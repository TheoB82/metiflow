'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/Logo'

type Venue = {
  id: string
  name: string
  address: string | null
  phone: string | null
  currency: string
  enable_table_service: boolean
  enable_takeaway: boolean
  plan: string | null
  opening_hours: string | null
  settings_json: string | null
}

const PLAN_LABELS: Record<string, { label: string; price: string }> = {
  takeaway:        { label: 'Takeaway',         price: '£19.50/mo' },
  takeaway_online: { label: 'Takeaway Pro',      price: '£24.50/mo' },
  basic:           { label: 'Restaurant',        price: '£44.50/mo' },
  basic_online:    { label: 'Restaurant Pro',    price: '£49.50/mo' },
  trial:           { label: 'Trial',             price: 'Free' },
  lifetime:        { label: 'Lifetime',          price: 'Free' },
}

export default function DashboardPage() {
  const router = useRouter()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [showMultiHint, setShowMultiHint] = useState(false)

  useEffect(() => {
    // One-time nudge — set when the owner said "more than one location"
    // during onboarding. Consumed immediately so it only shows on this
    // first landing, not every dashboard visit afterwards.
    if (sessionStorage.getItem('onboarding_multi') === 'multiple') {
      setShowMultiHint(true)
      sessionStorage.removeItem('onboarding_multi')
    }

    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')
      const { data } = await sb.from('venues')
        .select('id,name,address,phone,currency,enable_table_service,enable_takeaway,plan,opening_hours,settings_json')
        .eq('owner_id', user.id)
        .order('created_at')
      setVenues(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  async function signOut() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-3)' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)' }}>
      {/* Nav */}
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', height: 60,
      }}>
        <Logo size={32} compact />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{userEmail}</span>
        <button onClick={signOut} style={{
          fontSize: '0.875rem', color: 'var(--text-2)', background: 'none',
          border: '1px solid var(--border)', borderRadius: 6, padding: '0.375rem 0.75rem', cursor: 'pointer',
        }}>Sign out</button>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {showMultiHint && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem',
            padding: '0.75rem 1rem', background: 'var(--brand-light)',
            border: '1px solid var(--brand)', borderRadius: 8,
          }}>
            <span style={{ fontSize: 18 }}>🏪</span>
            <p style={{ fontSize: '0.875rem', color: 'var(--text)', flex: 1 }}>
              This venue is set up. When you&rsquo;re ready, use <b>+ Add venue</b> below for your next
              location — you&rsquo;ll be able to copy this one&rsquo;s menu and settings as a starting point.
            </p>
            <button onClick={() => setShowMultiHint(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1.125rem', lineHeight: 1,
            }}>×</button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>Your venues</h1>
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Manage settings for each of your locations</p>
          </div>
          <a href="/onboarding/venue" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--brand)', color: '#fff', borderRadius: 8,
            padding: '0.625rem 1rem', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
          }}>+ Add venue</a>
        </div>

        {venues.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
            <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>No venues yet. Let&rsquo;s set one up.</p>
            <a href="/onboarding/venue" style={{
              display: 'inline-block', background: 'var(--brand)', color: '#fff',
              borderRadius: 8, padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
            }}>Set up your venue</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {venues.map(v => <VenueCard key={v.id} venue={v} />)}
          </div>
        )}
      </main>
    </div>
  )
}

function VenueCard({ venue }: { venue: Venue }) {
  const plan = PLAN_LABELS[venue.plan ?? 'trial'] ?? { label: venue.plan ?? 'Trial', price: '' }
  const modes = [
    venue.enable_table_service && 'Restaurant',
    venue.enable_takeaway && 'Takeaway',
  ].filter(Boolean).join(' · ') || 'Not configured'

  return (
    <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
      <div style={{
        width: 48, height: 48, background: 'var(--brand-light)', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>🏪</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{venue.name}</h2>
          <span style={{
            fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99,
            background: '#fff7ed', color: 'var(--brand)',
          }}>{plan.label}</span>
          {plan.price && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{plan.price}</span>}
        </div>
        {venue.address && <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: 4 }}>{venue.address}</p>}
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>{modes} · {venue.currency}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <a href={`/dashboard/venue?id=${venue.id}`} style={{
          padding: '0.5rem 1rem', border: '1.5px solid var(--border)',
          borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', color: 'var(--text)',
          background: 'var(--surface)', textAlign: 'center',
        }}>Edit</a>
        <a href={`/dashboard/billing?id=${venue.id}`} style={{
          padding: '0.5rem 1rem', border: '1.5px solid var(--border)',
          borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', color: 'var(--text)',
          background: 'var(--surface)', textAlign: 'center',
        }}>Billing</a>
      </div>
    </div>
  )
}
