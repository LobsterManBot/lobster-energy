'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src="/logo.png" alt="Lobster Energy" className="h-24 mx-auto mb-2" />
          </Link>
          <p className="text-slate-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
          {error && (
            <div className="mb-4 p-3 bg-[#fb8a99]/20 border border-[#fb8a99]/50 rounded-lg text-[#fca5b0] text-sm">
              {error}
            </div>
          )}

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
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#fb8a99] to-[#fb8a99] text-white font-semibold rounded-lg hover:from-[#e87a89] hover:to-[#e87a89] transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="mt-6 text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#fb8a99] hover:text-[#fca5b0]">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
