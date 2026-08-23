import { Logo } from '@/components/Logo'

// Customer-facing "Call Staff" confirmation page, reached by scanning a
// table QR code. Broadcasting happens server-side here (not in a Supabase
// Edge Function) because Supabase force-rewrites any text/html Edge
// Function response to text/plain unless the project is on Pro with a
// custom function domain — the old /functions/v1/call-waiter endpoint could
// never actually render this page on a phone, only show raw markup as text.
export default async function CallWaiterPage({
  params,
}: {
  params: Promise<{ venueId: string; table: string }>
}) {
  const { venueId, table } = await params
  const tableLabel = decodeURIComponent(table)

  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({
        messages: [{
          topic: `realtime:kf-alerts-${venueId}`,
          event: 'broadcast',
          payload: { type: 'broadcast', event: 'call_waiter', payload: { table: tableLabel } },
        }],
      }),
      cache: 'no-store',
    })
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
