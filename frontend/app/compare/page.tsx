'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Calculator } from 'lucide-react';

interface ComparisonResult {
  recommendation: string;
  confidence: number;
  reason: string;
  fixed_rate: number;
  fixed_annual_cost: number;
  flexible_expected: number;
  flexible_expected_annual: number;
  flexible_best_case: number;
  flexible_worst_case: number;
  savings_potential_pct: number;
  risk_pct: number;
  contract_years: number;
  annual_volume_mwh: number;
}

export default function ComparePage() {
  const [fixedRate, setFixedRate] = useState(85);
  const [annualVolume, setAnnualVolume] = useState(10000);
  const [contractYears, setContractYears] = useState(1);
  const [market, setMarket] = useState('uk_dayahead');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  async function runComparison() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fixed_rate: fixedRate.toString(),
        annual_volume: annualVolume.toString(),
        contract_years: contractYears.toString(),
        market: market,
      });
      
      const res = await fetch(`/api/predictions/compare-contracts?${params}`);
      if (res.ok) {
        const json = await res.json();
        setResult(json);
      }
    } catch (e) {
      console.error('Comparison failed:', e);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fixed vs Flexible Analysis</h1>
        <p className="text-gray-500 mt-1">
          Compare contract options based on AI predictions
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contract Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fixed Rate Offer (£/MWh)
            </label>
            <input
              type="number"
              value={fixedRate}
              onChange={(e) => setFixedRate(Number(e.target.value))}
              className="w-full border rounded-lg px-4 py-2"
              min={0}
              step={0.5}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual Volume (MWh)
            </label>
            <input
              type="number"
              value={annualVolume}
              onChange={(e) => setAnnualVolume(Number(e.target.value))}
              className="w-full border rounded-lg px-4 py-2"
              min={0}
              step={100}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Duration
            </label>
            <select
              value={contractYears}
              onChange={(e) => setContractYears(Number(e.target.value))}
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value={1}>1 Year</option>
              <option value={2}>2 Years</option>
              <option value={3}>3 Years</option>
            </select>
          </div>
          
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
        </div>

        <button
          onClick={runComparison}
          disabled={loading}
          className="mt-6 px-6 py-3 bg-lobster-600 text-white rounded-lg font-medium hover:bg-lobster-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Calculator className="w-5 h-5" />
          {loading ? 'Analyzing...' : 'Compare Options'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Recommendation Banner */}
          <div className={`rounded-xl p-6 ${
            result.recommendation === 'FLEXIBLE' 
              ? 'bg-green-50 border-2 border-green-200'
              : result.recommendation === 'FIXED'
              ? 'bg-blue-50 border-2 border-blue-200'
              : 'bg-yellow-50 border-2 border-yellow-200'
          }`}>
            <div className="flex items-start gap-4">
              {result.recommendation === 'FLEXIBLE' ? (
                <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
              ) : result.recommendation === 'FIXED' ? (
                <CheckCircle className="w-8 h-8 text-blue-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Recommendation: {result.recommendation}
                </h3>
                <p className="text-gray-700 mt-1">{result.reason}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Confidence:</span>
                  <span className="font-semibold">{Math.round(result.confidence * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fixed Contract */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                Fixed Contract
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Fixed Rate</div>
                  <div className="text-2xl font-bold text-gray-900">
                    £{result.fixed_rate.toFixed(2)}/MWh
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Annual Cost</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(result.fixed_annual_cost)}
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-500">Pros</div>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    <li>✓ Price certainty for budgeting</li>
                    <li>✓ No market exposure risk</li>
                    <li>✓ Simple to manage</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Flexible Contract */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                Flexible Purchasing
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Expected Average Rate</div>
                  <div className="text-2xl font-bold text-gray-900">
                    £{result.flexible_expected.toFixed(2)}/MWh
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Expected Annual Cost</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(result.flexible_expected_annual)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Best Case</div>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(result.flexible_best_case)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Worst Case</div>
                    <div className="font-semibold text-red-600">
                      {formatCurrency(result.flexible_worst_case)}
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-500">Trade-offs</div>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    <li>✓ Potential savings of {result.savings_potential_pct.toFixed(1)}%</li>
                    <li>✓ Market timing opportunities</li>
                    <li>⚠ {result.risk_pct.toFixed(1)}% downside risk</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Potential Savings</div>
                <div className={`text-xl font-bold ${
                  result.savings_potential_pct > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.savings_potential_pct > 0 ? '+' : ''}
                  {formatCurrency(result.fixed_annual_cost - result.flexible_expected_annual)}
                </div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Savings %</div>
                <div className={`text-xl font-bold ${
                  result.savings_potential_pct > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.savings_potential_pct > 0 ? '+' : ''}
                  {result.savings_potential_pct.toFixed(1)}%
                </div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Downside Risk</div>
                <div className="text-xl font-bold text-gray-900">
                  {result.risk_pct.toFixed(1)}%
                </div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Max Downside</div>
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(result.flexible_worst_case - result.fixed_annual_cost)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
