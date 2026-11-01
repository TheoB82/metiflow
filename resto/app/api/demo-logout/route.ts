import { NextResponse } from 'next/server'
import { DEMO_COOKIE } from '@/lib/demoAccess'

// Leaves the app demo: clears the demo login and goes back to /demo. The
// app's Settings › Sign out comes here in the demo.
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/demo', request.url))
  response.cookies.set(DEMO_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}
