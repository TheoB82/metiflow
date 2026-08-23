// Pure, no server-only imports — safe for client components to import
// directly. venueMenu.ts re-exports this too for server-side callers,
// but a 'use client' component (CartBar) must import it from here, not
// from venueMenu.ts, since that file transitively pulls in
// supabase-server.ts's next/headers import, which breaks client bundling.
export function formatPrice(pence: number, currency: string) {
  const symbol = { GBP: '£', EUR: '€', USD: '$' }[currency] ?? currency + ' '
  return `${symbol}${(pence / 100).toFixed(2)}`
}
