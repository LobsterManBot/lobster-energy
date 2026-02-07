"""
Energy Market Data Fetcher
Uses BMRS (Elexon) for UK electricity data - official government source
"""
import httpx
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import asyncio


class BMRSClient:
    """
    BMRS/Elexon API Client for UK electricity market data
    https://data.elexon.co.uk/
    
    Free, no API key required for basic endpoints
    """
    
    BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def fetch_market_prices(
        self,
        start_date: datetime,
        end_date: Optional[datetime] = None,
        data_provider: str = "APXMIDP"  # APX Mid Price (main UK market)
    ) -> pd.DataFrame:
        """
        Fetch UK electricity market index prices
        
        data_provider options:
        - APXMIDP: APX Power UK Mid Price (main)
        - N2EXMIDP: N2EX Mid Price
        """
        if end_date is None:
            end_date = datetime.now()
        
        all_records = []
        current = start_date
        
        # BMRS limits to 7 days per request, so we chunk
        while current < end_date:
            chunk_end = min(current + timedelta(days=7), end_date)
            
            try:
                url = f"{self.BASE_URL}/balancing/pricing/market-index"
                params = {
                    "from": current.strftime("%Y-%m-%d"),
                    "to": chunk_end.strftime("%Y-%m-%d"),
                }
                
                response = await self.client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("data", []):
                        if item.get("dataProvider") == data_provider:
                            all_records.append({
                                "timestamp": item.get("startTime"),
                                "price": item.get("price"),
                                "volume": item.get("volume"),
                                "settlement_period": item.get("settlementPeriod"),
                                "market": "uk_dayahead",
                                "unit": "GBP/MWh",
                                "source": "bmrs"
                            })
                else:
                    print(f"BMRS error {response.status_code}: {current} to {chunk_end}")
                    
            except Exception as e:
                print(f"Fetch error {current}: {e}")
            
            current = chunk_end
            await asyncio.sleep(0.5)  # Rate limiting
        
        if not all_records:
            return pd.DataFrame()
        
        df = pd.DataFrame(all_records)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.drop_duplicates(subset=["timestamp"])
        df = df.sort_values("timestamp")
        return df
    
    async def fetch_system_prices(
        self,
        start_date: datetime,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Fetch system buy/sell prices (imbalance prices)
        More granular, half-hourly settlement periods
        """
        if end_date is None:
            end_date = datetime.now()
        
        all_records = []
        current = start_date
        
        while current < end_date:
            chunk_end = min(current + timedelta(days=7), end_date)
            
            try:
                url = f"{self.BASE_URL}/balancing/settlement/system-prices"
                params = {
                    "from": current.strftime("%Y-%m-%d"),
                    "to": chunk_end.strftime("%Y-%m-%d"),
                }
                
                response = await self.client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("data", []):
                        all_records.append({
                            "timestamp": item.get("startTime"),
                            "system_sell_price": item.get("systemSellPrice"),
                            "system_buy_price": item.get("systemBuyPrice"),
                            "settlement_period": item.get("settlementPeriod"),
                            "market": "uk_system",
                            "unit": "GBP/MWh",
                            "source": "bmrs"
                        })
                        
            except Exception as e:
                print(f"System price error {current}: {e}")
            
            current = chunk_end
            await asyncio.sleep(0.5)
        
        if not all_records:
            return pd.DataFrame()
        
        df = pd.DataFrame(all_records)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        return df
    
    async def fetch_day_ahead_prices(
        self,
        start_date: datetime,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Fetch day-ahead auction prices
        """
        if end_date is None:
            end_date = datetime.now()
        
        all_records = []
        current = start_date
        
        while current < end_date:
            chunk_end = min(current + timedelta(days=30), end_date)
            
            try:
                url = f"{self.BASE_URL}/datasets/MID"
                params = {
                    "from": current.strftime("%Y-%m-%dT00:00:00Z"),
                    "to": chunk_end.strftime("%Y-%m-%dT23:59:59Z"),
                }
                
                response = await self.client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("data", []):
                        all_records.append({
                            "timestamp": item.get("startTime"),
                            "price": item.get("price"),
                            "market": "uk_dayahead",
                            "unit": "GBP/MWh",
                            "source": "bmrs"
                        })
                        
            except Exception as e:
                print(f"Day-ahead error {current}: {e}")
            
            current = chunk_end
            await asyncio.sleep(0.5)
        
        if not all_records:
            return pd.DataFrame()
        
        df = pd.DataFrame(all_records)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        return df
    
    async def get_current_price(self) -> Dict:
        """Get the latest market price"""
        try:
            today = datetime.now()
            yesterday = today - timedelta(days=1)
            
            url = f"{self.BASE_URL}/balancing/pricing/market-index"
            params = {
                "from": yesterday.strftime("%Y-%m-%d"),
                "to": today.strftime("%Y-%m-%d"),
            }
            
            response = await self.client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                # Get latest APXMIDP price
                for item in reversed(data.get("data", [])):
                    if item.get("dataProvider") == "APXMIDP" and item.get("price", 0) > 0:
                        return {
                            "uk_dayahead": item.get("price"),
                            "timestamp": item.get("startTime"),
                            "unit": "GBP/MWh",
                            "volume": item.get("volume")
                        }
        except Exception as e:
            print(f"Current price error: {e}")
        
        return {}
    
    async def close(self):
        await self.client.aclose()


class GasDataClient:
    """
    UK NBP Gas prices
    Using free data sources where available
    """
    
    # National Grid gas data
    BASE_URL = "https://data.nationalgas.com/api"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def fetch_gas_prices(
        self,
        start_date: datetime,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Fetch UK NBP gas prices
        Note: Full historical data may require paid sources (ICE, ICIS)
        """
        # For now, we'll use a mock structure
        # In production, this would connect to ICE or a data provider
        
        if end_date is None:
            end_date = datetime.now()
        
        # Placeholder - would need actual data source
        print("Gas data requires ICE/ICIS subscription for historical data")
        return pd.DataFrame()
    
    async def close(self):
        await self.client.aclose()


async def backfill_historical_data(years: int = 5) -> pd.DataFrame:
    """
    Backfill historical electricity price data
    """
    client = BMRSClient()
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=years * 365)
    
    print(f"Fetching data from {start_date.date()} to {end_date.date()}...")
    
    try:
        df = await client.fetch_market_prices(start_date, end_date)
        print(f"Fetched {len(df)} records")
        return df
    finally:
        await client.close()


# Quick test
if __name__ == "__main__":
    async def test():
        client = BMRSClient()
        try:
            price = await client.get_current_price()
            print(f"Current UK price: {price}")
            
            # Fetch last 7 days
            end = datetime.now()
            start = end - timedelta(days=7)
            df = await client.fetch_market_prices(start, end)
            print(f"Last 7 days: {len(df)} records")
            if not df.empty:
                print(df.tail())
        finally:
            await client.close()
    
    asyncio.run(test())
