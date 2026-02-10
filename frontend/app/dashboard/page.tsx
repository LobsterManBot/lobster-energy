'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import AIChatBox from '@/components/AIChatBox'

interface Profile {
  email: string
  full_name: string
  company: string
  subscription_tier: string
  subscription_status: string
}

interface SignalData {
  signal: 'BUY' | 'WAIT' | 'HOLD'
  confidence: number
  reason: string
  priceContext: {
    current: number
    avg30d: number
    percentile: number
  }
}

interface MarketData {
  prices: { date: string; price: number }[]
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [signal, setSignal] = useState<SignalData | null>(null)
  const [priceHistory, setPriceHistory] = useState<{ date: string; price: number }[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // First check profile for subscription access
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // Gate: Must have a subscription to access dashboard
      if (!profileData?.subscription_tier || profileData.subscription_tier === 'free') {
        router.push('/onboarding')
        return
      }

      const [signalRes, marketRes] = await Promise.all([
        fetch('/api/signals').then(r => r.json()).catch(() => null),
        fetch('/api/market').then(r => r.json()).catch(() => ({ prices: [] }))
      ])

      setProfile(profileData)
      setSignal(signalRes)
      setPriceHistory(
        marketRes.prices?.slice(-14).map((p: any) => ({
          date: p.date,
          price: p.price || p.value
        })) || []
      )
      setLoading(false)
    }

