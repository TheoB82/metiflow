'use client'

import { useState, useTransition } from 'react'
import type { PinStatus } from '@/lib/tablePin'

// Gates the whole table page behind a 4-digit PIN — the first person to
// open the table's QR link sets it (shared verbally at the table, same as
// a wifi password), and it's required on every later visit to that table
// until the table's reset. See lib/tablePin.ts's doc comment for why: the
// QR code itself is static and printed, so nothing about *reaching* this
// page is secret — the PIN is what makes the table's actual session
// private, without needing to reprint anything when the table turns over.
export function TablePinGate({
  initialStatus,
  actions,
  children,
}: {
  initialStatus: PinStatus
  actions: {
    setPin: (pin: string) => Promise<{ ok: boolean; error?: string }>
    verifyPin: (pin: string) => Promise<{ ok: boolean; error?: string; locked?: boolean }>
  }
  children: React.ReactNode
}) {
  const [status, setStatus] = useState(initialStatus)

  if (status.state === 'verified') return <>{children}</>
  if (status.state === 'locked') {
    return <LockedCard retryAt={status.retryAt} />
  }
  if (status.state === 'none') {
    return (
      <SetPinCard
        onSet={async (pin) => {
          const result = await actions.setPin(pin)
          if (result.ok) setStatus({ state: 'verified' })
          return result
        }}
      />
    )
  }
  return (
    <EnterPinCard
      onVerify={async (pin) => {
        const result = await actions.verifyPin(pin)
        if (result.ok) {
          setStatus({ state: 'verified' })
        } else if (result.locked) {
          setStatus({
            state: 'locked',
            retryAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          })
        }
        return result
      }}
    />
  )
}

function PinBox({ card, children }: { card: React.ReactNode | string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, margin: '0 auto' }}>
        {typeof card === 'string' ? (
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>{card}</h1>
        ) : (
          card
        )}
        {children}
      </div>
    </div>
  )
}

function SetPinCard({
  onSet,
}: {
  onSet: (pin: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
    if (!/^\d{4}$/.test(pin)) {
      setError('Enter a 4-digit PIN.')
      return
    }
    if (pin !== confirm) {
      setError('PINs don’t match — try again.')
      return
    }
    startTransition(async () => {
      const result = await onSet(pin)
      if (!result.ok) setError(result.error ?? 'Something went wrong.')
    })
  }

  return (
    <PinBox card="Set a PIN for this table">
      <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem', marginBottom: '1.25rem' }}>
        Choose a 4-digit PIN and share it with your table — it keeps your bill and orders
        private until the table&rsquo;s reset.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div className="field">
          <label>PIN</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
          />
        </div>
        <div className="field">
          <label>Enter PIN again</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        {error && <div className="error-box">{error}</div>}
        <button className="btn-primary" onClick={submit} disabled={isPending}>
          {isPending ? 'Setting…' : 'Set PIN'}
        </button>
      </div>
    </PinBox>
  )
}

function EnterPinCard({
  onVerify,
}: {
  onVerify: (pin: string) => Promise<{ ok: boolean; error?: string; locked?: boolean }>
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
    if (!/^\d{4}$/.test(pin)) {
      setError('Enter the 4-digit PIN.')
      return
    }
    startTransition(async () => {
      const result = await onVerify(pin)
      if (!result.ok) {
        setError(result.error ?? 'Wrong PIN.')
        setPin('')
      }
    })
  }

  return (
    <PinBox card="Enter this table's PIN">
      <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem', marginBottom: '1.25rem' }}>
        Ask whoever&rsquo;s sitting at the table, or a member of staff, for the PIN.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div className="field">
          <label>PIN</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        {error && <div className="error-box">{error}</div>}
        <button className="btn-primary" onClick={submit} disabled={isPending}>
          {isPending ? 'Checking…' : 'Continue'}
        </button>
      </div>
    </PinBox>
  )
}

function LockedCard({ retryAt }: { retryAt: string }) {
  // Date.now() is an impure read, so it's computed once on mount (a lazy
  // useState initializer) rather than directly in the render body — this
  // is a rough "about N minutes" estimate, not a live countdown, so it
  // doesn't need to update as the clock ticks.
  const [minutes] = useState(() =>
    Math.max(1, Math.ceil((new Date(retryAt).getTime() - Date.now()) / 60000)),
  )
  return (
    <PinBox card="Too many attempts">
      <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem' }}>
        Please wait about {minutes} minute{minutes === 1 ? '' : 's'} and try again, or ask a
        member of staff for help.
      </p>
    </PinBox>
  )
}
