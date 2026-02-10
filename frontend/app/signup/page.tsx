'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company: company,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // If email verification is disabled, user is auto signed in
    // But if not, we need to sign them in manually
    if (!data.session) {
      // Sign in the user after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
    }

    // Go to onboarding
    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src="/logo.png" alt="Lobster Energy" className="h-24 mx-auto mb-2" />
          </Link>
          <p className="text-slate-400">Create your account</p>
        </div>

        <form onSubmit={handleSignup} className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
          {error && (
            <div className="mb-4 p-3 bg-[#fb8a99]/20 border border-[#fb8a99]/50 rounded-lg text-[#fca5b0] text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fb8a99] focus:border-transparent"
              placeholder="John Smith"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fb8a99] focus:border-transparent"
              placeholder="Acme Corp"
            />
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fb8a99] focus:border-transparent"
              placeholder="you@company.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fb8a99] focus:border-transparent"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#fb8a99] to-[#fb8a99] text-white font-semibold rounded-lg hover:from-[#e87a89] hover:to-[#e87a89] transition-all disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="mt-6 text-center text-slate-400 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-[#fb8a99] hover:text-[#fca5b0]">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
