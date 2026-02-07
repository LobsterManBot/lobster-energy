"""
Nordpool Data Fetcher
Fetches historical and live UK power prices from Nordpool/N2EX
"""
import httpx
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
import json


class NordpoolClient:
    """Client for fetching Nordpool/N2EX market data"""
    
    BASE_URL = "https://www.nordpoolgroup.com/api/marketdata/page"
    
    # Page IDs for different markets
    PAGES = {
        "uk_dayahead": 325,      # N2EX UK Day-ahead
        "uk_intraday": 326,      # N2EX UK Intraday
        "gas_uk": 328,           # UK Gas prices (NBP)
    }
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def fetch_dayahead_prices(
        self, 
        start_date: datetime,
        end_date: Optional[datetime] = None,
        currency: str = "GBP"
    ) -> pd.DataFrame:
        """Fetch UK day-ahead power prices"""
        if end_date is None:
            end_date = datetime.now()
        
        all_data = []
        current = start_date
        
        while current <= end_date:
            try:
                url = f"{self.BASE_URL}/{self.PAGES['uk_dayahead']}"
                params = {
                    "currency": currency,
                    "endDate": current.strftime("%d-%m-%Y"),
                }
                
                response = await self.client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    parsed = self._parse_nordpool_response(data)
                    all_data.extend(parsed)
            except Exception as e:
                print(f"Error fetching {current}: {e}")
            
            current += timedelta(days=7)  # Nordpool returns weekly data
        
        if not all_data:
            return pd.DataFrame()
        
        df = pd.DataFrame(all_data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.drop_duplicates(subset=['timestamp'])
        df = df.sort_values('timestamp')
        return df
    
    def _parse_nordpool_response(self, data: dict) -> list:
        """Parse Nordpool API response into records"""
        records = []
        
        try:
            rows = data.get('data', {}).get('Rows', [])
            for row in rows:
                if row.get('IsExtraRow'):
                    continue
                    
                timestamp = row.get('StartTime')
                columns = row.get('Columns', [])
                
                for col in columns:
                    if col.get('Name') == 'UK':
                        value = col.get('Value', '').replace(',', '').replace(' ', '')
                        if value and value != '-':
                            try:
                                price = float(value)
                                records.append({
                                    'timestamp': timestamp,
                                    'price': price,
                                    'market': 'uk_dayahead',
                                    'unit': 'GBP/MWh'
                                })
                            except ValueError:
                                pass
        except Exception as e:
            print(f"Parse error: {e}")
        
        return records
    
    async def fetch_gas_prices(
        self,
        start_date: datetime,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Fetch UK NBP gas prices"""
        # Similar implementation for gas
        # Using ICE NBP futures or ICIS Heren data
        pass
    
    async def get_current_prices(self) -> dict:
        """Get latest prices for all markets"""
        try:
            url = f"{self.BASE_URL}/{self.PAGES['uk_dayahead']}"
            response = await self.client.get(url, params={"currency": "GBP"})
            
            if response.status_code == 200:
                data = response.json()
                # Get the most recent price
                rows = data.get('data', {}).get('Rows', [])
                for row in rows:
                    if not row.get('IsExtraRow'):
                        for col in row.get('Columns', []):
                            if col.get('Name') == 'UK':
                                value = col.get('Value', '').replace(',', '').replace(' ', '')
                                if value and value != '-':
                                    return {
                                        'uk_dayahead': float(value),
                                        'timestamp': row.get('StartTime'),
                                        'unit': 'GBP/MWh'
                                    }
        except Exception as e:
            print(f"Error getting current prices: {e}")
        
        return {}
    
    async def close(self):
        await self.client.aclose()


# Alternative: BMRS (Balancing Mechanism Reporting Service) - Free UK data
class BMRSClient:
    """
    BMRS provides free UK electricity market data
    https://www.bmreports.com/
    """
    
    BASE_URL = "https://api.bmreports.com/BMRS"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or "demo"  # Demo key available
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def fetch_system_price(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> pd.DataFrame:
        """Fetch System Sell/Buy Prices (imbalance prices)"""
        records = []
        current = start_date
        
        while current <= end_date:
            try:
                url = f"{self.BASE_URL}/DERSYSDATA/v1"
                params = {
                    "APIKey": self.api_key,
                    "SettlementDate": current.strftime("%Y-%m-%d"),
                    "ServiceType": "json"
                }
                
                response = await self.client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    items = data.get('response', {}).get('responseBody', {}).get('responseList', {}).get('item', [])
                    
                    for item in items:
                        records.append({
                            'timestamp': f"{item.get('settlementDate')} {item.get('settlementPeriod')}",
                            'system_sell_price': float(item.get('systemSellPrice', 0)),
                            'system_buy_price': float(item.get('systemBuyPrice', 0)),
                        })
            except Exception as e:
                print(f"BMRS error {current}: {e}")
            
            current += timedelta(days=1)
        
        return pd.DataFrame(records)
    
    async def fetch_day_ahead_prices(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> pd.DataFrame:
        """Fetch Day-Ahead Market prices from BMRS"""
        records = []
        current = start_date
        
        while current <= end_date:
            try:
                url = f"{self.BASE_URL}/DAPRICE/v1"
                params = {
                    "APIKey": self.api_key,
                    "SettlementDate": current.strftime("%Y-%m-%d"),
                    "ServiceType": "json"
                }
                
                response = await self.client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    # Parse response...
                    pass
            except Exception as e:
                print(f"BMRS DAP error {current}: {e}")
            
            current += timedelta(days=1)
        
        return pd.DataFrame(records)


# Gas prices from ICE/NBP
class GasDataClient:
    """
    Fetches UK NBP gas prices
    Uses free data sources where available
    """
    
    async def fetch_historical_gas(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> pd.DataFrame:
        """
        Fetch historical NBP gas prices
        Sources: ICIS, Argus, or ICE
        """
        # Note: Most gas data requires paid subscriptions
        # We'll use publicly available data where possible
        pass
