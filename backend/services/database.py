"""
Database service for storing market data and predictions
"""
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./lobster_energy.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class MarketPrice(Base):
    """Historical and live market prices"""
    __tablename__ = "market_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, index=True)
    market = Column(String(50), index=True)  # uk_dayahead, uk_peak, gas_nbp
    product = Column(String(50))  # baseload, peak, offpeak
    price = Column(Float)
    unit = Column(String(20))  # GBP/MWh, p/therm
    source = Column(String(50))  # nordpool, bmrs, ice
    created_at = Column(DateTime, default=datetime.utcnow)


class Prediction(Base):
    """AI predictions for future prices"""
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    target_date = Column(DateTime, index=True)
    market = Column(String(50), index=True)
    product = Column(String(50))
    predicted_price = Column(Float)
    confidence = Column(Float)  # 0-1
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    model_version = Column(String(50))


class Signal(Base):
    """Trading signals - buy/wait/sell recommendations"""
    __tablename__ = "signals"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    market = Column(String(50), index=True)
    product = Column(String(50))
    signal_type = Column(String(20))  # BUY, WAIT, SELL
    strength = Column(Float)  # 0-1, how strong is the signal
    reason = Column(Text)  # AI explanation
    current_price = Column(Float)
    target_price = Column(Float)
    time_horizon = Column(String(50))  # day, week, month, quarter
    expires_at = Column(DateTime)


class TrancheRecommendation(Base):
    """Recommended tranche purchases"""
    __tablename__ = "tranche_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    delivery_period = Column(String(50))  # Q1-2026, Feb-2026, etc
    market = Column(String(50))
    product = Column(String(50))
    recommended_percentage = Column(Float)  # % of total to buy now
    current_price = Column(Float)
    predicted_price = Column(Float)
    confidence = Column(Float)
    reasoning = Column(Text)


class ContractComparison(Base):
    """Fixed vs Flexible contract analysis"""
    __tablename__ = "contract_comparisons"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    analysis_period = Column(String(50))  # 1 year, 2 years, 3 years
    fixed_rate_estimate = Column(Float)
    flexible_expected_cost = Column(Float)
    flexible_best_case = Column(Float)
    flexible_worst_case = Column(Float)
    recommendation = Column(String(20))  # FIXED, FLEXIBLE
    confidence = Column(Float)
    reasoning = Column(Text)


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
