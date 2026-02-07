'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '@/components/AppLayout'

interface BrandingSettings {
  company_name: string
  logo_url: string
  primary_color: string
  contact_email: string
  contact_phone: string
  website: string
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
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

    // Load existing settings
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    
    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/logo.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(fileName, file, { upsert: true })

    if (error) {
      setMessage({ type: 'error', text: 'Failed to upload logo' })
      setUploading(false)
      return
    }

    // Get public URL
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Branding Settings</h1>
        <p className="text-slate-400 mb-8">
          Customize your white-label reports with your company branding.
          <span className="text-[#fb8a99] ml-2">Agency plan feature</span>
        </p>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
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
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <p className="text-slate-500 text-sm mt-2">PNG or JPG, max 2MB</p>
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
    </AppLayout>
  )
}
