import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_INFO: Record<string, { name: string; amount: number; interval: string }> = {
  'price_1Syzr2BJnZ29CWvnMzTE5dQD': { name: 'Pro', amount: 149, interval: 'month' },
  'price_1SyzpwBJnZ29CWvn3BF3baHL': { name: 'Pro', amount: 1200, interval: 'year' },
  'price_1SyzhWBJnZ29CWvnGlOkhfO6': { name: 'Agency', amount: 299, interval: 'month' },
  'price_1SyzhWBJnZ29CWvnraFAlK2J': { name: 'Agency', amount: 2500, interval: 'year' },
}

export async function GET(request: Request) {
  try {
    // Get user from session
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile with subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // If user has Stripe subscription, get live details
    let subscriptionDetails = null
    if (profile.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id) as Stripe.Subscription
        const priceId = subscription.items.data[0]?.price.id
        const priceInfo = priceId ? PRICE_INFO[priceId] : undefined

        subscriptionDetails = {
          status: subscription.status,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
          trialEnd: (subscription as any).trial_end 
            ? new Date((subscription as any).trial_end * 1000).toISOString() 
            : null,
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
          cancelAt: (subscription as any).cancel_at 
            ? new Date((subscription as any).cancel_at * 1000).toISOString() 
            : null,
          plan: priceInfo?.name || profile.subscription_tier,
          amount: priceInfo?.amount || 0,
          interval: priceInfo?.interval || 'month',
          priceId: priceId,
        }
      } catch (e) {
        console.log('Could not fetch Stripe subscription, using cached data')
      }
    }

    return NextResponse.json({
      tier: profile.subscription_tier || 'free',
      status: subscriptionDetails?.status || profile.subscription_status || 'none',
      trialEnd: subscriptionDetails?.trialEnd || profile.trial_end,
      currentPeriodEnd: subscriptionDetails?.currentPeriodEnd || profile.current_period_end,
      cancelAtPeriodEnd: subscriptionDetails?.cancelAtPeriodEnd || profile.cancel_at_period_end || false,
      plan: subscriptionDetails?.plan || profile.subscription_tier || 'Free',
      amount: subscriptionDetails?.amount || 0,
      interval: subscriptionDetails?.interval || null,
      hasSubscription: !!profile.stripe_subscription_id,
    })
  } catch (error: any) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
