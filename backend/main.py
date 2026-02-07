"""
Lobster Energy - Backend API
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from routers import market, predictions, signals
from services.scheduler import start_scheduler

app = FastAPI(
    title="Lobster Energy API",
    description="AI-powered energy procurement advisory",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(signals.router, prefix="/api/signals", tags=["Trading Signals"])


@app.on_event("startup")
async def startup():
    start_scheduler()


@app.get("/")
def root():
    return {"name": "Lobster Energy 🦞⚡", "status": "running"}


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
