'use client'

import { useState, useTransition } from 'react'

// Deliberately a real tap the customer makes, not something that fires
// just by loading the page — unlike the original standalone /call page
// (a one-shot link with no other purpose), this button lives on a menu
// page people browse for a while, so loading/refreshing it must never
// itself count as a call.
export function CallWaiterButton({
  action,
}: {
  action: () => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.875rem',
          color: 'var(--brand-dark)',
          fontWeight: 600,
          fontSize: '0.9375rem',
        }}
      >
        🔔 Waiter notified — on their way
      </div>
    )
  }

  return (
    <button
      onClick={() => startTransition(async () => {
        await action()
        setSent(true)
      })}
      disabled={isPending}
      className="btn-outline"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
    >
      🔔 {isPending ? 'Calling…' : 'Call Waiter'}
    </button>
  )
}
