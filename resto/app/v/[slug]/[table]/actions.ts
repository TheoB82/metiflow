'use server'

import { broadcastCallWaiter } from '@/lib/callWaiter'
import { getCart, addToCart, setQuantity, placeOrder, type PlaceOrderResult } from '@/lib/cart'

export async function callWaiterAction(venueId: string, table: string) {
  await broadcastCallWaiter(venueId, table)
}

export async function getCartAction(venueId: string, table: string) {
  return getCart(venueId, table)
}

export async function addToCartAction(
  venueId: string,
  table: string,
  item: { id: string; name: string; price: number },
) {
  await addToCart(venueId, table, item)
  return getCart(venueId, table)
}

export async function setQuantityAction(
  venueId: string,
  table: string,
  menuItemId: string,
  quantity: number,
) {
  await setQuantity(venueId, table, menuItemId, quantity)
  return getCart(venueId, table)
}

export async function placeOrderAction(
  venueId: string,
  table: string,
): Promise<PlaceOrderResult> {
  return placeOrder(venueId, table)
}
