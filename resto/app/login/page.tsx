'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/Logo'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      router.replace('/update-password' + window.location.hash)
    }
  }, [router])

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [showReset, setShowReset]     = useState(false)
  const [resetEmail, setResetEmail]   = useState('')
  const [resetSent, setResetSent]     = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError]   = useState('')

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true); setError('')
    const sb = createClient()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setError('Sign in failed'); setLoading(false); return }
    if (user.email === 'admin@metiflow.com') { router.push('/admin/enquiries'); return }
    const { data: venues } = await sb.from('venues').select('id').eq('owner_id', user.id).limit(1)
    router.push(!venues || venues.length === 0 ? '/onboarding/venue' : '/dashboard')
  }

  async function handleReset(e: { preventDefault(): void }) {
    e.preventDefault()
    setResetLoading(true); setResetError('')
    const sb = createClient()
    const { error } = await sb.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    setResetLoading(false)
    if (error) { setResetError(error.message); return }
    setResetSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo />
        </div>

        <div className="card">
          {!showReset ? (
            <>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Sign in</h1>
              <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Welcome back — manage your venue
              </p>

              {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div style={{ textAlign: 'right', marginTop: -8 }}>
                  <button type="button" onClick={() => { setShowReset(true); setResetEmail(email) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.8125rem', padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Don't have an account? </span>
                <a href="/register" style={{ color: 'var(--brand)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                  Get started
                </a>
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Reset password</h1>
              <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Enter your email and we'll send a reset link.
              </p>

              {resetSent ? (
                <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#15803d', fontSize: '0.875rem' }}>
                  Check your inbox — reset link sent to {resetEmail}
                </div>
              ) : (
                <>
                  {resetError && <div className="error-box" style={{ marginBottom: '1rem' }}>{resetError}</div>}
                  <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="field">
                      <label>Email</label>
                      <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required autoFocus />
                    </div>
                    <button className="btn-primary" type="submit" disabled={resetLoading}>
                      {resetLoading ? 'Sending…' : 'Send reset link'}
                    </button>
                  </form>
                </>
              )}

              <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => { setShowReset(false); setResetSent(false); setResetError('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontWeight: 600, fontSize: '0.875rem' }}>
                  ← Back to sign in
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-3)', fontSize: '0.8125rem' }}>
          powered by metiflow
        </p>
      </div>
    </div>
  )
}
