'use client';

import { useEffect, useState } from 'react';
import PriceChart from '@/components/PriceChart';
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';

interface Forecast {
  date: string;
  predicted_price: number;
  confidence: number;
  lower_bound: number;
  upper_bound: number;
}

interface ForecastData {
  market: string;
  generated_at: string;
  horizon_days: number;
  current_price: number;
  forecast: Forecast[];
  feature_importance: Record<string, number>;
}

export default function ForecastPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState('uk_dayahead');
  const [horizon, setHorizon] = useState(30);

  useEffect(() => {
    fetchForecast();
  }, [market, horizon]);

  async function fetchForecast() {
    setLoading(true);
    try {
      const res = await fetch(`/api/predictions/forecast?market=${market}&horizon_days=${horizon}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch forecast:', e);
    } finally {
      setLoading(false);
    }
  }

  const avgPredicted = data?.forecast 
    ? data.forecast.reduce((sum, f) => sum + f.predicted_price, 0) / data.forecast.length
    : 0;

  const minPredicted = data?.forecast
    ? Math.min(...data.forecast.map(f => f.predicted_price))
    : 0;

  const maxPredicted = data?.forecast
    ? Math.max(...data.forecast.map(f => f.predicted_price))
    : 0;

  const priceChange = data?.current_price && avgPredicted
    ? ((avgPredicted - data.current_price) / data.current_price * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Price Forecast</h1>
        <p className="text-gray-500 mt-1">AI-powered price predictions</p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Market</label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="uk_dayahead">UK Day-Ahead</option>
            <option value="uk_peak">UK Peak</option>
            <option value="gas_nbp">UK NBP Gas</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horizon</label>
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lobster-600"></div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500 mb-1">Current Price</div>
              <div className="text-2xl font-bold text-gray-900">
                £{data?.current_price?.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500 mb-1">Avg Forecast</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  £{avgPredicted.toFixed(2)}
                </span>
                {priceChange > 0 ? (
                  <TrendingUp className="w-5 h-5 text-red-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className={`text-sm ${priceChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500 mb-1">Forecast Range</div>
              <div className="text-2xl font-bold text-gray-900">
                £{minPredicted.toFixed(0)} - £{maxPredicted.toFixed(0)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm text-gray-500 mb-1">Avg Confidence</div>
              <div className="text-2xl font-bold text-gray-900">
                {data?.forecast 
                  ? Math.round(data.forecast.reduce((sum, f) => sum + f.confidence, 0) / data.forecast.length * 100)
                  : 0}%
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Historical + Forecast
            </h2>
            <PriceChart market={market} showForecast={true} />
          </div>

          {/* Forecast Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Daily Forecast</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Predicted</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Range</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.forecast.slice(0, 14).map((f, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(f.date).toLocaleDateString('en-GB', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        £{f.predicted_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        £{f.lower_bound.toFixed(0)} - £{f.upper_bound.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          f.confidence > 0.8 
                            ? 'bg-green-100 text-green-800'
                            : f.confidence > 0.6
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {Math.round(f.confidence * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feature Importance */}
          {data?.feature_importance && Object.keys(data.feature_importance).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <BarChart3 className="inline w-5 h-5 mr-2" />
                Key Prediction Factors
              </h2>
              <div className="space-y-3">
                {Object.entries(data.feature_importance).slice(0, 5).map(([feature, importance]) => (
                  <div key={feature}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{feature.replace(/_/g, ' ')}</span>
                      <span className="text-gray-900 font-medium">{(importance * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-lobster-500 rounded-full"
                        style={{ width: `${importance * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
