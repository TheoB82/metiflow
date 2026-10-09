'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/Logo'
import { ALL_PLANS, planById, type PlanId } from '@/lib/plans'

type Venue = { id: string; name: string }

type AccountBilling = {
  plan: string
  license_expires_at: number | null
  subscription_status: string | null
  venues: Venue[]
}

function daysLeft(expiresAtMs: number | null): number | null {
  if (expiresAtMs == null) return null
  return Math.ceil((expiresAtMs - Date.now()) / (1000 * 60 * 60 * 24))
}

function BillingForm() {
  const router = useRouter()
  const params = useSearchParams()
  const success = params.get('success') === '1'
  const canceled = params.get('canceled') === '1'

  const [account, setAccount] = useState<AccountBilling | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState<PlanId | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }

      // One Stripe subscription covers every venue this owner has — pull
      // them all and use whichever carries the live subscription, if any,
      // as the source of truth (they're kept in sync by the webhook).
      const { data } = await sb.from('venues')
        .select('id, name, plan, license_expires_at, subscription_status, stripe_subscription_id')
        .eq('owner_id', user.id)
        .order('created_at')
      if (!data || data.length === 0) { router.push('/dashboard'); return }

      const source = data.find(v => v.stripe_subscription_id) ?? data[0]
      setAccount({
        plan: source.plan,
        license_expires_at: source.license_expires_at,
        subscription_status: source.subscription_status,
        venues: data.map(v => ({ id: v.id, name: v.name })),
      })
      setLoading(false)
    }
    load()
  }, [router])

  async function subscribe(plan: PlanId) {
    if (!account) return
    setCheckingOut(plan); setError('')
    // The @supabase/ssr browser client keeps the session in cookies, which
    // the same-origin API route reads directly — no auth header needed.
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Could not start checkout'); setCheckingOut(null); return }
    window.location.href = data.url
  }

  if (loading || !account) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>

  const remaining = account.plan === 'trial' ? daysLeft(account.license_expires_at) : null
  const currentPlan = planById(account.plan)
  const isActive = account.subscription_status === 'active' || account.subscription_status === 'trialing'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <div className="error-box">{error}</div>}
      {success && (
        <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#15803d', fontSize: '0.875rem' }}>
          Payment successful — thanks! Your subscription is now active.
        </div>
      )}
      {canceled && (
        <div style={{ padding: '0.75rem 1rem', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 8, color: '#9a3412', fontSize: '0.875rem' }}>
          Checkout was canceled — no payment was taken.
        </div>
      )}

      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Current plan</h2>
        {account.plan === 'trial' ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
            {remaining == null
              ? 'Free trial'
              : remaining > 0
                ? `Free trial — ${remaining} day${remaining === 1 ? '' : 's'} left`
                : 'Your free trial has ended — pick a plan below to keep your account active.'}
          </p>
        ) : (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
            {currentPlan?.name ?? account.plan} {isActive ? '· active' : account.subscription_status ? `· ${account.subscription_status}` : ''}
          </p>
        )}
        {account.venues.length > 1 && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 4 }}>
            Covers {account.venues.length} venues: {account.venues.map(v => v.name).join(', ')}
          </p>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          {account.plan === 'trial' ? 'Choose a plan to continue' : 'Change plan'}
        </h2>
        {account.venues.length > 1 && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
            One subscription covers your whole account — with {account.venues.length - 1} extra venue{account.venues.length - 1 === 1 ? '' : 's'} added at £25/mo each.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {ALL_PLANS.map(plan => (
            <div key={plan.id} style={{
              display: 'flex', gap: '1rem', padding: '1rem', borderRadius: 10,
              border: account.plan === plan.id ? '2px solid var(--brand)' : '1.5px solid var(--border)',
              background: account.plan === plan.id ? 'var(--brand-light)' : 'var(--surface)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>{plan.name}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${plan.badgeColor}20`, color: plan.badgeColor }}>{plan.badge}</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand)', marginBottom: 6 }}>
                  {plan.price}<span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-2)' }}>/month</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ fontSize: '0.8125rem', color: 'var(--text-2)', display: 'flex', gap: 6 }}>
                      <span style={{ color: '#22c55e', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                className="btn-primary"
                disabled={checkingOut !== null || (account.plan === plan.id && isActive)}
                onClick={() => subscribe(plan.id)}
                style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}
              >
                {account.plan === plan.id && isActive
                  ? 'Current plan'
                  : checkingOut === plan.id ? 'Redirecting…' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function BillingPage() {
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
        <span style={{ fontSize: '0.875rem', color: 'var(--text)' }}>Billing</span>
      </header>

      <main style={{ maxWidth: 620, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="card">
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Billing</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Manage your subscription and payment method.
          </p>
          <Suspense fallback={<div>Loading…</div>}>
            <BillingForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
