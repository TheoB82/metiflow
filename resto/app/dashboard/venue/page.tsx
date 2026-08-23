'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { HoursEditor } from '@/components/HoursEditor'
import { defaultHours, parseHours, encodeHours, type Hours } from '@/lib/openingHours'
import { mergeVenueSettings } from '@/lib/venueSettings'
import { uniqueSlug } from '@/lib/slug'
import { t } from '@/lib/i18n'

function VenueEditForm() {
  const router = useRouter()
  const params = useSearchParams()
  const venueId = params.get('id')

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [tableService, setTableService] = useState(true)
  const [takeaway, setTakeaway] = useState(false)
  const [tableCount, setTableCount] = useState(10)
  const [hours, setHours] = useState<Hours>(defaultHours())
  const [slug, setSlug] = useState('')
  const [qrOrdering, setQrOrdering] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!venueId) { router.push('/dashboard'); return }
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await sb.from('venues').select('*').eq('id', venueId).eq('owner_id', user.id).single()
      if (!data) { router.push('/dashboard'); return }
      setName(data.name ?? '')
      setAddress(data.address ?? '')
      setPhone(data.phone ?? '')
      setCurrency(data.currency ?? 'GBP')
      setTableService(data.enable_table_service ?? true)
      setTakeaway(data.enable_takeaway ?? false)
      if (data.opening_hours) setHours(parseHours(data.opening_hours))
      if (data.settings_json) {
        try { const s = JSON.parse(data.settings_json); if (s.table_count) setTableCount(s.table_count) } catch { /* */ }
      }
      setSlug(data.slug ?? '')
      setQrOrdering(data.enable_qr_ordering ?? false)
      setLoading(false)
    }
    load()
  }, [venueId, router])

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)

    // uniqueSlug() re-normalises and checks for collisions, excluding this
    // venue's own current row so an unchanged slug doesn't "collide with
    // itself". Falls back to the venue name if the field's been cleared.
    const finalSlug = await uniqueSlug(slug.trim() || name, venueId!)

    const sb = createClient()
    const { error: err } = await sb.from('venues').update({
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      currency,
      enable_table_service: tableService,
      enable_takeaway: takeaway,
      opening_hours: encodeHours(hours),
      slug: finalSlug || null,
      enable_qr_ordering: qrOrdering,
    }).eq('id', venueId!)
    if (err) { setError(err.message); setSaving(false); return }

    try {
      await mergeVenueSettings(venueId!, { table_count: tableCount })
    } catch (settingsErr) {
      setError((settingsErr as Error).message); setSaving(false); return
    }

    setSuccess(true); setSaving(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <div className="error-box">{error}</div>}
      {success && (
        <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#15803d', fontSize: '0.875rem' }}>
          Saved successfully ✓
        </div>
      )}

      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Venue details</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="field">
            <label>Business name</label>
            <input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
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
      </section>

      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Service modes</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { label: 'Restaurant / table service', desc: 'Table plan, seat assignments, course tracking', value: tableService, set: setTableService },
            { label: 'Takeaway & collection', desc: 'Order screen, KDS, collection/delivery', value: takeaway, set: setTakeaway },
          ].map(({ label, desc, value, set }) => (
            <label key={label} style={{
              display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
              border: `1.5px solid ${value ? 'var(--brand)' : 'var(--border)'}`,
              background: value ? 'var(--brand-light)' : 'var(--surface)',
              borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <input type="checkbox" checked={value} onChange={e => set(e.target.checked)}
                style={{ accentColor: 'var(--brand)', width: 16, height: 16, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{label}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{desc}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Tables</h2>
        <div className="field">
          <label>Number of tables</label>
          <input type="number" min={1} max={200} value={tableCount} onChange={e => setTableCount(Number(e.target.value))} style={{ maxWidth: 120 }} />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Opening hours</h2>
        <HoursEditor hours={hours} onChange={setHours} />
      </section>

      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          {t('publicPageTitle')}
          <span style={{
            fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac',
          }}>{t('publicPageLive')}</span>
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginBottom: '0.75rem' }}>{t('publicPageDesc')}</p>
        <div className="field" style={{ marginBottom: '0.75rem' }}>
          <label>Page address</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{
              padding: '0.625rem 0 0.625rem 0.875rem', fontSize: '0.9375rem', color: 'var(--text-3)',
              border: '1.5px solid var(--border)', borderRight: 'none', borderRadius: '8px 0 0 8px',
              background: 'var(--surface-2)', whiteSpace: 'nowrap',
            }}>resto.metiflow.com/v/</span>
            <input
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="your-venue-name"
              style={{ borderRadius: '0 8px 8px 0' }}
            />
          </div>
          <span className="hint">Table QR codes work immediately either way — they use the venue automatically, no address needed. This is only for sharing a general link (website, socials).</span>
        </div>
        <label style={{
          display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
          border: `1.5px solid ${qrOrdering ? 'var(--brand)' : 'var(--border)'}`,
          background: qrOrdering ? 'var(--brand-light)' : 'var(--surface)',
          borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
        }}>
          <input type="checkbox" checked={qrOrdering} onChange={e => setQrOrdering(e.target.checked)}
            style={{ accentColor: 'var(--brand)', width: 16, height: 16, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{t('enableOrdering')}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{t('enableOrderingDesc')}</div>
          </div>
        </label>
      </section>

      <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
        <button className="btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <a href="/dashboard" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0.75rem 1.25rem', border: '1.5px solid var(--border)',
          borderRadius: 8, fontWeight: 500, fontSize: '0.9375rem', textDecoration: 'none', color: 'var(--text)',
        }}>Cancel</a>
      </div>
    </form>
  )
}

export default function VenueEditPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)' }}>
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', height: 60,
      }}>
        <Logo size={32} compact />
        <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>›</span>
        <a href="/dashboard" style={{ fontSize: '0.875rem', color: 'var(--text-2)', textDecoration: 'none' }}>Dashboard</a>
        <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>›</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>Edit venue</span>
      </header>

      <main style={{ maxWidth: 620, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="card">
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Edit venue</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Changes here sync to the app the next time the device connects.
          </p>
          <Suspense fallback={<div>Loading…</div>}>
            <VenueEditForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
