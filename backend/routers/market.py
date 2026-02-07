"""
Market Data API Routes
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
import pandas as pd

from services.database import get_db, MarketPrice
from services.data_fetcher import BMRSClient

router = APIRouter()


@router.get("/prices")
async def get_prices(
    market: str = Query("uk_dayahead", description="Market: uk_dayahead, uk_peak, gas_nbp"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(1000, description="Max records to return"),
    db: Session = Depends(get_db)
):
    """Get historical market prices"""
    
    query = db.query(MarketPrice).filter(MarketPrice.market == market)
    
    if start_date:
        query = query.filter(MarketPrice.timestamp >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(MarketPrice.timestamp <= datetime.fromisoformat(end_date))
    
    prices = query.order_by(MarketPrice.timestamp.desc()).limit(limit).all()
    
    return {
        "market": market,
        "count": len(prices),
        "data": [
            {
                "timestamp": p.timestamp.isoformat(),
                "price": p.price,
                "unit": p.unit,
                "product": p.product
            }
            for p in prices
        ]
    }


@router.get("/current")
async def get_current_prices():
    """Get current/latest prices for all markets"""
    
    client = BMRSClient()
    try:
        prices = await client.get_current_price()
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "prices": prices
        }
    finally:
        await client.close()


@router.get("/summary")
async def get_market_summary(
    market: str = Query("uk_dayahead"),
    db: Session = Depends(get_db)
):
    """Get market summary statistics"""
    
    now = datetime.utcnow()
    
    # Last 24 hours
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    year_ago = now - timedelta(days=365)
    
    def get_stats(start_date):
        prices = db.query(MarketPrice).filter(
            MarketPrice.market == market,
            MarketPrice.timestamp >= start_date
        ).all()
        
        if not prices:
            return None
        
        values = [p.price for p in prices]
        return {
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "count": len(values)
        }
    
    return {
        "market": market,
        "last_24h": get_stats(day_ago),
        "last_7d": get_stats(week_ago),
        "last_30d": get_stats(month_ago),
        "last_365d": get_stats(year_ago),
    }


@router.get("/products")
async def list_products():
    """List available products/markets"""
    
    return {
        "products": [
            {
                "id": "uk_dayahead",
                "name": "UK Day-Ahead Power",
                "description": "N2EX/Nordpool UK day-ahead electricity prices",
                "unit": "GBP/MWh",
                "source": "Nordpool"
            },
            {
                "id": "uk_baseload",
                "name": "UK Baseload",
                "description": "UK baseload power (24h average)",
                "unit": "GBP/MWh",
                "source": "Nordpool"
            },
            {
                "id": "uk_peak",
                "name": "UK Peak",
                "description": "UK peak power (07:00-19:00 weekdays)",
                "unit": "GBP/MWh",
                "source": "Nordpool"
            },
            {
                "id": "gas_nbp",
                "name": "UK NBP Gas",
                "description": "UK National Balancing Point gas prices",
                "unit": "p/therm",
                "source": "ICE"
            }
        ]
    }


@router.post("/fetch")
async def fetch_historical_data(
    market: str = Query("uk_dayahead"),
    years: int = Query(5, description="Years of historical data to fetch"),
    db: Session = Depends(get_db)
):
    """Trigger historical data fetch (admin endpoint)"""
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=years * 365)
    
    client = BMRSClient()
    try:
        df = await client.fetch_market_prices(start_date, end_date)
        
        # Store in database
        count = 0
        for _, row in df.iterrows():
            existing = db.query(MarketPrice).filter(
                MarketPrice.timestamp == row['timestamp'],
                MarketPrice.market == row['market']
            ).first()
            
            if not existing and row['price'] > 0:
                price = MarketPrice(
                    timestamp=row['timestamp'],
                    market=row['market'],
                    price=row['price'],
                    unit=row.get('unit', 'GBP/MWh'),
                    source='bmrs'
                )
                db.add(price)
                count += 1
        
        db.commit()
        
        return {
            "status": "success",
            "records_fetched": len(df),
            "records_added": count
        }
    finally:
        await client.close()


@router.get("/chart")
async def get_chart_data(
    market: str = Query("uk_dayahead"),
    period: str = Query("1M", description="1D, 1W, 1M, 3M, 1Y, 5Y"),
    db: Session = Depends(get_db)
):
    """Get data formatted for charts"""
    
    periods = {
        "1D": timedelta(days=1),
        "1W": timedelta(days=7),
        "1M": timedelta(days=30),
        "3M": timedelta(days=90),
        "1Y": timedelta(days=365),
        "5Y": timedelta(days=365 * 5),
    }
    
    if period not in periods:
        raise HTTPException(status_code=400, detail=f"Invalid period. Use: {list(periods.keys())}")
    
    start_date = datetime.utcnow() - periods[period]
    
    prices = db.query(MarketPrice).filter(
        MarketPrice.market == market,
        MarketPrice.timestamp >= start_date
    ).order_by(MarketPrice.timestamp.asc()).all()
    
    return {
        "market": market,
        "period": period,
        "data": [
            {"x": p.timestamp.isoformat(), "y": p.price}
            for p in prices
        ]
    }
