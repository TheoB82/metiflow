'use client'
import { useState } from 'react'
import { Logo } from '@/components/Logo'

// Sign in to the KitchenFlow app demo with the shared demo login.
export default function DemoLoginPage() {
  const [email, setEmail] = useState('demo@metiflow.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      setError('Wrong email or password')
      setLoading(false)
      return
    }
    window.location.assign('/app-demo/index.html')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo />
        </div>
        <div className="card">
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Try the app</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            A demo taverna in your browser: tables, counter, kitchen, bookings,
            stock and recipes. Nothing is saved; refresh to start again.
          </p>
          {error && <div className="error-box" style={{ marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Opening…' : 'Open the demo'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-3)', fontSize: '0.8125rem' }}>
          powered by metiflow
        </p>
      </div>
    </div>
  )
}
