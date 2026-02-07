"""
Background scheduler for data updates and predictions
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
import asyncio

from services.database import SessionLocal, MarketPrice, init_db
from services.nordpool import NordpoolClient, BMRSClient

scheduler = AsyncIOScheduler()


async def fetch_live_prices():
    """Fetch current prices from all sources"""
    print(f"[{datetime.now()}] Fetching live prices...")
    
    db = SessionLocal()
    try:
        # Nordpool UK Day-ahead
        nordpool = NordpoolClient()
        try:
            prices = await nordpool.get_current_prices()
            
            if prices:
                price = MarketPrice(
                    timestamp=datetime.utcnow(),
                    market='uk_dayahead',
                    price=prices.get('uk_dayahead', 0),
                    unit='GBP/MWh',
                    source='nordpool'
                )
                db.add(price)
                db.commit()
                print(f"  UK Day-ahead: {prices.get('uk_dayahead')} GBP/MWh")
        finally:
            await nordpool.close()
        
    except Exception as e:
        print(f"  Error fetching prices: {e}")
    finally:
        db.close()


async def update_predictions():
    """Regenerate predictions based on latest data"""
    print(f"[{datetime.now()}] Updating predictions...")
    
    # This would be called less frequently (e.g., every 6 hours)
    # Import here to avoid circular imports
    from models.predictor import EnergyPredictor
    
    db = SessionLocal()
    try:
        predictor = EnergyPredictor()
        
        for market in ['uk_dayahead', 'uk_peak', 'gas_nbp']:
            prices = db.query(MarketPrice).filter(
                MarketPrice.market == market
            ).order_by(MarketPrice.timestamp.asc()).all()
            
            if len(prices) > 1000:
                import pandas as pd
                df = pd.DataFrame([
                    {"timestamp": p.timestamp, "price": p.price, "market": p.market}
                    for p in prices
                ])
                
                if not predictor.is_trained:
                    predictor.train(df)
                
                print(f"  Updated predictions for {market}")
    except Exception as e:
        print(f"  Error updating predictions: {e}")
    finally:
        db.close()


async def fetch_historical_backfill():
    """Backfill historical data if needed"""
    print(f"[{datetime.now()}] Checking for historical data gaps...")
    
    db = SessionLocal()
    try:
        # Check if we have enough data
        count = db.query(MarketPrice).filter(
            MarketPrice.market == 'uk_dayahead'
        ).count()
        
        if count < 43800:  # ~5 years of hourly data
            print(f"  Need backfill: have {count} records, need ~43800")
            
            nordpool = NordpoolClient()
            try:
                end_date = datetime.now()
                start_date = end_date - timedelta(days=365 * 5)
                
                df = await nordpool.fetch_dayahead_prices(start_date, end_date)
                
                added = 0
                for _, row in df.iterrows():
                    existing = db.query(MarketPrice).filter(
                        MarketPrice.timestamp == row['timestamp'],
                        MarketPrice.market == row['market']
                    ).first()
                    
                    if not existing:
                        price = MarketPrice(
                            timestamp=row['timestamp'],
                            market=row['market'],
                            price=row['price'],
                            unit='GBP/MWh',
                            source='nordpool'
                        )
                        db.add(price)
                        added += 1
                
                db.commit()
                print(f"  Added {added} historical records")
            finally:
                await nordpool.close()
    except Exception as e:
        print(f"  Backfill error: {e}")
    finally:
        db.close()


def start_scheduler():
    """Initialize and start the background scheduler"""
    
    # Initialize database
    init_db()
    
    # Fetch live prices every 15 minutes
    scheduler.add_job(
        fetch_live_prices,
        IntervalTrigger(minutes=15),
        id='fetch_live_prices',
        replace_existing=True
    )
    
    # Update predictions every 6 hours
    scheduler.add_job(
        update_predictions,
        IntervalTrigger(hours=6),
        id='update_predictions',
        replace_existing=True
    )
    
    # Check for backfill on startup and daily at 3 AM
    scheduler.add_job(
        fetch_historical_backfill,
        CronTrigger(hour=3, minute=0),
        id='backfill_check',
        replace_existing=True
    )
    
    # Run initial fetch
    scheduler.add_job(
        fetch_historical_backfill,
        id='initial_backfill',
        replace_existing=True
    )
    
    scheduler.start()
    print("Scheduler started")


def stop_scheduler():
    """Stop the scheduler"""
    scheduler.shutdown()
