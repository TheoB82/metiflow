'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { CartItem } from '@/lib/cart'
import { getCartAction, addToCartAction, setQuantityAction } from '@/app/v/[slug]/[table]/actions'

type CartContextValue = {
  cart: CartItem[]
  addItem: (item: { id: string; name: string; price: number }) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
}

const CartContext = createContext<CartContextValue | null>(null)

// Every mutation (addItem/updateQuantity) applies the server action's
// returned cart immediately, so the device that just tapped sees its own
// change with no lag. The 3s poll exists purely to pick up changes made
// by other phones at the same table — deliberately plain polling, not
// another Realtime channel, after today's whole detour discovering how
// easy that is to get silently wrong (private-channel config, RLS on
// realtime.messages, the broadcast REST endpoint not delivering at all).
// A few seconds of lag on a shared restaurant bill is a fine trade for
// not reintroducing that risk.
export function CartProvider({
  venueId,
  table,
  initialCart,
  children,
}: {
  venueId: string
  table: string
  initialCart: CartItem[]
  children: React.ReactNode
}) {
  const [cart, setCart] = useState(initialCart)
  const pending = useRef(false)

  useEffect(() => {
    const id = setInterval(async () => {
      if (pending.current) return
      const fresh = await getCartAction(venueId, table)
      setCart(fresh)
    }, 3000)
    return () => clearInterval(id)
  }, [venueId, table])

  async function addItem(item: { id: string; name: string; price: number }) {
    pending.current = true
    const fresh = await addToCartAction(venueId, table, item)
    setCart(fresh)
    pending.current = false
  }

  async function updateQuantity(menuItemId: string, quantity: number) {
    pending.current = true
    const fresh = await setQuantityAction(venueId, table, menuItemId, quantity)
    setCart(fresh)
    pending.current = false
  }

  return (
    <CartContext.Provider value={{ cart, addItem, updateQuantity }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
