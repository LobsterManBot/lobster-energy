"""
Background scheduler for data updates and predictions
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
import asyncio

from services.database import SessionLocal, MarketPrice, init_db
from services.data_fetcher import BMRSClient

scheduler = AsyncIOScheduler()


async def fetch_live_prices():
    """Fetch current prices from BMRS"""
    print(f"[{datetime.now()}] Fetching live prices...")
    
    db = SessionLocal()
    client = BMRSClient()
    
    try:
        price_data = await client.get_current_price()
        
        if price_data and price_data.get("uk_dayahead"):
            price = MarketPrice(
                timestamp=datetime.fromisoformat(price_data["timestamp"].replace("Z", "+00:00")),
                market="uk_dayahead",
                price=price_data["uk_dayahead"],
                unit="GBP/MWh",
                source="bmrs"
            )
            
            # Check if we already have this timestamp
            existing = db.query(MarketPrice).filter(
                MarketPrice.timestamp == price.timestamp,
                MarketPrice.market == "uk_dayahead"
            ).first()
            
            if not existing:
                db.add(price)
                db.commit()
                print(f"  UK Day-ahead: £{price_data['uk_dayahead']}/MWh")
            else:
                print(f"  Price already exists for {price.timestamp}")
        else:
            print("  No price data available")
            
    except Exception as e:
        print(f"  Error fetching prices: {e}")
    finally:
        await client.close()
        db.close()


async def update_predictions():
    """Regenerate predictions based on latest data"""
    print(f"[{datetime.now()}] Updating predictions...")
    
    from models.predictor import EnergyPredictor
    import pandas as pd
    
    db = SessionLocal()
    try:
        predictor = EnergyPredictor()
        
        for market in ["uk_dayahead"]:
            prices = db.query(MarketPrice).filter(
                MarketPrice.market == market
            ).order_by(MarketPrice.timestamp.asc()).all()
            
            if len(prices) > 1000:
                df = pd.DataFrame([
                    {"timestamp": p.timestamp, "price": p.price, "market": p.market}
                    for p in prices
                ])
                
                if not predictor.is_trained:
                    print(f"  Training model on {len(df)} records...")
                    predictor.train(df)
                
                print(f"  Updated predictions for {market}")
    except Exception as e:
        print(f"  Error updating predictions: {e}")
    finally:
        db.close()


async def backfill_historical():
    """Backfill historical data from BMRS"""
    print(f"[{datetime.now()}] Checking for historical data gaps...")
    
    db = SessionLocal()
    client = BMRSClient()
    
    try:
        # Check current data count
        count = db.query(MarketPrice).filter(
            MarketPrice.market == "uk_dayahead"
        ).count()
        
        # Target: 5 years of half-hourly data = ~87,600 records
        target = 87600
        
        if count < target * 0.9:  # Less than 90% of target
            print(f"  Have {count} records, need ~{target}. Starting backfill...")
            
            # Find oldest record
            oldest = db.query(MarketPrice).filter(
                MarketPrice.market == "uk_dayahead"
            ).order_by(MarketPrice.timestamp.asc()).first()
            
            if oldest:
                end_date = oldest.timestamp
            else:
                end_date = datetime.now()
            
            # Fetch in chunks (BMRS has rate limits)
            start_date = end_date - timedelta(days=365)  # 1 year at a time
            
            df = await client.fetch_market_prices(start_date, end_date)
            
            added = 0
            for _, row in df.iterrows():
                existing = db.query(MarketPrice).filter(
                    MarketPrice.timestamp == row["timestamp"],
                    MarketPrice.market == row["market"]
                ).first()
                
                if not existing and row["price"] > 0:
                    price = MarketPrice(
                        timestamp=row["timestamp"],
                        market=row["market"],
                        price=row["price"],
                        unit=row["unit"],
                        source=row["source"]
                    )
                    db.add(price)
                    added += 1
            
            db.commit()
            print(f"  Added {added} historical records")
        else:
            print(f"  Historical data OK: {count} records")
            
    except Exception as e:
        print(f"  Backfill error: {e}")
    finally:
        await client.close()
        db.close()


def start_scheduler():
    """Initialize and start the background scheduler"""
    
    # Initialize database
    init_db()
    
    # Fetch live prices every 15 minutes
    scheduler.add_job(
        fetch_live_prices,
        IntervalTrigger(minutes=15),
        id="fetch_live_prices",
        replace_existing=True
    )
    
    # Update predictions every 6 hours
    scheduler.add_job(
        update_predictions,
        IntervalTrigger(hours=6),
        id="update_predictions",
        replace_existing=True
    )
    
    # Backfill check daily at 3 AM
    scheduler.add_job(
        backfill_historical,
        CronTrigger(hour=3, minute=0),
        id="backfill_check",
        replace_existing=True
    )
    
    # Run initial fetch on startup
    scheduler.add_job(
        fetch_live_prices,
        id="initial_fetch",
        replace_existing=True
    )
    
    scheduler.start()
    print("Scheduler started")


def stop_scheduler():
    """Stop the scheduler"""
    scheduler.shutdown()
