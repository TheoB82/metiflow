'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { OnboardingShell } from '@/components/OnboardingShell'
import { uniqueSlug } from '@/lib/slug'
import { cloneVenueSetup } from '@/lib/cloneVenue'
import { t } from '@/lib/i18n'
import { v4 as uuidv4 } from 'uuid'

const CURRENCIES = [
  { code: 'GBP', label: '£ GBP — British Pound' },
  { code: 'EUR', label: '€ EUR — Euro' },
  { code: 'USD', label: '$ USD — US Dollar' },
  { code: 'AUD', label: 'A$ AUD — Australian Dollar' },
  { code: 'CAD', label: 'C$ CAD — Canadian Dollar' },
]

type ExistingVenue = { id: string; name: string; enable_table_service: boolean; enable_takeaway: boolean }

export default function VenuePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Multi-location fork — informational only right now (see design plan):
  // "multiple" just changes the dashboard's empty state afterwards to lead
  // with "+ Add venue" instead of treating this as the owner's only site.
  const [multiLocation, setMultiLocation] = useState<'single' | 'multiple' | null>(null)

  // Copy-from-venue — only offered when the owner already has ≥1 venue.
  const [existingVenues, setExistingVenues] = useState<ExistingVenue[]>([])
  const [copyFromId, setCopyFromId] = useState<string | null>(null)
  const [checkingVenues, setCheckingVenues] = useState(true)
  // Set when the register page already asked this — skips re-asking below.
  const [multiFromPrefill, setMultiFromPrefill] = useState<'single' | 'multiple' | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('onboarding_prefill')
      if (raw) {
        const p = JSON.parse(raw)
        if (p.name) setName(p.name)
        if (p.phone) setPhone(p.phone)
        if (p.address) setAddress(p.address)
        if (p.currency) setCurrency(p.currency)
        if (p.multi === 'single' || p.multi === 'multiple') {
          setMultiFromPrefill(p.multi)
          setMultiLocation(p.multi)
        }
      }
    } catch { /* ignore */ }

    async function loadExisting() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setCheckingVenues(false); return }
      const { data } = await sb.from('venues')
        .select('id, name, enable_table_service, enable_takeaway')
        .eq('owner_id', user.id)
        .order('created_at')
      setExistingVenues(data ?? [])
      setCheckingVenues(false)
    }
    loadExisting()
  }, [])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true); setError('')
    const sb = createClient()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr || !user) { router.push('/login'); return }

    const venueId = uuidv4()
    const slug = await uniqueSlug(name)
    const { error: insertErr } = await sb.from('venues').upsert({
      id: venueId,
      owner_id: user.id,
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      currency,
      slug,
      created_at: new Date().toISOString(),
    })
    if (insertErr) { setError(insertErr.message); setLoading(false); return }
    sessionStorage.setItem('onboarding_venue_id', venueId)
    if (multiLocation) sessionStorage.setItem('onboarding_multi', multiLocation)

    if (copyFromId) {
      try {
        await cloneVenueSetup(copyFromId, venueId)
      } catch (cloneErr) {
        // Venue row already exists at this point — surface the error but
        // let them continue manually rather than stranding them.
        setError(`Copy didn't fully complete (${(cloneErr as Error).message}). You can still continue and set things up manually.`)
      }
      // Type/features are inherited from the copy — skip straight to Plan.
      sessionStorage.setItem('onboarding_copy_from', copyFromId)
      const source = existingVenues.find(v => v.id === copyFromId)
      const inheritedType =
        source?.enable_table_service && source?.enable_takeaway ? 'both'
        : source?.enable_takeaway ? 'takeaway'
        : 'restaurant'
      sessionStorage.setItem('onboarding_type', inheritedType)
      sessionStorage.removeItem('onboarding_prefill')
      router.push('/onboarding/plan')
      return
    }

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

        {/* ── Multi-location fork — only asked for a first venue, and ─
             only if the register page didn't already ask it ─────────── */}
        {!checkingVenues && existingVenues.length === 0 && !multiFromPrefill && (
          <div className="field">
            <label>{t('locationsQuestion')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {([
                ['single', t('locationsSingle'), t('locationsSingleDesc')],
                ['multiple', t('locationsMultiple'), t('locationsMultipleDesc')],
              ] as const).map(([value, label, desc]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMultiLocation(value)}
                  style={{
                    padding: '0.75rem', textAlign: 'left', borderRadius: 8, cursor: 'pointer',
                    border: `1.5px solid ${multiLocation === value ? 'var(--brand)' : 'var(--border)'}`,
                    background: multiLocation === value ? 'var(--brand-light)' : 'var(--surface)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Copy-from-venue — only offered for a 2nd+ venue ───────── */}
        {!checkingVenues && existingVenues.length > 0 && (
          <div className="field">
            <label>{t('copyFromTitle')}</label>
            <span className="hint" style={{ marginBottom: 6, display: 'block' }}>{t('copyFromDesc')}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setCopyFromId(null)}
                style={{
                  padding: '0.625rem 0.75rem', textAlign: 'left', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${copyFromId === null ? 'var(--brand)' : 'var(--border)'}`,
                  background: copyFromId === null ? 'var(--brand-light)' : 'var(--surface)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('copyFromScratch')}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{t('copyFromScratchDesc')}</div>
              </button>
              {existingVenues.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setCopyFromId(v.id)}
                  style={{
                    padding: '0.625rem 0.75rem', textAlign: 'left', borderRadius: 8, cursor: 'pointer',
                    border: `1.5px solid ${copyFromId === v.id ? 'var(--brand)' : 'var(--border)'}`,
                    background: copyFromId === v.id ? 'var(--brand-light)' : 'var(--surface)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('copyFromExisting')} {v.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
          {loading ? 'Saving…' : 'Continue →'}
        </button>
      </form>
    </OnboardingShell>
  )
}
