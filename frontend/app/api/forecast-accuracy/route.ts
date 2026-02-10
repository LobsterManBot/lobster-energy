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

// Replicate the forecast model logic to test what it WOULD have predicted
function generateForecast(historicalDaily: number[], horizon: number): number[] {
  const n = historicalDaily.length;
  
  // Dampened trend + conservative mean reversion (matching main predictions API)
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
  
  // Maximum daily change: 4%
  const MAX_DAILY_CHANGE = 0.04;
  
  const predictions: number[] = [];
  let previousPrediction = historicalDaily[n - 1];
  
  for (let i = 1; i <= horizon; i++) {
    const trendValue = intercept + slope * (n + i);
    const meanWeight = Math.min(0.3, i * 0.008);
    const rawPrediction = trendValue * (1 - meanWeight) + avgPrice * meanWeight;
    
    const smoothingFactor = 0.7;
    const smoothedPrediction = smoothingFactor * previousPrediction + (1 - smoothingFactor) * rawPrediction;
    
    const maxChange = previousPrediction * MAX_DAILY_CHANGE;
    const change = smoothedPrediction - previousPrediction;
    const clampedPrediction = previousPrediction + Math.max(-maxChange, Math.min(maxChange, change));
    
    predictions.push(Math.max(0, clampedPrediction));
    previousPrediction = clampedPrediction;
  }
  
  return predictions;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get('days') || '45'), 60);
  const forecastHorizon = Math.min(parseInt(searchParams.get('horizon') || '7'), 14);
  
  try {
    // Fetch 8 weeks of data (need history + actuals to compare)
    const now = new Date();
    const allData: {price: number, startTime: string}[] = [];
    
    for (let i = 0; i < 8; i++) {
      const to = new Date(now);
      to.setDate(to.getDate() - (i * 7));
      const from = new Date(to);
      from.setDate(from.getDate() - 7);
      const weekData = await fetchBMRSWeek(from, to);
      allData.push(...weekData);
    }
    
    if (allData.length === 0) {
      return NextResponse.json({ success: false, error: 'No data from BMRS' }, { status: 404 });
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
    
    // Run rolling backtest
    // For each day, use prior 28 days as history, predict next N days, compare to actuals
    const minHistory = 28;
    const results: {
      forecastDate: string;
      horizon: number;
      predicted: number;
      actual: number;
      error: number;
      percentError: number;
      directionCorrect: boolean;
    }[] = [];
    
    for (let i = minHistory; i < dailyAvgs.length - forecastHorizon; i++) {
      const history = dailyAvgs.slice(i - minHistory, i);
      const basePrice = history[history.length - 1];
      const predictions = generateForecast(history, forecastHorizon);
      
      // Compare each day of the forecast to actual
      for (let h = 0; h < forecastHorizon && (i + h) < dailyAvgs.length; h++) {
        const predicted = predictions[h];
        const actual = dailyAvgs[i + h];
        const error = Math.abs(predicted - actual);
        
        // Direction: did we predict up/down correctly?
        const predictedDirection = predicted > basePrice ? 'up' : predicted < basePrice ? 'down' : 'flat';
        const actualDirection = actual > basePrice ? 'up' : actual < basePrice ? 'down' : 'flat';
        const directionCorrect = predictedDirection === actualDirection;
        
        results.push({
          forecastDate: sortedDates[i + h],
          horizon: h + 1,
          predicted: Math.round(predicted * 100) / 100,
          actual: Math.round(actual * 100) / 100,
          error: Math.round(error * 100) / 100,
          percentError: Math.round((error / actual) * 10000) / 100,
          directionCorrect
        });
      }
    }
    
    // Calculate aggregate metrics
    const totalResults = results.length;
    const mae = results.reduce((sum, r) => sum + r.error, 0) / totalResults;
    const mape = results.reduce((sum, r) => sum + r.percentError, 0) / totalResults;
    const directionalAccuracy = (results.filter(r => r.directionCorrect).length / totalResults) * 100;
    
    // Metrics by horizon
    const byHorizon: {horizon: number; mae: number; mape: number; directionalAccuracy: number; count: number}[] = [];
    for (let h = 1; h <= forecastHorizon; h++) {
      const horizonResults = results.filter(r => r.horizon === h);
      if (horizonResults.length > 0) {
        byHorizon.push({
          horizon: h,
          mae: Math.round((horizonResults.reduce((s, r) => s + r.error, 0) / horizonResults.length) * 100) / 100,
          mape: Math.round((horizonResults.reduce((s, r) => s + r.percentError, 0) / horizonResults.length) * 100) / 100,
          directionalAccuracy: Math.round((horizonResults.filter(r => r.directionCorrect).length / horizonResults.length) * 10000) / 100,
          count: horizonResults.length
        });
      }
    }
    
    // Recent examples (last 10)
    const recentExamples = results.slice(-10).map(r => ({
      date: r.forecastDate,
      horizon: `${r.horizon}d`,
      predicted: r.predicted,
      actual: r.actual,
      error: r.error,
      direction: r.directionCorrect ? '✓' : '✗'
    }));
    
    return NextResponse.json({
      success: true,
      period: {
        start: sortedDates[minHistory],
        end: sortedDates[sortedDates.length - 1],
        totalDays: dailyAvgs.length,
        forecastsEvaluated: totalResults
      },
      aggregateMetrics: {
        mae: Math.round(mae * 100) / 100,
        mape: Math.round(mape * 100) / 100,
        directionalAccuracy: Math.round(directionalAccuracy * 100) / 100,
        interpretation: {
          mae: `Average error of £${Math.round(mae * 100) / 100}/MWh`,
          mape: `${Math.round(mape * 100) / 100}% average percentage error`,
          directional: `${Math.round(directionalAccuracy)}% of the time we correctly predicted price direction`
        }
      },
      byHorizon,
      recentExamples,
      model: 'Smoothed Conservative (max 4%/day)',
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to run forecast accuracy backtest',
      details: message
    }, { status: 500 });
  }
}
