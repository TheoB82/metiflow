import { NextResponse } from 'next/server'
import { isHqRequest } from '@/lib/hqApi'
import { createAdminSupabase } from '@/lib/supabase-server'

// GET /api/hq/accounts — every owner account with its email and venues, for
// Metiflow HQ's customer list and licence page.
export async function GET(request: Request) {
  if (!isHqRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminSupabase()
  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, name, address, plan, license_expires_at, created_at, subscription_status, stripe_subscription_id, stripe_customer_id, owner_id')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const emails: Record<string, string> = {}
  const perPage = 1000
  for (let page = 1; ; page++) {
    const { data, error: usersError } = await supabase.auth.admin.listUsers({ page, perPage })
    if (usersError || !data) break
    for (const u of data.users) if (u.email) emails[u.id] = u.email
    if (data.users.length < perPage) break
  }

  const accounts = new Map<string, { ownerId: string; email: string | null; createdAt: string; venues: typeof venues }>()
  for (const venue of venues ?? []) {
    const ownerId = venue.owner_id ?? 'unowned'
    if (!accounts.has(ownerId)) {
      accounts.set(ownerId, { ownerId, email: emails[ownerId] ?? null, createdAt: venue.created_at, venues: [] })
    }
    accounts.get(ownerId)!.venues.push(venue)
  }

  return NextResponse.json({ accounts: [...accounts.values()] }, { headers: { 'Cache-Control': 'no-store' } })
}
