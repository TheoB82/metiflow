import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe, planForPriceId } from '@/lib/stripe'
import { createAdminSupabase } from '@/lib/supabase-server'

// current_period_end lives on the subscription item, not the subscription itself.
function periodEndMs(subscription: Stripe.Subscription): number | null {
  const end = subscription.items.data[0]?.current_period_end
  return end ? end * 1000 : null
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 })
  }

  const supabase = createAdminSupabase()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const venueId = session.metadata?.venue_id ?? session.client_reference_id
      const plan = session.metadata?.plan
      if (!venueId || !session.subscription || typeof session.customer !== 'string') break

      const subscription = await getStripe().subscriptions.retrieve(session.subscription as string)
      await supabase.from('venues').update({
        plan: plan ?? planForPriceId(subscription.items.data[0]?.price.id ?? '') ?? 'basic_online',
        stripe_customer_id: session.customer,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        license_expires_at: periodEndMs(subscription),
      }).eq('id', venueId)
      break
    }

    // Renewal payment succeeded — push the expiry out to the new period end.
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = (invoice as unknown as { subscription: string | null }).subscription
      if (!subscriptionId) break
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
      await supabase.from('venues').update({
        subscription_status: subscription.status,
        license_expires_at: periodEndMs(subscription),
      }).eq('stripe_subscription_id', subscription.id)
      break
    }

    // Renewal payment failed / subscription otherwise changed status.
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      await supabase.from('venues').update({
        subscription_status: subscription.status,
      }).eq('stripe_subscription_id', subscription.id)
      break
    }

    // Subscription canceled — gate the account immediately.
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await supabase.from('venues').update({
        subscription_status: 'canceled',
        license_expires_at: Date.now(),
      }).eq('stripe_subscription_id', subscription.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
