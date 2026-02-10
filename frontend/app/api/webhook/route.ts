import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_TO_TIER: Record<string, string> = {
  'price_1Syzr2BJnZ29CWvnMzTE5dQD': 'pro',      // Pro Monthly
  'price_1SyzpwBJnZ29CWvn3BF3baHL': 'pro',      // Pro Annual
  'price_1SyzhWBJnZ29CWvnGlOkhfO6': 'agency',   // Agency Monthly
  'price_1SyzhWBJnZ29CWvnraFAlK2J': 'agency',   // Agency Annual
}

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    let event: Stripe.Event

    // Verify webhook signature if secret is configured
    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        )
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    } else {
      // Development fallback
      event = JSON.parse(body) as Stripe.Event
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Webhook received:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const subscriptionId = session.subscription as string

        if (userId && subscriptionId) {
          // Fetch full subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const priceId = subscription.items.data[0]?.price.id
          const tier = PRICE_TO_TIER[priceId] || 'pro'

          const sub = subscription as any
          await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: sub.status,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscriptionId,
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              trial_end: sub.trial_end 
                ? new Date(sub.trial_end * 1000).toISOString() 
                : null,
              cancel_at_period_end: sub.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          console.log(`Checkout completed: User ${userId} subscribed to ${tier}`)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          const priceId = subscription.items.data[0]?.price.id
          const tier = PRICE_TO_TIER[priceId] || 'pro'

          await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_end: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString() 
                : null,
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id)

          console.log(`Subscription ${event.type}: User ${profile.id} - ${subscription.status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

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
              subscription_status: 'canceled',
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id)

          console.log(`Subscription deleted: User ${profile.id}`)
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id)

          console.log(`Invoice paid: User ${profile.id}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id)

          console.log(`Payment failed: User ${profile.id}`)
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
