'use client'
import { ANDROID_APP_URL, IOS_APP_URL } from '@/lib/app'

// "Now install the app" panel — the website only sets the account up; the
// venue is actually run from the app, and nothing else tells a new owner that.
export function GetTheApp({ email }: { email?: string }) {
  const steps = [
    'Install the app on your phone or tablet.',
    <>Log in with {email ? <b>{email}</b> : 'the email you just registered with'}.</>,
    'Pick your venue and follow the first-login prompts to set up the device.',
  ]
  const badge = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '0.625rem 1rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem',
    textDecoration: 'none',
  } as const

  return (
    <div style={{ border: '1.5px solid var(--brand)', background: 'var(--brand-light)', borderRadius: 12, padding: '1.25rem' }}>
      <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 4 }}>Next: get the app</h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '0.875rem' }}>
        Your venue is run from the Metiflow Resto app — this website is just for your account and billing.
      </p>
      <ol style={{ margin: '0 0 1rem', paddingLeft: '1.25rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a href={ANDROID_APP_URL} target="_blank" rel="noopener noreferrer"
          style={{ ...badge, background: 'var(--brand)', color: '#fff' }}>
          Get it for Android
        </a>
        {IOS_APP_URL ? (
          <a href={IOS_APP_URL} target="_blank" rel="noopener noreferrer"
            style={{ ...badge, background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)' }}>
            Get it for iPhone / iPad
          </a>
        ) : (
          <span style={{ ...badge, background: 'var(--surface)', color: 'var(--text-3)', border: '1.5px dashed var(--border)' }}>
            iPhone / iPad — coming soon
          </span>
        )}
      </div>
    </div>
  )
}
