"""
Trading Signals API Routes
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import pandas as pd

from services.database import get_db, MarketPrice, Signal, TrancheRecommendation
from models.predictor import EnergyPredictor, SignalGenerator

router = APIRouter()

# Global instances
predictor = EnergyPredictor(model_dir="./saved_models")
signal_generator = SignalGenerator(predictor)


@router.get("/current")
async def get_current_signals(
    market: str = Query("uk_dayahead"),
    db: Session = Depends(get_db)
):
    """Get current trading signals"""
    
    # Load historical data
    start_date = datetime.utcnow() - timedelta(days=365)
    prices = db.query(MarketPrice).filter(
        MarketPrice.market == market,
        MarketPrice.timestamp >= start_date
    ).order_by(MarketPrice.timestamp.asc()).all()
    
    if len(prices) < 100:
        raise HTTPException(status_code=400, detail="Insufficient data for signal generation")
    
    df = pd.DataFrame([
        {"timestamp": p.timestamp, "price": p.price, "market": p.market}
        for p in prices
    ])
    
    current_price = prices[-1].price
    
    if not predictor.is_trained:
        if not predictor.load_models():
            predictor.train(df)
    
    signals = signal_generator.generate_signals(df, current_price, market)
    
    # Store signal
    signal_record = Signal(
        market=market,
        signal_type=signals['signal'],
        strength=signals['strength'],
        reason=signals['reason'],
        current_price=current_price,
        target_price=signals['forecast_7d'],
        time_horizon="7d",
        expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    db.add(signal_record)
    db.commit()
    
    return {
        "signal_id": signal_record.id,
        "market": market,
        "generated_at": datetime.utcnow().isoformat(),
        **signals
    }


@router.get("/recommendations")
async def get_tranche_recommendations(
    market: str = Query("uk_dayahead"),
    delivery_period: str = Query("Q2-2026", description="Delivery period (e.g., Q2-2026, Mar-2026)"),
    volume_mwh: float = Query(1000, description="Volume to procure in MWh"),
    db: Session = Depends(get_db)
):
    """Get specific tranche purchase recommendations"""
    
    # Load data
    start_date = datetime.utcnow() - timedelta(days=365)
    prices = db.query(MarketPrice).filter(
        MarketPrice.market == market,
        MarketPrice.timestamp >= start_date
    ).order_by(MarketPrice.timestamp.asc()).all()
    
    if len(prices) < 100:
        raise HTTPException(status_code=400, detail="Insufficient data")
    
    df = pd.DataFrame([
        {"timestamp": p.timestamp, "price": p.price, "market": p.market}
        for p in prices
    ])
    
    current_price = prices[-1].price
    
    if not predictor.is_trained:
        if not predictor.load_models():
            predictor.train(df)
    
    signals = signal_generator.generate_signals(df, current_price, market)
    
    # Calculate tranche details
    recommendations = signals['recommendations']
    
    tranche_details = []
    for rec in recommendations:
        volume = volume_mwh * (rec['percentage'] / 100)
        cost = volume * rec['target_price']
        
        tranche_details.append({
            **rec,
            'volume_mwh': volume,
            'estimated_cost': cost,
            'delivery_period': delivery_period
        })
        
        # Store recommendation
        tranche = TrancheRecommendation(
            delivery_period=delivery_period,
            market=market,
            recommended_percentage=rec['percentage'],
            current_price=current_price,
            predicted_price=rec['target_price'],
            confidence=signals['confidence'],
            reasoning=rec['reason']
        )
        db.add(tranche)
    
    db.commit()
    
    return {
        "market": market,
        "delivery_period": delivery_period,
        "total_volume_mwh": volume_mwh,
        "current_price": current_price,
        "signal": signals['signal'],
        "recommendations": tranche_details,
        "summary": {
            "action": recommendations[0]['action'] if recommendations else "HOLD",
            "confidence": signals['confidence'],
            "forecast_7d": signals['forecast_7d'],
            "forecast_30d": signals['forecast_30d']
        }
    }


@router.get("/history")
async def get_signal_history(
    market: str = Query("uk_dayahead"),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """Get historical signals"""
    
    signals = db.query(Signal).filter(
        Signal.market == market
    ).order_by(Signal.created_at.desc()).limit(limit).all()
    
    return {
        "signals": [
            {
                "id": s.id,
                "created_at": s.created_at.isoformat(),
                "signal_type": s.signal_type,
                "strength": s.strength,
                "reason": s.reason,
                "current_price": s.current_price,
                "target_price": s.target_price
            }
            for s in signals
        ]
    }


@router.get("/dashboard")
async def get_dashboard_data(
    db: Session = Depends(get_db)
):
    """Get all data needed for main dashboard"""
    
    markets = ['uk_dayahead', 'uk_peak', 'gas_nbp']
    dashboard = {}
    
    for market in markets:
        prices = db.query(MarketPrice).filter(
            MarketPrice.market == market
        ).order_by(MarketPrice.timestamp.desc()).limit(168).all()  # Last week
        
        if prices:
            current = prices[0].price
            day_ago = prices[24].price if len(prices) > 24 else current
            week_ago = prices[-1].price if prices else current
            
            dashboard[market] = {
                "current_price": current,
                "change_24h": ((current - day_ago) / day_ago * 100) if day_ago else 0,
                "change_7d": ((current - week_ago) / week_ago * 100) if week_ago else 0,
                "min_7d": min(p.price for p in prices),
                "max_7d": max(p.price for p in prices),
                "unit": prices[0].unit
            }
    
    # Latest signal for each market
    for market in markets:
        latest_signal = db.query(Signal).filter(
            Signal.market == market
        ).order_by(Signal.created_at.desc()).first()
        
        if latest_signal and market in dashboard:
            dashboard[market]['signal'] = {
                "type": latest_signal.signal_type,
                "strength": latest_signal.strength,
                "reason": latest_signal.reason
            }
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "markets": dashboard
    }
