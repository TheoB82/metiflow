import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// The KitchenFlow browser demo (public/app-demo, built from the app's
// lib/main_demo.dart) is for sales demos by the admin only. Every file under
// /app-demo is served only to that signed-in account; anyone else goes to
// the login page and comes back afterwards.
const DEMO_ADMIN_EMAIL = 'tbratelis@gmail.com'

export async function proxy(request: NextRequest) {
  // The folder itself is the demo's index.html (Next doesn't serve one).
  const { pathname } = request.nextUrl
  const response =
    pathname === '/app-demo' || pathname === '/app-demo/'
      ? NextResponse.rewrite(new URL('/app-demo/index.html', request.url))
      : NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    },
  )
  // Verified claims (the token's signature is checked), not just the cookie.
  const { data } = await supabase.auth.getClaims()
  const email = data?.claims?.email
  if (email === DEMO_ADMIN_EMAIL) return response

  const login = new URL('/login', request.url)
  login.searchParams.set('next', '/app-demo/')
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/app-demo', '/app-demo/:path*'],
}
