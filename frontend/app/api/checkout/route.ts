import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_IDS = {
  pro: {
    monthly: 'price_1Syzr2BJnZ29CWvnMzTE5dQD',
    annual: 'price_1SyzpwBJnZ29CWvn3BF3baHL',
  },
  agency: {
    monthly: 'price_1SyzhWBJnZ29CWvnGlOkhfO6',
    annual: 'price_1SyzhWBJnZ29CWvnraFAlK2J',
  },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const plan = searchParams.get('plan') as 'pro' | 'agency'
  const billing = (searchParams.get('billing') || 'monthly') as 'monthly' | 'annual'

  if (!plan || !PRICE_IDS[plan]) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Get user from Supabase session
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
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  try {
    const priceId = PRICE_IDS[plan][billing]

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.id, // Link Stripe session to Supabase user
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          supabase_user_id: user.id,
        },
      },
      metadata: {
        supabase_user_id: user.id,
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
