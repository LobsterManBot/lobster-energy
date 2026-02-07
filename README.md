# Lobster Energy 🦞⚡

AI-powered energy procurement advisory platform for flexible contract trading.

## What It Does

- Analyzes 5 years of historical UK energy market data
- Provides live market monitoring
- ML-driven recommendations on when to buy energy tranches
- Supports baseload, peak, and gas products
- Helps decide fixed vs flexible contracts

## Tech Stack

- **Backend:** Python/FastAPI
- **Frontend:** Next.js
- **ML:** scikit-learn, XGBoost, Prophet (for time series)
- **Data:** Nordpool, UKPX, ICE (where available)
- **Database:** SQLite (local deployment)

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py

# Frontend
cd frontend
npm install
npm run dev
```

## Data Sources

- **Nordpool:** Free historical data available
- **UKPX/N2EX:** Via Nordpool
- **ICE:** Paid API (expensive) - using alternatives where possible
