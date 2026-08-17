import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getStripe, priceIdForPlan } from '@/lib/stripe'

export async function POST(request: Request) {
  const { venueId, plan } = await request.json()
  if (!venueId || !plan) {
    return NextResponse.json({ error: 'venueId and plan are required' }, { status: 400 })
  }

  const priceId = priceIdForPlan(plan)
  if (!priceId) {
    return NextResponse.json({ error: `Unknown plan "${plan}"` }, { status: 400 })
  }

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // Only the venue's own owner may start a checkout for it.
  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, stripe_customer_id')
    .eq('id', venueId)
    .eq('owner_id', user.id)
    .single()
  if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 })

  const { origin } = new URL(request.url)

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer: venue.stripe_customer_id ?? undefined,
    customer_email: venue.stripe_customer_id ? undefined : user.email ?? undefined,
    client_reference_id: venue.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { venue_id: venue.id } },
    metadata: { venue_id: venue.id, plan },
    success_url: `${origin}/dashboard/billing?success=1`,
    cancel_url: `${origin}/dashboard/billing?canceled=1`,
  })

  return NextResponse.json({ url: session.url })
}
