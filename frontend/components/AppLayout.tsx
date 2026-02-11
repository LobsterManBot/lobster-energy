'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/signals', label: 'Signals', icon: '🎯' },
  { href: '/forecast', label: 'Forecast', icon: '📈' },
  { href: '/backtest', label: 'Backtest', icon: '📉' },
  { href: '/weather', label: 'Weather', icon: '🌤️' },
  { href: '/demand', label: 'Demand', icon: '⚡' },
  { href: '/compare', label: 'Compare', icon: '⚖️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

const agencyItems = [
  { href: '/reports', label: 'Reports', icon: '📄' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/lobster-logo.png" alt="Lobster Energy" className="h-10" />
              <span className="text-lg font-bold text-white hidden sm:block">Lobster Energy</span>
            </Link>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-[#fb8a99]/20 text-[#fb8a99]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Agency Menu */}
              <div className="relative ml-2">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    pathname === '/reports'
                      ? 'bg-[#fb8a99]/20 text-[#fb8a99]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  Agency
                  <svg className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
                    {agencyItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMenu(false)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm ${
                          pathname === item.href
                            ? 'bg-[#fb8a99]/20 text-[#fb8a99]'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                        }`}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                    <div className="border-t border-slate-700 my-1"></div>
                    <Link
                      href="/pricing"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50"
                    >
                      <span>💳</span>
                      Upgrade Plan
                    </Link>
                  </div>
                )}
              </div>
            </nav>

            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400 hidden md:block">{user.email}</span>
                <button
                  onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
                  className="text-sm text-slate-300 hover:text-white"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm text-[#fb8a99] hover:text-[#fca5b0]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-1 rounded-lg ${
                pathname === item.href
                  ? 'bg-[#fb8a99]/20 text-[#fb8a99]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          ))}
          {/* More menu on mobile */}
          <Link
            href="/reports"
            className={`flex flex-col items-center py-2 px-1 rounded-lg ${
              pathname === '/reports'
                ? 'bg-[#fb8a99]/20 text-[#fb8a99]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-lg">📄</span>
            <span className="text-[10px] mt-1">Reports</span>
          </Link>
          <Link
            href="/settings"
            className={`flex flex-col items-center py-2 px-1 rounded-lg ${
              pathname === '/settings'
                ? 'bg-[#fb8a99]/20 text-[#fb8a99]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-lg">⚙️</span>
            <span className="text-[10px] mt-1">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}
