'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { OnboardingShell } from '@/components/OnboardingShell'

type Option = { id: string; label: string; desc: string; icon: string; tableService: boolean; takeaway: boolean }

const OPTIONS: Option[] = [
  {
    id: 'restaurant',
    label: 'Restaurant / dine-in',
    desc: 'Table plan, seat assignments, course tracking, KDS, payments',
    icon: '🍽️',
    tableService: true, takeaway: false,
  },
  {
    id: 'takeaway',
    label: 'Takeaway & collection',
    desc: 'Order screen, KDS, collection/delivery, pre-orders',
    icon: '🛵',
    tableService: false, takeaway: true,
  },
  {
    id: 'both',
    label: 'Both',
    desc: 'Full restaurant service plus takeaway and pre-orders',
    icon: '🏪',
    tableService: true, takeaway: true,
  },
]

export default function TypePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleContinue() {
    if (!selected) return
    const opt = OPTIONS.find(o => o.id === selected)!
    setLoading(true); setError('')
    const venueId = sessionStorage.getItem('onboarding_venue_id')
    if (!venueId) { router.push('/onboarding/venue'); return }
    const sb = createClient()
    const { error: err } = await sb.from('venues').update({
      enable_table_service: opt.tableService,
      enable_takeaway: opt.takeaway,
    }).eq('id', venueId)
    if (err) { setError(err.message); setLoading(false); return }
    sessionStorage.setItem('onboarding_type', selected)
    router.push('/onboarding/plan')
  }

  return (
    <OnboardingShell step={1}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>What kind of venue is this?</h1>
      <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        This sets which features are enabled. You can change it later.
      </p>

      {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {OPTIONS.map(opt => (
          <button key={opt.id} type="button" onClick={() => setSelected(opt.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '1rem',
              padding: '1rem', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
              border: selected === opt.id ? '2px solid var(--brand)' : '1.5px solid var(--border)',
              background: selected === opt.id ? 'var(--brand-light)' : 'var(--surface)',
              transition: 'all 0.15s',
            }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>{opt.icon}</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <button className="btn-primary" onClick={handleContinue} disabled={!selected || loading}>
        {loading ? 'Saving…' : 'Continue →'}
      </button>
      <button className="btn-outline" onClick={() => router.back()} style={{ marginTop: '0.5rem' }}>
        ← Back
      </button>
    </OnboardingShell>
  )
}
