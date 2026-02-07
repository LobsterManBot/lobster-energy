"""
Predictions API Routes
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import pandas as pd

from services.database import get_db, MarketPrice, Prediction, ContractComparison
from models.predictor import EnergyPredictor, SignalGenerator

router = APIRouter()

# Global predictor instance
predictor = EnergyPredictor(model_dir="./saved_models")
signal_generator = SignalGenerator(predictor)


@router.get("/forecast")
async def get_forecast(
    market: str = Query("uk_dayahead"),
    horizon_days: int = Query(30, description="Forecast horizon in days (max 90)"),
    db: Session = Depends(get_db)
):
    """Get price forecast for specified market"""
    
    if horizon_days > 90:
        horizon_days = 90
    
    # Load historical data
    start_date = datetime.utcnow() - timedelta(days=365)
    prices = db.query(MarketPrice).filter(
        MarketPrice.market == market,
        MarketPrice.timestamp >= start_date
    ).order_by(MarketPrice.timestamp.asc()).all()
    
    if len(prices) < 100:
        raise HTTPException(
            status_code=400, 
            detail="Insufficient historical data. Need at least 100 data points."
        )
    
    # Convert to DataFrame
    df = pd.DataFrame([
        {"timestamp": p.timestamp, "price": p.price, "market": p.market}
        for p in prices
    ])
    
    # Ensure model is trained
    if not predictor.is_trained:
        if not predictor.load_models():
            # Train on available data
            predictor.train(df)
    
    # Generate predictions
    predictions = predictor.predict(df, horizon_days=horizon_days, market=market)
    
    return {
        "market": market,
        "generated_at": datetime.utcnow().isoformat(),
        "horizon_days": horizon_days,
        "current_price": prices[-1].price if prices else None,
        "forecast": [
            {
                "date": p.target_date.isoformat(),
                "predicted_price": round(p.predicted_price, 2),
                "confidence": round(p.confidence, 2),
                "lower_bound": round(p.lower_bound, 2),
                "upper_bound": round(p.upper_bound, 2)
            }
            for p in predictions
        ],
        "feature_importance": predictions[0].features_importance if predictions else {}
    }


@router.post("/train")
async def train_model(
    market: str = Query("uk_dayahead"),
    db: Session = Depends(get_db)
):
    """Train/retrain the prediction model"""
    
    # Load all historical data
    prices = db.query(MarketPrice).filter(
        MarketPrice.market == market
    ).order_by(MarketPrice.timestamp.asc()).all()
    
    if len(prices) < 1000:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient data for training. Have {len(prices)}, need 1000+."
        )
    
    df = pd.DataFrame([
        {"timestamp": p.timestamp, "price": p.price, "market": p.market}
        for p in prices
    ])
    
    # Train model
    metrics = predictor.train(df)
    
    return {
        "status": "success",
        "training_samples": len(df),
        "metrics": metrics
    }


@router.get("/compare-contracts")
async def compare_contracts(
    fixed_rate: float = Query(..., description="Current fixed rate offer (GBP/MWh)"),
    annual_volume: float = Query(..., description="Annual consumption in MWh"),
    contract_years: int = Query(1, description="Contract duration (1-3 years)"),
    market: str = Query("uk_dayahead"),
    db: Session = Depends(get_db)
):
    """Compare fixed vs flexible contract options"""
    
    # Load historical data
    start_date = datetime.utcnow() - timedelta(days=365)
    prices = db.query(MarketPrice).filter(
        MarketPrice.market == market,
        MarketPrice.timestamp >= start_date
    ).order_by(MarketPrice.timestamp.asc()).all()
    
    if len(prices) < 100:
        raise HTTPException(status_code=400, detail="Insufficient data for analysis")
    
    df = pd.DataFrame([
        {"timestamp": p.timestamp, "price": p.price, "market": p.market}
        for p in prices
    ])
    
    if not predictor.is_trained:
        if not predictor.load_models():
            predictor.train(df)
    
    # Generate predictions for contract period
    predictions = predictor.predict(df, horizon_days=min(365 * contract_years, 365))
    
    # Compare
    comparison = signal_generator.compare_fixed_vs_flexible(
        fixed_rate, predictions, annual_volume
    )
    
    # Store result
    record = ContractComparison(
        analysis_period=f"{contract_years} year(s)",
        fixed_rate_estimate=fixed_rate,
        flexible_expected_cost=comparison['flexible_expected_annual'],
        flexible_best_case=comparison['flexible_best_case'],
        flexible_worst_case=comparison['flexible_worst_case'],
        recommendation=comparison['recommendation'],
        confidence=comparison['confidence'],
        reasoning=comparison['reason']
    )
    db.add(record)
    db.commit()
    
    return {
        "analysis_id": record.id,
        **comparison,
        "contract_years": contract_years,
        "annual_volume_mwh": annual_volume
    }


@router.get("/history")
async def get_prediction_history(
    market: str = Query("uk_dayahead"),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """Get historical predictions for accuracy analysis"""
    
    predictions = db.query(Prediction).filter(
        Prediction.market == market
    ).order_by(Prediction.created_at.desc()).limit(limit).all()
    
    return {
        "predictions": [
            {
                "id": p.id,
                "created_at": p.created_at.isoformat(),
                "target_date": p.target_date.isoformat(),
                "predicted_price": p.predicted_price,
                "confidence": p.confidence,
                "lower_bound": p.lower_bound,
                "upper_bound": p.upper_bound
            }
            for p in predictions
        ]
    }
