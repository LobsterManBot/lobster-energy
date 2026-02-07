'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

interface BacktestData {
  success: boolean;
  period: { start: string; end: string; tradingDays: number };
  signalStrategy: { avgPrice: number; buyDays: number; skipDays: number };
  naiveStrategy: { avgPrice: number; buyDays: number };
  comparison: { savings: number; savingsPercent: number; annualSavingsPerMW: number; verdict: string };
  recentTrades: { date: string; price: number; signal: string; action: string }[];
}

export default function BacktestPage() {
  const [data, setData] = useState<BacktestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [consumption, setConsumption] = useState(1);

  useEffect(() => {
    fetch('/api/backtest').then(res => res.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
        </div>
      </AppLayout>
    );
  }

  if (!data?.success) {
    return (
      <AppLayout>
        <div className="text-red-400 p-4 bg-red-500/20 rounded-xl">Failed to load backtest</div>
      </AppLayout>
    );
  }

  const outperformed = data.comparison.savings > 0;
  const annualSavings = data.comparison.annualSavingsPerMW * consumption;
  const monthlySavings = Math.round(annualSavings / 12);
  const testPeriodSavings = Math.round(data.comparison.savings * 24 * data.period.tradingDays * consumption);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-white">📊 Backtest Results</h1>
          <p className="text-sm text-slate-400">{data.period.start} to {data.period.end}</p>
        </div>

        {/* THE BIG NUMBER */}
        <div className={`rounded-xl border-2 p-6 text-center ${
          outperformed ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'
        }`}>
          <div className="text-sm text-slate-300 mb-1">Following our signals, you would have saved</div>
          <div className={`text-5xl font-bold mb-2 ${outperformed ? 'text-green-400' : 'text-red-400'}`}>
            £{annualSavings.toLocaleString()}
          </div>
          <div className="text-lg text-slate-300">per year</div>
          <div className="text-sm text-slate-400 mt-2">
            (£{monthlySavings.toLocaleString()}/month • {data.comparison.savingsPercent.toFixed(1)}% less)
          </div>
        </div>

        {/* Consumption Slider */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-400">Your consumption</span>
            <span className="font-bold text-lg text-white">{consumption} MW</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={consumption}
            onChange={(e) => setConsumption(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0.5 MW</span>
            <span>10 MW</span>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-blue-500/20 rounded-xl border border-blue-500/30 p-4">
          <h3 className="font-semibold text-blue-300 mb-2">📈 How We Beat The Market</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-blue-300 font-medium">Signal Strategy</div>
              <div className="text-2xl font-bold text-white">£{data.signalStrategy.avgPrice}/MWh</div>
              <div className="text-blue-400">{data.signalStrategy.buyDays} buys, {data.signalStrategy.skipDays} skipped</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Buying Daily</div>
              <div className="text-2xl font-bold text-slate-300">£{data.naiveStrategy.avgPrice}/MWh</div>
              <div className="text-slate-500">{data.naiveStrategy.buyDays} buys</div>
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-3 border-b border-slate-700">
            <h2 className="font-semibold text-white text-sm">Trade History</h2>
          </div>
          <div className="divide-y divide-slate-700 max-h-64 overflow-y-auto">
            {data.recentTrades.map((trade, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div>
                  <div className="text-sm font-medium text-white">{trade.date}</div>
                  <div className="text-xs text-slate-500">£{trade.price}/MWh</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    trade.signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
                    trade.signal === 'WAIT' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{trade.signal}</span>
                  {trade.action.includes('BOUGHT') ? (
                    <span className="text-green-400">✓</span>
                  ) : (
                    <span className="text-slate-500">✗</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-4 text-xs text-slate-500">
          <strong>Note:</strong> Past performance doesn't guarantee future results. 
          Based on {data.period.tradingDays} days of UK wholesale prices.
        </div>
      </div>
    </AppLayout>
  );
}
