import { NextResponse } from 'next/server';

export const runtime = 'edge';

const BMRS_BASE = 'https://data.elexon.co.uk/bmrs/api/v1';

async function fetchBMRSWeek(from: Date, to: Date): Promise<{price: number, startTime: string}[]> {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedDays = parseInt(searchParams.get('days') || '7');
  const product = searchParams.get('product') || 'baseload';
  
  // Calculate weeks needed (BMRS allows max 7 days per request)
  const weeks = Math.ceil(Math.min(requestedDays, 28) / 7);
  
  try {
    const now = new Date();
    const allData: {price: number, startTime: string}[] = [];
    
    // Fetch in 7-day chunks
    for (let i = 0; i < weeks; i++) {
      const to = new Date(now);
      to.setDate(to.getDate() - (i * 7));
      const from = new Date(to);
      from.setDate(from.getDate() - 7);
      
      const weekData = await fetchBMRSWeek(from, to);
      allData.push(...weekData);
    }
    
    if (allData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data from BMRS'
      }, { status: 404 });
    }
    
    // Transform to our format (already sorted newest first from BMRS)
    const prices = allData.map((item) => ({
      timestamp: item.startTime,
      price: item.price,
      product: product,
      source: 'BMRS'
    }));
    
    // Calculate stats
    const priceValues = prices.map(p => p.price);
    const currentPrice = priceValues[0];
    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    
    // Calculate trend
    const recent = priceValues.slice(0, 48); // Last day
    const older = priceValues.slice(48, 96); // Day before
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    const trend = recentAvg > olderAvg * 1.02 ? 'rising' : recentAvg < olderAvg * 0.98 ? 'falling' : 'stable';
    
    return NextResponse.json({
      success: true,
      product,
      period: `${weeks * 7} days`,
      current: {
        price: Math.round(currentPrice * 100) / 100,
        unit: '£/MWh',
        timestamp: prices[0]?.timestamp
      },
      stats: {
        average: Math.round(avgPrice * 100) / 100,
        min: Math.round(minPrice * 100) / 100,
        max: Math.round(maxPrice * 100) / 100,
        trend
      },
      prices: prices.slice(0, 168), // Last week of half-hourly data
      totalRecords: prices.length
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch market data',
      details: message
    }, { status: 500 });
  }
}
