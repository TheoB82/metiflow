import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// The KitchenFlow browser demo (public/app-demo, built from the app's
// lib/main_demo.dart) is for sales demos by the admin only. Every file under
// /app-demo is served only to that signed-in account; anyone else goes to
// the login page and comes back afterwards.
const DEMO_ADMIN_EMAIL = 'tbratelis@gmail.com'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })
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
  if (email === DEMO_ADMIN_EMAIL) {
    // The folder itself goes to its index.html (Next doesn't serve one, and
    // strips the trailing slash): the app finds its files relative to the
    // page's own folder, so it must open as /app-demo/index.html.
    const { pathname } = request.nextUrl
    if (pathname === '/app-demo' || pathname === '/app-demo/') {
      return NextResponse.redirect(new URL('/app-demo/index.html', request.url))
    }
    return response
  }

  const login = new URL('/login', request.url)
  login.searchParams.set('next', '/app-demo/')
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/app-demo', '/app-demo/:path*'],
}
