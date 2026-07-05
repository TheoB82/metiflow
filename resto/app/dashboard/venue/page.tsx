'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/Logo'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
type DayHours = { open: boolean; from: string; to: string }
type Hours = Record<string, DayHours>

function defaultHours(): Hours {
  return Object.fromEntries(DAYS.map(d => [d, { open: true, from: '09:00', to: '22:00' }]))
}

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
      if (data.opening_hours) {
        try { setHours(JSON.parse(data.opening_hours)) } catch { /* keep default */ }
      }
      if (data.settings_json) {
        try { const s = JSON.parse(data.settings_json); if (s.table_count) setTableCount(s.table_count) } catch { /* */ }
      }
      setLoading(false)
    }
    load()
  }, [venueId, router])

  function setDay(day: string, patch: Partial<DayHours>) {
    setHours(h => ({ ...h, [day]: { ...h[day], ...patch } }))
  }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)
    const sb = createClient()
    const { error: err } = await sb.from('venues').update({
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      currency,
      enable_table_service: tableService,
      enable_takeaway: takeaway,
      opening_hours: JSON.stringify(hours),
      settings_json: JSON.stringify({ table_count: tableCount }),
    }).eq('id', venueId)
    if (err) { setError(err.message); setSaving(false); return }
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {DAYS.map(day => (
            <div key={day} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.5rem',
              alignItems: 'center', padding: '0.5rem 0.75rem',
              border: '1.5px solid var(--border)', borderRadius: 8,
              background: hours[day]?.open ? 'var(--surface)' : '#f8fafc',
            }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={hours[day]?.open ?? true} onChange={e => setDay(day, { open: e.target.checked })}
                  style={{ accentColor: 'var(--brand)', width: 15, height: 15 }} />
                {day}
              </label>
              {hours[day]?.open ? (
                <>
                  <input type="time" value={hours[day]?.from ?? '09:00'} onChange={e => setDay(day, { from: e.target.value })}
                    style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.875rem' }} />
                  <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>–</span>
                  <input type="time" value={hours[day]?.to ?? '22:00'} onChange={e => setDay(day, { to: e.target.value })}
                    style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.875rem' }} />
                </>
              ) : (
                <span style={{ gridColumn: 'span 3', fontSize: '0.8125rem', color: 'var(--text-3)', fontStyle: 'italic' }}>Closed</span>
              )}
            </div>
          ))}
        </div>
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
