#!/usr/bin/env python3
"""
Backfill historical data from BMRS
Run this to populate the database with 5 years of UK electricity prices
"""
import asyncio
from datetime import datetime, timedelta
from services.database import init_db, SessionLocal, MarketPrice
from services.data_fetcher import BMRSClient


async def backfill(years: int = 5):
    """Backfill historical data"""
    
    print(f"🦞 Lobster Energy - Historical Data Backfill")
    print(f"=" * 50)
    
    # Initialize database
    init_db()
    db = SessionLocal()
    client = BMRSClient()
    
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=years * 365)
        
        print(f"Fetching data from {start_date.date()} to {end_date.date()}")
        print(f"This will take a while (rate limited)...")
        print()
        
        # Fetch in yearly chunks to show progress
        total_added = 0
        current = start_date
        
        while current < end_date:
            chunk_end = min(current + timedelta(days=365), end_date)
            
            print(f"  Fetching {current.date()} to {chunk_end.date()}...", end=" ", flush=True)
            
            df = await client.fetch_market_prices(current, chunk_end)
            
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
            total_added += added
            print(f"{added} records added")
            
            current = chunk_end
        
        print()
        print(f"=" * 50)
        print(f"✅ Backfill complete! Added {total_added} total records")
        
        # Show summary
        count = db.query(MarketPrice).filter(
            MarketPrice.market == "uk_dayahead"
        ).count()
        
        oldest = db.query(MarketPrice).filter(
            MarketPrice.market == "uk_dayahead"
        ).order_by(MarketPrice.timestamp.asc()).first()
        
        newest = db.query(MarketPrice).filter(
            MarketPrice.market == "uk_dayahead"
        ).order_by(MarketPrice.timestamp.desc()).first()
        
        print(f"  Total records: {count}")
        print(f"  Date range: {oldest.timestamp.date()} to {newest.timestamp.date()}")
        
    finally:
        await client.close()
        db.close()


if __name__ == "__main__":
    asyncio.run(backfill(years=5))
