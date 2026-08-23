'use client'

import { useState } from 'react'
import { useCart } from './CartProvider'

export function AddToCartButton({
  item,
}: {
  item: { id: string; name: string; price: number }
}) {
  const { addItem } = useCart()
  const [justAdded, setJustAdded] = useState(false)

  return (
    <button
      onClick={() => {
        addItem(item)
        setJustAdded(true)
        setTimeout(() => setJustAdded(false), 900)
      }}
      style={{
        flexShrink: 0,
        width: '2rem',
        height: '2rem',
        borderRadius: '999px',
        border: 'none',
        background: justAdded ? 'var(--brand-dark)' : 'var(--brand)',
        color: 'white',
        fontSize: '1.125rem',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      aria-label={`Add ${item.name}`}
    >
      {justAdded ? '✓' : '+'}
    </button>
  )
}
