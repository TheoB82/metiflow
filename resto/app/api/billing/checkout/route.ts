import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getStripe, priceIdForPlan } from '@/lib/stripe'

export async function POST(request: Request) {
  const { plan } = await request.json()
  if (!plan) {
    return NextResponse.json({ error: 'plan is required' }, { status: 400 })
  }

  const priceId = priceIdForPlan(plan)
  if (!priceId) {
    return NextResponse.json({ error: `Unknown plan "${plan}"` }, { status: 400 })
  }

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // One Stripe subscription covers the owner's whole account — every venue
  // they own, not just one — so checkout is scoped to the owner, not a venue.
  const { data: venues } = await supabase
    .from('venues')
    .select('id, stripe_customer_id')
    .eq('owner_id', user.id)
  if (!venues || venues.length === 0) {
    return NextResponse.json({ error: 'No venues found for this account' }, { status: 404 })
  }

  const existingCustomerId = venues.find(v => v.stripe_customer_id)?.stripe_customer_id
  const addonPriceId = priceIdForPlan('addon')
  const extraVenues = venues.length - 1

  const lineItems: Array<{ price: string; quantity: number }> = [
    { price: priceId, quantity: 1 },
  ]
  if (extraVenues > 0) {
    if (!addonPriceId) {
      return NextResponse.json({ error: 'Extra-venue pricing is not configured' }, { status: 500 })
    }
    lineItems.push({ price: addonPriceId, quantity: extraVenues })
  }

  const { origin } = new URL(request.url)

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer: existingCustomerId ?? undefined,
    customer_email: existingCustomerId ? undefined : user.email ?? undefined,
    client_reference_id: user.id,
    line_items: lineItems,
    subscription_data: { metadata: { owner_id: user.id } },
    metadata: { owner_id: user.id, plan },
    success_url: `${origin}/dashboard/billing?success=1`,
    cancel_url: `${origin}/dashboard/billing?canceled=1`,
  })

  return NextResponse.json({ url: session.url })
}
