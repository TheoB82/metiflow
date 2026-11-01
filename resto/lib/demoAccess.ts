// The shareable KitchenFlow demo (public/app-demo): one shared login,
// checked here — not a Supabase account, so it can't sign in to the real
// dashboard or create venues. Change it with DEMO_EMAIL / DEMO_PASSWORD.
export const DEMO_COOKIE = 'metiflow_demo'
export const DEMO_EMAIL = (process.env.DEMO_EMAIL ?? 'demo@metiflow.com').toLowerCase()
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo123'

export function isDemoLogin(email: string, password: string) {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD
}

// The cookie's value: changes whenever the login does, so changing the
// password signs everyone out of the demo.
export async function demoToken(): Promise<string> {
  const bytes = new TextEncoder().encode(`metiflow-demo:${DEMO_EMAIL}:${DEMO_PASSWORD}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}
