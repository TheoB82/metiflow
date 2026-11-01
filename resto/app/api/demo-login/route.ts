import { NextResponse } from 'next/server'
import { DEMO_COOKIE, demoToken, isDemoLogin } from '@/lib/demoAccess'

// Signs a visitor in to the app demo (see lib/demoAccess.ts).
export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}))
  if (typeof email !== 'string' || typeof password !== 'string' ||
      !isDemoLogin(email, password)) {
    return NextResponse.json({ error: 'Wrong email or password' }, { status: 401 })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(DEMO_COOKIE, await demoToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
