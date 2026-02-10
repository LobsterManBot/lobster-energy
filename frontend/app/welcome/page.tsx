'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import confetti from 'canvas-confetti'

// Lobster confetti celebration
function fireLobsterConfetti() {
  const duration = 4000
  const end = Date.now() + duration

  // Custom lobster shape
  const lobsterEmoji = confetti.shapeFromText({ text: '🦞', scalar: 2 })
  
  // Initial big burst
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#fb8a99', '#f472b6', '#c084fc', '#ffffff'],
  })

  // Continuous lobster rain
  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      shapes: [lobsterEmoji],
      scalar: 2,
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      shapes: [lobsterEmoji],
      scalar: 2,
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }
  
  frame()
}

export default function WelcomePage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Fire confetti on mount
    fireLobsterConfetti()

    // Countdown to dashboard
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          router.push('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
        <div className="animate-bounce text-8xl mb-6">🦞</div>
        
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to Lobster Energy!
        </h1>
        
        <p className="text-xl text-slate-300 mb-2">
          Your 14-day free trial has started
        </p>
        
        <p className="text-slate-400 mb-8">
          You now have full access to all features. Let's get you set up!
        </p>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">What's next?</h2>
          <ul className="text-left text-slate-300 space-y-3">
            <li className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              <span>Check today's trading signal</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              <span>Explore price forecasts</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              <span>Set up your branding (Agency)</span>
            </li>
          </ul>
        </div>

        <Link
          href="/dashboard"
          className="inline-block px-8 py-4 bg-[#fb8a99] hover:bg-[#e87a89] text-white font-semibold rounded-lg text-lg transition-all hover:scale-105"
        >
          Go to Dashboard →
        </Link>

        <p className="text-slate-500 text-sm mt-4">
          Redirecting in {countdown} seconds...
        </p>
      </div>
    </div>
  )
}
