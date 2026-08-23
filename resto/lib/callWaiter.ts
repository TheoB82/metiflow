import { createAdminSupabase } from './supabase-server'

// Shared by the standalone /call page and the inline bell on /v/<venue>/<table>.
// Sends via a real realtime client connection (channel.send()), not the
// REST /realtime/v1/api/broadcast endpoint — verified by direct test that
// the REST endpoint accepts the request (202) but never actually delivers
// to any subscriber on this project, authorization aside entirely (even
// service-role-to-service-role, bypassing all RLS, failed identically).
// A live channel.send() from an actual websocket connection was the only
// thing that worked in that same test. Confirmed end-to-end working
// against a real device 2026-08-23.
export async function broadcastCallWaiter(venueId: string, tableLabel: string) {
  const client = createAdminSupabase()
  const channel = client.channel(`kf-alerts-${venueId}`, {
    config: { private: true },
  })

  await new Promise<void>((resolve) => {
    // Don't let a stuck connection hang the caller indefinitely.
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
