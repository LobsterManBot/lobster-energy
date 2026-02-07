import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Open-Meteo API (free, no key needed)
const METEO_BASE = 'https://api.open-meteo.com/v1';

// UK grid reference point (roughly central England)
const UK_LAT = 52.5;
const UK_LON = -1.5;

export async function GET() {
  try {
    // Get current weather + 7 day forecast
    const weatherUrl = `${METEO_BASE}/forecast?latitude=${UK_LAT}&longitude=${UK_LON}&current=temperature_2m,wind_speed_10m,cloud_cover&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum,sunshine_duration&timezone=Europe/London&past_days=7&forecast_days=7`;
    
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error('Weather API failed');
    const weather = await weatherRes.json();
    
    // Calculate heating degree days (HDD) - key driver of demand
    const current = weather.current;
    const daily = weather.daily;
    
    // HDD = max(0, 15.5 - avg_temp) - standard UK baseline
    const hddData = daily.time.map((date: string, i: number) => {
      const avgTemp = (daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2;
      const hdd = Math.max(0, 15.5 - avgTemp);
      return {
        date,
        maxTemp: daily.temperature_2m_max[i],
        minTemp: daily.temperature_2m_min[i],
        avgTemp: Math.round(avgTemp * 10) / 10,
        hdd: Math.round(hdd * 10) / 10,
        windSpeed: daily.wind_speed_10m_max[i],
        precipitation: daily.precipitation_sum[i],
        sunshineHours: Math.round(daily.sunshine_duration[i] / 3600 * 10) / 10
      };
    });
    
    // Split into past and forecast
    const today = new Date().toISOString().split('T')[0];
    const todayIndex = hddData.findIndex((d: {date: string}) => d.date === today);
    const pastWeather = hddData.slice(0, todayIndex + 1);
    const forecastWeather = hddData.slice(todayIndex);
    
    // Calculate demand impact estimate
    // Higher HDD = higher heating demand = higher prices
    const avgHDD = forecastWeather.reduce((sum: number, d: {hdd: number}) => sum + d.hdd, 0) / forecastWeather.length;
    const demandImpact = avgHDD > 10 ? 'high' : avgHDD > 5 ? 'medium' : 'low';
    
    // Wind impact on renewable generation
    const avgWind = forecastWeather.reduce((sum: number, d: {windSpeed: number}) => sum + d.windSpeed, 0) / forecastWeather.length;
    const windGeneration = avgWind > 40 ? 'high' : avgWind > 20 ? 'medium' : 'low';
    
    // Solar impact
    const avgSunshine = forecastWeather.reduce((sum: number, d: {sunshineHours: number}) => sum + d.sunshineHours, 0) / forecastWeather.length;
    const solarGeneration = avgSunshine > 6 ? 'high' : avgSunshine > 3 ? 'medium' : 'low';
    
    // Price pressure estimate
    let pricePressure: string;
    if (demandImpact === 'high' && windGeneration === 'low') {
      pricePressure = 'upward';
    } else if (demandImpact === 'low' && (windGeneration === 'high' || solarGeneration === 'high')) {
      pricePressure = 'downward';
    } else {
      pricePressure = 'neutral';
    }
    
    return NextResponse.json({
      success: true,
      current: {
        temperature: current.temperature_2m,
        windSpeed: current.wind_speed_10m,
        cloudCover: current.cloud_cover,
        timestamp: current.time
      },
      pastWeek: pastWeather,
      forecast: forecastWeather,
      analysis: {
        avgHDD: Math.round(avgHDD * 10) / 10,
        demandImpact,
        windGeneration,
        solarGeneration,
        pricePressure,
        summary: pricePressure === 'upward' 
          ? 'Cold weather + low wind expected. Prices likely to rise.'
          : pricePressure === 'downward'
          ? 'Mild weather + good renewables. Prices likely to fall.'
          : 'Normal conditions. No strong price signal from weather.'
      },
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch weather data',
      details: message
    }, { status: 500 });
  }
}
