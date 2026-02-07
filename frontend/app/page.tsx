'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, Flame, Activity } from 'lucide-react';
import PriceChart from '@/components/PriceChart';
import SignalCard from '@/components/SignalCard';

interface MarketData {
  current_price: number;
  change_24h: number;
  change_7d: number;
  min_7d: number;
  max_7d: number;
  unit: string;
  signal?: {
    type: string;
    strength: number;
    reason: string;
  };
}

interface DashboardData {
  timestamp: string;
  markets: {
    uk_dayahead?: MarketData;
    uk_peak?: MarketData;
    gas_nbp?: MarketData;
  };
}

const marketInfo = {
  uk_dayahead: { name: 'UK Day-Ahead', icon: Zap, color: 'blue' },
  uk_peak: { name: 'UK Peak', icon: Activity, color: 'purple' },
  gas_nbp: { name: 'UK NBP Gas', icon: Flame, color: 'orange' },
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch('/api/signals/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError('Unable to load market data. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lobster-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button 
          onClick={fetchDashboard}
          className="mt-4 px-4 py-2 bg-lobster-600 text-white rounded-md hover:bg-lobster-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Overview</h1>
          <p className="text-gray-500 text-sm mt-1">
            Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Market Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(marketInfo).map(([key, info]) => {
          const market = data?.markets[key as keyof typeof data.markets];
          const Icon = info.icon;
          
          return (
            <div key={key} className="bg-white rounded-xl shadow-sm border p-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${info.color}-100`}>
                    <Icon className={`w-5 h-5 text-${info.color}-600`} />
                  </div>
                  <h3 className="font-semibold text-gray-900">{info.name}</h3>
                </div>
                {market?.signal && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium signal-${market.signal.type.toLowerCase()}`}>
                    {market.signal.type}
                  </span>
                )}
              </div>
              
              {market ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {market.current_price?.toFixed(2) || 'N/A'}
                    </span>
                    <span className="text-gray-500 text-sm">{market.unit}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1">
                      {market.change_24h > 0 ? (
                        <TrendingUp className="w-4 h-4 text-red-500" />
                      ) : market.change_24h < 0 ? (
                        <TrendingDown className="w-4 h-4 text-green-500" />
                      ) : (
                        <Minus className="w-4 h-4 text-gray-400" />
                      )}
                      <span className={`text-sm ${market.change_24h > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {market.change_24h?.toFixed(1)}% 24h
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      7d: {market.min_7d?.toFixed(0)} - {market.max_7d?.toFixed(0)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-gray-400">No data available</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Price Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Price History</h2>
        <PriceChart market="uk_dayahead" />
      </div>

      {/* Latest Signals */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Signals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(data?.markets || {}).map(([key, market]) => (
            market?.signal && (
              <SignalCard 
                key={key}
                market={marketInfo[key as keyof typeof marketInfo]?.name || key}
                signal={market.signal}
                currentPrice={market.current_price}
                unit={market.unit}
              />
            )
          ))}
        </div>
      </div>
    </div>
  );
}
