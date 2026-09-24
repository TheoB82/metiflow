import { createHmac } from 'node:crypto'
import { cookies } from 'next/headers'
import { createAdminSupabase } from './supabase-server'
import { resolveTable } from './cart'

// Protects a table's QR ordering/bill page from someone who knows or
// guesses the table's static QR URL and uses it remotely — the physical
// QR code itself never changes (reprinting stickers per seating defeats
// the whole point of a QR code), but the table's *session* does: the
// first person to use the page sets a 4-digit PIN, which everyone at that
// table shares (same idea as a wifi password), and it's required to view
// the bill or place an order from then on. It clears automatically when
// the table is reset (see clearTableQrPin in
// lib/core/services/supabase_menu_sync.dart on the Flutter side, called
// from bill_screen.dart / table_order_summary_sheet.dart's reset-table
// actions) — so a stranger who dined there last week, or a party at a
// neighbouring table, can't reuse a PIN that's since gone stale.
const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 5 * 60 * 1000

function cookieName(venueId: string, tableLabel: string): string {
  return `kf_pin_${venueId}_${tableLabel}`.replace(/[^a-zA-Z0-9_]/g, '_')
}

// The cookie only proves "this browser was told the PIN that was current
// as of qr_pin_updated_at" — it's signed so it can't be forged, and tying
// it to qr_pin_updated_at (not just the PIN digits) means a stale cookie
// from a previous seating can't accidentally validate against a new PIN
// that happens to reuse the same 4 digits.
function sign(payload: string): string {
  // Dedicated HMAC secret — this used to reuse the Supabase service-role
  // key, which tied cookie signing to an API credential being rotated.
  const secret = process.env.TABLE_PIN_COOKIE_SECRET
  if (!secret) throw new Error('TABLE_PIN_COOKIE_SECRET not set')
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function tokenFor(pin: string, updatedAt: string): string {
  const payload = `${pin}:${updatedAt}`
  return `${payload}.${sign(payload)}`
}

function tokenMatches(token: string, pin: string, updatedAt: string): boolean {
  const expected = tokenFor(pin, updatedAt)
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

async function setVerifiedCookie(
  venueId: string,
  tableLabel: string,
  pin: string,
  updatedAt: string,
) {
  const store = await cookies()
  store.set(cookieName(venueId, tableLabel), tokenFor(pin, updatedAt), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    // A long-ish sitting plus some margin — re-verifying mid-meal because
    // a cookie expired would be exactly the friction this is meant to avoid.
    maxAge: 60 * 60 * 6,
    path: '/',
  })
}

type DiningTablePinRow = {
  id: string
  qr_pin: string | null
  qr_pin_updated_at: string | null
  qr_pin_attempts: number | null
  qr_pin_locked_until: string | null
}

async function fetchTableRow(
  sb: ReturnType<typeof createAdminSupabase>,
  venueId: string,
  tableLabel: string,
): Promise<DiningTablePinRow | null> {
  const table = await resolveTable(sb, venueId, tableLabel)
  if (!table) return null
  const { data } = await sb
    .from('dining_tables')
    .select('id, qr_pin, qr_pin_updated_at, qr_pin_attempts, qr_pin_locked_until')
    .eq('id', table.id)
    .maybeSingle()
  return (data as DiningTablePinRow | null) ?? null
}

export type PinStatus =
  | { state: 'verified' }
  | { state: 'none' } // no PIN set yet — table's open, first user can set one
  | { state: 'needed' }
  | { state: 'locked'; retryAt: string }

export async function getPinStatus(venueId: string, tableLabel: string): Promise<PinStatus> {
  const sb = createAdminSupabase()
  const row = await fetchTableRow(sb, venueId, tableLabel)
  if (!row?.qr_pin) return { state: 'none' }
  if (row.qr_pin_locked_until && new Date(row.qr_pin_locked_until) > new Date()) {
    return { state: 'locked', retryAt: row.qr_pin_locked_until }
  }
  const store = await cookies()
  const cookie = store.get(cookieName(venueId, tableLabel))?.value
  if (cookie && tokenMatches(cookie, row.qr_pin, row.qr_pin_updated_at ?? '')) {
    return { state: 'verified' }
  }
  return { state: 'needed' }
}

export async function setTablePin(
  venueId: string,
  tableLabel: string,
  pin: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'PIN must be 4 digits.' }
  const sb = createAdminSupabase()
  const row = await fetchTableRow(sb, venueId, tableLabel)
  if (!row) return { ok: false, error: 'Table not found.' }
  // Someone else may have just set one (two phones opening the page at
  // once) — don't silently overwrite it, send them to the "enter PIN" path.
  if (row.qr_pin) return { ok: false, error: 'This table already has a PIN.' }
  const now = new Date().toISOString()
  await sb
    .from('dining_tables')
    .update({ qr_pin: pin, qr_pin_updated_at: now, qr_pin_attempts: 0, qr_pin_locked_until: null })
    .eq('id', row.id)
  await setVerifiedCookie(venueId, tableLabel, pin, now)
  return { ok: true }
}

export async function verifyTablePin(
  venueId: string,
  tableLabel: string,
  pin: string,
): Promise<{ ok: boolean; error?: string; locked?: boolean }> {
  const sb = createAdminSupabase()
  const row = await fetchTableRow(sb, venueId, tableLabel)
  if (!row) return { ok: false, error: 'Table not found.' }
  if (!row.qr_pin) return { ok: true } // nothing to verify against
  if (row.qr_pin_locked_until && new Date(row.qr_pin_locked_until) > new Date()) {
    return { ok: false, locked: true, error: 'Too many attempts — try again in a few minutes.' }
  }
  if (pin === row.qr_pin) {
    await sb
      .from('dining_tables')
      .update({ qr_pin_attempts: 0, qr_pin_locked_until: null })
      .eq('id', row.id)
    await setVerifiedCookie(venueId, tableLabel, row.qr_pin, row.qr_pin_updated_at ?? '')
    return { ok: true }
  }
  const attempts = (row.qr_pin_attempts ?? 0) + 1
  const lockedUntil =
    attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS).toISOString() : null
  await sb
    .from('dining_tables')
    .update({ qr_pin_attempts: attempts, qr_pin_locked_until: lockedUntil })
    .eq('id', row.id)
  if (lockedUntil) {
    return { ok: false, locked: true, error: 'Too many attempts — try again in a few minutes.' }
  }
  return { ok: false, error: `Wrong PIN — ${MAX_ATTEMPTS - attempts} attempt(s) left.` }
}

// Defense in depth for every gated server action (add to cart, place
// order, view bill): the page itself already gates on getPinStatus before
// rendering any ordering UI, but a server action is still directly
// callable given the venueId/table, so each one checks again rather than
// trusting the page never got skipped.
export async function assertTableVerified(venueId: string, tableLabel: string) {
  const status = await getPinStatus(venueId, tableLabel)
  if (status.state === 'verified' || status.state === 'none') return
  throw new Error('PIN_REQUIRED')
}
