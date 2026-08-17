import { createClient } from './supabase'

// Turns "The Crown (London)" into "the-crown-london". Public venue-page
// URLs (metiflow.com/v/<slug>) are only reserved right now — the page
// itself doesn't exist yet — but the slug is generated and stored from the
// start so it's stable whenever that page ships, rather than assigned
// retroactively.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// Appends -2, -3, ... until the slug is free. `excludeVenueId` lets a venue
// keep its own slug when re-saving without colliding with itself.
export async function uniqueSlug(name: string, excludeVenueId?: string): Promise<string> {
  const base = slugify(name) || 'venue'
  const sb = createClient()
  let candidate = base
  let n = 2
  // Bounded loop — a real collision run this long is not realistic, and an
  // unbounded while() risks hanging the form on an unexpected query error.
  for (let attempt = 0; attempt < 50; attempt++) {
    let query = sb.from('venues').select('id').eq('slug', candidate).limit(1)
    if (excludeVenueId) query = query.neq('id', excludeVenueId)
    const { data } = await query
    if (!data || data.length === 0) return candidate
    candidate = `${base}-${n}`
    n += 1
  }
  return `${base}-${Date.now()}`
}
