import Stripe from 'stripe'

// Lazily constructed so the app can build/boot before Stripe keys are
// configured — only routes that actually use billing need them at runtime.
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}

// Maps the plan ids already used across onboarding/venues.plan to Stripe Price ids.
// Create one recurring (monthly) Price per plan in the Stripe dashboard and set these.
export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  takeaway: process.env.STRIPE_PRICE_TAKEAWAY,
  takeaway_online: process.env.STRIPE_PRICE_TAKEAWAY_ONLINE,
  basic: process.env.STRIPE_PRICE_BASIC,
  basic_online: process.env.STRIPE_PRICE_BASIC_ONLINE,
}

export function priceIdForPlan(plan: string): string | null {
  return PLAN_PRICE_IDS[plan] ?? null
}

export function planForPriceId(priceId: string): string | null {
  for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id === priceId) return plan
  }
  return null
}
