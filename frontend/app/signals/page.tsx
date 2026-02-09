'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface SignalData {
  success: boolean;
  signal: 'BUY' | 'WAIT' | 'HOLD';
  confidence: number;
  reason: string;
  recommendation: string;
  priceContext: { current: number; avg30d: number; avg90d: number; percentile: number };
  contractComparison: { fixedRate: number; flexibleEstimate: number; fixedPremium: string; potentialSavings: string | null };
  lastUpdated: string;
  priceHistory?: { date: string; price: number }[];
}

export default function SignalsPage() {
  const [data, setData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [signalRes, historyRes] = await Promise.all([
        fetch('/api/signals').then(r => r.json()),
        fetch('/api/market').then(r => r.json()).catch(() => ({ prices: [] }))
      ]);
      
      setData({
        ...signalRes,
        priceHistory: historyRes.prices?.slice(-30).map((p: any) => ({
          date: new Date(p.timestamp || p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          price: p.price || p.value
        })) || []
      });
      setLoading(false);
    }
    loadData();
  }, []);

  const signalConfig = {
    BUY: { 
      bg: 'from-green-500/20 to-green-600/10', 
      border: 'border-green-500/50', 
      text: 'text-green-400', 
      glow: 'shadow-green-500/20',
      icon: '📈',
      label: 'BUY NOW'
    },
    WAIT: { 
      bg: 'from-amber-500/20 to-amber-600/10', 
      border: 'border-amber-500/50', 
      text: 'text-amber-400',
      glow: 'shadow-amber-500/20',
      icon: '⏳',
      label: 'WAIT'
    },
    HOLD: { 
      bg: 'from-blue-500/20 to-blue-600/10', 
      border: 'border-blue-500/50', 
      text: 'text-blue-400',
      glow: 'shadow-blue-500/20',
      icon: '🔄',
      label: 'HOLD'
    }
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
  const priceChange = data.priceContext.current - data.priceContext.avg30d;
  const priceChangePercent = ((priceChange / data.priceContext.avg30d) * 100).toFixed(1);
  const isPriceUp = priceChange > 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Trading Signals</h1>
            <p className="text-slate-400 text-sm">
              Updated {new Date(data.lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs uppercase">Live Price</div>
            <div className="text-2xl font-bold text-white">£{data.priceContext.current}<span className="text-sm text-slate-400">/MWh</span></div>
          </div>
        </div>

        {/* Main Signal Card */}
        <div className={`relative overflow-hidden rounded-2xl border ${config.border} bg-gradient-to-br ${config.bg} p-6 shadow-lg ${config.glow}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{config.icon}</div>
                <div>
                  <div className={`text-5xl font-black ${config.text} tracking-tight`}>{config.label}</div>
                  <div className="text-slate-400 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.text}`}>
                      {Math.round(data.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 text-sm">Price Percentile</div>
                <div className={`text-4xl font-bold ${config.text}`}>{data.priceContext.percentile}<span className="text-lg">th</span></div>
              </div>
            </div>
            
            <div className="bg-slate-900/50 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-lg text-white font-medium mb-2">{data.reason}</p>
              <p className="text-slate-300 text-sm">💡 {data.recommendation}</p>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white text-lg">📊 30-Day Price History</h2>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${isPriceUp ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {isPriceUp ? '↑' : '↓'} {Math.abs(Number(priceChangePercent))}% vs avg
            </div>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.priceHistory || []}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb8a99" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#fb8a99" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  tickFormatter={(val) => `£${val}`}
                  width={50}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`£${value.toFixed(2)}/MWh`, 'Price']}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#fb8a99" 
                  strokeWidth={2}
                  fill="url(#priceGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 text-center">
            <div className="text-slate-400 text-xs uppercase mb-1">Current</div>
            <div className="text-2xl font-bold text-white">£{data.priceContext.current}</div>
            <div className="text-slate-500 text-xs">/MWh</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 text-center">
            <div className="text-slate-400 text-xs uppercase mb-1">30-Day Avg</div>
            <div className="text-2xl font-bold text-slate-200">£{data.priceContext.avg30d}</div>
            <div className="text-slate-500 text-xs">/MWh</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 text-center">
            <div className="text-slate-400 text-xs uppercase mb-1">90-Day Avg</div>
            <div className="text-2xl font-bold text-slate-200">£{data.priceContext.avg90d}</div>
            <div className="text-slate-500 text-xs">/MWh</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 text-center">
            <div className="text-slate-400 text-xs uppercase mb-1">Trend</div>
            <div className={`text-2xl font-bold ${isPriceUp ? 'text-red-400' : 'text-green-400'}`}>
              {isPriceUp ? '↑' : '↓'} {Math.abs(Number(priceChangePercent))}%
            </div>
            <div className="text-slate-500 text-xs">vs 30d avg</div>
          </div>
        </div>

        {/* Contract Comparison */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <h2 className="font-semibold text-white text-lg mb-4">⚖️ Contract Comparison</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-slate-400 text-sm">Fixed Rate</span>
              </div>
              <div className="text-3xl font-bold text-white">£{data.contractComparison.fixedRate}</div>
              <div className="text-slate-500 text-sm mt-1">+{data.contractComparison.fixedPremium} premium</div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-slate-400 text-sm">Flexible Est.</span>
              </div>
              <div className="text-3xl font-bold text-white">£{data.contractComparison.flexibleEstimate}</div>
              <div className="text-slate-500 text-sm mt-1">Based on current rates</div>
            </div>
          </div>
          
          {data.contractComparison.potentialSavings && (
            <div className="mt-4 p-4 bg-green-500/10 rounded-xl border border-green-500/30">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <span className="text-green-400 font-semibold">{data.contractComparison.potentialSavings}</span>
              </div>
            </div>
          )}
        </div>

        {/* Percentile Gauge */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <h2 className="font-semibold text-white text-lg mb-4">📍 Where Are We in the Price Range?</h2>
          <div className="relative pt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Cheap</span>
              <span>Average</span>
              <span>Expensive</span>
            </div>
            <div className="h-4 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full relative">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg border-2 border-slate-800"
                style={{ left: `calc(${data.priceContext.percentile}% - 12px)` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                  {data.priceContext.percentile}th percentile
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-3">
              <span>0th</span>
              <span>50th</span>
              <span>100th</span>
            </div>
          </div>
        </div>

        {/* Signal Guide */}
        <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-5">
          <h3 className="font-semibold text-white mb-4">📚 Understanding Signals</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <span className="text-2xl">📈</span>
              <div>
                <div className="font-semibold text-green-400">BUY</div>
                <p className="text-slate-400 text-sm">Prices in bottom 25%. Favorable time to lock in rates.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <span className="text-2xl">⏳</span>
              <div>
                <div className="font-semibold text-amber-400">WAIT</div>
                <p className="text-slate-400 text-sm">Prices elevated or falling. Monitor for better entry.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <span className="text-2xl">🔄</span>
              <div>
                <div className="font-semibold text-blue-400">HOLD</div>
                <p className="text-slate-400 text-sm">Mid-range pricing. Consider flexible approach.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
