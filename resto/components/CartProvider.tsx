'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { CartItem, CartOption, PlacedOrderItem } from '@/lib/cart'
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
    itemId: string,
    opts?: { quantity?: number; options?: CartOption[] },
  ) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  placeOrder: () => Promise<void>
  placing: boolean
  placeOrderError: string | null
  // Set when a basket action failed (stale page after an update, expired PIN,
  // network) — shown with a refresh button instead of failing silently.
  actionError: boolean
  // Set when staff declined a round; its items are back in the basket.
  declinedNotice: boolean
  dismissDeclinedNotice: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

// Every mutation (addItem/updateQuantity) applies the server action's
// returned cart immediately, so the device that just tapped sees its own
// change with no lag. The poll exists purely to pick up changes made by
// other phones at the same table (or, for placedOrder, by the kitchen
// side) — deliberately plain polling, not another Realtime channel, after
// today's whole detour discovering how easy that is to get silently wrong
// (private-channel config, RLS on realtime.messages, the broadcast REST
// endpoint not delivering at all). A few seconds of lag on a shared
// restaurant bill is a fine trade for not reintroducing that risk.
//
// Each poll is several Supabase queries, so it runs only while the page is
// in view, and slows down when nothing has changed for a while: every 3 s
// while the table is active, 10 s after a quiet minute, 30 s after ten.
// Any tap, or coming back to the page, makes it quick again.
const POLL_ACTIVE_MS = 3_000
const POLL_QUIET_MS = 10_000
const POLL_IDLE_MS = 30_000

function pollDelay(sinceChangeMs: number): number {
  if (sinceChangeMs < 60_000) return POLL_ACTIVE_MS
  if (sinceChangeMs < 10 * 60_000) return POLL_QUIET_MS
  return POLL_IDLE_MS
}

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
  const [actionError, setActionError] = useState(false)
  const pending = useRef(false)
  const pollFailures = useRef(0)

  // When this page last saw the basket or the order change (or the guest
  // tapped something) — drives how often it polls.
  const lastChange = useRef(0)
  const lastSeen = useRef('')

  useEffect(() => {
    lastChange.current = Date.now()
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    async function poll() {
      if (stopped || document.hidden) return // resumed by onVisible
      if (!pending.current) {
        try {
          const { cart: freshCart, placed: freshPlaced, restored } = await pollAction(venueId, table)
          const seen = JSON.stringify([freshCart, freshPlaced])
          if (seen !== lastSeen.current) {
            lastSeen.current = seen
            lastChange.current = Date.now()
          }
          setCart(freshCart)
          setPlacedOrder(freshPlaced)
          if (restored > 0) setDeclinedNotice(true)
          pollFailures.current = 0
        } catch {
          // One dropped request on a flaky connection is normal; two in a row
          // means the page is stale (e.g. the site was updated) or the session
          // expired — say so instead of leaving a basket that quietly stops
          // updating.
          pollFailures.current += 1
          if (pollFailures.current >= 2) setActionError(true)
        }
      }
      if (!stopped) timer = setTimeout(poll, pollDelay(Date.now() - lastChange.current))
    }

    function onVisible() {
      if (document.hidden) return
      clearTimeout(timer)
      lastChange.current = Date.now()
      poll()
    }

    document.addEventListener('visibilitychange', onVisible)
    timer = setTimeout(poll, POLL_ACTIVE_MS)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [venueId, table])

  async function addItem(
    itemId: string,
    opts?: { quantity?: number; options?: CartOption[] },
  ) {
    pending.current = true
    lastChange.current = Date.now()
    try {
      const fresh = await addToCartAction(venueId, table, itemId, opts)
      setCart(fresh)
      setActionError(false)
    } catch {
      setActionError(true)
    } finally {
      pending.current = false
    }
  }

  async function updateQuantity(cartItemId: string, quantity: number) {
    pending.current = true
    lastChange.current = Date.now()
    try {
      const fresh = await setQuantityAction(venueId, table, cartItemId, quantity)
      setCart(fresh)
      setActionError(false)
    } catch {
      setActionError(true)
    } finally {
      pending.current = false
    }
  }

  async function placeOrder() {
    lastChange.current = Date.now()
    setPlacing(true)
    setPlaceOrderError(null)
    try {
      const result = await placeOrderAction(venueId, table)
      if (result.ok) {
        setCart([])
        setPlacedOrder(await getPlacedOrderAction(venueId, table))
        setActionError(false)
      } else {
        setPlaceOrderError(result.error)
      }
    } catch {
      setActionError(true)
    } finally {
      setPlacing(false)
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
        actionError,
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
