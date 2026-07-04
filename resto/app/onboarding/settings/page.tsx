'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { OnboardingShell } from '@/components/OnboardingShell'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type DayHours = { open: boolean; from: string; to: string }
type Hours = Record<string, DayHours>

function defaultHours(): Hours {
  return Object.fromEntries(DAYS.map(d => [d, { open: true, from: '09:00', to: '22:00' }]))
}

export default function SettingsPage() {
  const router = useRouter()
  const [tableCount, setTableCount] = useState(10)
  const [hours, setHours] = useState<Hours>(defaultHours())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function setDay(day: string, patch: Partial<DayHours>) {
    setHours(h => ({ ...h, [day]: { ...h[day], ...patch } }))
  }

  async function handleContinue() {
    setLoading(true); setError('')
    const venueId = sessionStorage.getItem('onboarding_venue_id')
    if (!venueId) { router.push('/onboarding/venue'); return }

    const sb = createClient()
    const { error: err } = await sb.from('venues').update({
      opening_hours: JSON.stringify(hours),
      // table_count isn't a Supabase column, stored in settings_json
      settings_json: JSON.stringify({ table_count: tableCount }),
    }).eq('id', venueId)
    if (err) { setError(err.message); setLoading(false); return }

    sessionStorage.removeItem('onboarding_venue_id')
    sessionStorage.removeItem('onboarding_type')
    router.push('/dashboard')
  }

  return (
    <OnboardingShell step={3}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>A few more details</h1>
      <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        You can update all of these later in your dashboard.
      </p>

      {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Table count */}
      <div className="field" style={{ marginBottom: '1.5rem' }}>
        <label>Number of tables (approx.)</label>
        <input type="number" min={1} max={200} value={tableCount}
          onChange={e => setTableCount(Number(e.target.value))} />
        <span className="hint">Used to pre-size your floor plan. Change it anytime.</span>
      </div>

      {/* Opening hours */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.75rem' }}>
          Opening hours
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {DAYS.map(day => (
            <div key={day} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.5rem',
              alignItems: 'center', padding: '0.5rem 0.75rem',
              border: '1.5px solid var(--border)', borderRadius: 8,
              background: hours[day].open ? 'var(--surface)' : '#f8fafc',
            }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={hours[day].open} onChange={e => setDay(day, { open: e.target.checked })}
                  style={{ accentColor: 'var(--brand)', width: 15, height: 15 }} />
                {day}
              </label>
              {hours[day].open ? (
                <>
                  <input type="time" value={hours[day].from} onChange={e => setDay(day, { from: e.target.value })}
                    style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.875rem' }} />
                  <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>–</span>
                  <input type="time" value={hours[day].to} onChange={e => setDay(day, { to: e.target.value })}
                    style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.875rem' }} />
                </>
              ) : (
                <span style={{ gridColumn: 'span 3', fontSize: '0.8125rem', color: 'var(--text-3)', fontStyle: 'italic' }}>Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={handleContinue} disabled={loading}>
        {loading ? 'Finishing setup…' : 'Complete setup →'}
      </button>
      <button className="btn-outline" onClick={() => router.back()} style={{ marginTop: '0.5rem' }}>
        ← Back
      </button>
    </OnboardingShell>
  )
}
