'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'
import Link from 'next/link'

interface BrandingSettings {
  company_name: string
  logo_url: string
  primary_color: string
  contact_email: string
  contact_phone: string
  website: string
}

interface SubscriptionInfo {
  tier: string
  status: string
  trialEnd: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  plan: string
  amount: number
  interval: string | null
  hasSubscription: boolean
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free')
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'subscription' | 'branding'>('subscription')
  
  const isAgency = subscriptionTier === 'agency'
  
  const [settings, setSettings] = useState<BrandingSettings>({
    company_name: '',
    logo_url: '',
    primary_color: '#fb8a99',
    contact_email: '',
    contact_phone: '',
    website: '',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }
    setUser(user)

    // Load subscription info
    try {
      const subRes = await fetch('/api/billing/subscription')
      if (subRes.ok) {
        const subData = await subRes.json()
        setSubscription(subData)
        setSubscriptionTier(subData.tier || 'free')
      }
    } catch (e) {
      console.log('Could not load subscription')
    }

    // Load existing branding settings
    const { data } = await supabase
      .from('branding_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setSettings({
        company_name: data.company_name || '',
        logo_url: data.logo_url || '',
        primary_color: data.primary_color || '#fb8a99',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        website: data.website || '',
      })
    }
    setLoading(false)
  }

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: data.error || 'Could not open billing portal' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to open billing portal' })
    }
    setPortalLoading(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Invalid format. Please upload PNG, JPG, SVG, or WebP.' })
      return
    }

    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      setMessage({ type: 'error', text: 'File too large. Maximum size is 2MB.' })
      return
    }

    setUploading(true)
    
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const fileName = `${user.id}/logo.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(fileName, file, { upsert: true })

    if (error) {
      setMessage({ type: 'error', text: `Upload failed: ${error.message}` })
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName)

    setSettings(prev => ({ ...prev, logo_url: publicUrl }))
    setUploading(false)
    setMessage({ type: 'success', text: 'Logo uploaded!' })
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)

    const { error } = await supabase
      .from('branding_settings')
      .upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } else {
      setMessage({ type: 'success', text: 'Settings saved!' })
    }
    setSaving(false)
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
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

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('subscription')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'subscription'
                ? 'bg-[#fb8a99] text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Subscription
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'branding'
                ? 'bg-[#fb8a99] text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Branding
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Current Plan</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-2xl font-bold ${
                      subscription?.tier === 'agency' ? 'text-purple-400' :
                      subscription?.tier === 'pro' ? 'text-[#fb8a99]' : 'text-slate-400'
                    }`}>
                      {subscription?.plan || 'Free'}
                    </span>
                    {subscription?.interval && (
                      <span className="text-slate-500 text-sm">
                        / {subscription.interval}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  subscription?.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  subscription?.status === 'trialing' ? 'bg-blue-500/20 text-blue-400' :
                  subscription?.status === 'past_due' ? 'bg-red-500/20 text-red-400' :
                  subscription?.status === 'canceled' ? 'bg-slate-500/20 text-slate-400' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {subscription?.status === 'trialing' ? '🎉 Trial' :
                   subscription?.status === 'active' ? '✓ Active' :
                   subscription?.status === 'past_due' ? '⚠️ Past Due' :
                   subscription?.status === 'canceled' ? 'Canceled' :
                   'No Plan'}
                </div>
              </div>

              {/* Subscription Details */}
              {subscription?.hasSubscription && (
                <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-700">
                  {subscription.status === 'trialing' && subscription.trialEnd && (
                    <div>
                      <div className="text-slate-500 text-sm">Trial Ends</div>
                      <div className="text-white font-medium">{formatDate(subscription.trialEnd)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-slate-500 text-sm">
                      {subscription.cancelAtPeriodEnd ? 'Access Until' : 'Next Payment'}
                    </div>
                    <div className="text-white font-medium">{formatDate(subscription.currentPeriodEnd)}</div>
                  </div>
                  {subscription.amount > 0 && !subscription.cancelAtPeriodEnd && (
                    <div>
                      <div className="text-slate-500 text-sm">Amount</div>
                      <div className="text-white font-medium">
                        £{subscription.amount}
                        {subscription.interval === 'year' ? '/year' : '/month'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cancellation Notice */}
              {subscription?.cancelAtPeriodEnd && (
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-400">
                    <span>⚠️</span>
                    <span className="font-medium">Subscription ending</span>
                  </div>
                  <p className="text-slate-300 text-sm mt-1">
                    Your subscription will end on {formatDate(subscription.currentPeriodEnd)}. 
                    You'll keep access until then.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mt-6">
                {subscription?.hasSubscription ? (
                  <>
                    <button
                      onClick={openPortal}
                      disabled={portalLoading}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {portalLoading ? 'Loading...' : 'Manage Subscription'}
                    </button>
                    {subscription.tier === 'pro' && (
                      <Link
                        href="/pricing"
                        className="px-4 py-2 bg-[#fb8a99] hover:bg-[#e87a89] text-white rounded-lg transition-colors"
                      >
                        Upgrade to Agency
                      </Link>
                    )}
                  </>
                ) : (
                  <Link
                    href="/pricing"
                    className="px-4 py-2 bg-[#fb8a99] hover:bg-[#e87a89] text-white rounded-lg transition-colors"
                  >
                    Choose a Plan
                  </Link>
                )}
              </div>
            </div>

            {/* What's Included */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">What's Included</h2>
              <div className="space-y-3">
                <Feature included={true} text="Real-time trading signals" />
                <Feature included={true} text="Price forecasts (7-90 days)" />
                <Feature included={true} text="Weather & demand analysis" />
                <Feature included={true} text="Contract comparison tools" />
                <Feature included={isAgency} text="White-label PDF reports" pro />
                <Feature included={isAgency} text="Custom branding" pro />
              </div>
              {!isAgency && (
                <Link
                  href="/pricing"
                  className="block mt-4 text-[#fb8a99] hover:text-[#fca5b0] text-sm"
                >
                  View all features →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <p className="text-slate-400">
              Customize your white-label reports with your company branding.
              <span className="text-[#fb8a99] ml-2">Agency plan feature</span>
            </p>

            {!isAgency && (
              <div className="p-6 bg-gradient-to-r from-[#fb8a99]/20 to-slate-800/50 border border-[#fb8a99]/30 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-2">🔒 Agency Feature</h3>
                <p className="text-slate-300 mb-4">
                  White-label branding is available on the Agency plan. Add your logo and company details to create professional reports for your clients.
                </p>
                <Link 
                  href="/pricing" 
                  className="inline-block bg-[#fb8a99] hover:bg-[#e87a89] text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Upgrade to Agency
                </Link>
              </div>
            )}

            <div className={`space-y-6 ${!isAgency ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Logo Upload */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Company Logo</h2>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-slate-500 text-sm">No logo</span>
                    )}
                  </div>
                  <div>
                    <label className="block">
                      <span className="bg-[#fb8a99] hover:bg-[#e87a89] text-white px-4 py-2 rounded-lg cursor-pointer inline-block transition-colors">
                        {uploading ? 'Uploading...' : 'Upload Logo'}
                      </span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg,.webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    <p className="text-slate-500 text-sm mt-2">PNG, JPG, SVG, or WebP · Max 2MB</p>
                  </div>
                </div>
              </div>

              {/* Company Details */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Company Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">Company Name</label>
                    <input
                      type="text"
                      value={settings.company_name}
                      onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Your Company Ltd"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#fb8a99]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={settings.contact_email}
                      onChange={(e) => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="hello@yourcompany.com"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#fb8a99]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={settings.contact_phone}
                      onChange={(e) => setSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="+44 20 1234 5678"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#fb8a99]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">Website</label>
                    <input
                      type="url"
                      value={settings.website}
                      onChange={(e) => setSettings(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourcompany.com"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#fb8a99]"
                    />
                  </div>
                </div>
              </div>

              {/* Brand Color */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Brand Color</h2>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-12 h-12 rounded-lg cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={settings.primary_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white w-32 focus:outline-none focus:border-[#fb8a99]"
                  />
                  <span className="text-slate-500 text-sm">Used in report headers</span>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#fb8a99] hover:bg-[#e87a89] text-white py-4 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function Feature({ included, text, pro }: { included: boolean; text: string; pro?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={included ? 'text-green-400' : 'text-slate-600'}>
        {included ? '✓' : '✗'}
      </span>
      <span className={included ? 'text-slate-200' : 'text-slate-500'}>{text}</span>
      {pro && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Agency</span>}
    </div>
  )
}
