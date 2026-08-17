'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { OnboardingShell } from '@/components/OnboardingShell'
import { TAKEAWAY_PLANS, RESTAURANT_PLANS, type PlanId } from '@/lib/plans'

export default function PlanPage() {
  const router = useRouter()
  const [venueType, setVenueType] = useState<string>('both')
  const [selected, setSelected] = useState<PlanId | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = sessionStorage.getItem('onboarding_type') ?? 'both'
    setVenueType(t)
    setSelected(t === 'takeaway' ? 'takeaway_online' : 'basic_online')
  }, [])

  const plans = venueType === 'takeaway' ? TAKEAWAY_PLANS : RESTAURANT_PLANS

  async function handleContinue() {
    if (!selected) return
    setLoading(true); setError('')
    const venueId = sessionStorage.getItem('onboarding_venue_id')
    if (!venueId) { router.push('/onboarding/venue'); return }
    const sb = createClient()
    const { error: err } = await sb.from('venues').update({ plan: selected }).eq('id', venueId)
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/onboarding/handoff')
  }

  return (
    <OnboardingShell step={2}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Choose your plan</h1>
      <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        No setup fees. Cancel any time. Prices exclude VAT.
      </p>

      {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {plans.map(plan => (
          <button key={plan.id} type="button" onClick={() => setSelected(plan.id)}
            style={{
              position: 'relative', display: 'flex', gap: '1rem', padding: '1rem',
              borderRadius: 10, textAlign: 'left', cursor: 'pointer',
              border: selected === plan.id ? '2px solid var(--brand)' : '1.5px solid var(--border)',
              background: selected === plan.id ? 'var(--brand-light)' : 'var(--surface)',
              transition: 'all 0.15s',
            }}>
            {plan.popular && (
              <span style={{
                position: 'absolute', top: -10, right: 12,
                background: '#f59e0b', color: '#fff', borderRadius: 99,
                padding: '2px 10px', fontSize: '0.6875rem', fontWeight: 700,
              }}>Most popular</span>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{plan.name}</span>
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  background: `${plan.badgeColor}20`, color: plan.badgeColor,
                }}>{plan.badge}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand)', marginBottom: 6 }}>
                {plan.price}<span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-2)' }}>/month</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: '0.8125rem', color: 'var(--text-2)', display: 'flex', gap: 6 }}>
                    <span style={{ color: '#22c55e', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </button>
        ))}
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '1rem', textAlign: 'center' }}>
        You won&rsquo;t be charged today — your account starts on a free trial.
      </p>

      <button className="btn-primary" onClick={handleContinue} disabled={!selected || loading}>
        {loading ? 'Saving…' : 'Continue →'}
      </button>
      <button className="btn-outline" onClick={() => router.back()} style={{ marginTop: '0.5rem' }}>
        ← Back
      </button>
    </OnboardingShell>
  )
}
