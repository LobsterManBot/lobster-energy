import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('Stripe webhook secret not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    // In production, verify the webhook signature
    // For now, we'll parse the event directly
    const event = JSON.parse(body)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.client_reference_id || session.subscription_data?.metadata?.userId
        const subscriptionId = session.subscription

        if (userId) {
          // Get subscription details
          const subResponse = await fetch(
            `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
            {
              headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` },
            }
          )
          const subscription = await subResponse.json()
          
          // Determine tier from price
          const priceId = subscription.items?.data?.[0]?.price?.id
          const agencyPrices = [
            process.env.STRIPE_AGENCY_PRICE_ID,
            process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID,
          ]
          const tier = agencyPrices.includes(priceId) ? 'agency' : 'pro'

          // Update user profile
          await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: 'active',
              stripe_customer_id: session.customer,
              stripe_subscription_id: subscriptionId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          console.log(`Updated user ${userId} to ${tier}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          const status = subscription.status === 'active' ? 'active' : 
                        subscription.status === 'past_due' ? 'past_due' : 'cancelled'
          
          await supabase
            .from('profiles')
            .update({
              subscription_status: status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'free',
              subscription_status: 'cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
