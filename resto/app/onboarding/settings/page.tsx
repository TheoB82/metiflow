'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { OnboardingShell } from '@/components/OnboardingShell'
import { HoursEditor } from '@/components/HoursEditor'
import { defaultHours, encodeHours, type Hours } from '@/lib/openingHours'
import { mergeVenueSettings } from '@/lib/venueSettings'

export default function SettingsPage() {
  const router = useRouter()
  const [tableCount, setTableCount] = useState(10)
  const [hours, setHours] = useState<Hours>(defaultHours())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleContinue() {
    setLoading(true); setError('')
    const venueId = sessionStorage.getItem('onboarding_venue_id')
    if (!venueId) { router.push('/onboarding/venue'); return }

    const sb = createClient()
    const { error: err } = await sb.from('venues').update({
      opening_hours: encodeHours(hours),
    }).eq('id', venueId)
    if (err) { setError(err.message); setLoading(false); return }

    try {
      // table_count isn't a Supabase column — merged into settings_json
      // alongside whatever the Features step already set, not overwriting it.
      await mergeVenueSettings(venueId, { table_count: tableCount })
    } catch (settingsErr) {
      setError((settingsErr as Error).message); setLoading(false); return
    }

    sessionStorage.removeItem('onboarding_venue_id')
    sessionStorage.removeItem('onboarding_type')
    sessionStorage.removeItem('onboarding_copy_from')
    sessionStorage.removeItem('onboarding_multi')
    router.push('/dashboard')
  }

  return (
    <OnboardingShell step={5}>
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
        <HoursEditor hours={hours} onChange={setHours} />
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
