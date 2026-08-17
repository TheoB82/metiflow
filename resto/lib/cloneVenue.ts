import { createClient } from './supabase'

// "Copy from an existing venue" — used when an owner with multiple
// locations adds a new one and doesn't want to rebuild the same menu from
// scratch. This COPIES data once; the two venues are fully independent
// afterwards (editing venue B never touches venue A). True live-shared
// menus (one edit updates every venue) is a bigger, separate change to the
// menu tables' one-venue-owns-a-row model and was deliberately not built —
// see the design plan for the tradeoff.
//
// What's copied: menus, course categories, menu categories, menu items,
// modifier groups/options, and venue-level settings (opening hours,
// service periods, feature flags, currency, table-service/takeaway mode).
// What's NOT copied: floor plan / dining tables, stations, staff, devices,
// orders — all physically or operationally specific to one location.
export async function cloneVenueSetup(sourceVenueId: string, targetVenueId: string) {
  const sb = createClient()

  // ── Venue-level settings ────────────────────────────────────────────
  const { data: source, error: sourceErr } = await sb
    .from('venues')
    .select('opening_hours, service_periods, settings_json, currency, enable_table_service, enable_takeaway')
    .eq('id', sourceVenueId)
    .single()
  if (sourceErr) throw sourceErr

  await sb.from('venues').update({
    opening_hours: source.opening_hours,
    service_periods: source.service_periods,
    settings_json: source.settings_json,
    currency: source.currency,
    enable_table_service: source.enable_table_service,
    enable_takeaway: source.enable_takeaway,
  }).eq('id', targetVenueId)

  // ── Course categories (top-level course grouping; station_id is venue-
  // specific hardware routing, so it's dropped rather than copied) ──────
  const { data: courseCats } = await sb
    .from('course_categories')
    .select('id, name, course_type, display_order, colour, icon')
    .eq('venue_id', sourceVenueId)
  const courseCatIdMap = new Map<string, string>()
  if (courseCats && courseCats.length > 0) {
    const rows = courseCats.map(c => {
      const newId = crypto.randomUUID()
      courseCatIdMap.set(c.id, newId)
      return { ...c, id: newId, venue_id: targetVenueId, station_id: null }
    })
    await sb.from('course_categories').insert(rows)
  }

  // ── Menus ────────────────────────────────────────────────────────────
  const { data: menus } = await sb
    .from('menus')
    .select('id, name, type, available_days, time_from, time_until, service_period_ids, pricing, is_active, display_order')
    .eq('venue_id', sourceVenueId)
  const menuIdMap = new Map<string, string>()
  if (menus && menus.length > 0) {
    const rows = menus.map(m => {
      const newId = crypto.randomUUID()
      menuIdMap.set(m.id, newId)
      return { ...m, id: newId, venue_id: targetVenueId }
    })
    await sb.from('menus').insert(rows)
  }

  // ── Menu categories ──────────────────────────────────────────────────
  const { data: categories } = await sb
    .from('menu_categories')
    .select('id, name, display_order, colour, icon, is_active, available_from, available_until, menu_id, period_ids, available_days, course_category_id')
    .eq('venue_id', sourceVenueId)
  const categoryIdMap = new Map<string, string>()
  if (categories && categories.length > 0) {
    const rows = categories.map(c => {
      const newId = crypto.randomUUID()
      categoryIdMap.set(c.id, newId)
      return {
        ...c,
        id: newId,
        venue_id: targetVenueId,
        menu_id: c.menu_id ? menuIdMap.get(c.menu_id) ?? null : null,
        course_category_id: c.course_category_id ? courseCatIdMap.get(c.course_category_id) ?? null : null,
      }
    })
    await sb.from('menu_categories').insert(rows)
  }

  // ── Menu items ────────────────────────────────────────────────────────
  const { data: items } = await sb
    .from('menu_items')
    .select('id, category_id, name, description, price, course_type, prep_time_minutes, is_active, is_available, image_url, allergen_flags, dietary_flags, display_order, menu_id')
    .eq('venue_id', sourceVenueId)
  const itemIdMap = new Map<string, string>()
  if (items && items.length > 0) {
    const rows = items
      .filter(i => categoryIdMap.has(i.category_id)) // orphaned items (deleted category) aren't copied
      .map(i => {
        const newId = crypto.randomUUID()
        itemIdMap.set(i.id, newId)
        return {
          ...i,
          id: newId,
          venue_id: targetVenueId,
          category_id: categoryIdMap.get(i.category_id)!,
          menu_id: i.menu_id ? menuIdMap.get(i.menu_id) ?? null : null,
          // station_id is hardware routing, specific to the source venue's
          // kitchen — dropped, not copied.
          station_id: null,
          // stock_item_id links to the source venue's inventory SKU, which
          // doesn't exist for the new venue.
          stock_item_id: null,
        }
      })
    if (rows.length > 0) await sb.from('menu_items').insert(rows)
  }

  // ── Modifier groups ──────────────────────────────────────────────────
  const { data: groups } = await sb
    .from('modifier_groups')
    .select('id, menu_item_id, name, is_required, min_choices, max_choices, allows_quantity, display_order')
    .eq('venue_id', sourceVenueId)
  const groupIdMap = new Map<string, string>()
  if (groups && groups.length > 0) {
    const rows = groups
      .filter(g => itemIdMap.has(g.menu_item_id))
      .map(g => {
        const newId = crypto.randomUUID()
        groupIdMap.set(g.id, newId)
        return { ...g, id: newId, venue_id: targetVenueId, menu_item_id: itemIdMap.get(g.menu_item_id)! }
      })
    if (rows.length > 0) await sb.from('modifier_groups').insert(rows)
  }

  // ── Modifier options ──────────────────────────────────────────────────
  const { data: options } = await sb
    .from('modifier_options')
    .select('id, group_id, name, price_adj_pence, is_available, display_order, source_menu_item_id')
    .eq('venue_id', sourceVenueId)
  if (options && options.length > 0) {
    const rows = options
      .filter(o => groupIdMap.has(o.group_id))
      .map(o => ({
        ...o,
        id: crypto.randomUUID(),
        venue_id: targetVenueId,
        group_id: groupIdMap.get(o.group_id)!,
        // Only remap if it points at an item copied in this same run —
        // otherwise it'd dangle onto the source venue's own item.
        source_menu_item_id: o.source_menu_item_id ? itemIdMap.get(o.source_menu_item_id) ?? null : null,
      }))
    if (rows.length > 0) await sb.from('modifier_options').insert(rows)
  }
}
