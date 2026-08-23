'use client'

import { useState } from 'react'
import { useCart } from './CartProvider'
import { ModifierPicker } from './ModifierPicker'
import type { ModifierGroupRow, ModifierOptionRow } from '@/lib/venueMenu'

export function AddToCartButton({
  item,
  groups,
  optionsByGroupId,
  currency,
}: {
  item: { id: string; name: string; price: number }
  // Empty for a plain item — adds straight away, same as before. Any groups
  // present open the modifier picker instead, same as tapping a customizable
  // item in the Flutter app's order-taking screen.
  groups: ModifierGroupRow[]
  optionsByGroupId: Record<string, ModifierOptionRow[]>
  currency: string
}) {
  const { addItem } = useCart()
  const [justAdded, setJustAdded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  function handleClick() {
    if (groups.length > 0) {
      setPickerOpen(true)
      return
    }
    addItem(item)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 900)
  }

  return (
    <>
      <button
        onClick={handleClick}
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
      {pickerOpen && (
        <ModifierPicker
          item={item}
          groups={groups}
          optionsByGroupId={optionsByGroupId}
          currency={currency}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}
