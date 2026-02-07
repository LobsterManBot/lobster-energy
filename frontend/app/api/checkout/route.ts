import { NextResponse } from 'next/server'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

// Price IDs for each tier and billing period
const PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRO_PRICE_ID || 'price_1SyHcYBsXsZR366OFu6uHm8B',
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_1SyHikBsXsZR366ODVr1diNa',
  },
  agency: {
    monthly: process.env.STRIPE_AGENCY_PRICE_ID || 'price_1SyKEhBsXsZR366OUhaDODX8',
    annual: process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID || 'price_1SyKEmBsXsZR366O7TX1neoC',
  },
}

export async function POST(request: Request) {
  try {
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured. Add STRIPE_SECRET_KEY to environment.' },
        { status: 500 }
      )
    }

    const { tier = 'pro', billing = 'monthly', userId, plan } = await request.json()
    
    // Support legacy 'plan' parameter (monthly/annual)
    let actualTier = tier
    let actualBilling = billing
    if (plan && !tier) {
      actualTier = 'pro'
      actualBilling = plan
    }
    
    const priceId = PRICE_IDS[actualTier as keyof typeof PRICE_IDS]?.[actualBilling as 'monthly' | 'annual']
    
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid tier or billing period' }, { status: 400 })
    }

    // Create Stripe checkout session with 14-day trial
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'payment_method_types[0]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'subscription_data[trial_period_days]': '14',
        'allow_promotion_codes': 'true',
        'success_url': `${process.env.NEXT_PUBLIC_APP_URL || 'https://lobster.energy'}/dashboard?success=true`,
        'cancel_url': `${process.env.NEXT_PUBLIC_APP_URL || 'https://lobster.energy'}/pricing`,
        'client_reference_id': userId || '',
        'subscription_data[metadata][userId]': userId || '',
        'subscription_data[metadata][tier]': actualTier,
      }),
    })

    const session = await response.json()

    if (session.error) {
      return NextResponse.json({ error: session.error.message }, { status: 400 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
