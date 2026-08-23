import { createAdminSupabase } from './supabase-server'

export type CartItem = {
  id: string
  menu_item_id: string
  name: string
  price: number
  quantity: number
  modifier_notes: string | null
}

export async function getCart(venueId: string, tableLabel: string): Promise<CartItem[]> {
  const sb = createAdminSupabase()
  const { data } = await sb
    .from('qr_cart_items')
    .select('id, menu_item_id, name, price, quantity, modifier_notes')
    .eq('venue_id', venueId)
    .eq('table_label', tableLabel)
    .order('added_at')
  return (data as CartItem[]) ?? []
}

// A plain item (no modifiers) taps repeatedly onto the same line — merges by
// incrementing quantity, same as before. A customized item (modifierNotes
// set) always gets its own line: two "Gyros" with different modifier
// choices are different orders, and can't be merged into one quantity.
// `price` here is already the effective per-unit price (base + any modifier
// price adjustments), matching how order_items.unit_price works everywhere
// else in the system.
export async function addToCart(
  venueId: string,
  tableLabel: string,
  item: { id: string; name: string; price: number },
  opts?: { modifierNotes?: string; quantity?: number },
) {
  const sb = createAdminSupabase()
  const quantity = opts?.quantity ?? 1
  const modifierNotes = opts?.modifierNotes ?? null

  if (!modifierNotes) {
    const { data: existing } = await sb
      .from('qr_cart_items')
      .select('id, quantity')
      .eq('venue_id', venueId)
      .eq('table_label', tableLabel)
      .eq('menu_item_id', item.id)
      .is('modifier_notes', null)
      .maybeSingle()

    if (existing) {
      await sb
        .from('qr_cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id)
      return
    }
  }

  await sb.from('qr_cart_items').insert({
    venue_id: venueId,
    table_label: tableLabel,
    menu_item_id: item.id,
    name: item.name,
    price: item.price,
    quantity,
    modifier_notes: modifierNotes,
  })
}

export type PlaceOrderResult =
  | { ok: true }
  | { ok: false; error: string }

// A QR code is printed per physical table, but the label it carries is free
// text — resolve it against the venue's configured tables so orders land as
// a normal dine-in ticket against that table wherever possible. No match
// (label doesn't correspond to any configured table, e.g. a mis-printed QR
// or a takeaway-only setup) still gets the order through as a takeaway
// ticket rather than silently failing or landing unlinked, with the raw
// label kept in customer_name so staff can find it — and so later rounds
// from the same table can find the same standing order again (see
// findActiveOrder below).
async function resolveTable(
  sb: ReturnType<typeof createAdminSupabase>,
  venueId: string,
  tableLabel: string,
) {
  const { data } = await sb
    .from('dining_tables')
    .select('id')
    .eq('venue_id', venueId)
    .ilike('name', tableLabel)
    .maybeSingle()
  return data
}

// A table's bill is one running order for the whole sitting, with items
// added as rounds come in — not a new order per "place order" tap. Without
// this, a second round creates a second, unrelated order row: the kitchen
// ticket for it is still real, but staff screens that look up "the order
// for this table" (the bill, the table summary) only know about whichever
// order they found first, so the second round's items silently don't show
// up there even though they exist.
async function findActiveOrder(
  sb: ReturnType<typeof createAdminSupabase>,
  venueId: string,
  tableLabel: string,
  tableId: string | null,
) {
  const query = sb
    .from('orders')
    .select('id')
    .eq('venue_id', venueId)
    .not('status', 'in', '(paid,cancelled)')
    .order('created_at', { ascending: false })
    .limit(1)
  const { data } = tableId
    ? await query.eq('table_id', tableId)
    : await query.eq('customer_name', `QR order — Table ${tableLabel}`)
  return data?.[0]?.id as string | undefined
}

// Converts the standing qr_cart_items rows into a real order the venue's
// kitchen/table devices already know how to display — same orders/order_items
// tables and column shapes SupabaseOrderSync pushes/pulls in the Flutter app
// (lib/core/services/supabase_order_sync.dart), so this order syncs down to
// every device exactly like one placed by staff. Items are written straight
// to 'sent' status since there's no staff step in between to "fire" them —
// placing the order from the customer's phone IS the fire.
export async function placeOrder(
  venueId: string,
  tableLabel: string,
): Promise<PlaceOrderResult> {
  const sb = createAdminSupabase()
  const items = await getCart(venueId, tableLabel)
  if (items.length === 0) {
    return { ok: false, error: 'Cart is empty.' }
  }

  const table = await resolveTable(sb, venueId, tableLabel)

  // The kitchen display routes tickets by station, and grouping is keyed
  // off course_type — both live on the menu item, not the cart row, so they
  // have to be looked up here rather than copied from qr_cart_items (which
  // only denormalizes name/price for the bill). Without these an order's
  // items carry no station at all, making them invisible on any per-station
  // KDS screen.
  const { data: menuItems } = await sb
    .from('menu_items')
    .select('id, station_id, course_type')
    .in('id', items.map((item) => item.menu_item_id))
  const menuItemById = new Map((menuItems ?? []).map((mi) => [mi.id, mi]))

  const now = new Date().toISOString()

  let orderId = await findActiveOrder(sb, venueId, tableLabel, table?.id ?? null)
  if (orderId) {
    await sb.from('orders').update({ updated_at: now }).eq('id', orderId)
  } else {
    orderId = crypto.randomUUID()
    const { error: orderError } = await sb.from('orders').insert({
      id: orderId,
      venue_id: venueId,
      table_id: table?.id ?? null,
      order_type: table?.id ? 'dine_in' : 'takeaway',
      customer_name: table?.id ? null : `QR order — Table ${tableLabel}`,
      status: 'sent',
      device_id: 'qr-customer',
      created_at: now,
      updated_at: now,
    })
    if (orderError) {
      return { ok: false, error: orderError.message }
    }
  }

  const { error: itemsError } = await sb.from('order_items').insert(
    items.map((item) => ({
      id: crypto.randomUUID(),
      order_id: orderId,
      menu_item_id: item.menu_item_id,
      item_name: item.name,
      course_type: menuItemById.get(item.menu_item_id)?.course_type ?? 'main',
      station_id: menuItemById.get(item.menu_item_id)?.station_id ?? null,
      quantity: item.quantity,
      unit_price: item.price,
      modifier_notes: item.modifier_notes,
      status: 'sent',
      sent_at: now,
    })),
  )
  if (itemsError) {
    return { ok: false, error: itemsError.message }
  }

  await sb
    .from('qr_cart_items')
    .delete()
    .eq('venue_id', venueId)
    .eq('table_label', tableLabel)

  return { ok: true }
}

export type PlacedOrderItem = {
  name: string
  quantity: number
  unit_price: number
  modifier_notes: string | null
}

// The standing order for this table across every round placed so far, for
// the customer to check back on ("what have we ordered?") — reads the real
// orders/order_items rows (the same ones staff/kitchen see), not the
// already-cleared qr_cart_items, since a placed order can span several
// "place order" taps.
export async function getPlacedOrder(
  venueId: string,
  tableLabel: string,
): Promise<{ items: PlacedOrderItem[]; total: number } | null> {
  const sb = createAdminSupabase()
  const table = await resolveTable(sb, venueId, tableLabel)
  const orderId = await findActiveOrder(sb, venueId, tableLabel, table?.id ?? null)
  if (!orderId) return null

  const { data } = await sb
    .from('order_items')
    .select('item_name, quantity, unit_price, modifier_notes')
    .eq('order_id', orderId)
    .order('sent_at')

  const items = (data ?? []).map((i) => ({
    name: i.item_name,
    quantity: i.quantity,
    unit_price: i.unit_price,
    modifier_notes: i.modifier_notes,
  }))
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  return { items, total }
}

// quantity <= 0 removes the line entirely rather than leaving a 0 row
// sitting in the cart. Keyed by the cart row's own id rather than
// menu_item_id — the same menu item can now appear as several distinct
// lines (different modifier choices), so menu_item_id alone no longer
// identifies a single line.
export async function setQuantity(
  venueId: string,
  tableLabel: string,
  cartItemId: string,
  quantity: number,
) {
  const sb = createAdminSupabase()
  if (quantity <= 0) {
    await sb
      .from('qr_cart_items')
      .delete()
      .eq('id', cartItemId)
      .eq('venue_id', venueId)
      .eq('table_label', tableLabel)
  } else {
    await sb
      .from('qr_cart_items')
      .update({ quantity })
      .eq('id', cartItemId)
      .eq('venue_id', venueId)
      .eq('table_label', tableLabel)
  }
}
