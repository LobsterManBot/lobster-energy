'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'

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

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [signal, setSignal] = useState<SignalData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Load profile and signal in parallel
      const [profileRes, signalRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        fetch('/api/signals').then(r => r.json()).catch(() => null)
      ])

      setProfile(profileRes.data)
      setSignal(signalRes)
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
        </div>
      </AppLayout>
    )
  }

  const isPro = profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'enterprise'

  const signalConfig = {
    BUY: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', icon: '🟢' },
    WAIT: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', icon: '🟡' },
    HOLD: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', icon: '🔵' }
  }

  const config = signal ? signalConfig[signal.signal] : null

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-slate-400">
              {profile?.company && `${profile.company} · `}
              <span className={isPro ? 'text-red-400' : 'text-slate-500'}>
                {isPro ? '⭐ Pro' : 'Free'} Plan
              </span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Live Signal & Price Summary */}
        {signal && config && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Signal */}
            <Link href="/signals" className={`rounded-xl border-2 ${config.border} ${config.bg} p-4 hover:opacity-90 transition-opacity`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{config.icon}</span>
                <div>
                  <div className="text-xs text-slate-400 uppercase">Current Signal</div>
                  <div className={`text-2xl font-bold ${config.text}`}>{signal.signal}</div>
                </div>
              </div>
              <p className="text-sm text-slate-300 mt-2 line-clamp-2">{signal.reason}</p>
            </Link>

            {/* Current Price */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="text-xs text-slate-400 uppercase">Current Price</div>
              <div className="text-3xl font-bold text-white">£{signal.priceContext.current}</div>
              <div className="text-sm text-slate-400">/MWh</div>
              <div className="mt-2 text-sm">
                <span className="text-slate-500">30d avg: </span>
                <span className="text-slate-300">£{signal.priceContext.avg30d}</span>
              </div>
            </div>

            {/* Price Percentile */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="text-xs text-slate-400 uppercase">Price Percentile</div>
              <div className={`text-3xl font-bold ${
                signal.priceContext.percentile < 30 ? 'text-green-400' :
                signal.priceContext.percentile > 70 ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {signal.priceContext.percentile}th
              </div>
              <div className="mt-2">
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      signal.priceContext.percentile < 30 ? 'bg-green-500' :
                      signal.priceContext.percentile > 70 ? 'bg-red-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${signal.priceContext.percentile}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Cheap</span>
                  <span>Expensive</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Banner (for free users) */}
        {!isPro && (
          <div className="p-4 bg-gradient-to-r from-red-500/20 to-red-500/20 border border-red-500/30 rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Upgrade to Pro</h3>
                <p className="text-slate-300 text-sm">Get unlimited access to signals, forecasts, and backtest data</p>
              </div>
              <Link
                href="/pricing"
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-500 text-white font-semibold rounded-lg hover:from-red-600 hover:to-red-600 transition-all text-center"
              >
                View Plans
              </Link>
            </div>
          </div>
        )}

        {/* Features Grid */}
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
    </AppLayout>
  )
}

function FeatureCard({ 
  href, 
  icon, 
  title, 
  description, 
  available,
  proOnly = false 
}: { 
  href: string
  icon: string
  title: string
  description: string
  available: boolean
  proOnly?: boolean
}) {
  const content = (
    <div className={`p-5 rounded-xl border transition-all ${
      available 
        ? 'bg-slate-800/50 border-slate-700 hover:border-red-500/50 hover:bg-slate-800 cursor-pointer' 
        : 'bg-slate-800/30 border-slate-700/50 opacity-60'
    }`}>
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        {proOnly && (
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
            PRO
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
