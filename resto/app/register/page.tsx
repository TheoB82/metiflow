'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/Logo'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const sb = createClient()
    const { error } = await sb.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding/venue` },
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/onboarding/venue')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo />
        </div>

        <div className="card">
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Create your account</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Takes 2 minutes — no card required to start
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
              <span className="hint">At least 8 characters</span>
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Creating account…' : 'Continue'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>Already have an account? </span>
            <a href="/login" style={{ color: 'var(--brand)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
