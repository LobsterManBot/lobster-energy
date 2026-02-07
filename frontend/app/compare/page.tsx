'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

interface SignalData {
  priceContext: { current: number; avg30d: number; avg90d: number; percentile: number };
  contractComparison: { fixedRate: number; flexibleEstimate: number };
}

export default function ComparePage() {
  const [data, setData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [annualMWh, setAnnualMWh] = useState(8760);

  useEffect(() => {
    fetch('/api/signals').then(res => res.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fb8a99]"></div>
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="text-[#fb8a99] p-4 bg-[#fb8a99]/20 rounded-xl">Unable to load data</div>
      </AppLayout>
    );
  }

  const fixedCost = data.contractComparison.fixedRate * annualMWh;
  const flexibleCost = data.contractComparison.flexibleEstimate * annualMWh;
  const difference = fixedCost - flexibleCost;
  const percentDiff = ((difference / flexibleCost) * 100).toFixed(1);

  const scenarios = [
    { name: 'Prices drop 15%', flexMultiplier: 0.85 },
    { name: 'Prices stable', flexMultiplier: 1.0 },
    { name: 'Prices rise 15%', flexMultiplier: 1.15 },
    { name: 'Prices spike 30%', flexMultiplier: 1.30 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">⚖️ Contract Comparison</h1>
          <p className="text-slate-400 text-sm mt-1">Fixed vs Flexible energy contract analysis</p>
        </div>

        {/* Usage Input */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h2 className="font-semibold text-white mb-3">📊 Your Usage</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full">
              <input
                type="number"
                value={annualMWh}
                onChange={(e) => setAnnualMWh(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-[#fb8a99] focus:border-[#fb8a99]"
                placeholder="Annual MWh"
              />
            </div>
            <div className="flex gap-2">
              {[{ label: '1 MW', value: 8760 }, { label: '5 MW', value: 43800 }, { label: '10 MW', value: 87600 }].map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setAnnualMWh(preset.value)}
                  className="px-3 py-2 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🔒</span>
              <h2 className="font-semibold text-white">Fixed Contract</h2>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              £{(fixedCost / 1000).toFixed(0)}k<span className="text-lg font-normal text-slate-400">/year</span>
            </div>
            <div className="text-slate-400 mb-4">at £{data.contractComparison.fixedRate.toFixed(2)}/MWh</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-green-400"><span>✓</span> Price certainty</div>
              <div className="flex items-center gap-2 text-green-400"><span>✓</span> Spike protection</div>
              <div className="flex items-center gap-2 text-yellow-400"><span>⚠</span> ~8% premium</div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📈</span>
              <h2 className="font-semibold text-white">Flexible Contract</h2>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              £{(flexibleCost / 1000).toFixed(0)}k<span className="text-lg font-normal text-slate-400">/year*</span>
            </div>
            <div className="text-slate-400 mb-4">at £{data.contractComparison.flexibleEstimate.toFixed(2)}/MWh (est.)</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-green-400"><span>✓</span> Benefit from drops</div>
              <div className="flex items-center gap-2 text-green-400"><span>✓</span> Lower avg cost</div>
              <div className="flex items-center gap-2 text-[#fb8a99]"><span>✗</span> Spike exposure</div>
            </div>
          </div>
        </div>

        {/* Difference */}
        <div className={`rounded-xl border-2 p-5 text-center ${
          difference > 0 ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-green-500/20 border-green-500/50'
        }`}>
          <div className="text-slate-300 mb-1">
            {difference > 0 ? 'Fixed costs more by' : 'Fixed saves you'}
          </div>
          <div className={`text-4xl font-bold ${difference > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            £{Math.abs(difference / 1000).toFixed(0)}k/year
          </div>
          <div className="text-slate-400 text-sm mt-1">
            ({difference > 0 ? '+' : ''}{percentDiff}% vs flexible)
          </div>
        </div>

        {/* Scenario Analysis */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="font-semibold text-white">🎯 Scenario Analysis</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Scenario</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Fixed</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Flexible</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Winner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {scenarios.map((scenario) => {
                  const scenarioFlex = flexibleCost * scenario.flexMultiplier;
                  const diff = fixedCost - scenarioFlex;
                  const winner = diff > 0 ? 'Flexible' : 'Fixed';
                  return (
                    <tr key={scenario.name} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm text-white">{scenario.name}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-300">£{(fixedCost / 1000).toFixed(0)}k</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-300">£{(scenarioFlex / 1000).toFixed(0)}k</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          winner === 'Fixed' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                        }`}>{winner}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendation */}
        <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-4">
          <h3 className="font-semibold text-white mb-2">💡 Tranche Strategy</h3>
          <p className="text-sm text-slate-400">
            Consider a <strong className="text-white">tranche buying strategy</strong>: purchase in portions 
            (e.g., 25% at a time) when prices are favorable. Use our signals page to time purchases.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
