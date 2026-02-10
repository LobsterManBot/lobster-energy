'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Step = 'welcome' | 'role' | 'goals' | 'plan'

interface OnboardingData {
  role: string
  clientCount: string
  goals: string[]
}

const ROLES = [
  { id: 'broker', label: 'Energy Broker / TPI', icon: '🤝' },
  { id: 'consultant', label: 'Energy Consultant', icon: '📊' },
  { id: 'manager', label: 'Energy Manager (In-house)', icon: '🏢' },
  { id: 'other', label: 'Other', icon: '💼' },
]

const CLIENT_COUNTS = [
  { id: '1-10', label: '1-10 clients' },
  { id: '11-50', label: '11-50 clients' },
  { id: '51-200', label: '51-200 clients' },
  { id: '200+', label: '200+ clients' },
]

const GOALS = [
  { id: 'timing', label: 'Better contract timing advice', icon: '⏰' },
  { id: 'retention', label: 'Improve client retention', icon: '🔄' },
  { id: 'differentiate', label: 'Stand out from competitors', icon: '⭐' },
  { id: 'save', label: 'Save clients money', icon: '💰' },
  { id: 'reports', label: 'Professional reports', icon: '📄' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('welcome')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual')
  const [data, setData] = useState<OnboardingData>({
    role: '',
    clientCount: '',
    goals: [],
  })
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user already completed onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, subscription_tier')
        .eq('id', user.id)
        .single()

      if (profile?.onboarding_completed && profile?.subscription_tier) {
        router.push('/dashboard')
        return
      }

      // If they have a subscription but haven't completed onboarding, skip to dashboard
      if (profile?.subscription_tier && profile.subscription_tier !== 'free') {
        router.push('/dashboard')
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [router])

  async function saveOnboarding() {
    if (!user) return

    setSaving(true)
    await supabase
      .from('profiles')
      .update({
        role: data.role,
        client_count: data.clientCount,
        goals: data.goals,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    setSaving(false)
    setStep('plan')
  }

  function toggleGoal(goalId: string) {
    setData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(g => g !== goalId)
        : [...prev.goals, goalId]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fb8a99]"></div>
      </div>
    )
  }

  const prices = {
    pro: { monthly: 149, annual: 100, annualTotal: 1200 },
    agency: { monthly: 299, annual: 208, annualTotal: 2500 },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        {step !== 'plan' && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              {['welcome', 'role', 'goals'].map((s, i) => (
                <div
                  key={s}
                  className={`flex-1 h-1 rounded-full mx-1 transition-colors ${
                    ['welcome', 'role', 'goals'].indexOf(step) >= i
                      ? 'bg-[#fb8a99]'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="text-center animate-fade-in">
            <div className="text-6xl mb-6">🦞</div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Welcome to Lobster Energy!
            </h1>
            <p className="text-slate-400 mb-8 text-lg">
              Let's get you set up in under a minute.
            </p>
            <button
              onClick={() => setStep('role')}
              className="px-8 py-4 bg-[#fb8a99] hover:bg-[#e87a89] text-white font-semibold rounded-lg text-lg transition-all hover:scale-105"
            >
              Let's Go →
            </button>
          </div>
        )}

        {/* Role Step */}
        {step === 'role' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              What's your role?
            </h2>
            <p className="text-slate-400 mb-6 text-center">
              This helps us tailor your experience
            </p>

            <div className="space-y-3 mb-6">
              {ROLES.map(role => (
                <button
                  key={role.id}
                  onClick={() => setData(prev => ({ ...prev, role: role.id }))}
                  className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${
                    data.role === role.id
                      ? 'border-[#fb8a99] bg-[#fb8a99]/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <span className="text-2xl">{role.icon}</span>
                  <span className="text-white font-medium">{role.label}</span>
                  {data.role === role.id && (
                    <span className="ml-auto text-[#fb8a99]">✓</span>
                  )}
                </button>
              ))}
            </div>

            {data.role && (
              <div className="mb-6 animate-fade-in">
                <label className="block text-slate-300 text-sm font-medium mb-3">
                  How many clients do you work with?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CLIENT_COUNTS.map(count => (
                    <button
                      key={count.id}
                      onClick={() => setData(prev => ({ ...prev, clientCount: count.id }))}
                      className={`p-3 rounded-lg border transition-all ${
                        data.clientCount === count.id
                          ? 'border-[#fb8a99] bg-[#fb8a99]/10 text-white'
                          : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {count.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('welcome')}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('goals')}
                disabled={!data.role}
                className="flex-1 py-3 bg-[#fb8a99] hover:bg-[#e87a89] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Goals Step */}
        {step === 'goals' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              What are your goals?
            </h2>
            <p className="text-slate-400 mb-6 text-center">
              Select all that apply
            </p>

            <div className="space-y-3 mb-6">
              {GOALS.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${
                    data.goals.includes(goal.id)
                      ? 'border-[#fb8a99] bg-[#fb8a99]/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <span className="text-2xl">{goal.icon}</span>
                  <span className="text-white font-medium">{goal.label}</span>
                  {data.goals.includes(goal.id) && (
                    <span className="ml-auto text-[#fb8a99]">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('role')}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={saveOnboarding}
                disabled={data.goals.length === 0 || saving}
                className="flex-1 py-3 bg-[#fb8a99] hover:bg-[#e87a89] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* Plan Selection Step */}
        {step === 'plan' && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Choose your plan
              </h2>
              <p className="text-slate-400">
                All plans include a 14-day free trial. No credit card required.
              </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center mb-6">
              <div className="bg-slate-800 rounded-full p-1 flex">
                <button
                  onClick={() => setBilling('monthly')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    billing === 'monthly'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBilling('annual')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                    billing === 'annual'
                      ? 'bg-[#fb8a99] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Annual
                  <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Save 30%
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Pro Plan */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-white">Pro</h3>
                    <p className="text-slate-400 text-sm">For individual brokers</p>
                  </div>
                  <div className="text-right">
                    {billing === 'annual' ? (
                      <>
                        <div className="text-2xl font-bold text-white">£{prices.pro.annual}</div>
                        <div className="text-slate-500 text-sm">/month (billed yearly)</div>
                        <div className="text-green-400 text-xs">Save £588/year</div>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-white">£{prices.pro.monthly}</div>
                        <div className="text-slate-500 text-sm">/month</div>
                      </>
                    )}
                  </div>
                </div>
                <ul className="text-slate-300 text-sm space-y-1 mb-4">
                  <li>✓ Trading signals & forecasts</li>
                  <li>✓ Weather & demand analysis</li>
                  <li>✓ Contract comparison</li>
                </ul>
                <Link
                  href={`/api/checkout?plan=pro&billing=${billing}&email=${encodeURIComponent(user?.email || '')}&uid=${user?.id || ''}`}
                  className="block w-full py-3 text-center bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Agency Plan */}
              <div className="bg-gradient-to-b from-[#fb8a99]/10 to-slate-800/50 border-2 border-[#fb8a99]/50 rounded-xl p-5 relative">
                <div className="absolute -top-3 left-4 bg-[#fb8a99] text-white text-xs font-bold px-3 py-1 rounded-full">
                  RECOMMENDED
                </div>
                <div className="flex items-start justify-between mb-3 mt-2">
                  <div>
                    <h3 className="text-xl font-bold text-white">Agency</h3>
                    <p className="text-slate-400 text-sm">For brokerages & teams</p>
                  </div>
                  <div className="text-right">
                    {billing === 'annual' ? (
                      <>
                        <div className="text-2xl font-bold text-[#fb8a99]">£{prices.agency.annual}</div>
                        <div className="text-slate-500 text-sm">/month (billed yearly)</div>
                        <div className="text-green-400 text-xs">Save £1,088/year</div>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-[#fb8a99]">£{prices.agency.monthly}</div>
                        <div className="text-slate-500 text-sm">/month</div>
                      </>
                    )}
                  </div>
                </div>
                <ul className="text-slate-300 text-sm space-y-1 mb-4">
                  <li>✓ Everything in Pro</li>
                  <li className="text-white font-medium">★ White-label PDF reports</li>
                  <li className="text-white font-medium">★ Your branding & logo</li>
                </ul>
                <Link
                  href={`/api/checkout?plan=agency&billing=${billing}&email=${encodeURIComponent(user?.email || '')}&uid=${user?.id || ''}`}
                  className="block w-full py-3 text-center bg-[#fb8a99] hover:bg-[#e87a89] text-white font-semibold rounded-lg transition-colors"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>

            <p className="text-center text-slate-500 text-sm mt-6">
              Cancel anytime during your trial
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
