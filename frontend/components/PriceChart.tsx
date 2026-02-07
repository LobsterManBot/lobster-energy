'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface ChartData {
  x: string;
  y: number;
}

interface PriceChartProps {
  market: string;
  showForecast?: boolean;
}

const periods = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

export default function PriceChart({ market, showForecast = false }: PriceChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('1M');

  useEffect(() => {
    fetchData();
  }, [market, period]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch historical data
      const res = await fetch(`/api/market/chart?market=${market}&period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }

      // Fetch forecast if enabled
      if (showForecast) {
        const forecastRes = await fetch(`/api/predictions/forecast?market=${market}&horizon_days=30`);
        if (forecastRes.ok) {
          const forecastJson = await forecastRes.json();
          setForecast(forecastJson.forecast || []);
        }
      }
    } catch (e) {
      console.error('Failed to fetch chart data:', e);
    } finally {
      setLoading(false);
    }
  }

  const formatXAxis = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (period === '1D') return format(date, 'HH:mm');
      if (period === '1W') return format(date, 'EEE');
      if (period === '1M') return format(date, 'dd MMM');
      return format(date, 'MMM yy');
    } catch {
      return dateStr;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="text-gray-500 text-sm">
            {format(parseISO(label), 'dd MMM yyyy HH:mm')}
          </p>
          <p className="text-lg font-semibold text-gray-900">
            £{payload[0].value?.toFixed(2)}/MWh
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading chart...</div>
      </div>
    );
  }

  // Combine historical and forecast data
  const combinedData = [...data];
  if (showForecast && forecast.length > 0) {
    forecast.forEach((f) => {
      combinedData.push({
        x: f.date,
        y: f.predicted_price,
        forecast: true,
        lower: f.lower_bound,
        upper: f.upper_bound,
      } as any);
    });
  }

  return (
    <div>
      {/* Period selector */}
      <div className="flex gap-2 mb-4">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              period === p
                ? 'bg-lobster-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={combinedData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="x"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              tickFormatter={(v) => `£${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="y"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#colorPrice)"
              dot={false}
            />
            {showForecast && (
              <>
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
