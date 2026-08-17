'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { uniqueSlug } from '@/lib/slug'
import { t } from '@/lib/i18n'

type VenueType = 'restaurant' | 'takeaway' | 'both'

const TYPE_OPTIONS: { value: VenueType; label: string; desc: string; emoji: string }[] = [
  { value: 'restaurant', label: 'Restaurant', desc: 'Table service, courses, waiter flow', emoji: '🍽️' },
  { value: 'takeaway',   label: 'Takeaway',   desc: 'Counter orders, collection, KDS',     emoji: '🥡' },
  { value: 'both',       label: 'Both',       desc: 'Full table service + takeaway orders', emoji: '⚡' },
]

export default function RegisterPage() {
  const router = useRouter()

  // Auth
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  // Venue
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [venueType, setVenueType] = useState<VenueType>('restaurant')
  const [multiLocation, setMultiLocation] = useState<'single' | 'multiple'>('single')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!businessName.trim()) { setError('Business name is required'); return }
    setLoading(true); setError('')

    const sb = createClient()

    // 1. Create auth user
    const { data: authData, error: authErr } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding/plan` },
    })
    if (authErr) { setError(authErr.message); setLoading(false); return }

    const user = authData.user
    const session = authData.session

    // 2. If we have a session (auto-confirm enabled), create venue now and skip to plan
    if (user && session) {
      const tableService = venueType === 'restaurant' || venueType === 'both'
      const takeaway    = venueType === 'takeaway'   || venueType === 'both'
      const slug = await uniqueSlug(businessName.trim())

      const { data: venue, error: venueErr } = await sb.from('venues').insert({
        owner_id: user.id,
        name: businessName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        currency,
        enable_table_service: tableService,
        enable_takeaway: takeaway,
        slug,
      }).select('id').single()

      if (venueErr) {
        // Non-fatal — let onboarding handle it
        sessionStorage.setItem('onboarding_prefill', JSON.stringify({
          name: businessName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          currency,
          type: venueType,
        }))
        router.push('/onboarding/venue')
        return
      }

      sessionStorage.setItem('onboarding_venue_id', venue.id)
      sessionStorage.setItem('onboarding_type', venueType)
      sessionStorage.setItem('onboarding_multi', multiLocation)
      router.push('/onboarding/plan')
      return
    }

    // 3. Email confirmation required — store prefill and let onboarding handle it
    sessionStorage.setItem('onboarding_prefill', JSON.stringify({
      name: businessName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      currency,
      type: venueType,
      multi: multiLocation,
    }))
    router.push('/onboarding/venue')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--surface-2)' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo />
        </div>

        <div className="card">
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Set up your account</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Fill in your details below — you&rsquo;ll be up and running in minutes.
          </p>

          {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

            {/* ── Account ────────────────────────────────────────────── */}
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
              Your account
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                  <span className="hint">Min. 8 characters</span>
                </div>
                <div className="field">
                  <label>Confirm password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>
              </div>
            </div>

            {/* ── Business ───────────────────────────────────────────── */}
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
              Your business
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div className="field">
                <label>Business name <span style={{ color: 'var(--brand)', fontWeight: 400 }}>*</span></label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. The White Hart" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Phone <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000" />
                </div>
                <div className="field">
                  <label>Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}>
                    {[['GBP','£ GBP'],['EUR','€ EUR'],['USD','$ USD'],['AUD','A$ AUD'],['CAD','C$ CAD']].map(([c,l]) => (
                      <option key={c} value={c}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Address <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 High St, London, EC1A 1BB" />
              </div>
            </div>

            {/* ── Venue type ─────────────────────────────────────────── */}
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
              What kind of venue?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVenueType(opt.value)}
                  style={{
                    padding: '0.75rem 0.5rem',
                    border: `1.5px solid ${venueType === opt.value ? 'var(--brand)' : 'var(--border)'}`,
                    background: venueType === opt.value ? 'var(--brand-light)' : 'var(--surface)',
                    borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.15s',
                    outline: 'none',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.emoji}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: venueType === opt.value ? 'var(--brand)' : 'var(--text)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: 2, lineHeight: 1.3 }}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* ── Multi-location fork ────────────────────────────────── */}
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
              {t('locationsQuestion')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {([
                ['single', t('locationsSingle'), t('locationsSingleDesc')],
                ['multiple', t('locationsMultiple'), t('locationsMultipleDesc')],
              ] as const).map(([value, label, desc]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMultiLocation(value)}
                  style={{
                    padding: '0.75rem', textAlign: 'left', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${multiLocation === value ? 'var(--brand)' : 'var(--border)'}`,
                    background: multiLocation === value ? 'var(--brand-light)' : 'var(--surface)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: multiLocation === value ? 'var(--brand)' : 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: 2, lineHeight: 1.3 }}>{desc}</div>
                </button>
              ))}
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Setting up…' : 'Create account & continue →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Already have an account? </span>
            <a href="/login" style={{ color: 'var(--brand)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
