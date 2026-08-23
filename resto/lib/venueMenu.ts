import { createAdminSupabase } from './supabase-server'
export { formatPrice } from './format'

export type MenuItemRow = {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  is_available: boolean
  display_order: number
}

export type MenuCategoryRow = {
  id: string
  course_category_id: string | null
  name: string
  display_order: number
}

export type CourseCategoryRow = {
  id: string
  name: string
  display_order: number
}

export type Venue = {
  id: string
  name: string
  currency: string
  enable_qr_ordering: boolean
}

// Table QR codes are printed with the venue's raw id (always stable, no
// dependency on the owner having set a friendly slug yet); a shared/
// marketing link can use the nicer slug once set. Try slug first since
// it's the more specific/intentional match, then fall back to id.
export async function resolveVenue(slugOrId: string): Promise<Venue | null> {
  const sb = createAdminSupabase()
  const bySlug = await sb
    .from('venues')
    .select('id, name, currency, enable_qr_ordering')
    .eq('slug', slugOrId)
    .limit(1)
    .maybeSingle()
  if (bySlug.data) return bySlug.data as Venue

  const byId = await sb
    .from('venues')
    .select('id, name, currency, enable_qr_ordering')
    .eq('id', slugOrId)
    .limit(1)
    .maybeSingle()
  return (byId.data as Venue) ?? null
}

// Deliberately selects only customer-safe columns — never stock_item_id,
// cost, supplier data, prep time, or station routing. is_active hides an
// item/category from the menu entirely (deleted/retired); is_available
// keeps it visible but marked "Sold out" so staff toggling something off
// mid-service is visible to the customer, not silently invisible.
export async function fetchMenu(venueId: string) {
  const sb = createAdminSupabase()
  const [{ data: courseCats }, { data: menuCats }, { data: items }] = await Promise.all([
    sb
      .from('course_categories')
      .select('id, name, display_order')
      .eq('venue_id', venueId)
      .order('display_order') as unknown as Promise<{ data: CourseCategoryRow[] | null }>,
    sb
      .from('menu_categories')
      .select('id, course_category_id, name, display_order')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('display_order') as unknown as Promise<{ data: MenuCategoryRow[] | null }>,
    sb
      .from('menu_items')
      .select('id, category_id, name, description, price, is_available, display_order')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('display_order') as unknown as Promise<{ data: MenuItemRow[] | null }>,
  ])

  const itemsByCategory = new Map<string, MenuItemRow[]>()
  for (const item of items ?? []) {
    const list = itemsByCategory.get(item.category_id) ?? []
    list.push(item)
    itemsByCategory.set(item.category_id, list)
  }

  const visibleMenuCats = (menuCats ?? []).filter(
    (c) => (itemsByCategory.get(c.id)?.length ?? 0) > 0,
  )
  const menuCatsByCourse = new Map<string, MenuCategoryRow[]>()
  for (const mc of visibleMenuCats) {
    const key = mc.course_category_id ?? '__none__'
    const list = menuCatsByCourse.get(key) ?? []
    list.push(mc)
    menuCatsByCourse.set(key, list)
  }

  const orderedCourseCats = [
    ...(courseCats ?? []),
    { id: '__none__', name: '', display_order: 999999 },
  ].filter((cc) => (menuCatsByCourse.get(cc.id)?.length ?? 0) > 0)

  return { orderedCourseCats, menuCatsByCourse, itemsByCategory }
}
