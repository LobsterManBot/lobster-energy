'use client';

import { ArrowUp, ArrowDown, Pause } from 'lucide-react';

interface SignalCardProps {
  market: string;
  signal: {
    type: string;
    strength: number;
    reason: string;
  };
  currentPrice: number;
  unit: string;
}

export default function SignalCard({ market, signal, currentPrice, unit }: SignalCardProps) {
  const getSignalIcon = () => {
    switch (signal.type.toUpperCase()) {
      case 'BUY':
        return <ArrowDown className="w-5 h-5 text-green-600" />;
      case 'WAIT':
        return <Pause className="w-5 h-5 text-yellow-600" />;
      case 'SELL':
        return <ArrowUp className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getSignalColor = () => {
    switch (signal.type.toUpperCase()) {
      case 'BUY':
        return 'border-green-200 bg-green-50';
      case 'WAIT':
        return 'border-yellow-200 bg-yellow-50';
      case 'SELL':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const strengthPercent = Math.round(signal.strength * 100);

  return (
    <div className={`border rounded-lg p-4 ${getSignalColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getSignalIcon()}
          <span className="font-semibold text-gray-900">{market}</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
          signal.type.toUpperCase() === 'BUY' 
            ? 'bg-green-600 text-white'
            : signal.type.toUpperCase() === 'WAIT'
            ? 'bg-yellow-600 text-white'
            : 'bg-gray-600 text-white'
        }`}>
          {signal.type.toUpperCase()}
        </span>
      </div>
      
      <div className="mb-3">
        <div className="text-sm text-gray-500 mb-1">Signal Strength</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                signal.type.toUpperCase() === 'BUY' 
                  ? 'bg-green-500'
                  : signal.type.toUpperCase() === 'WAIT'
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
              }`}
              style={{ width: `${strengthPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">{strengthPercent}%</span>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-3">
        Current: <span className="font-semibold">{currentPrice?.toFixed(2)} {unit}</span>
      </div>

      <p className="text-sm text-gray-700">{signal.reason}</p>
    </div>
  );
}
