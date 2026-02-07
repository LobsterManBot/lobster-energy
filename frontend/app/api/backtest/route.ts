import { NextResponse } from 'next/server';

export const runtime = 'edge';

const BMRS_BASE = 'https://data.elexon.co.uk/bmrs/api/v1';

async function fetchBMRSWeek(from: Date, to: Date): Promise<{price: number, startTime: string}[]> {
  const url = `${BMRS_BASE}/balancing/pricing/market-index?from=${from.toISOString()}&to=${to.toISOString()}&dataProviders=APXMIDP`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'LobsterEnergy/1.0' }
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

function generateSignal(prices: number[], currentIdx: number): 'BUY' | 'WAIT' | 'HOLD' {
  // Look at last 14 days of data before this point
  const lookback = prices.slice(Math.max(0, currentIdx - 14), currentIdx + 1);
  if (lookback.length < 7) return 'HOLD';
  
  const current = prices[currentIdx];
  const avg = lookback.reduce((a, b) => a + b, 0) / lookback.length;
  const sorted = [...lookback].sort((a, b) => a - b);
  const percentile = (sorted.findIndex(p => p >= current) / lookback.length) * 100;
  
  if (percentile < 25) return 'BUY';
  if (percentile > 75) return 'WAIT';
  return 'HOLD';
}

export async function GET() {
  try {
    // Fetch 4 weeks of historical data
    const now = new Date();
    const allData: {price: number, startTime: string}[] = [];
    
    for (let i = 0; i < 4; i++) {
      const to = new Date(now);
      to.setDate(to.getDate() - (i * 7));
      const from = new Date(to);
      from.setDate(from.getDate() - 7);
      const weekData = await fetchBMRSWeek(from, to);
      allData.push(...weekData);
    }
    
    if (allData.length === 0) {
      return NextResponse.json({ success: false, error: 'No data' }, { status: 404 });
    }
    
    // Aggregate to daily prices
    const dailyPrices: Map<string, number[]> = new Map();
    allData.forEach((item) => {
      const date = item.startTime.split('T')[0];
      if (!dailyPrices.has(date)) dailyPrices.set(date, []);
      dailyPrices.get(date)!.push(item.price);
    });
    
    const sortedDates = Array.from(dailyPrices.keys()).sort();
    const dailyAvgs = sortedDates.map(date => {
      const prices = dailyPrices.get(date)!;
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    });
    
    // Simulate two strategies
    // 1. Follow signals (buy when BUY, skip when WAIT, market when HOLD)
    // 2. Buy every day (naive approach)
    
    let signalTotal = 0;
    let signalDays = 0;
    let naiveTotal = 0;
    let naiveDays = 0;
    
    const tradeLog: {date: string, price: number, signal: string, action: string}[] = [];
    
    // Start from day 14 to have enough lookback
    for (let i = 14; i < dailyAvgs.length; i++) {
      const price = dailyAvgs[i];
      const date = sortedDates[i];
      const signal = generateSignal(dailyAvgs, i);
      
      // Naive always buys
      naiveTotal += price;
      naiveDays++;
      
      // Signal strategy
      if (signal === 'BUY') {
        signalTotal += price;
        signalDays++;
        tradeLog.push({ date, price: Math.round(price * 100) / 100, signal, action: 'BOUGHT' });
      } else if (signal === 'HOLD') {
        signalTotal += price;
        signalDays++;
        tradeLog.push({ date, price: Math.round(price * 100) / 100, signal, action: 'BOUGHT (market)' });
      } else {
        tradeLog.push({ date, price: Math.round(price * 100) / 100, signal, action: 'SKIPPED' });
      }
    }
    
    const signalAvg = signalDays > 0 ? signalTotal / signalDays : 0;
    const naiveAvg = naiveDays > 0 ? naiveTotal / naiveDays : 0;
    const savings = naiveAvg - signalAvg;
    const savingsPercent = naiveAvg > 0 ? (savings / naiveAvg) * 100 : 0;
    
    // Calculate annual savings estimate (per MW baseload)
    const annualMWh = 8760;
    const annualSavings = savings * annualMWh;
    
    return NextResponse.json({
      success: true,
      period: {
        start: sortedDates[14],
        end: sortedDates[sortedDates.length - 1],
        tradingDays: dailyAvgs.length - 14
      },
      signalStrategy: {
        avgPrice: Math.round(signalAvg * 100) / 100,
        buyDays: signalDays,
        skipDays: tradeLog.filter(t => t.action === 'SKIPPED').length
      },
      naiveStrategy: {
        avgPrice: Math.round(naiveAvg * 100) / 100,
        buyDays: naiveDays
      },
      comparison: {
        savings: Math.round(savings * 100) / 100,
        savingsPercent: Math.round(savingsPercent * 100) / 100,
        annualSavingsPerMW: Math.round(annualSavings),
        verdict: savings > 0 ? 'Signal strategy outperformed' : 'Naive strategy outperformed'
      },
      recentTrades: tradeLog.slice(-10),
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to run backtest',
      details: message
    }, { status: 500 });
  }
}
