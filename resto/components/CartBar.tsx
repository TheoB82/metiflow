'use client'

import { useState } from 'react'
import { useCart } from './CartProvider'
import { formatPrice } from '@/lib/format'

export function CartBar({ currency }: { currency: string }) {
  const { cart, placedOrder, updateQuantity, placeOrder, placing, placeOrderError } = useCart()
  const [expanded, setExpanded] = useState(false)
  const [placedExpanded, setPlacedExpanded] = useState(false)

  const count = cart.reduce((n, i) => n + i.quantity, 0)
  const total = cart.reduce((n, i) => n + i.quantity * i.price, 0)
  const hasPlacedOrder = !!placedOrder && placedOrder.items.length > 0

  return (
    <>
      {/* Both buttons below are sticky so that once anything has been sent
          to the kitchen, checking the bill never requires scrolling back
          down through the whole menu to find it — it stays reachable from
          wherever the customer is on the page, the same way the active
          cart's "View bill" button already did. */}
      {(hasPlacedOrder || count > 0) && (
        <div
          style={{
            position: 'sticky',
            bottom: '1rem',
            marginTop: '1.5rem',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {hasPlacedOrder && placedExpanded && (
            <div className="card" style={{ padding: '0.875rem 1rem' }}>
              {placedOrder.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.5rem 0',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem' }}>
                      {item.quantity}× {item.name}
                    </div>
                    {item.modifier_notes && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                        {item.modifier_notes}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatPrice(item.unit_price * item.quantity, currency)}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '0.5rem' }}>
                Add more items any time to send another round.
              </div>
            </div>
          )}

          {/* Persistent recap of everything already sent to the kitchen for
              this table, across every "place order" tap so far — not just
              the last one. Reads the real order, so it stays accurate even
              after a page refresh or coming back later, unlike a one-off
              confirmation toast. Styled as a secondary (not btn-primary)
              shortcut so it doesn't compete with "Place order" below when
              both are showing at once. */}
          {hasPlacedOrder && (
            <button
              onClick={() => setPlacedExpanded((v) => !v)}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                font: 'inherit',
                color: 'inherit',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                ✓ Sent to the kitchen · {placedExpanded ? 'Hide' : 'View bill'}
              </span>
              <span style={{ fontWeight: 600 }}>{formatPrice(placedOrder.total, currency)}</span>
            </button>
          )}

          {expanded && count > 0 && (
            <div
              className="card"
              style={{ padding: '0.5rem 1rem' }}
            >
              {cart.map((item, i) => (
                <div
                  key={item.id}
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
                    {item.modifier_notes && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                        {item.modifier_notes}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                      {formatPrice(item.price, currency)} each
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      style={quantityBtnStyle}
                      aria-label={`Remove one ${item.name}`}
                    >
                      −
                    </button>
                    <span style={{ fontWeight: 600, minWidth: '1.25rem', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
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

              {placeOrderError && (
                <div style={{ color: '#b91c1c', fontSize: '0.8125rem', padding: '0.5rem 0' }}>
                  {placeOrderError}
                </div>
              )}

              <button
                onClick={placeOrder}
                disabled={placing}
                className="btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {placing ? 'Placing order…' : `Place order · ${formatPrice(total, currency)}`}
              </button>
            </div>
          )}

          {count > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="btn-primary"
              style={{ justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
            >
              <span>{expanded ? 'Hide' : `${count} item${count === 1 ? '' : 's'} · New round`}</span>
              <span>{formatPrice(total, currency)}</span>
            </button>
          )}
        </div>
      )}
    </>
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
