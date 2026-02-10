import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

    if (user) {
      // Check if user has completed onboarding and has a subscription
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, subscription_tier')
        .eq('id', user.id)
        .single()

      // If no subscription or onboarding not complete, go to onboarding
      if (!profile?.subscription_tier || profile.subscription_tier === 'free' || !profile?.onboarding_completed) {
        // Use production URL
        return NextResponse.redirect(new URL('/onboarding', 'https://lobster.energy'))
      }
    }
  }

  // Use production URL for redirect
  return NextResponse.redirect(new URL('/dashboard', 'https://lobster.energy'))
}
