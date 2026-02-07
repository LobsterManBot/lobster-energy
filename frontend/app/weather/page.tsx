'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

interface WeatherData {
  success: boolean;
  current: { temperature: number; windSpeed: number; cloudCover: number };
  forecast: { date: string; maxTemp: number; minTemp: number; hdd: number; windSpeed: number; sunshineHours: number }[];
  analysis: { avgHDD: number; demandImpact: string; windGeneration: string; solarGeneration: string; pricePressure: string; summary: string };
}

export default function WeatherPage() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/weather').then(res => res.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fb8a99]"></div>
        </div>
      </AppLayout>
    );
  }

  if (!data?.success) {
    return (
      <AppLayout>
        <div className="text-[#fb8a99] p-4 bg-[#fb8a99]/20 rounded-xl">Failed to load weather</div>
      </AppLayout>
    );
  }

  const pressureColor = data.analysis.pricePressure === 'upward' ? 'red' : 
                        data.analysis.pricePressure === 'downward' ? 'green' : 'slate';

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-white">🌤️ Weather Impact</h1>

        {/* Current */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 text-center">
            <div className="text-2xl mb-1">🌡️</div>
            <div className="text-xl font-bold text-white">{data.current.temperature}°</div>
            <div className="text-xs text-slate-400">Temp</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 text-center">
            <div className="text-2xl mb-1">💨</div>
            <div className="text-xl font-bold text-white">{data.current.windSpeed}</div>
            <div className="text-xs text-slate-400">km/h</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 text-center">
            <div className="text-2xl mb-1">☁️</div>
            <div className="text-xl font-bold text-white">{data.current.cloudCover}%</div>
            <div className="text-xs text-slate-400">Cloud</div>
          </div>
        </div>

        {/* Price Impact */}
        <div className={`rounded-xl border-2 p-4 ${
          pressureColor === 'red' ? 'bg-[#fb8a99]/20 border-[#fb8a99]/50' :
          pressureColor === 'green' ? 'bg-green-500/20 border-green-500/50' :
          'bg-slate-700/50 border-slate-600'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">
              {data.analysis.pricePressure === 'upward' ? '↗️' :
               data.analysis.pricePressure === 'downward' ? '↘️' : '➡️'}
            </span>
            <span className={`text-lg font-bold ${
              pressureColor === 'red' ? 'text-[#fb8a99]' :
              pressureColor === 'green' ? 'text-green-400' : 'text-slate-300'
            }`}>
              {data.analysis.pricePressure === 'upward' ? 'Upward Pressure' :
               data.analysis.pricePressure === 'downward' ? 'Downward Pressure' : 'Neutral'}
            </span>
          </div>
          <p className="text-sm text-slate-300">{data.analysis.summary}</p>
        </div>

        {/* Impact Factors */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 text-center">
            <div className="text-lg mb-1">🔥</div>
            <div className={`text-sm font-bold ${
              data.analysis.demandImpact === 'high' ? 'text-[#fb8a99]' :
              data.analysis.demandImpact === 'medium' ? 'text-yellow-400' : 'text-green-400'
            }`}>{data.analysis.demandImpact.toUpperCase()}</div>
            <div className="text-xs text-slate-500">Heating</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 text-center">
            <div className="text-lg mb-1">💨</div>
            <div className={`text-sm font-bold ${
              data.analysis.windGeneration === 'high' ? 'text-green-400' :
              data.analysis.windGeneration === 'medium' ? 'text-yellow-400' : 'text-[#fb8a99]'
            }`}>{data.analysis.windGeneration.toUpperCase()}</div>
            <div className="text-xs text-slate-500">Wind</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 text-center">
            <div className="text-lg mb-1">☀️</div>
            <div className={`text-sm font-bold ${
              data.analysis.solarGeneration === 'high' ? 'text-green-400' :
              data.analysis.solarGeneration === 'medium' ? 'text-yellow-400' : 'text-[#fb8a99]'
            }`}>{data.analysis.solarGeneration.toUpperCase()}</div>
            <div className="text-xs text-slate-500">Solar</div>
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-3 border-b border-slate-700">
            <h2 className="font-semibold text-white text-sm">7-Day Forecast</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {data.forecast.slice(0, 7).map((day, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="w-16">
                  <div className="text-sm font-medium text-white">
                    {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#fb8a99] text-sm">{day.maxTemp}°</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-blue-400 text-sm">{day.minTemp}°</span>
                </div>
                <div className={`text-sm font-medium w-16 text-right ${
                  day.hdd > 10 ? 'text-[#fb8a99]' : day.hdd > 5 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {day.hdd} HDD
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-4">
          <h3 className="font-semibold text-white text-sm mb-1">About HDD</h3>
          <p className="text-xs text-slate-400">
            Heating Degree Days measure cold. Higher = more heating = higher demand = higher prices.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
