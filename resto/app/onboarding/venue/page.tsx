'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { OnboardingShell } from '@/components/OnboardingShell'
import { v4 as uuidv4 } from 'uuid'

const CURRENCIES = [
  { code: 'GBP', label: '£ GBP — British Pound' },
  { code: 'EUR', label: '€ EUR — Euro' },
  { code: 'USD', label: '$ USD — US Dollar' },
  { code: 'AUD', label: 'A$ AUD — Australian Dollar' },
  { code: 'CAD', label: 'C$ CAD — Canadian Dollar' },
]

export default function VenuePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill from register page if available
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('onboarding_prefill')
      if (!raw) return
      const p = JSON.parse(raw)
      if (p.name)     setName(p.name)
      if (p.phone)    setPhone(p.phone)
      if (p.address)  setAddress(p.address)
      if (p.currency) setCurrency(p.currency)
    } catch { /* ignore */ }
  }, [])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true); setError('')
    const sb = createClient()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr || !user) { router.push('/login'); return }

    const venueId = uuidv4()
    const { error: insertErr } = await sb.from('venues').upsert({
      id: venueId,
      owner_id: user.id,
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      currency,
      created_at: new Date().toISOString(),
    })
    if (insertErr) { setError(insertErr.message); setLoading(false); return }
    sessionStorage.setItem('onboarding_venue_id', venueId)

    // If type was set on the register page, skip the type step
    const prefill = (() => { try { return JSON.parse(sessionStorage.getItem('onboarding_prefill') ?? '{}') } catch { return {} } })()
    if (prefill.type) {
      sessionStorage.setItem('onboarding_type', prefill.type)
      sessionStorage.removeItem('onboarding_prefill')
      router.push('/onboarding/plan')
    } else {
      router.push('/onboarding/type')
    }
  }

  return (
    <OnboardingShell step={0}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Tell us about your venue</h1>
      <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        This appears in receipts and on your devices.
      </p>

      {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="field">
          <label>Business name <span style={{ color: '#ef4444' }}>*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} required autoFocus
            placeholder="e.g. The Crown" />
        </div>
        <div className="field">
          <label>Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder="12 High Street, London, SW1A 1AA" />
        </div>
        <div className="field">
          <label>Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+44 20 7946 0958" />
        </div>
        <div className="field">
          <label>Currency</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
          {loading ? 'Saving…' : 'Continue →'}
        </button>
      </form>
    </OnboardingShell>
  )
}
