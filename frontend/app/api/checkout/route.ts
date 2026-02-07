import { NextResponse } from 'next/server'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || 'price_1SyHcYBsXsZR366OFu6uHm8B'
const STRIPE_ANNUAL_PRICE_ID = process.env.STRIPE_ANNUAL_PRICE_ID || 'price_1SyHikBsXsZR366ODVr1diNa'

export async function POST(request: Request) {
  try {
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured. Add STRIPE_SECRET_KEY to environment.' },
        { status: 500 }
      )
    }

    const { plan, userId } = await request.json()
    
    const priceId = plan === 'annual' ? STRIPE_ANNUAL_PRICE_ID : STRIPE_PRO_PRICE_ID

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
        'success_url': `${process.env.NEXT_PUBLIC_APP_URL || 'https://lobster-energy.vercel.app'}/dashboard?success=true`,
        'cancel_url': `${process.env.NEXT_PUBLIC_APP_URL || 'https://lobster-energy.vercel.app'}/pricing`,
        'client_reference_id': userId || '',
        'subscription_data[metadata][userId]': userId || '',
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
