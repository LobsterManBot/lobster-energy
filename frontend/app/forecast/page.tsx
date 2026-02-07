'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

interface ForecastData {
  success: boolean;
  product: string;
  horizon: string;
  current: number;
  model: string;
  summary: {
    avgPredicted: number;
    minPredicted: number;
    maxPredicted: number;
    direction: string;
    percentChange: number;
  };
  forecast: Array<{
    date: string;
    predicted: number;
    confidence: number;
    lower: number;
    upper: number;
  }>;
  lastUpdated: string;
}

export default function ForecastPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState(30);

  useEffect(() => {
    fetchForecast();
  }, [horizon]);

  async function fetchForecast() {
    setLoading(true);
    try {
      const res = await fetch(`/api/predictions?horizon=${horizon}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch forecast:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📈 Price Forecast</h1>
            <p className="text-slate-400 text-sm mt-1">
              {data?.model} • Updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'N/A'}
            </p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setHorizon(d)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  horizon === d
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {data?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="text-slate-400 text-sm mb-1">Current</div>
              <div className="text-2xl font-bold text-white">£{data.current}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="text-slate-400 text-sm mb-1">Predicted Avg</div>
              <div className="text-2xl font-bold text-white">£{data.summary.avgPredicted}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="text-slate-400 text-sm mb-1">Range</div>
              <div className="text-xl font-bold text-white">
                £{data.summary.minPredicted}-{data.summary.maxPredicted}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="text-slate-400 text-sm mb-1">Expected</div>
              <div className={`text-2xl font-bold flex items-center gap-2 ${
                data.summary.percentChange > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {data.summary.direction === 'up' ? '↗' : data.summary.direction === 'down' ? '↘' : '→'}
                {data.summary.percentChange > 0 ? '+' : ''}{data.summary.percentChange}%
              </div>
            </div>
          </div>
        )}

        {/* Forecast Table */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="font-semibold text-white">Daily Forecast</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Date</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Predicted</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Range</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {data?.forecast.slice(0, 14).map((day, i) => (
                  <tr key={i} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-sm text-white">
                      {new Date(day.date).toLocaleDateString('en-GB', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-white">
                      £{day.predicted.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-400">
                      £{day.lower.toFixed(2)} - £{day.upper.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${day.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-slate-400 w-12">
                          {Math.round(day.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-4">
          <h3 className="font-semibold text-white mb-2">📊 Methodology</h3>
          <p className="text-sm text-slate-400">
            Forecasts use a trend + seasonality model trained on 90 days of BMRS market index data. 
            Confidence intervals widen over time as uncertainty increases.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
