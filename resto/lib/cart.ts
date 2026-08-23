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

// Converts the standing qr_cart_items rows into a real order the venue's
// kitchen/table devices already know how to display — same orders/order_items
// tables and column shapes SupabaseOrderSync pushes/pulls in the Flutter app
// (lib/core/services/supabase_order_sync.dart), so this order syncs down to
// every device exactly like one placed by staff. Written straight to
// 'sent'/'sent' status (order/items) since there's no staff step in between
// to "fire" it — placing the order from the customer's phone IS the fire.
export async function placeOrder(
  venueId: string,
  tableLabel: string,
): Promise<PlaceOrderResult> {
  const sb = createAdminSupabase()
  const items = await getCart(venueId, tableLabel)
  if (items.length === 0) {
    return { ok: false, error: 'Cart is empty.' }
  }

  // A QR code is printed per physical table, but the label it carries is
  // free text — resolve it against the venue's configured tables so the
  // order lands as a normal dine-in ticket against that table wherever
  // possible. No match (label doesn't correspond to any configured table,
  // e.g. a mis-printed QR or a takeaway-only setup) still gets the order
  // through as a takeaway ticket rather than silently failing or landing
  // unlinked, with the raw label kept in customer_name so staff can find it.
  const { data: table } = await sb
    .from('dining_tables')
    .select('id')
    .eq('venue_id', venueId)
    .ilike('name', tableLabel)
    .maybeSingle()

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
  const orderId = crypto.randomUUID()

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
