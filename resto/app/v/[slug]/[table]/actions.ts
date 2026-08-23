'use server'

import { broadcastCallWaiter } from '@/lib/callWaiter'

export async function callWaiterAction(venueId: string, table: string) {
  await broadcastCallWaiter(venueId, table)
}
