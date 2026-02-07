'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TPILandingPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Nav */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center animate-fade-in">
        <div className="flex items-center gap-2">
          <img src="/lobster-logo.png" alt="Lobster Energy" className="h-12 animate-float" />
          <span className="text-xl font-bold text-white">Lobster Energy</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="text-slate-300 hover:text-white px-4 py-2 transition-colors">Login</Link>
          <Link href="/signup" className="bg-[#fb8a99] hover:bg-[#e87a89] text-white px-4 py-2 rounded-lg font-medium btn-shine transition-all hover:scale-105">
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <div className="inline-block px-4 py-1 bg-[#fb8a99]/20 text-[#fb8a99] rounded-full text-sm font-medium mb-6 animate-fade-in-up opacity-0" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
          Built for Energy Brokers & TPIs
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in-up opacity-0" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
          Win More Clients With<br />
          <span className="gradient-text-shimmer">AI-Powered Market Intelligence</span>
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto animate-fade-in-up opacity-0" style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}>
          Stop guessing when to advise clients to buy. Get data-backed signals that 
          build trust, close deals, and keep clients coming back.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up opacity-0" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
          <Link 
            href="/signup" 
            className="bg-[#fb8a99] hover:bg-[#e87a89] text-white px-8 py-4 rounded-lg font-semibold text-lg btn-shine animate-pulse-glow transition-all hover:scale-105"
          >
            Start 14-Day Free Trial
          </Link>
          <a 
            href="#demo" 
            className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105"
          >
            See How It Works
          </a>
        </div>
        <p className="text-slate-500 mt-4 text-sm animate-fade-in opacity-0" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}}>No credit card required • Cancel anytime</p>
      </section>

      {/* Pain Points */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
          Sound Familiar?
        </h2>
        <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          Every energy broker faces these challenges
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-[#fb8a99]/10 border border-[#fb8a99]/30 rounded-xl p-6 card-hover">
            <div className="text-3xl mb-3">😰</div>
            <h3 className="text-lg font-semibold text-white mb-2">"Should we buy now?"</h3>
            <p className="text-slate-400 text-sm">Clients ask for timing advice but you're guessing based on gut feel and yesterday's news.</p>
          </div>
          <div className="bg-[#fb8a99]/10 border border-[#fb8a99]/30 rounded-xl p-6 card-hover">
            <div className="text-3xl mb-3">🏃</div>
            <h3 className="text-lg font-semibold text-white mb-2">Competing on price alone</h3>
            <p className="text-slate-400 text-sm">Every broker has the same suppliers. Hard to differentiate when you're all quoting the same rates.</p>
          </div>
          <div className="bg-[#fb8a99]/10 border border-[#fb8a99]/30 rounded-xl p-6 card-hover">
            <div className="text-3xl mb-3">👋</div>
            <h3 className="text-lg font-semibold text-white mb-2">Clients shop around</h3>
            <p className="text-slate-400 text-sm">You place a contract, then don't hear from them for 2 years until renewal. No ongoing relationship.</p>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="container mx-auto px-4 py-16" id="demo">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
          Become Their Trusted Energy Advisor
        </h2>
        <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          Lobster Energy gives you the data to back up your recommendations
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 card-hover group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Real-Time Trading Signals</h3>
            </div>
            <p className="text-slate-400 mb-4">
              Clear BUY / WAIT / HOLD recommendations based on live market data. 
              Know exactly when to tell clients to lock in rates.
            </p>
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 inline-block">
              <span className="text-green-400 font-semibold">🟢 BUY - Prices in bottom 25%</span>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 card-hover group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Price Forecasts</h3>
            </div>
            <p className="text-slate-400 mb-4">
              7-90 day price predictions powered by ML. Show clients where the market 
              is heading and why now is (or isn't) the time to buy.
            </p>
            <div className="text-slate-300 text-sm">
              "Prices expected to rise 8% over next 30 days"
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 card-hover group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Backtest Results</h3>
            </div>
            <p className="text-slate-400 mb-4">
              Prove your advice works. Show clients the historical performance 
              of signal-based buying vs. random timing.
            </p>
            <div className="text-slate-300 text-sm">
              <span className="text-green-400 font-semibold">4% average savings</span> vs. buying blind
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 card-hover group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">🌤️</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Weather Impact Analysis</h3>
            </div>
            <p className="text-slate-400 mb-4">
              Understand how weather affects prices before it happens. 
              Cold snap coming? Prices will rise. Wind picking up? Prices drop.
            </p>
            <div className="text-slate-300 text-sm">
              "High wind forecast → expect downward price pressure"
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Results */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-[#fb8a99]/20 via-purple-500/10 to-[#fb8a99]/20 border border-[#fb8a99]/30 rounded-2xl p-8 md:p-12 max-w-4xl mx-auto text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-pulse"></div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 relative">
            The Numbers Don't Lie
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="group">
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2 group-hover:scale-110 transition-transform">4%</div>
              <div className="text-slate-300">Average savings vs. buying blind</div>
            </div>
            <div className="group">
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2 group-hover:scale-110 transition-transform">£33k</div>
              <div className="text-slate-300">Annual savings per 1MW client</div>
            </div>
            <div className="group">
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2 group-hover:scale-110 transition-transform">24/7</div>
              <div className="text-slate-300">Real-time BMRS market data</div>
            </div>
          </div>
        </div>
      </section>

      {/* How TPIs Use It */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
          How Brokers Use Lobster Energy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">1️⃣</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Check the Signal</h3>
            <p className="text-slate-400">
              Start your day with the current market signal. BUY, WAIT, or HOLD - instantly know the market conditions.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">2️⃣</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Advise Clients</h3>
            <p className="text-slate-400">
              Call clients with data-backed recommendations. "The market is in the bottom 20% - good time to lock in."
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">3️⃣</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Build Trust</h3>
            <p className="text-slate-400">
              Clients see you as an advisor, not just a broker. They come back because you add real value.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-16" id="pricing">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
          Choose Your Plan
        </h2>
        <p className="text-slate-400 text-center mb-12">
          14-day free trial on all plans. No credit card required.
        </p>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Pro Tier */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 card-hover">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
              <p className="text-slate-400 text-sm mb-4">For individual brokers</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-white">£149</span>
                <span className="text-slate-400">/month</span>
              </div>
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
                <span className="text-green-400">✓</span> Weather & demand data
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> Contract comparison
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span> Email support
              </li>
            </ul>

            <Link
              href="/signup"
              className="block w-full py-4 text-center bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-lg transition-all hover:scale-105"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Agency Tier */}
          <div className="bg-gradient-to-b from-[#fb8a99]/10 to-slate-800/50 rounded-2xl p-8 border-2 border-[#fb8a99]/50 card-hover relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-[#fb8a99] text-white text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Agency</h3>
              <p className="text-slate-400 text-sm mb-4">For brokerages & teams</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold gradient-text">£299</span>
                <span className="text-slate-400">/month</span>
              </div>
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
            </ul>

            <Link
              href="/signup"
              className="block w-full py-4 text-center bg-[#fb8a99] hover:bg-[#e87a89] text-white font-semibold rounded-lg text-lg btn-shine transition-all hover:scale-105"
            >
              Start Free Trial
            </Link>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link href="/pricing" className="text-[#fb8a99] hover:text-[#fca5b0]">
            View full pricing details & annual discounts →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
          Questions?
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Where does the data come from?</h3>
            <p className="text-slate-400">
              All price data comes from BMRS (Balancing Mechanism Reporting Service) - the official UK government 
              source for electricity market data. Weather data from Open-Meteo.
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">How accurate are the signals?</h3>
            <p className="text-slate-400">
              Our backtest shows the signal strategy outperformed naive buying by ~4% over the test period. 
              Past performance doesn't guarantee future results, but the data-driven approach consistently 
              identifies favorable buying windows.
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Can I share this with my clients?</h3>
            <p className="text-slate-400">
              Yes! Use the insights in your client conversations. For white-label reports with your branding, 
              contact us about our Agency plan.
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">What if I'm not happy?</h3>
            <p className="text-slate-400">
              Cancel anytime during your trial and pay nothing. After that, cancel with one click - 
              no contracts, no hassle.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-20 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#fb8a99]/5 via-purple-500/5 to-[#fb8a99]/5 rounded-3xl"></div>
        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to <span className="gradient-text">win more clients</span>?
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Join smart energy brokers using data to stand out from the competition.
          </p>
          <Link 
            href="/signup" 
            className="inline-block bg-[#fb8a99] hover:bg-[#e87a89] text-white px-8 py-4 rounded-lg font-semibold text-lg btn-shine animate-pulse-glow transition-all hover:scale-105"
          >
            Start Your Free Trial
          </Link>
          <p className="text-slate-500 mt-4 text-sm">
            14 days free • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-8">
        <div className="container mx-auto px-4 text-center text-slate-500">
          <p>© 2026 Lobster Energy. Made in the UK 🇬🇧</p>
        </div>
      </footer>
    </div>
  );
}
