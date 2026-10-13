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
  if (!(await claimAlertSlot(venueId, `call:${tableLabel}`))) return
  await broadcastAlert(venueId, 'call_waiter', { table: tableLabel })
}

// A QR-ordered drink round just got placed (see placeOrder in lib/cart.ts) —
// vibrates + purple-pulses the table on every KitchenFlow device, since a
// round placed straight from a customer's phone otherwise only showed up
// silently on the bar's own KDS tab.
export async function broadcastQrDrinkOrder(venueId: string, tableLabel: string) {
  if (!(await claimAlertSlot(venueId, `drink:${tableLabel}`))) return
  await broadcastAlert(venueId, 'qr_drink_order', { table: tableLabel })
}

// Alerts are public (anyone with a table's link can ring it), so each one
// asks the database first: one per table every 30 s, one per venue every
// 3 s, none for a venue that doesn't exist (claim_alert_slot,
// supabase_prelaunch_load.sql). A repeat tap inside the window is dropped
// quietly — staff were already alerted. Until that function is deployed,
// alerts go out as before.
async function claimAlertSlot(venueId: string, key: string): Promise<boolean> {
  const { data, error } = await createAdminSupabase().rpc('claim_alert_slot', {
    p_venue_id: venueId,
    p_key: key,
  })
  if (error) return error.code === 'PGRST202'
  return data === true
}

async function broadcastAlert(
  venueId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const client = createAdminSupabase()
  const channel = client.channel(`kf-alerts-${venueId}`, {
    config: { private: true },
  })

  await new Promise<void>((resolve) => {
    // Don't let a stuck connection hang the caller indefinitely.
    const timeout = setTimeout(resolve, 8000)
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({ type: 'broadcast', event, payload })
        clearTimeout(timeout)
        resolve()
      }
    })
  })

  await client.removeChannel(channel)
}
