'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

interface DemandData {
  success: boolean;
  baseloadMW: number;
  forecastDays: number;
  dailySummary: { date: string; dayOfWeek: string; peakDemand: number; minDemand: number; avgDemand: number }[];
  flexibility: {
    peakHours: string;
    offPeakHours: string;
    avgPeakDemand: number;
    avgOffPeakDemand: number;
    shiftableMW: number;
    potentialAnnualSavings: number;
  };
  recommendations: string[];
}

export default function DemandPage() {
  const [data, setData] = useState<DemandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [baseload, setBaseload] = useState(1);

  useEffect(() => {
    fetchData();
  }, [baseload]);

  async function fetchData() {
    setLoading(true);
    const res = await fetch(`/api/demand?baseload=${baseload}&days=7`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  if (loading && !data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fb8a99]"></div>
        </div>
      </AppLayout>
    );
  }

  if (!data?.success) {
    return (
      <AppLayout>
        <div className="text-[#fb8a99] p-4 bg-[#fb8a99]/20 rounded-xl">Failed to load demand data</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">⚡ Demand Forecast</h1>
          <p className="text-slate-400 text-sm mt-1">Load profile analysis and flexibility opportunities</p>
        </div>

        {/* Baseload Input */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Your baseload</span>
            <span className="text-xl font-bold text-white">{baseload} MW</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={baseload}
            onChange={(e) => setBaseload(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#fb8a99]"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Small site</span>
            <span>Large industrial</span>
          </div>
        </div>

        {/* Flexibility Opportunity */}
        <div className="bg-green-500/20 rounded-xl border-2 border-green-500/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">💰</span>
            <div>
              <div className="text-2xl font-bold text-green-400">
                £{data.flexibility.potentialAnnualSavings.toLocaleString()}/year
              </div>
              <div className="text-green-300">Potential savings from load shifting</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <div className="text-xs text-slate-400">Peak Hours</div>
              <div className="font-semibold text-white">{data.flexibility.peakHours}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Off-Peak</div>
              <div className="font-semibold text-white">{data.flexibility.offPeakHours}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Peak Demand</div>
              <div className="font-semibold text-white">{data.flexibility.avgPeakDemand} MW</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Shiftable</div>
              <div className="font-semibold text-green-400">{data.flexibility.shiftableMW} MW</div>
            </div>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="font-semibold text-white">7-Day Demand Profile</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Day</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Peak</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Min</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {data.dailySummary.map((day, i) => (
                  <tr key={i} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{day.dayOfWeek}</div>
                      <div className="text-xs text-slate-500">{day.date}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-[#fb8a99]">
                      {day.peakDemand} MW
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-400">
                      {day.minDemand} MW
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-white">
                      {day.avgDemand} MW
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing Periods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#fb8a99]/20 rounded-xl border border-[#fb8a99]/30 p-4">
            <h3 className="font-semibold text-[#fb8a99] mb-1">Peak Period</h3>
            <div className="text-xl font-bold text-white">16:00 - 20:00</div>
            <p className="text-xs text-[#fca5b0] mt-1">Highest prices, avoid if possible</p>
          </div>
          <div className="bg-yellow-500/20 rounded-xl border border-yellow-500/30 p-4">
            <h3 className="font-semibold text-yellow-400 mb-1">Day Rate</h3>
            <div className="text-xl font-bold text-white">07:00 - 23:00</div>
            <p className="text-xs text-yellow-300 mt-1">Standard pricing</p>
          </div>
          <div className="bg-green-500/20 rounded-xl border border-green-500/30 p-4">
            <h3 className="font-semibold text-green-400 mb-1">Off-Peak</h3>
            <div className="text-xl font-bold text-white">23:00 - 06:00</div>
            <p className="text-xs text-green-300 mt-1">Cheapest rates</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
