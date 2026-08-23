import { createAdminSupabase } from './supabase-server'

export type CartItem = {
  menu_item_id: string
  name: string
  price: number
  quantity: number
}

export async function getCart(venueId: string, tableLabel: string): Promise<CartItem[]> {
  const sb = createAdminSupabase()
  const { data } = await sb
    .from('qr_cart_items')
    .select('menu_item_id, name, price, quantity')
    .eq('venue_id', venueId)
    .eq('table_label', tableLabel)
    .order('added_at')
  return (data as CartItem[]) ?? []
}

export async function addToCart(
  venueId: string,
  tableLabel: string,
  item: { id: string; name: string; price: number },
) {
  const sb = createAdminSupabase()
  const { data: existing } = await sb
    .from('qr_cart_items')
    .select('quantity')
    .eq('venue_id', venueId)
    .eq('table_label', tableLabel)
    .eq('menu_item_id', item.id)
    .maybeSingle()

  if (existing) {
    await sb
      .from('qr_cart_items')
      .update({ quantity: existing.quantity + 1 })
      .eq('venue_id', venueId)
      .eq('table_label', tableLabel)
      .eq('menu_item_id', item.id)
  } else {
    await sb.from('qr_cart_items').insert({
      venue_id: venueId,
      table_label: tableLabel,
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
    })
  }
}

// quantity <= 0 removes the line entirely rather than leaving a 0 row
// sitting in the cart.
export async function setQuantity(
  venueId: string,
  tableLabel: string,
  menuItemId: string,
  quantity: number,
) {
  const sb = createAdminSupabase()
  if (quantity <= 0) {
    await sb
      .from('qr_cart_items')
      .delete()
      .eq('venue_id', venueId)
      .eq('table_label', tableLabel)
      .eq('menu_item_id', menuItemId)
  } else {
    await sb
      .from('qr_cart_items')
      .update({ quantity })
      .eq('venue_id', venueId)
      .eq('table_label', tableLabel)
      .eq('menu_item_id', menuItemId)
  }
}
