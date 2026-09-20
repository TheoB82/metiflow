'use server'

import { broadcastCallWaiter } from '@/lib/callWaiter'
import {
  getCart,
  addToCart,
  setQuantity,
  placeOrder,
  getPlacedOrder,
  restoreDeclined,
  type PlaceOrderResult,
} from '@/lib/cart'
import {
  assertTableVerified,
  getPinStatus,
  setTablePin,
  verifyTablePin,
  type PinStatus,
} from '@/lib/tablePin'

// Call Waiter is deliberately left ungated — it's benign (worst case
// someone pings staff for a table they're not at) and doubles as an escape
// hatch if a real guest gets stuck on the PIN screen.
export async function callWaiterAction(venueId: string, table: string) {
  await broadcastCallWaiter(venueId, table)
}

export async function getTablePinStatusAction(
  venueId: string,
  table: string,
): Promise<PinStatus> {
  return getPinStatus(venueId, table)
}

export async function setTablePinAction(venueId: string, table: string, pin: string) {
  return setTablePin(venueId, table, pin)
}

export async function verifyTablePinAction(venueId: string, table: string, pin: string) {
  return verifyTablePin(venueId, table, pin)
}

export async function getCartAction(venueId: string, table: string) {
  await assertTableVerified(venueId, table)
  return getCart(venueId, table)
}

export async function addToCartAction(
  venueId: string,
  table: string,
  item: { id: string; name: string; price: number },
  opts?: { modifierNotes?: string; quantity?: number; optionIds?: string[] },
) {
  await assertTableVerified(venueId, table)
  await addToCart(venueId, table, item, opts)
  return getCart(venueId, table)
}

export async function setQuantityAction(
  venueId: string,
  table: string,
  cartItemId: string,
  quantity: number,
) {
  await assertTableVerified(venueId, table)
  await setQuantity(venueId, table, cartItemId, quantity)
  return getCart(venueId, table)
}

export async function placeOrderAction(
  venueId: string,
  table: string,
): Promise<PlaceOrderResult> {
  await assertTableVerified(venueId, table)
  return placeOrder(venueId, table)
}

// One round-trip for the 3s poll: first return any declined round's items to
// the basket (reporting how many, so the page can say so), then read both.
export async function pollAction(venueId: string, table: string) {
  await assertTableVerified(venueId, table)
  const restored = await restoreDeclined(venueId, table)
  const [cart, placed] = await Promise.all([
    getCart(venueId, table),
    getPlacedOrder(venueId, table),
  ])
  return { cart, placed, restored }
}

export async function getPlacedOrderAction(venueId: string, table: string) {
  await assertTableVerified(venueId, table)
  return getPlacedOrder(venueId, table)
}
