import { timingSafeEqual } from 'crypto'

// Metiflow HQ (hq.metiflow.com) manages RestoFlow licences through the
// /api/hq/* routes. HQ holds only this shared secret — never RestoFlow's
// Supabase keys — so these routes are the whole of what HQ can do here.
export function isHqRequest(request: Request): boolean {
  const secret = process.env.HQ_API_SECRET ?? ''
  if (secret.length < 32) return false

  const header = request.headers.get('authorization') ?? ''
  const given = header.startsWith('Bearer ') ? header.slice(7) : ''
  const a = Buffer.from(given)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const HQ_PLANS = ['takeaway', 'takeaway_online', 'basic', 'basic_online', 'addon', 'lifetime'] as const
export type HqPlan = (typeof HQ_PLANS)[number]
