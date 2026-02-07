'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

interface SignalData {
  success: boolean;
  signal: 'BUY' | 'WAIT' | 'HOLD';
  confidence: number;
  reason: string;
  recommendation: string;
  priceContext: { current: number; avg30d: number; avg90d: number; percentile: number };
  contractComparison: { fixedRate: number; flexibleEstimate: number; fixedPremium: string; potentialSavings: string | null };
  lastUpdated: string;
}

export default function SignalsPage() {
  const [data, setData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/signals').then(res => res.json()).then(setData).finally(() => setLoading(false));
  }, []);

  const signalConfig = {
    BUY: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', icon: '🟢' },
    WAIT: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', icon: '🟡' },
    HOLD: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', icon: '🔵' }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fb8a99]"></div>
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="text-[#fb8a99] p-4 bg-[#fb8a99]/20 rounded-xl">Unable to load signals</div>
      </AppLayout>
    );
  }

  const config = signalConfig[data.signal];

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-white">🎯 Trading Signals</h1>

        {/* Main Signal */}
        <div className={`rounded-xl border-2 ${config.border} ${config.bg} p-5`}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{config.icon}</span>
            <div>
              <div className={`text-4xl font-bold ${config.text}`}>{data.signal}</div>
              <div className="text-slate-400">{Math.round(data.confidence * 100)}% confidence</div>
            </div>
          </div>
          <p className={`text-lg ${config.text} mb-3`}>{data.reason}</p>
          <div className="bg-slate-800/70 rounded-lg p-4">
            <p className="text-slate-300">💡 {data.recommendation}</p>
          </div>
        </div>

        {/* Price Stats */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h2 className="font-semibold text-white mb-3">📊 Price Analysis</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Current</span>
              <span className="font-bold text-lg text-white">£{data.priceContext.current}/MWh</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">30-Day Avg</span>
              <span className="font-medium text-slate-200">£{data.priceContext.avg30d}/MWh</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Percentile</span>
              <span className={`font-bold ${
                data.priceContext.percentile < 30 ? 'text-green-400' :
                data.priceContext.percentile > 70 ? 'text-[#fb8a99]' : 'text-yellow-400'
              }`}>{data.priceContext.percentile}th</span>
            </div>
          </div>

          {/* Percentile Bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-700 rounded-full h-4 relative">
              <div 
                className={`h-4 rounded-full ${
                  data.priceContext.percentile < 30 ? 'bg-green-500' :
                  data.priceContext.percentile > 70 ? 'bg-[#fb8a99]' : 'bg-yellow-500'
                }`}
                style={{ width: `${data.priceContext.percentile}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        </div>

        {/* Contract Comparison */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h2 className="font-semibold text-white mb-3">⚖️ Contracts</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400">Fixed</div>
              <div className="text-xl font-bold text-white">£{data.contractComparison.fixedRate}</div>
              <div className="text-xs text-slate-500">+{data.contractComparison.fixedPremium}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400">Flexible Est.</div>
              <div className="text-xl font-bold text-white">£{data.contractComparison.flexibleEstimate}</div>
              <div className="text-xs text-slate-500">varies</div>
            </div>
          </div>
          {data.contractComparison.potentialSavings && (
            <div className="mt-3 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
              <span className="text-green-400 text-sm font-medium">
                💰 {data.contractComparison.potentialSavings}
              </span>
            </div>
          )}
        </div>

        {/* Signal Guide */}
        <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-4">
          <h3 className="font-semibold text-white mb-2">📚 Signal Guide</h3>
          <div className="text-sm text-slate-400 space-y-2">
            <p><strong className="text-green-400">BUY</strong> - Bottom 25%, lock in rates</p>
            <p><strong className="text-yellow-400">WAIT</strong> - Top 25% or falling, hold off</p>
            <p><strong className="text-blue-400">HOLD</strong> - Mid-range, flexible approach</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
