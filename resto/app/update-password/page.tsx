'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/Logo'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const sb = createClient()
    // Listen for the PASSWORD_RECOVERY event — fires when Supabase
    // parses the #access_token recovery hash from the URL
    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Also check if session already active (user navigated here directly after link)
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const sb = createClient()
    const { error: err } = await sb.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => { window.location.href = '/login' }, 2000)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo />
        </div>

        <div className="card">
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Set new password</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Choose a strong password for your account.
          </p>

          {done && (
            <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, color: '#15803d', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Password updated — redirecting to login…
            </div>
          )}

          {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}

          {!ready && !done && (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
              Verifying reset link…
            </p>
          )}

          {ready && !done && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="field">
                <label>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
                <span className="hint">At least 8 characters</span>
              </div>
              <div className="field">
                <label>Confirm new password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? 'Updating…' : 'Set password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
