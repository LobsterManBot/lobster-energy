import { NextResponse } from 'next/server';

export const runtime = 'edge';

const BMRS_BASE = 'https://data.elexon.co.uk/bmrs/api/v1';

async function fetchBMRSData(from: Date, to: Date): Promise<{price: number, startTime: string}[]> {
  const url = `${BMRS_BASE}/balancing/pricing/market-index?from=${from.toISOString()}&to=${to.toISOString()}&dataProviders=APXMIDP`;
  
  const response = await fetch(url, {
    headers: { 
      'Accept': 'application/json',
      'User-Agent': 'LobsterEnergy/1.0'
    }
  });
  
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

async function fetchMultipleWeeks(weeks: number): Promise<{price: number, startTime: string}[]> {
  const allData: {price: number, startTime: string}[] = [];
  const now = new Date();
  
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
  const horizon = Math.min(parseInt(searchParams.get('horizon') || '30'), 90);
  const product = searchParams.get('product') || 'baseload';
  
  try {
    // Fetch 4 weeks of history
    const allData = await fetchMultipleWeeks(4);
    
    if (allData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data from BMRS'
      }, { status: 404 });
    }
    
    // Aggregate to daily
    const dailyPrices: Map<string, number[]> = new Map();
    allData.forEach((item) => {
      const date = item.startTime.split('T')[0];
      if (!dailyPrices.has(date)) {
        dailyPrices.set(date, []);
      }
      dailyPrices.get(date)!.push(item.price);
    });
    
    // Daily averages (oldest first for prediction)
    const sortedDates = Array.from(dailyPrices.keys()).sort();
    const historicalDaily = sortedDates.map(date => {
      const prices = dailyPrices.get(date)!;
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    });
    
    const n = historicalDaily.length;
    
    // Dampened trend + conservative mean reversion forecast
    // Calculate historical volatility for adaptive dampening
    const returns: number[] = [];
    for (let i = 1; i < historicalDaily.length; i++) {
      returns.push((historicalDaily[i] - historicalDaily[i-1]) / historicalDaily[i-1]);
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(returns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / returns.length);
    
    // Simple trend calculation (heavily dampened)
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    historicalDaily.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    const rawSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - rawSlope * sumX) / n;
    const avgPrice = sumY / n;
    
    // Dampen the slope significantly - reduce trend influence by 70%
    const slope = rawSlope * 0.3;
    
    // Maximum daily change: 4% (middle of 3-5% range)
    const MAX_DAILY_CHANGE = 0.04;
    
    // Generate predictions with smoothing
    const predictions: number[] = [];
    let previousPrediction = historicalDaily[n - 1]; // Start from current price
    
    for (let i = 1; i <= horizon; i++) {
      // Blend trend with strong mean reversion (slower convergence)
      const trendValue = intercept + slope * (n + i);
      // Slower mean reversion: max 30% weight, builds slowly
      const meanWeight = Math.min(0.3, i * 0.008);
      const rawPrediction = trendValue * (1 - meanWeight) + avgPrice * meanWeight;
      
      // Apply smoothing: exponential moving average with previous prediction
      const smoothingFactor = 0.7; // Heavy smoothing
      const smoothedPrediction = smoothingFactor * previousPrediction + (1 - smoothingFactor) * rawPrediction;
      
      // Clamp daily change to MAX_DAILY_CHANGE
      const maxChange = previousPrediction * MAX_DAILY_CHANGE;
      const change = smoothedPrediction - previousPrediction;
      const clampedPrediction = previousPrediction + Math.max(-maxChange, Math.min(maxChange, change));
      
      predictions.push(Math.max(0, Math.round(clampedPrediction * 100) / 100));
      previousPrediction = clampedPrediction;
    }
    
    // Build response
    const forecastStart = new Date();
    forecastStart.setDate(forecastStart.getDate() + 1);
    
    const forecast = predictions.map((price, i) => {
      const date = new Date(forecastStart);
      date.setDate(date.getDate() + i);
      const confidence = Math.round((1 - Math.min(0.5, i * 0.01)) * 100) / 100;
      return {
        date: date.toISOString().split('T')[0],
        predicted: price,
        confidence,
        lower: Math.round((price * 0.9) * 100) / 100,
        upper: Math.round((price * 1.1) * 100) / 100
      };
    });
    
    const currentPrice = historicalDaily[n - 1];
    const avgPredicted = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    
    return NextResponse.json({
      success: true,
      product,
      horizon: `${horizon} days`,
      current: Math.round(currentPrice * 100) / 100,
      model: 'Smoothed Conservative (max 4%/day)',
      summary: {
        avgPredicted: Math.round(avgPredicted * 100) / 100,
        minPredicted: Math.round(Math.min(...predictions) * 100) / 100,
        maxPredicted: Math.round(Math.max(...predictions) * 100) / 100,
        direction: avgPredicted > currentPrice ? 'up' : avgPredicted < currentPrice ? 'down' : 'stable',
        percentChange: Math.round(((avgPredicted - currentPrice) / currentPrice) * 10000) / 100
      },
      forecast,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to generate predictions',
      details: message
    }, { status: 500 });
  }
}
