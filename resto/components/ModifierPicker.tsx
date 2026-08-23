'use client'

import { useState } from 'react'
import { useCart } from './CartProvider'
import { formatPrice } from '@/lib/format'
import type { ModifierGroupRow, ModifierOptionRow } from '@/lib/venueMenu'

// Mirrors the Flutter app's modifier picker (single-choice groups act as a
// radio pick, multi-choice groups get a +/- stepper capped at max_choices)
// so a customer ordering via QR gets the same customization options as one
// placed by staff — "with all", "extra haloumi", etc.
export function ModifierPicker({
  item,
  groups,
  optionsByGroupId,
  currency,
  onClose,
}: {
  item: { id: string; name: string; price: number }
  groups: ModifierGroupRow[]
  optionsByGroupId: Record<string, ModifierOptionRow[]>
  currency: string
  onClose: () => void
}) {
  const { addItem } = useCart()
  const [selected, setSelected] = useState<Record<string, Record<string, number>>>(
    () => Object.fromEntries(groups.map((g) => [g.id, {}])),
  )
  const [quantity, setQuantity] = useState(1)

  function groupTotal(groupId: string) {
    return Object.values(selected[groupId] ?? {}).reduce((s, q) => s + q, 0)
  }

  function setQty(group: ModifierGroupRow, optId: string, qty: number) {
    setSelected((prev) => {
      const next = { ...prev, [group.id]: { ...prev[group.id] } }
      let q = Math.max(0, qty)
      if (group.max_choices === 1) {
        return { ...next, [group.id]: q > 0 ? { [optId]: 1 } : {} }
      }
      if (group.max_choices > 0) {
        const otherTotal = groupTotal(group.id) - (next[group.id][optId] ?? 0)
        const headroom = group.max_choices - otherTotal
        q = Math.min(q, Math.max(0, headroom))
      }
      if (q <= 0) {
        delete next[group.id][optId]
      } else {
        next[group.id][optId] = q
      }
      return next
    })
  }

  const isValid = groups.every((g) => {
    if (!g.is_required) return true
    const min = g.min_choices > 0 ? g.min_choices : 1
    return groupTotal(g.id) >= min
  })

  const priceAdj = groups.reduce((sum, g) => {
    const opts = optionsByGroupId[g.id] ?? []
    const qty = selected[g.id] ?? {}
    return (
      sum +
      opts.reduce((s, o) => s + o.price_adj_pence * (qty[o.id] ?? 0), 0)
    )
  }, 0)

  const notes = groups
    .map((g) => {
      const opts = optionsByGroupId[g.id] ?? []
      const qty = selected[g.id] ?? {}
      const names = opts
        .filter((o) => (qty[o.id] ?? 0) > 0)
        .map((o) => (qty[o.id]! > 1 ? `${o.name} x${qty[o.id]}` : o.name))
        .join(', ')
      return names ? `${g.name}: ${names}` : null
    })
    .filter(Boolean)
    .join(' | ')

  const unitPrice = item.price + priceAdj

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '16px 16px 0 0',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{item.name}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-2)' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>Quantity</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              style={stepperBtnStyle}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span style={{ fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              style={stepperBtnStyle}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {groups.map((group) => {
          const opts = optionsByGroupId[group.id] ?? []
          const qty = selected[group.id] ?? {}
          return (
            <div key={group.id} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{group.name}</span>
                {group.is_required && (
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>required</span>
                )}
              </div>
              {opts.map((opt) => {
                const q = qty[opt.id] ?? 0
                const singleChoice = group.max_choices === 1
                return (
                  <div
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem' }}>
                      {opt.name}
                      {opt.price_adj_pence !== 0 && (
                        <span style={{ color: 'var(--text-2)' }}>
                          {' '}
                          ({opt.price_adj_pence > 0 ? '+' : ''}
                          {formatPrice(opt.price_adj_pence, currency)})
                        </span>
                      )}
                    </span>
                    {singleChoice ? (
                      <button
                        onClick={() => setQty(group, opt.id, q > 0 ? 0 : 1)}
                        style={{
                          ...stepperBtnStyle,
                          width: 'auto',
                          padding: '0.25rem 0.75rem',
                          borderRadius: 999,
                          background: q > 0 ? 'var(--brand)' : 'var(--surface)',
                          color: q > 0 ? 'white' : 'var(--text)',
                          borderColor: q > 0 ? 'var(--brand)' : 'var(--border)',
                        }}
                      >
                        {q > 0 ? 'Selected' : 'Select'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => setQty(group, opt.id, q - 1)}
                          style={stepperBtnStyle}
                          aria-label={`Remove one ${opt.name}`}
                        >
                          −
                        </button>
                        <span style={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{q}</span>
                        <button
                          onClick={() => setQty(group, opt.id, q + 1)}
                          style={stepperBtnStyle}
                          aria-label={`Add one ${opt.name}`}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        <button
          onClick={() => {
            addItem(
              { id: item.id, name: item.name, price: unitPrice },
              { modifierNotes: notes || undefined, quantity },
            )
            onClose()
          }}
          disabled={!isValid}
          className="btn-primary"
          style={{ width: '100%', opacity: isValid ? 1 : 0.5 }}
        >
          Add to order · {formatPrice(unitPrice * quantity, currency)}
        </button>
      </div>
    </div>
  )
}

const stepperBtnStyle: React.CSSProperties = {
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
