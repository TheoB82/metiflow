'use client'

import { useState } from 'react'
import { useCart } from './CartProvider'
import { formatPrice } from '@/lib/format'

export function CartBar({ currency }: { currency: string }) {
  const { cart, updateQuantity } = useCart()
  const [expanded, setExpanded] = useState(false)

  const count = cart.reduce((n, i) => n + i.quantity, 0)
  const total = cart.reduce((n, i) => n + i.quantity * i.price, 0)

  if (count === 0) return null

  return (
    <div
      style={{
        position: 'sticky',
        bottom: '1rem',
        marginTop: '1.5rem',
        zIndex: 10,
      }}
    >
      {expanded && (
        <div
          className="card"
          style={{ marginBottom: '0.75rem', padding: '0.5rem 1rem' }}
        >
          {cart.map((item, i) => (
            <div
              key={item.menu_item_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.625rem 0',
                borderBottom: i < cart.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                  {formatPrice(item.price, currency)} each
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                  style={quantityBtnStyle}
                  aria-label={`Remove one ${item.name}`}
                >
                  −
                </button>
                <span style={{ fontWeight: 600, minWidth: '1.25rem', textAlign: 'center' }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                  style={quantityBtnStyle}
                  aria-label={`Add one more ${item.name}`}
                >
                  +
                </button>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: '3.5rem', textAlign: 'right' }}>
                {formatPrice(item.price * item.quantity, currency)}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="btn-primary"
        style={{ justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
      >
        <span>{expanded ? 'Hide bill' : `${count} item${count === 1 ? '' : 's'} · View bill`}</span>
        <span>{formatPrice(total, currency)}</span>
      </button>
    </div>
  )
}

const quantityBtnStyle: React.CSSProperties = {
  width: '1.75rem',
  height: '1.75rem',
  borderRadius: '999px',
  border: '1.5px solid var(--border)',
  background: 'var(--surface)',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  color: 'var(--text)',
}
