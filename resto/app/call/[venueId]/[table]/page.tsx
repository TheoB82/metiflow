import { createClient } from '@supabase/supabase-js'
import { Logo } from '@/components/Logo'

// Customer-facing "Call Staff" confirmation page, reached by scanning a
// table QR code. Broadcasting happens server-side here (not in a Supabase
// Edge Function) because Supabase force-rewrites any text/html Edge
// Function response to text/plain unless the project is on Pro with a
// custom function domain — the old /functions/v1/call-waiter endpoint could
// never actually render this page on a phone, only show raw markup as text.
//
// Sends via a real realtime client connection (channel.send()), not the
// REST /realtime/v1/api/broadcast endpoint — verified by direct test that
// the REST endpoint accepts the request (202) but never actually delivers
// to any subscriber on this project, authorization aside entirely (even
// service-role-to-service-role, bypassing all RLS, failed identically).
// A live channel.send() from an actual websocket connection was the only
// thing that worked in that same test.
//
// Also requires SUPABASE_SERVICE_ROLE_KEY to actually be set in Vercel's
// Production environment, not just in local .env.local — it wasn't,
// which silently no-op'd every call here (createClient with an undefined
// key doesn't throw) until this was caught by temporarily logging each
// step to a scratch table and finding execution never even reached
// "start". Confirmed end-to-end working 2026-08-23.
async function broadcastCallWaiter(venueId: string, tableLabel: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const channel = client.channel(`kf-alerts-${venueId}`, {
    config: { private: true },
  })

  await new Promise<void>((resolve) => {
    // Don't let a stuck connection hang the customer's page indefinitely.
    const timeout = setTimeout(resolve, 8000)
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'call_waiter',
          payload: { table: tableLabel },
        })
        clearTimeout(timeout)
        resolve()
      }
    })
  })

  await client.removeChannel(channel)
}

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