    loadData()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fb8a99]"></div>
        </div>
      </AppLayout>
    )
  }

  const isPro = profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'agency'
  const isAgency = profile?.subscription_tier === 'agency'

  const signalConfig = {
    BUY: { 
      bg: 'from-green-500/20 to-green-600/5', 
      border: 'border-green-500/50', 
      text: 'text-green-400', 
      icon: '📈',
      label: 'BUY'
    },
    WAIT: { 
      bg: 'from-amber-500/20 to-amber-600/5', 
      border: 'border-amber-500/50', 
      text: 'text-amber-400',
      icon: '⏳',
      label: 'WAIT'
    },
    HOLD: { 
      bg: 'from-blue-500/20 to-blue-600/5', 
      border: 'border-blue-500/50', 
      text: 'text-blue-400',
      icon: '🔄',
      label: 'HOLD'
    }
  }

  const config = signal ? signalConfig[signal.signal] : null
  const priceChange = signal ? signal.priceContext.current - signal.priceContext.avg30d : 0
  const priceChangePercent = signal ? ((priceChange / signal.priceContext.avg30d) * 100).toFixed(1) : '0'
  const isPriceUp = priceChange > 0

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
            </h1>
            <p className="text-slate-400 mt-1">
              {profile?.company && <span>{profile.company} · </span>}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                isAgency ? 'bg-purple-500/20 text-purple-400' :
                isPro ? 'bg-[#fb8a99]/20 text-[#fb8a99]' : 
                'bg-slate-700 text-slate-400'
              }`}>
                {isAgency ? '🏢 Agency' : isPro ? '⭐ Pro' : 'Free'}
              </span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm"
          >
            Sign out
          </button>
        </div>

        {/* Market Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Signal Card */}
          {signal && config && (
            <Link 
              href="/signals" 
              className={`relative overflow-hidden rounded-xl border ${config.border} bg-gradient-to-br ${config.bg} p-5 hover:scale-[1.02] transition-transform`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{config.icon}</span>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Today's Signal</div>
                  <div className={`text-3xl font-bold ${config.text}`}>{config.label}</div>
                </div>
              </div>
              <p className="text-sm text-slate-300 line-clamp-2">{signal.reason}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border}`}>
                  {Math.round(signal.confidence * 100)}% confidence
                </span>
              </div>
            </Link>
          )}

          {/* Price Card with Sparkline */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide">Current Price</div>
                <div className="text-3xl font-bold text-white">
                  £{signal?.priceContext.current || '—'}
                  <span className="text-sm text-slate-400 font-normal">/MWh</span>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                isPriceUp ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {isPriceUp ? '↑' : '↓'} {Math.abs(Number(priceChangePercent))}%
              </div>
            </div>
            <div className="h-16 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory}>
                  <defs>
                    <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb8a99" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#fb8a99" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#fb8a99" 
                    strokeWidth={2}
                    fill="url(#sparkGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-slate-500 mt-1">14-day trend</div>
          </div>

          {/* Percentile Card */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Price Position</div>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${
                (signal?.priceContext.percentile || 50) < 30 ? 'text-green-400' :
                (signal?.priceContext.percentile || 50) > 70 ? 'text-red-400' : 'text-amber-400'
              }`}>
                {signal?.priceContext.percentile || '—'}
              </span>
              <span className="text-slate-400 text-lg mb-1">th percentile</span>
            </div>
            <div className="mt-4">
              <div className="h-3 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full relative">
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-slate-800"
                  style={{ left: `calc(${signal?.priceContext.percentile || 50}% - 8px)` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>Cheap</span>
                <span>Expensive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/30 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-xl font-bold text-white">£{signal?.priceContext.avg30d || '—'}</div>
            <div className="text-slate-500 text-xs">30-Day Average</div>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">📈</div>
            <div className={`text-xl font-bold ${isPriceUp ? 'text-red-400' : 'text-green-400'}`}>
              {isPriceUp ? '+' : ''}{priceChangePercent}%
            </div>
            <div className="text-slate-500 text-xs">vs Average</div>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-xl font-bold text-white">{Math.round((signal?.confidence || 0) * 100)}%</div>
            <div className="text-slate-500 text-xs">Signal Confidence</div>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-xl font-bold text-white">~4%</div>
            <div className="text-slate-500 text-xs">Avg. Savings</div>
          </div>
        </div>

        {/* AI Chat */}
        <AIChatBox 
          marketContext={signal ? {
            signal: signal.signal,
            confidence: signal.confidence,
            currentPrice: signal.priceContext.current,
            avg30d: signal.priceContext.avg30d,
            percentile: signal.priceContext.percentile,
          } : undefined}
        />

        {/* Upgrade Banner */}
        {!isPro && (
          <div className="p-5 bg-gradient-to-r from-[#fb8a99]/10 to-purple-500/10 border border-[#fb8a99]/30 rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">🚀 Unlock Full Access</h3>
                <p className="text-slate-300 text-sm">Get price forecasts, backtest analysis, weather data, and more</p>
              </div>
              <Link
                href="/pricing"
                className="px-6 py-2.5 bg-[#fb8a99] hover:bg-[#e87a89] text-white font-semibold rounded-lg transition-colors text-center whitespace-nowrap"
              >
                View Plans
              </Link>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Tools & Features</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              href="/signals"
              icon="🎯"
              title="Trading Signals"
              description="Buy, wait, or hold recommendations"
              available={true}
            />
            <FeatureCard
              href="/compare"
              icon="⚖️"
              title="Compare Contracts"
              description="Fixed vs flexible analysis"
              available={true}
            />
            <FeatureCard
              href="/forecast"
              icon="📈"
              title="Price Forecasts"
              description="7-90 day price predictions"
              available={isPro}
              proOnly={!isPro}
            />
            <FeatureCard
              href="/backtest"
              icon="📉"
              title="Backtest Analysis"
              description="Historical strategy performance"
              available={isPro}
              proOnly={!isPro}
            />
            <FeatureCard
              href="/weather"
              icon="🌤️"
              title="Weather Impact"
              description="Weather-driven price analysis"
              available={isPro}
              proOnly={!isPro}
            />
            <FeatureCard
              href="/demand"
              icon="⚡"
              title="Demand Forecast"
              description="Load profile predictions"
              available={isPro}
              proOnly={!isPro}
            />
          </div>
        </div>

        {/* Agency Features */}
        {isPro && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              {isAgency ? '🏢 Agency Tools' : '🔒 Agency Features'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <FeatureCard
                href="/reports"
                icon="📄"
                title="White-Label Reports"
                description="Branded PDF reports for clients"
                available={isAgency}
                proOnly={!isAgency}
                badge="Agency"
              />
              <FeatureCard
                href="/settings"
                icon="🎨"
                title="Custom Branding"
                description="Your logo and company details"
                available={isAgency}
                proOnly={!isAgency}
                badge="Agency"
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function FeatureCard({ 
  href, 
  icon, 
  title, 
  description, 
  available,
  proOnly = false,
  badge
}: { 
  href: string
  icon: string
  title: string
  description: string
  available: boolean
  proOnly?: boolean
  badge?: string
}) {
  const content = (
    <div className={`p-5 rounded-xl border transition-all ${
      available 
        ? 'bg-slate-800/50 border-slate-700 hover:border-[#fb8a99]/50 hover:bg-slate-800 cursor-pointer hover:scale-[1.02]' 
        : 'bg-slate-800/30 border-slate-700/50 opacity-60'
    }`}>
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        {proOnly && (
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            badge === 'Agency' 
              ? 'bg-purple-500/20 text-purple-400' 
              : 'bg-[#fb8a99]/20 text-[#fb8a99]'
          }`}>
            {badge || 'PRO'}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-white mt-3">{title}</h3>
      <p className="text-slate-400 text-sm mt-1">{description}</p>
    </div>
  )

  if (available) {
    return <Link href={href}>{content}</Link>
  }
  return <Link href="/pricing">{content}</Link>
}
