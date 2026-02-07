import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Typical UK demand patterns (relative to daily average)
const HOURLY_PATTERN = [
  0.65, 0.60, 0.58, 0.57, 0.58, 0.65, // 00-05: overnight low
  0.80, 0.95, 1.05, 1.10, 1.12, 1.10, // 06-11: morning ramp
  1.08, 1.05, 1.02, 1.05, 1.15, 1.25, // 12-17: afternoon + evening peak
  1.30, 1.20, 1.10, 0.95, 0.85, 0.75  // 18-23: evening decline
];

// Day of week factors (Mon=0)
const DAY_FACTORS = [1.05, 1.08, 1.08, 1.06, 1.02, 0.85, 0.80];

// Month factors (seasonal)
const MONTH_FACTORS = [1.25, 1.20, 1.10, 0.95, 0.85, 0.80, 0.78, 0.80, 0.88, 1.00, 1.15, 1.25];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseloadMW = parseFloat(searchParams.get('baseload') || '1');
  const days = Math.min(parseInt(searchParams.get('days') || '7'), 14);
  
  try {
    const now = new Date();
    const forecast: {
      datetime: string;
      hour: number;
      dayOfWeek: string;
      demandMW: number;
      relativeDemand: number;
      priceImpact: string;
    }[] = [];
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Generate hourly forecast for next N days
    for (let d = 0; d < days; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      const month = date.getMonth();
      const dayOfWeek = date.getDay();
      const monthFactor = MONTH_FACTORS[month];
      const dayFactor = DAY_FACTORS[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
      
      for (let h = 0; h < 24; h++) {
        const hourFactor = HOURLY_PATTERN[h];
        const relativeDemand = hourFactor * dayFactor * monthFactor;
        const demandMW = baseloadMW * relativeDemand;
        
        const datetime = new Date(date);
        datetime.setHours(h, 0, 0, 0);
        
        let priceImpact: string;
        if (h >= 16 && h <= 19) priceImpact = 'peak';
        else if (h >= 7 && h <= 21) priceImpact = 'day';
        else priceImpact = 'night';
        
        forecast.push({
          datetime: datetime.toISOString(),
          hour: h,
          dayOfWeek: dayNames[dayOfWeek],
          demandMW: Math.round(demandMW * 1000) / 1000,
          relativeDemand: Math.round(relativeDemand * 100) / 100,
          priceImpact
        });
      }
    }
    
    // Calculate summary stats
    const peakHours = forecast.filter(f => f.priceImpact === 'peak');
    const offPeakHours = forecast.filter(f => f.priceImpact === 'night');
    
    const avgPeakDemand = peakHours.reduce((s, f) => s + f.demandMW, 0) / peakHours.length;
    const avgOffPeakDemand = offPeakHours.reduce((s, f) => s + f.demandMW, 0) / offPeakHours.length;
    
    // Flexibility opportunity
    const shiftableMW = avgPeakDemand - avgOffPeakDemand;
    const flexSavingsPercent = 15; // Typical peak/off-peak spread
    const annualFlexSavings = shiftableMW * 8760 * 0.25 * (flexSavingsPercent / 100) * 90; // rough £/MWh
    
    // Peak vs off-peak hours
    const peakHoursPerDay = 4; // 4pm-8pm
    const offPeakHoursPerDay = 7; // 11pm-6am
    
    return NextResponse.json({
      success: true,
      baseloadMW,
      forecastDays: days,
      forecast: forecast.slice(0, 72), // First 3 days hourly
      dailySummary: Array.from({ length: days }, (_, d) => {
        const dayForecast = forecast.slice(d * 24, (d + 1) * 24);
        const date = new Date(now);
        date.setDate(date.getDate() + d);
        return {
          date: date.toISOString().split('T')[0],
          dayOfWeek: dayNames[date.getDay()],
          peakDemand: Math.round(Math.max(...dayForecast.map(f => f.demandMW)) * 1000) / 1000,
          minDemand: Math.round(Math.min(...dayForecast.map(f => f.demandMW)) * 1000) / 1000,
          avgDemand: Math.round(dayForecast.reduce((s, f) => s + f.demandMW, 0) / 24 * 1000) / 1000
        };
      }),
      flexibility: {
        peakHours: '16:00-20:00',
        offPeakHours: '23:00-06:00',
        avgPeakDemand: Math.round(avgPeakDemand * 1000) / 1000,
        avgOffPeakDemand: Math.round(avgOffPeakDemand * 1000) / 1000,
        shiftableMW: Math.round(shiftableMW * 1000) / 1000,
        potentialAnnualSavings: Math.round(annualFlexSavings)
      },
      recommendations: [
        shiftableMW > 0.1 ? `Shift ${Math.round(shiftableMW * 100) / 100} MW from peak to off-peak` : null,
        'Consider battery storage for peak shaving',
        'Review process schedules for overnight operation'
      ].filter(Boolean),
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to generate demand forecast',
      details: message
    }, { status: 500 });
  }
}
