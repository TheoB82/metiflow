import { Logo } from '@/components/Logo'
import { broadcastCallWaiter } from '@/lib/callWaiter'

// Customer-facing "Call Staff" confirmation page, reached by scanning a
// table QR code. Broadcasting happens server-side here (not in a Supabase
// Edge Function) because Supabase force-rewrites any text/html Edge
// Function response to text/plain unless the project is on Pro with a
// custom function domain — the old /functions/v1/call-waiter endpoint could
// never actually render this page on a phone, only show raw markup as text.
//
// Superseded as the primary landing point by /v/<venue>/<table> (the menu
// page with an inline Call Waiter button) — kept working as-is for any
// already-printed QR codes that still point here. See lib/callWaiter.ts
// for why the broadcast has to go through a live realtime connection
// rather than the REST endpoint, and for the Vercel env var gotcha that
// silently no-op'd this until 2026-08-23.
export default async function CallWaiterPage({
  params,
}: {
  params: Promise<{ venueId: string; table: string }>
}) {
  const { venueId, table } = await params
  const tableLabel = decodeURIComponent(table)

  try {
    await broadcastCallWaiter(venueId, tableLabel)
  } catch (e) {
    console.error('[call-waiter] broadcast error:', e)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Logo />
        </div>
        <div className="card">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔔</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Waiter on the way
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem' }}>
            Your waiter has been notified and will be with you shortly.
          </p>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-3)', fontSize: '0.8125rem' }}>
          powered by metiflow
        </p>
      </div>
    </div>
  )
}
