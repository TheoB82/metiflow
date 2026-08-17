export type PlanId = 'takeaway' | 'takeaway_online' | 'basic' | 'basic_online'

export type Plan = {
  id: PlanId
  name: string
  price: string
  badge: string
  badgeColor: string
  features: string[]
  popular?: boolean
}

export const TAKEAWAY_PLANS: Plan[] = [
  {
    id: 'takeaway',
    name: 'Takeaway',
    price: '£19.50',
    badge: 'Local only',
    badgeColor: '#0284c7',
    features: ['Takeaway order screen + KDS', 'Modifiers, scheduling, delivery & collection', 'Live WiFi sync across all devices', 'Payments and daily takings'],
  },
  {
    id: 'takeaway_online',
    name: 'Takeaway Pro',
    price: '£24.50',
    badge: '+ Online backup',
    badgeColor: '#d97706',
    features: ['Everything in Takeaway', 'Cloud order history', 'Menu backed up to cloud', 'New devices sync instantly'],
    popular: true,
  },
]

export const RESTAURANT_PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Restaurant',
    price: '£44.50',
    badge: 'Local only',
    badgeColor: '#ea580c',
    features: ['Table plan, orders, KDS, payments', 'Reservations & booking management', 'Takeaway & pre-orders included', 'Unlimited devices & staff'],
  },
  {
    id: 'basic_online',
    name: 'Restaurant Pro',
    price: '£49.50',
    badge: '+ Online backup',
    badgeColor: '#d97706',
    features: ['Everything in Restaurant', 'Cloud order history across all devices', 'Menu synced to cloud', 'Access your data from anywhere'],
    popular: true,
  },
]

export const ALL_PLANS: Plan[] = [...TAKEAWAY_PLANS, ...RESTAURANT_PLANS]

export function planById(id: string): Plan | undefined {
  return ALL_PLANS.find(p => p.id === id)
}
