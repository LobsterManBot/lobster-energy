'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'

interface MarketData {
  signal: string
  currentPrice: number
  percentile: number
  avgPrice: number
  minPrice: number
  maxPrice: number
  forecast: { date: string; price: number }[]
  weather: { temp: number; wind: number; condition: string }
}

interface BrandingSettings {
  company_name: string
  logo_url: string
  primary_color: string
  contact_email: string
  contact_phone: string
  website: string
}

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [branding, setBranding] = useState<BrandingSettings | null>(null)
  const [clientName, setClientName] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }
    setUser(user)

    // Load branding settings
    const { data: brandingData } = await supabase
      .from('branding_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (brandingData) {
      setBranding(brandingData)
    }

    // Load market data
    try {
      const [signalsRes, forecastRes, weatherRes] = await Promise.all([
        fetch('/api/signals'),
        fetch('/api/predictions'),
        fetch('/api/weather'),
      ])

      const signals = await signalsRes.json()
      const forecast = await forecastRes.json()
      const weather = await weatherRes.json()

      setMarketData({
        signal: signals.signal || 'WAIT',
        currentPrice: signals.currentPrice || 0,
        percentile: signals.percentile || 50,
        avgPrice: signals.avgPrice || 0,
        minPrice: signals.minPrice || 0,
        maxPrice: signals.maxPrice || 0,
        forecast: forecast.predictions || [],
        weather: {
          temp: weather.current?.temp || 10,
          wind: weather.current?.wind || 15,
          condition: weather.current?.condition || 'Cloudy',
        },
      })
    } catch (error) {
      console.error('Failed to load market data:', error)
    }

    setLoading(false)
  }

  async function generatePDF() {
    if (!reportRef.current) return
    setGenerating(true)

    try {
      // Dynamic import to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#1e293b',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      
      const fileName = `energy-report-${clientName || 'client'}-${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }

    setGenerating(false)
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return '#22c55e'
      case 'WAIT': return '#f59e0b'
      case 'HOLD': return '#ef4444'
      default: return '#64748b'
    }
  }

  const formatDate = () => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading...</div>
        </div>
      </AppLayout>
    )
  }

  if (!branding?.company_name) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="text-5xl mb-4">⚙️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Set Up Your Branding First</h1>
          <p className="text-slate-400 mb-6">
            Before generating white-label reports, configure your company branding in settings.
          </p>
          <Link
            href="/settings"
            className="inline-block bg-[#fb8a99] hover:bg-[#e87a89] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Go to Settings
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Generate Report</h1>
            <p className="text-slate-400">Create a white-label market report for your client.</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client name (optional)"
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#fb8a99]"
            />
            <button
              onClick={generatePDF}
              disabled={generating}
              className="bg-[#fb8a99] hover:bg-[#e87a89] text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {generating ? 'Generating...' : '📄 Download PDF'}
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div ref={reportRef} className="p-8" style={{ backgroundColor: '#1e293b' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-600">
              <div className="flex items-center gap-4">
                {branding.logo_url && (
                  <img src={branding.logo_url} alt={branding.company_name} className="h-12 object-contain" />
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">{branding.company_name}</h2>
                  {branding.website && (
                    <p className="text-slate-400 text-sm">{branding.website}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">Energy Market Report</p>
                <p className="text-slate-400 text-sm">{formatDate()}</p>
              </div>
            </div>

            {/* Client Name */}
            {clientName && (
              <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
                <p className="text-slate-400 text-sm">Prepared for</p>
                <p className="text-white text-lg font-semibold">{clientName}</p>
              </div>
            )}

            {/* Signal Card */}
            <div 
              className="mb-6 p-6 rounded-xl"
              style={{ backgroundColor: `${getSignalColor(marketData?.signal || 'WAIT')}20` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm mb-1">Current Trading Signal</p>
                  <p 
                    className="text-4xl font-bold"
                    style={{ color: getSignalColor(marketData?.signal || 'WAIT') }}
                  >
                    {marketData?.signal || 'WAIT'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-300 text-sm mb-1">Current Price</p>
                  <p className="text-2xl font-bold text-white">
                    £{marketData?.currentPrice?.toFixed(2) || '0.00'}/MWh
                  </p>
                </div>
              </div>
            </div>

            {/* Market Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-slate-400 text-sm">Price Percentile</p>
                <p className="text-2xl font-bold text-white">{marketData?.percentile || 50}%</p>
                <p className="text-slate-500 text-xs">vs. 90-day range</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-slate-400 text-sm">90-Day Average</p>
                <p className="text-2xl font-bold text-white">£{marketData?.avgPrice?.toFixed(2) || '0.00'}</p>
                <p className="text-slate-500 text-xs">per MWh</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-slate-400 text-sm">90-Day Range</p>
                <p className="text-2xl font-bold text-white">
                  £{marketData?.minPrice?.toFixed(0) || '0'}-{marketData?.maxPrice?.toFixed(0) || '0'}
                </p>
                <p className="text-slate-500 text-xs">per MWh</p>
              </div>
            </div>

            {/* Weather Impact */}
            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-3">Weather Impact</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl">🌡️</p>
                  <p className="text-white font-medium">{marketData?.weather?.temp || 10}°C</p>
                  <p className="text-slate-500 text-xs">Temperature</p>
                </div>
                <div>
                  <p className="text-2xl">💨</p>
                  <p className="text-white font-medium">{marketData?.weather?.wind || 15} km/h</p>
                  <p className="text-slate-500 text-xs">Wind Speed</p>
                </div>
                <div>
                  <p className="text-2xl">☁️</p>
                  <p className="text-white font-medium">{marketData?.weather?.condition || 'Cloudy'}</p>
                  <p className="text-slate-500 text-xs">Conditions</p>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div 
              className="p-4 rounded-lg mb-6"
              style={{ 
                backgroundColor: branding.primary_color + '20',
                borderLeft: `4px solid ${branding.primary_color}` 
              }}
            >
              <h3 className="text-white font-semibold mb-2">Our Recommendation</h3>
              <p className="text-slate-300 text-sm">
                {marketData?.signal === 'BUY' 
                  ? 'Current prices are favorable. This is a good time to consider locking in rates for your energy contracts.'
                  : marketData?.signal === 'HOLD'
                  ? 'Prices are elevated. We recommend waiting for a better entry point unless you have an urgent requirement.'
                  : 'Market conditions are neutral. Consider your specific timing needs and monitor for better opportunities.'}
              </p>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-slate-600 flex items-center justify-between text-sm">
              <div className="text-slate-400">
                <p>{branding.company_name}</p>
                {branding.contact_email && <p>{branding.contact_email}</p>}
                {branding.contact_phone && <p>{branding.contact_phone}</p>}
              </div>
              <div className="text-slate-500 text-right text-xs">
                <p>Data sourced from BMRS</p>
                <p>Report generated by Lobster Energy</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-sm text-center mt-6">
          This is a preview. Click "Download PDF" to save a copy for your client.
        </p>
      </div>
    </AppLayout>
  )
}
