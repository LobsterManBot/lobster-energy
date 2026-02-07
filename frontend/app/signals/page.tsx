'use client';

import { useEffect, useState } from 'react';
import SignalCard from '@/components/SignalCard';
import { RefreshCw, AlertTriangle, TrendingUp, Clock, ShoppingCart } from 'lucide-react';

interface Recommendation {
  action: string;
  percentage: number;
  reason: string;
  target_price: number;
  urgency: string;
  volume_mwh?: number;
  estimated_cost?: number;
  delivery_period?: string;
}

interface SignalData {
  signal_id: number;
  market: string;
  generated_at: string;
  signal: string;
  strength: number;
  reason: string;
  current_price: number;
  forecast_7d: number;
  forecast_14d: number;
  forecast_30d: number;
  confidence: number;
  recommendations: Recommendation[];
}

export default function SignalsPage() {
  const [signal, setSignal] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState('uk_dayahead');
  const [deliveryPeriod, setDeliveryPeriod] = useState('Q2-2026');
  const [volume, setVolume] = useState(1000);

  useEffect(() => {
    fetchSignals();
  }, [market]);

  async function fetchSignals() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        market: market,
        delivery_period: deliveryPeriod,
        volume_mwh: volume.toString(),
      });
      
      const res = await fetch(`/api/signals/recommendations?${params}`);
      if (res.ok) {
        const json = await res.json();
        setSignal(json);
      }
    } catch (e) {
      console.error('Failed to fetch signals:', e);
    } finally {
      setLoading(false);
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toUpperCase()) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trading Signals</h1>
          <p className="text-gray-500 mt-1">
            AI-powered buy/wait recommendations
          </p>
        </div>
        <button
          onClick={fetchSignals}
          disabled={loading}
          className="px-4 py-2 bg-lobster-600 text-white rounded-lg font-medium hover:bg-lobster-700 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Market
            </label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="uk_dayahead">UK Day-Ahead</option>
              <option value="uk_peak">UK Peak</option>
              <option value="gas_nbp">UK NBP Gas</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Period
            </label>
            <select
              value={deliveryPeriod}
              onChange={(e) => setDeliveryPeriod(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="Q1-2026">Q1 2026</option>
              <option value="Q2-2026">Q2 2026</option>
              <option value="Q3-2026">Q3 2026</option>
              <option value="Q4-2026">Q4 2026</option>
              <option value="2027">Full Year 2027</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Volume (MWh)
            </label>
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full border rounded-lg px-4 py-2"
              min={0}
              step={100}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lobster-600"></div>
        </div>
      ) : signal ? (
        <>
          {/* Main Signal */}
          <div className={`rounded-xl p-6 border-2 ${
            signal.signal === 'BUY' 
              ? 'bg-green-50 border-green-300'
              : signal.signal === 'WAIT'
              ? 'bg-yellow-50 border-yellow-300'
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-4xl font-bold ${
                  signal.signal === 'BUY' ? 'text-green-600'
                  : signal.signal === 'WAIT' ? 'text-yellow-600'
                  : 'text-gray-600'
                }`}>
                  {signal.signal}
                </span>
                <div>
                  <div className="text-sm text-gray-500">Signal Strength</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          signal.signal === 'BUY' ? 'bg-green-500'
                          : signal.signal === 'WAIT' ? 'bg-yellow-500'
                          : 'bg-gray-500'
                        }`}
                        style={{ width: `${signal.strength * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(signal.strength * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Confidence</div>
                <div className="text-xl font-bold text-gray-900">
                  {Math.round(signal.confidence * 100)}%
                </div>
              </div>
            </div>
            <p className="text-gray-700">{signal.reason}</p>
          </div>

          {/* Price Forecasts */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500 mb-1">Current Price</div>
              <div className="text-2xl font-bold text-gray-900">
                £{signal.current_price?.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500 mb-1">7-Day Forecast</div>
              <div className={`text-2xl font-bold ${
                signal.forecast_7d > signal.current_price ? 'text-red-600' : 'text-green-600'
              }`}>
                £{signal.forecast_7d?.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500 mb-1">14-Day Forecast</div>
              <div className={`text-2xl font-bold ${
                signal.forecast_14d > signal.current_price ? 'text-red-600' : 'text-green-600'
              }`}>
                £{signal.forecast_14d?.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500 mb-1">30-Day Forecast</div>
              <div className={`text-2xl font-bold ${
                signal.forecast_30d > signal.current_price ? 'text-red-600' : 'text-green-600'
              }`}>
                £{signal.forecast_30d?.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Tranche Recommendations */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Tranche Recommendations for {deliveryPeriod}
            </h2>
            
            <div className="space-y-4">
              {signal.recommendations?.map((rec, i) => (
                <div 
                  key={i}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full font-bold text-sm ${
                        rec.action.includes('BUY') 
                          ? 'bg-green-100 text-green-800'
                          : rec.action.includes('WAIT')
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {rec.action}
                      </span>
                      <span className="text-lg font-semibold text-gray-900">
                        {rec.percentage}% of volume
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getUrgencyColor(rec.urgency)}`}>
                      {rec.urgency} URGENCY
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{rec.reason}</p>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Target Price:</span>
                      <span className="ml-2 font-semibold">£{rec.target_price?.toFixed(2)}/MWh</span>
                    </div>
                    {rec.volume_mwh && (
                      <div>
                        <span className="text-gray-500">Volume:</span>
                        <span className="ml-2 font-semibold">{rec.volume_mwh.toLocaleString()} MWh</span>
                      </div>
                    )}
                    {rec.estimated_cost && (
                      <div>
                        <span className="text-gray-500">Est. Cost:</span>
                        <span className="ml-2 font-semibold">
                          £{rec.estimated_cost.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-yellow-700">
            No signals available. Train the model first with historical data.
          </p>
        </div>
      )}
    </div>
  );
}
