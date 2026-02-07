'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  async function handleSubscribe(tier: 'pro' | 'agency', billingPeriod: 'monthly' | 'annual') {
    setLoading(`${tier}-${billingPeriod}`)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      window.location.href = '/signup'
      return
    }

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, billing: billingPeriod, userId: user.id }),
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
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-4">
            <img src="/lobster-logo.png" alt="Lobster Energy" className="h-20 mx-auto" />
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-4">
            Choose your plan
          </h1>
          <p className="text-slate-400 text-lg">
            14-day free trial on all plans. No credit card required.
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
              Annual <span className="text-green-400 ml-1">Save 30%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Pro Tier */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 card-hover">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
              <p className="text-slate-400 text-sm mb-4">For individual brokers</p>
              {billing === 'monthly' ? (
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-white">£149</span>
                  <span className="text-slate-400">/month</span>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">£1,200</span>
                    <span className="text-slate-400">/year</span>
                  </div>
                  <p className="text-green-400 text-sm mt-2">= £100/month (Save £588)</p>
                </>
              )}
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
                <span className="text-green-400">✓</span> Email support
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe('pro', billing)}
              disabled={loading !== null}
              className="block w-full py-4 text-center bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-lg transition-colors disabled:opacity-50"
            >
              {loading === `pro-${billing}` ? 'Loading...' : 'Start Free Trial'}
            </button>
          </div>

          {/* Agency Tier */}
          <div className="bg-gradient-to-b from-[#fb8a99]/10 to-slate-800/50 rounded-2xl p-8 border-2 border-[#fb8a99]/50 card-hover relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-[#fb8a99] text-white text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Agency</h3>
              <p className="text-slate-400 text-sm mb-4">For brokerages & teams</p>
              {billing === 'monthly' ? (
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold gradient-text">£299</span>
                  <span className="text-slate-400">/month</span>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold gradient-text">£2,599</span>
                    <span className="text-slate-400">/year</span>
                  </div>
                  <p className="text-green-400 text-sm mt-2">= £217/month (Save £989)</p>
                </>
              )}
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> Everything in Pro
              </li>
              <li className="flex items-center gap-3 text-white font-medium">
                <span className="text-[#fb8a99]">★</span> White-label PDF reports
              </li>
              <li className="flex items-center gap-3 text-white font-medium">
                <span className="text-[#fb8a99]">★</span> Your logo & branding
              </li>
              <li className="flex items-center gap-3 text-white font-medium">
                <span className="text-[#fb8a99]">★</span> Client report sharing
              </li>
              <li className="flex items-center gap-3 text-white font-medium">
                <span className="text-[#fb8a99]">★</span> Scheduled weekly reports
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> Priority support
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> API access (coming soon)
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe('agency', billing)}
              disabled={loading !== null}
              className="block w-full py-4 text-center bg-[#fb8a99] hover:bg-[#e87a89] text-white font-semibold rounded-lg text-lg transition-all hover:scale-105 btn-shine disabled:opacity-50"
            >
              {loading === `agency-${billing}` ? 'Loading...' : 'Start Free Trial'}
            </button>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Compare Features</h2>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-medium p-4">Feature</th>
                  <th className="text-center text-white font-medium p-4">Pro</th>
                  <th className="text-center text-[#fb8a99] font-medium p-4">Agency</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-700/50">
                  <td className="p-4">Real-time trading signals</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="p-4">Price forecasts (7-90 days)</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="p-4">Backtest analysis</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="p-4">Weather impact data</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="p-4">Demand forecasting</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="p-4">Contract comparison</td>
                  <td className="text-center p-4">✓</td>
                  <td className="text-center p-4">✓</td>
                </tr>
                <tr className="border-b border-slate-700/50 bg-[#fb8a99]/5">
                  <td className="p-4 font-medium text-white">White-label PDF reports</td>
                  <td className="text-center p-4 text-slate-500">—</td>
                  <td className="text-center p-4 text-[#fb8a99]">✓</td>
                </tr>
                <tr className="border-b border-slate-700/50 bg-[#fb8a99]/5">
                  <td className="p-4 font-medium text-white">Custom branding & logo</td>
                  <td className="text-center p-4 text-slate-500">—</td>
                  <td className="text-center p-4 text-[#fb8a99]">✓</td>
                </tr>
                <tr className="border-b border-slate-700/50 bg-[#fb8a99]/5">
                  <td className="p-4 font-medium text-white">Client report sharing</td>
                  <td className="text-center p-4 text-slate-500">—</td>
                  <td className="text-center p-4 text-[#fb8a99]">✓</td>
                </tr>
                <tr className="bg-[#fb8a99]/5">
                  <td className="p-4 font-medium text-white">Scheduled weekly reports</td>
                  <td className="text-center p-4 text-slate-500">—</td>
                  <td className="text-center p-4 text-[#fb8a99]">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Referral */}
        <div className="max-w-md mx-auto mt-12 bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">🤝 Know another broker?</h3>
          <p className="text-slate-400 text-sm">
            Refer them to Lobster Energy and you both get <span className="text-green-400 font-semibold">1 month free</span> when they subscribe.
          </p>
          <p className="text-slate-500 text-xs mt-3">
            Just have them mention your name when signing up
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
