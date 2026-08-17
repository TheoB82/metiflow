import { createClient } from './supabase'

// venues.settings_json is a single JSON blob shared by several independent
// screens (onboarding features, onboarding settings, dashboard venue edit —
// and, in the app itself, half a dozen Settings toggles). Writing it with a
// plain `JSON.stringify(partialObject)` silently deletes every key some
// other screen previously set. This reads-merges-writes instead, so each
// screen only ever touches the keys it actually owns.
export async function mergeVenueSettings(venueId: string, patch: Record<string, unknown>) {
  const sb = createClient()
  const { data } = await sb.from('venues').select('settings_json').eq('id', venueId).single()
  let current: Record<string, unknown> = {}
  if (data?.settings_json) {
    try { current = JSON.parse(data.settings_json) } catch { /* corrupt/empty — start fresh */ }
  }
  const merged = { ...current, ...patch }
  const { error } = await sb.from('venues').update({ settings_json: JSON.stringify(merged) }).eq('id', venueId)
  if (error) throw error
  return merged
}
