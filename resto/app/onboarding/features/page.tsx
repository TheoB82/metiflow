'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { OnboardingShell } from '@/components/OnboardingShell'
import { mergeVenueSettings } from '@/lib/venueSettings'
import { t } from '@/lib/i18n'

type FeatureKey = 'reservations' | 'order_filters' | 'seat_selection' | 'inventory'

// Keys/labels match exactly what the KitchenFlow app itself reads back out
// of venues.settings_json (see SupabaseMenuSync.pushVenueSettings /
// _doApplyVenueSettingsJson) — this has to stay in lockstep with the app,
// not just look similar.
//
// A function, not a module-level constant: t() is locale-aware, and this
// needs to re-resolve per render once a real locale switcher exists (today
// it's always 'en', so this recomputes to the same thing every time, but
// building it as a constant now would silently freeze it in English even
// after that lands).
function featureRows(): { key: FeatureKey; title: string; desc: string }[] {
  return [
    { key: 'reservations',   title: t('featureReservations'), desc: t('featureReservationsDesc') },
    { key: 'order_filters',  title: t('featureAllergy'),       desc: t('featureAllergyDesc') },
    { key: 'seat_selection', title: t('featureSeating'),       desc: t('featureSeatingDesc') },
    { key: 'inventory',      title: t('featureStock'),         desc: t('featureStockDesc') },
  ]
}

export default function FeaturesPage() {
  const router = useRouter()
  const [values, setValues] = useState<Record<FeatureKey, boolean>>({
    reservations: true,
    order_filters: true,
    seat_selection: true,
    inventory: false,
  })
  const [cloudHistory, setCloudHistory] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const type = sessionStorage.getItem('onboarding_type')
    // Smart defaults from venue type — a takeaway-only venue has no tables
    // or seats to assign, so those two default off rather than on.
    if (type === 'takeaway') {
      setValues(v => ({ ...v, reservations: false, seat_selection: false }))
    }

    async function loadPlan() {
      const venueId = sessionStorage.getItem('onboarding_venue_id')
      if (!venueId) { setLoading(false); return }
      const sb = createClient()
      const { data } = await sb.from('venues').select('plan').eq('id', venueId).single()
      // "Pro" tiers are explicitly "+ Online backup" — cloud history on by
      // default there, off for the local-only tiers. Editable either way.
      setCloudHistory((data?.plan ?? '').toString().endsWith('_online'))
      setLoading(false)
    }
    loadPlan()
  }, [])

  async function handleContinue() {
    const venueId = sessionStorage.getItem('onboarding_venue_id')
    if (!venueId) { router.push('/onboarding/venue'); return }
    setSaving(true); setError('')
    try {
      // `inventory` is the internal stock-tracking capability flag; the
      // Settings screen the owner actually sees ("Stock Room in main
      // menu") reads a DIFFERENT key, enable_stock_room — both need
      // setting from the one checkbox here, or the app shows it as off
      // with no indication why (confirmed 2026-08-18).
      await mergeVenueSettings(venueId, {
        ...values,
        enable_stock_room: values.inventory,
        cloud_history: cloudHistory,
      })
    } catch (err) {
      setError((err as Error).message); setSaving(false); return
    }
    router.push('/onboarding/settings')
  }

  if (loading) {
    return (
      <OnboardingShell step={4}>
        <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell step={4}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t('featuresTitle')}</h1>
      <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{t('featuresDesc')}</p>

      {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {featureRows().map(f => (
          <label key={f.key} style={{
            display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
            border: `1.5px solid ${values[f.key] ? 'var(--brand)' : 'var(--border)'}`,
            background: values[f.key] ? 'var(--brand-light)' : 'var(--surface)',
            borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <input
              type="checkbox"
              checked={values[f.key]}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.checked }))}
              style={{ accentColor: 'var(--brand)', width: 16, height: 16, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{f.title}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{f.desc}</div>
            </div>
          </label>
        ))}

        <label style={{
          display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
          border: `1.5px solid ${cloudHistory ? 'var(--brand)' : 'var(--border)'}`,
          background: cloudHistory ? 'var(--brand-light)' : 'var(--surface)',
          borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
        }}>
          <input
            type="checkbox"
            checked={cloudHistory}
            onChange={e => setCloudHistory(e.target.checked)}
            style={{ accentColor: 'var(--brand)', width: 16, height: 16, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{t('featureCloudHistory')}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{t('featureCloudHistoryDesc')}</div>
          </div>
        </label>
      </div>

      <button className="btn-primary" onClick={handleContinue} disabled={saving}>
        {saving ? 'Saving…' : 'Continue →'}
      </button>
      <button className="btn-outline" onClick={() => router.push('/onboarding/settings')} style={{ marginTop: '0.5rem' }}>
        Skip this step
      </button>
    </OnboardingShell>
  )
}
