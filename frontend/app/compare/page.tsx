'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

interface SignalData {
  priceContext: { current: number; avg30d: number; avg90d: number; percentile: number };
  contractComparison: { fixedRate: number; flexibleEstimate: number };
}

// Non-commodity cost components (£/MWh estimates for 2024/25)
const nonCommodityCosts = {
  network: {
    TNUoS: 12.50,  // Transmission
    DUoS: 18.00,   // Distribution
    BSUoS: 3.50,   // Balancing
  },
  policy: {
    RO: 8.00,      // Renewables Obligation
    FiT: 2.50,     // Feed-in Tariff
    CfD: 6.00,     // Contracts for Difference
    CM: 4.00,      // Capacity Market
  },
  tax: {
    CCL: 7.70,     // Climate Change Levy (per MWh)
  }
};

const nonCommodityProfiles = {
  low: { label: 'Low (HH metered, good load factor)', multiplier: 0.75 },
  medium: { label: 'Medium (typical SME)', multiplier: 1.0 },
  high: { label: 'High (small sites, poor load factor)', multiplier: 1.25 },
};

export default function ComparePage() {
  const [data, setData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [annualMWh, setAnnualMWh] = useState(8760);
  const [nonCommodityProfile, setNonCommodityProfile] = useState<'low' | 'medium' | 'high'>('medium');
  const [showNonCommodityBreakdown, setShowNonCommodityBreakdown] = useState(false);

  // Calculate total non-commodity cost per MWh
  const baseNonCommodity = 
    Object.values(nonCommodityCosts.network).reduce((a, b) => a + b, 0) +
    Object.values(nonCommodityCosts.policy).reduce((a, b) => a + b, 0) +
    Object.values(nonCommodityCosts.tax).reduce((a, b) => a + b, 0);
  
  const nonCommodityPerMWh = baseNonCommodity * nonCommodityProfiles[nonCommodityProfile].multiplier;

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

  // Commodity costs
  const fixedCommodity = data.contractComparison.fixedRate * annualMWh;
  const flexibleCommodity = data.contractComparison.flexibleEstimate * annualMWh;
  
  // Non-commodity costs (same for both contract types)
  const nonCommodityTotal = nonCommodityPerMWh * annualMWh;
  
  // Total costs
  const fixedTotal = fixedCommodity + nonCommodityTotal;
  const flexibleTotal = flexibleCommodity + nonCommodityTotal;
  
  // Difference (only commodity differs)
  const difference = fixedCommodity - flexibleCommodity;
  const percentDiff = ((difference / flexibleCommodity) * 100).toFixed(1);
  
  // For display
  const commodityPercent = ((fixedCommodity / fixedTotal) * 100).toFixed(0);
  const nonCommodityPercent = ((nonCommodityTotal / fixedTotal) * 100).toFixed(0);

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

        {/* Non-Commodity Costs */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">🏭 Non-Commodity Costs</h2>
            <button
              onClick={() => setShowNonCommodityBreakdown(!showNonCommodityBreakdown)}
              className="text-sm text-[#fb8a99] hover:text-[#fb8a99]/80"
            >
              {showNonCommodityBreakdown ? 'Hide breakdown' : 'Show breakdown'}
            </button>
          </div>
          
          {/* Profile selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(Object.keys(nonCommodityProfiles) as Array<'low' | 'medium' | 'high'>).map((profile) => (
              <button
                key={profile}
                onClick={() => setNonCommodityProfile(profile)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  nonCommodityProfile === profile
                    ? 'bg-[#fb8a99] text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {profile.charAt(0).toUpperCase() + profile.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mb-3">{nonCommodityProfiles[nonCommodityProfile].label}</p>
          
          {/* Summary */}
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg mb-3">
            <span className="text-slate-300">Non-commodity rate</span>
            <span className="text-white font-semibold">£{nonCommodityPerMWh.toFixed(2)}/MWh</span>
          </div>
          
          {/* Detailed breakdown */}
          {showNonCommodityBreakdown && (
            <div className="space-y-4 mt-4 pt-4 border-t border-slate-700">
              {/* Network Charges */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">⚡ Network Charges</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">TNUoS (Transmission)</span>
                    <span className="text-slate-300">£{(nonCommodityCosts.network.TNUoS * nonCommodityProfiles[nonCommodityProfile].multiplier).toFixed(2)}/MWh</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">DUoS (Distribution)</span>
                    <span className="text-slate-300">£{(nonCommodityCosts.network.DUoS * nonCommodityProfiles[nonCommodityProfile].multiplier).toFixed(2)}/MWh</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">BSUoS (Balancing)</span>
                    <span className="text-slate-300">£{(nonCommodityCosts.network.BSUoS * nonCommodityProfiles[nonCommodityProfile].multiplier).toFixed(2)}/MWh</span>
                  </div>
                </div>
              </div>
              
              {/* Policy Costs */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">🌱 Policy Costs</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">RO (Renewables Obligation)</span>
                    <span className="text-slate-300">£{(nonCommodityCosts.policy.RO * nonCommodityProfiles[nonCommodityProfile].multiplier).toFixed(2)}/MWh</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">FiT (Feed-in Tariff)</span>
                    <span className="text-slate-300">£{(nonCommodityCosts.policy.FiT * nonCommodityProfiles[nonCommodityProfile].multiplier).toFixed(2)}/MWh</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">CfD (Contracts for Difference)</span>
                    <span className="text-slate-300">£{(nonCommodityCosts.policy.CfD * nonCommodityProfiles[nonCommodityProfile].multiplier).toFixed(2)}/MWh</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">CM (Capacity Market)</span>
                    <span className="text-slate-300">£{(nonCommodityCosts.policy.CM * nonCommodityProfiles[nonCommodityProfile].multiplier).toFixed(2)}/MWh</span>
                  </div>
                </div>
              </div>
              
              {/* Taxes */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">💷 Taxes & Levies</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">CCL (Climate Change Levy)</span>
                    <span className="text-slate-300">£{(nonCommodityCosts.tax.CCL * nonCommodityProfiles[nonCommodityProfile].multiplier).toFixed(2)}/MWh</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>VAT (20% on total - not included)</span>
                    <span>Varies</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🔒</span>
              <h2 className="font-semibold text-white">Fixed Contract</h2>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              £{(fixedTotal / 1000).toFixed(0)}k<span className="text-lg font-normal text-slate-400">/year</span>
            </div>
            <div className="text-slate-400 text-sm mb-3">Total cost incl. non-commodity</div>
            
            {/* Cost breakdown bar */}
            <div className="mb-4">
              <div className="flex h-3 rounded-full overflow-hidden bg-slate-700">
                <div 
                  className="bg-[#fb8a99]" 
                  style={{ width: `${commodityPercent}%` }}
                  title="Commodity"
                />
                <div 
                  className="bg-slate-500" 
                  style={{ width: `${nonCommodityPercent}%` }}
                  title="Non-commodity"
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-[#fb8a99]">Commodity £{(fixedCommodity / 1000).toFixed(0)}k ({commodityPercent}%)</span>
                <span className="text-slate-400">Non-comm £{(nonCommodityTotal / 1000).toFixed(0)}k</span>
              </div>
            </div>
            
            <div className="text-slate-400 text-sm mb-4">Commodity rate: £{data.contractComparison.fixedRate.toFixed(2)}/MWh</div>
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
            <div className="text-3xl font-bold text-white mb-1">
              £{(flexibleTotal / 1000).toFixed(0)}k<span className="text-lg font-normal text-slate-400">/year*</span>
            </div>
            <div className="text-slate-400 text-sm mb-3">Total cost incl. non-commodity</div>
            
            {/* Cost breakdown bar */}
            <div className="mb-4">
              <div className="flex h-3 rounded-full overflow-hidden bg-slate-700">
                <div 
                  className="bg-green-500" 
                  style={{ width: `${((flexibleCommodity / flexibleTotal) * 100).toFixed(0)}%` }}
                  title="Commodity"
                />
                <div 
                  className="bg-slate-500" 
                  style={{ width: `${((nonCommodityTotal / flexibleTotal) * 100).toFixed(0)}%` }}
                  title="Non-commodity"
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-green-400">Commodity £{(flexibleCommodity / 1000).toFixed(0)}k ({((flexibleCommodity / flexibleTotal) * 100).toFixed(0)}%)</span>
                <span className="text-slate-400">Non-comm £{(nonCommodityTotal / 1000).toFixed(0)}k</span>
              </div>
            </div>
            
            <div className="text-slate-400 text-sm mb-4">Commodity rate: £{data.contractComparison.flexibleEstimate.toFixed(2)}/MWh (est.)</div>
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
            {difference > 0 ? 'Fixed commodity costs more by' : 'Fixed saves you'}
          </div>
          <div className={`text-4xl font-bold ${difference > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            £{Math.abs(difference / 1000).toFixed(0)}k/year
          </div>
          <div className="text-slate-400 text-sm mt-1">
            ({difference > 0 ? '+' : ''}{percentDiff}% commodity difference)
          </div>
          <div className="text-slate-500 text-xs mt-2">
            Non-commodity costs (£{(nonCommodityTotal / 1000).toFixed(0)}k) are the same for both contract types
          </div>
        </div>

        {/* Scenario Analysis */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="font-semibold text-white">🎯 Scenario Analysis</h2>
            <p className="text-xs text-slate-400 mt-1">Scenarios affect commodity costs only — non-commodity (£{(nonCommodityTotal / 1000).toFixed(0)}k) stays fixed</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Scenario</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Fixed Total</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Flexible Total</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Difference</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Winner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {scenarios.map((scenario) => {
                  const scenarioFlexCommodity = flexibleCommodity * scenario.flexMultiplier;
                  const scenarioFlexTotal = scenarioFlexCommodity + nonCommodityTotal;
                  const diff = fixedTotal - scenarioFlexTotal;
                  const winner = diff > 0 ? 'Flexible' : 'Fixed';
                  return (
                    <tr key={scenario.name} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm text-white">{scenario.name}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-300">£{(fixedTotal / 1000).toFixed(0)}k</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-300">£{(scenarioFlexTotal / 1000).toFixed(0)}k</td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={diff > 0 ? 'text-green-400' : 'text-yellow-400'}>
                          {diff > 0 ? '-' : '+'}£{Math.abs(diff / 1000).toFixed(0)}k
                        </span>
                      </td>
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
