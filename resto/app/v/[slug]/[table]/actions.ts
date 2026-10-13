'use server'

import { broadcastCallWaiter } from '@/lib/callWaiter'
import {
  getCart,
  addToCart,
  setQuantity,
  placeOrder,
  getPlacedOrder,
  restoreDeclined,
  isQrOrderingOn,
  type CartOption,
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

// Every action that writes to the basket or places an order: the venue takes
// QR orders, and this browser has the table's PIN (when one is set). Reads
// (the 3 s poll) check the PIN only, to keep the poll to its own queries.
async function assertCanOrder(venueId: string, table: string) {
  if (!(await isQrOrderingOn(venueId))) throw new Error('QR_ORDERING_OFF')
  await assertTableVerified(venueId, table)
}

export async function getCartAction(venueId: string, table: string) {
  await assertTableVerified(venueId, table)
  return getCart(venueId, table)
}

// Only the item, options and quantities count: the server prices the line
// (lib/cart.ts priceLine). `item` may still arrive as the object an older,
// already-open page sends; its name and price are ignored.
export async function addToCartAction(
  venueId: string,
  table: string,
  item: string | { id: string },
  opts?: { quantity?: number; options?: CartOption[]; optionIds?: string[] },
) {
  await assertCanOrder(venueId, table)
  const itemId = typeof item === 'string' ? item : item?.id
  if (typeof itemId !== 'string') throw new Error('ITEM_UNAVAILABLE')
  const options =
    opts?.options ?? (opts?.optionIds ?? []).map((id) => ({ id, qty: 1 }))
  await addToCart(venueId, table, itemId, { quantity: opts?.quantity, options })
  return getCart(venueId, table)
}

export async function setQuantityAction(
  venueId: string,
  table: string,
  cartItemId: string,
  quantity: number,
) {
  await assertCanOrder(venueId, table)
  await setQuantity(venueId, table, cartItemId, quantity)
  return getCart(venueId, table)
}

export async function placeOrderAction(
  venueId: string,
  table: string,
): Promise<PlaceOrderResult> {
  await assertCanOrder(venueId, table)
  return placeOrder(venueId, table)
}

// One round-trip for the 3s poll: first return any declined round's items to
// the basket (reporting how many, so the page can say so), then read both.
export async function pollAction(venueId: string, table: string) {
  const tableId = await assertTableVerified(venueId, table)
  const restored = await restoreDeclined(venueId, table)
  const [cart, placed] = await Promise.all([
    getCart(venueId, table),
    getPlacedOrder(venueId, table, tableId),
  ])
  return { cart, placed, restored }
}

export async function getPlacedOrderAction(venueId: string, table: string) {
  await assertTableVerified(venueId, table)
  return getPlacedOrder(venueId, table)
}
