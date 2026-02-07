import { NextResponse } from 'next/server';

export const runtime = 'edge';

const BMRS_BASE = 'https://data.elexon.co.uk/bmrs/api/v1';

type Signal = 'BUY' | 'WAIT' | 'HOLD';

async function fetchBMRSData(from: Date, to: Date): Promise<{price: number, startTime: string}[]> {
  const url = `${BMRS_BASE}/balancing/pricing/market-index?from=${from.toISOString()}&to=${to.toISOString()}&dataProviders=APXMIDP`;
  
  const response = await fetch(url, {
    headers: { 
      'Accept': 'application/json',
      'User-Agent': 'LobsterEnergy/1.0'
    }
  });
  
  if (!response.ok) {
    return [];
  }
  
  const data = await response.json();
  return data.data || [];
}

async function fetchMultipleWeeks(weeks: number): Promise<{price: number, startTime: string}[]> {
  const allData: {price: number, startTime: string}[] = [];
  const now = new Date();
  
  // Fetch in 7-day chunks (BMRS limit)
  for (let i = 0; i < weeks; i++) {
    const to = new Date(now);
    to.setDate(to.getDate() - (i * 7));
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    
    const weekData = await fetchBMRSData(from, to);
    allData.push(...weekData);
  }
  
  return allData;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get('product') || 'baseload';
  
  try {
    // Fetch 4 weeks (28 days) of data
    const allData = await fetchMultipleWeeks(4);
    
    if (allData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data from BMRS'
      }, { status: 404 });
    }
    
    // Aggregate to daily prices
    const dailyPrices: Map<string, number[]> = new Map();
    allData.forEach((item) => {
      const date = item.startTime.split('T')[0];
      if (!dailyPrices.has(date)) {
        dailyPrices.set(date, []);
      }
      dailyPrices.get(date)!.push(item.price);
    });
    
    // Calculate daily averages (most recent first)
    const sortedDates = Array.from(dailyPrices.keys()).sort().reverse();
    const historicalDaily = sortedDates.map(date => {
      const prices = dailyPrices.get(date)!;
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    });
    
    const n = historicalDaily.length;
    const current = historicalDaily[0];
    
    // Calculate averages
    const avg7d = historicalDaily.slice(0, 7).reduce((a, b) => a + b, 0) / Math.min(7, n);
    const avg30d = historicalDaily.reduce((a, b) => a + b, 0) / n;
    
    // Calculate percentile
    const sorted = [...historicalDaily].sort((a, b) => a - b);
    const percentile = Math.round((sorted.findIndex(p => p >= current) / n) * 100);
    
    // Calculate trend (last 7 days)
    const last7 = historicalDaily.slice(0, 7);
    const trendSlope = last7.length > 1 ? (last7[0] - last7[last7.length - 1]) / last7.length : 0;
    
    // Determine signal
    let signal: Signal;
    let confidence: number;
    let reason: string;
    let recommendation: string;
    
    if (percentile < 25 && trendSlope <= 0) {
      signal = 'BUY';
      confidence = 0.8;
      reason = 'Price in bottom quartile with stable/falling trend';
      recommendation = 'Lock in rates now. Current prices are historically low.';
    } else if (percentile < 40 && current < avg7d * 0.97) {
      signal = 'BUY';
      confidence = 0.65;
      reason = 'Price below recent average in lower range';
      recommendation = 'Good opportunity for partial procurement.';
    } else if (trendSlope < -1 && percentile > 40) {
      signal = 'WAIT';
      confidence = 0.6;
      reason = 'Prices trending downward';
      recommendation = 'Hold off - better rates likely coming.';
    } else if (percentile > 75) {
      signal = 'WAIT';
      confidence = 0.7;
      reason = 'Prices in top quartile - expensive';
      recommendation = 'Avoid long-term commitments at current rates.';
    } else {
      signal = 'HOLD';
      confidence = 0.55;
      reason = 'Prices in normal range';
      recommendation = 'Consider flexible contract or wait for better signal.';
    }
    
    const fixedRate = current * 1.08;
    
    return NextResponse.json({
      success: true,
      product,
      signal,
      confidence,
      reason,
      recommendation,
      priceContext: {
        current: Math.round(current * 100) / 100,
        avg30d: Math.round(avg30d * 100) / 100,
        avg90d: Math.round(avg30d * 100) / 100, // Use 30d as proxy
        percentile
      },
      contractComparison: {
        fixedRate: Math.round(fixedRate * 100) / 100,
        flexibleEstimate: Math.round(avg30d * 100) / 100,
        fixedPremium: '8%',
        potentialSavings: signal === 'BUY' ? `£${Math.round((avg30d - current) * 8.76)}k/MW/year` : null
      },
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to generate signal',
      details: message
    }, { status: 500 });
  }
}
