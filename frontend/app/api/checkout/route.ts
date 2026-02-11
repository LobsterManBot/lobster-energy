import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: 'price_1Syzr2BJnZ29CWvnMzTE5dQD',
    annual: 'price_1SyzpwBJnZ29CWvn3BF3baHL',
  },
  agency: {
    monthly: 'price_1SyzhWBJnZ29CWvnGlOkhfO6',
    annual: 'price_1SyzhWBJnZ29CWvnraFAlK2J',
  },
}

const PRICE_TO_TIER: Record<string, string> = {
  'price_1Syzr2BJnZ29CWvnMzTE5dQD': 'pro',
  'price_1SyzpwBJnZ29CWvn3BF3baHL': 'pro',
  'price_1SyzhWBJnZ29CWvnGlOkhfO6': 'agency',
  'price_1SyzhWBJnZ29CWvnraFAlK2J': 'agency',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const plan = searchParams.get('plan') as 'pro' | 'agency'
  const billing = (searchParams.get('billing') || 'monthly') as 'monthly' | 'annual'
  
  // Get user info from query params (fallback if cookies don't work)
  const emailParam = searchParams.get('email')
  const uidParam = searchParams.get('uid')

  if (!plan || !PRICE_IDS[plan]) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Try to get user from Supabase session first
  let userEmail: string | null = emailParam
  let userId: string | null = uidParam

  try {
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
    
    if (user) {
      userEmail = user.email || null
      userId = user.id
    }
  } catch (e) {
    // Cookie reading failed, use query params
    console.log('Cookie reading failed, using query params')
  }

  // If no user info available at all, redirect to login
  if (!userEmail || !userId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  try {
    const priceId = PRICE_IDS[plan][billing]

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      client_reference_id: userId, // Link Stripe session to Supabase user
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          supabase_user_id: userId,
        },
      },
      metadata: {
        supabase_user_id: userId,
      },
      success_url: `https://lobster.energy/welcome`,
      cancel_url: `https://lobster.energy/onboarding`,
      allow_promotion_codes: true,
    })

    return NextResponse.redirect(session.url!)
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.redirect(
      new URL(`/onboarding?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }
}

// POST handler for upgrades and programmatic checkout
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tier, billing, userId } = body

    if (!tier || !PRICE_IDS[tier]) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const priceId = PRICE_IDS[tier][billing || 'monthly']

    // Get user profile to check for existing subscription
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, stripe_customer_id, stripe_subscription_id, subscription_tier')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If user has existing subscription, upgrade it
    if (profile.stripe_subscription_id) {
      try {
        // Get current subscription
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
        
        // Update subscription to new price
        const updatedSubscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
          items: [{
            id: subscription.items.data[0].id,
            price: priceId,
          }],
          proration_behavior: 'create_prorations',
        })

        // Update database
        const newTier = PRICE_TO_TIER[priceId] || tier
        await supabase
          .from('profiles')
          .update({
            subscription_tier: newTier,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        return NextResponse.json({ 
          success: true, 
          message: `Upgraded to ${newTier}`,
          url: '/settings?upgraded=true'
        })
      } catch (stripeError: any) {
        console.error('Upgrade error:', stripeError)
        return NextResponse.json({ error: stripeError.message }, { status: 400 })
      }
    }

    // No existing subscription - create new checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: profile.email,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_user_id: userId },
      },
      metadata: { supabase_user_id: userId },
      success_url: 'https://lobster.energy/welcome',
      cancel_url: 'https://lobster.energy/pricing',
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
