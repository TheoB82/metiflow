import { NextResponse } from 'next/server'
import { HQ_PLANS, isHqRequest, type HqPlan } from '@/lib/hqApi'
import { createAdminSupabase } from '@/lib/supabase-server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST /api/hq/license — Metiflow HQ's manual licence actions. One Stripe
// subscription covers an owner's whole account, so every action applies to
// all of that owner's venues. Stripe-driven changes keep arriving through the
// Stripe webhook as before.
//   { ownerId, action: 'activate', plan, days | null }  (null days = no expiry)
//   { ownerId, action: 'extend', days }
//   { ownerId, action: 'revoke' }
export async function POST(request: Request) {
  if (!isHqRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const ownerId = String(body?.ownerId ?? '')
  const action = String(body?.action ?? '')
  if (!UUID.test(ownerId)) return NextResponse.json({ error: 'Invalid ownerId' }, { status: 400 })

  const days = body?.days == null ? null : Number(body.days)
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) {
    return NextResponse.json({ error: 'days must be a whole number from 1 to 3650' }, { status: 400 })
  }

  const supabase = createAdminSupabase()
  let update: Record<string, unknown>

  if (action === 'activate') {
    const plan = String(body?.plan ?? '') as HqPlan
    if (!HQ_PLANS.includes(plan)) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
    update = {
      plan,
      license_expires_at: plan === 'lifetime' || days === null ? null : Date.now() + days * 86_400_000,
    }
  } else if (action === 'extend') {
    if (days === null) return NextResponse.json({ error: 'days is required' }, { status: 400 })
    // Extend from now or from the account's current expiry, whichever is later.
    const { data } = await supabase
      .from('venues').select('license_expires_at').eq('owner_id', ownerId).limit(1).maybeSingle()
    const base = Math.max(Date.now(), (data?.license_expires_at as number | null) ?? Date.now())
    update = { license_expires_at: base + days * 86_400_000 }
  } else if (action === 'revoke') {
    update = { plan: 'trial', license_expires_at: Date.now() - 1 }
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { data: changed, error } = await supabase
    .from('venues').update(update).eq('owner_id', ownerId).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!changed?.length) return NextResponse.json({ error: 'No venues for that owner' }, { status: 404 })

  return NextResponse.json({ ok: true, venuesUpdated: changed.length })
}
