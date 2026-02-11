import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(new URL('/login?error=auth_failed', 'https://lobster.energy'))
    }

    if (user) {
      // Check if user has completed onboarding and has a subscription
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, subscription_tier')
        .eq('id', user.id)
        .single()

      // If no subscription or onboarding not complete, go to onboarding
      if (!profile?.subscription_tier || profile.subscription_tier === 'free' || !profile?.onboarding_completed) {
        return NextResponse.redirect(new URL('/onboarding', 'https://lobster.energy'))
      }
    }
  }

  return NextResponse.redirect(new URL('/dashboard', 'https://lobster.energy'))
}
