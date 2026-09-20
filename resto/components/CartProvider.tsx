'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { CartItem, PlacedOrderItem } from '@/lib/cart'
import {
  addToCartAction,
  setQuantityAction,
  placeOrderAction,
  getPlacedOrderAction,
  pollAction,
} from '@/app/v/[slug]/[table]/actions'

type PlacedOrder = {
  items: PlacedOrderItem[]
  total: number
  // Rounds sent but not yet approved by staff (venues that require approval).
  pendingItems: PlacedOrderItem[]
  pendingTotal: number
} | null

type CartContextValue = {
  cart: CartItem[]
  placedOrder: PlacedOrder
  addItem: (
    item: { id: string; name: string; price: number },
    opts?: { modifierNotes?: string; quantity?: number; optionIds?: string[] },
  ) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  placeOrder: () => Promise<void>
  placing: boolean
  placeOrderError: string | null
  // Set when staff declined a round; its items are back in the basket.
  declinedNotice: boolean
  dismissDeclinedNotice: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

// Every mutation (addItem/updateQuantity) applies the server action's
// returned cart immediately, so the device that just tapped sees its own
// change with no lag. The 3s poll exists purely to pick up changes made
// by other phones at the same table (or, for placedOrder, by the kitchen
// side) — deliberately plain polling, not another Realtime channel, after
// today's whole detour discovering how easy that is to get silently wrong
// (private-channel config, RLS on realtime.messages, the broadcast REST
// endpoint not delivering at all). A few seconds of lag on a shared
// restaurant bill is a fine trade for not reintroducing that risk.
export function CartProvider({
  venueId,
  table,
  initialCart,
  initialPlacedOrder,
  children,
}: {
  venueId: string
  table: string
  initialCart: CartItem[]
  initialPlacedOrder: PlacedOrder
  children: React.ReactNode
}) {
  const [cart, setCart] = useState(initialCart)
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder>(initialPlacedOrder)
  const [placing, setPlacing] = useState(false)
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null)
  const [declinedNotice, setDeclinedNotice] = useState(false)
  const pending = useRef(false)

  useEffect(() => {
    const id = setInterval(async () => {
      if (pending.current) return
      const { cart: freshCart, placed: freshPlaced, restored } = await pollAction(venueId, table)
      setCart(freshCart)
      setPlacedOrder(freshPlaced)
      if (restored > 0) setDeclinedNotice(true)
    }, 3000)
    return () => clearInterval(id)
  }, [venueId, table])

  async function addItem(
    item: { id: string; name: string; price: number },
    opts?: { modifierNotes?: string; quantity?: number; optionIds?: string[] },
  ) {
    pending.current = true
    const fresh = await addToCartAction(venueId, table, item, opts)
    setCart(fresh)
    pending.current = false
  }

  async function updateQuantity(cartItemId: string, quantity: number) {
    pending.current = true
    const fresh = await setQuantityAction(venueId, table, cartItemId, quantity)
    setCart(fresh)
    pending.current = false
  }

  async function placeOrder() {
    setPlacing(true)
    setPlaceOrderError(null)
    const result = await placeOrderAction(venueId, table)
    setPlacing(false)
    if (result.ok) {
      setCart([])
      setPlacedOrder(await getPlacedOrderAction(venueId, table))
    } else {
      setPlaceOrderError(result.error)
    }
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        placedOrder,
        addItem,
        updateQuantity,
        placeOrder,
        placing,
        placeOrderError,
        declinedNotice,
        dismissDeclinedNotice: () => setDeclinedNotice(false),
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
