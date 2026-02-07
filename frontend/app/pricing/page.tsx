'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  async function handleSubscribe(plan: 'monthly' | 'annual') {
    setLoading(plan)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      window.location.href = '/signup'
      return
    }

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, userId: user.id }),
    })

    const { url, error } = await response.json()
    
    if (error) {
      alert(error)
      setLoading(null)
      return
    }

    window.location.href = url
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-4">
            <img src="/logo.png" alt="Lobster Energy" className="h-24 mx-auto" />
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-slate-400 text-lg">
            One plan. Everything included. 14-day free trial.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-800 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billing === 'monthly' 
                  ? 'bg-[#fb8a99] text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billing === 'annual' 
                  ? 'bg-[#fb8a99] text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Annual <span className="text-green-400 ml-1">Save £588</span>
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-b from-[#fb8a99]/10 to-slate-800/50 rounded-2xl p-8 border-2 border-[#fb8a99]/50">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
              {billing === 'monthly' ? (
                <>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">£149</span>
                    <span className="text-slate-400">/month</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">£1,200</span>
                    <span className="text-slate-400">/year</span>
                  </div>
                  <p className="text-green-400 text-sm mt-2">= £100/month (Save £588)</p>
                </>
              )}
              <p className="text-green-400 text-sm mt-2">14-day free trial included</p>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> Real-time trading signals
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> Price forecasts (7-90 days)
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> Backtest analysis
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> Weather impact data
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> Demand forecasting
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> Contract comparison tools
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> Priority email support
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe(billing)}
              disabled={loading !== null}
              className="block w-full py-4 text-center bg-[#fb8a99] hover:bg-[#e87a89] text-white font-semibold rounded-lg text-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Start Free Trial'}
            </button>
            <p className="text-center text-slate-500 text-sm mt-4">
              No credit card required to start
            </p>
          </div>
        </div>

        {/* Referral */}
        <div className="max-w-md mx-auto mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">🤝 Know another broker?</h3>
          <p className="text-slate-400 text-sm">
            Refer them to Lobster Energy and you both get <span className="text-green-400 font-semibold">1 month free</span> when they subscribe.
          </p>
          <p className="text-slate-500 text-xs mt-3">
            Just have them mention your name when signing up
          </p>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-400">
            Need white-label or API access?{' '}
            <a href="mailto:hello@lobster.energy" className="text-[#fb8a99] hover:text-[#fca5b0]">
              Contact us for Agency pricing
            </a>
          </p>
        </div>
        
        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-[#fb8a99] hover:text-[#fca5b0]">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
