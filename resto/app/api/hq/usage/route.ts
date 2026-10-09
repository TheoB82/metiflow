import { NextResponse } from 'next/server'
import { isHqRequest } from '@/lib/hqApi'
import { createAdminSupabase } from '@/lib/supabase-server'

// GET /api/hq/usage?weeks=12 — weekly totals for Metiflow HQ's Traffic page:
// new owner accounts, new venues, venues that took orders, and order counts.
// Totals only; no names, emails or order contents leave RestoFlow.

function weekStart(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)) // Monday
  return x.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  if (!isHqRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weeks = Math.min(104, Math.max(1, Number(new URL(request.url).searchParams.get('weeks')) || 12))
  const first = new Date(weekStart(new Date()))
  first.setUTCDate(first.getUTCDate() - 7 * (weeks - 1))

  const supabase = createAdminSupabase()
  const { data: venues, error } = await supabase.from('venues').select('id, owner_id, created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Page through orders in range (PostgREST returns at most 1000 rows a call).
  const orders: { venue_id: string; created_at: string }[] = []
  for (let from = 0; from < 200_000; from += 1000) {
    const { data, error: ordersError } = await supabase
      .from('orders')
      .select('venue_id, created_at')
      .gte('created_at', first.toISOString())
      .order('created_at', { ascending: true })
      .range(from, from + 999)
    if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 })
    orders.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  const rows = new Map<string, { week: string; newAccounts: number; newVenues: number; activeVenues: Set<string>; orders: number }>()
  for (let i = 0; i < weeks; i++) {
    const d = new Date(first)
    d.setUTCDate(d.getUTCDate() + 7 * i)
    const w = d.toISOString().slice(0, 10)
    rows.set(w, { week: w, newAccounts: 0, newVenues: 0, activeVenues: new Set(), orders: 0 })
  }

  const firstVenueByOwner = new Map<string, string>()
  for (const v of venues ?? []) {
    const row = rows.get(weekStart(new Date(v.created_at)))
    if (row) row.newVenues++
    if (v.owner_id) {
      const prev = firstVenueByOwner.get(v.owner_id)
      if (!prev || v.created_at < prev) firstVenueByOwner.set(v.owner_id, v.created_at)
    }
  }
  for (const createdAt of firstVenueByOwner.values()) {
    const row = rows.get(weekStart(new Date(createdAt)))
    if (row) row.newAccounts++
  }
  for (const o of orders) {
    const row = rows.get(weekStart(new Date(o.created_at)))
    if (!row) continue
    row.orders++
    row.activeVenues.add(o.venue_id)
  }

  return NextResponse.json(
    { weeks: [...rows.values()].map((r) => ({ ...r, activeVenues: r.activeVenues.size })) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
