import { createAdminSupabase } from '@/lib/supabase-server'
import { Logo } from '@/components/Logo'
import { notFound } from 'next/navigation'

// Public, unauthenticated venue menu page (metiflow.com/v/<slug> —
// the address reserved in Settings → Your Venue Page). Fetched
// server-side with the service-role client, same pattern as the
// call-waiter page, and deliberately selects only customer-safe
// columns — never stock_item_id, cost, supplier data, prep time, or
// anything else internal. is_active hides an item/category from the
// menu entirely (deleted/retired); is_available keeps it visible but
// marked "Sold out" — staff toggling something off mid-service should
// be visible to the customer, not make the dish disappear as if it
// never existed.
//
// Deliberately simple for this first version: no service-period/menu
// (breakfast vs dinner) filtering, no allergen/dietary badges — just
// title, description, price, and availability, matching exactly what
// was asked for. Most venues using this app today don't use the
// multi-menu feature at all (menu_categories.menu_id is null), so this
// just shows every active category regardless of time of day.

type MenuItemRow = {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  is_available: boolean
  display_order: number
}

type MenuCategoryRow = {
  id: string
  course_category_id: string | null
  name: string
  display_order: number
}

type CourseCategoryRow = {
  id: string
  name: string
  display_order: number
}

function formatPrice(pence: number, currency: string) {
  const symbol = { GBP: '£', EUR: '€', USD: '$' }[currency] ?? currency + ' '
  return `${symbol}${(pence / 100).toFixed(2)}`
}

export default async function VenueMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sb = createAdminSupabase()

  const { data: venue } = await sb
    .from('venues')
    .select('id, name, currency')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle()

  if (!venue) notFound()

  const [{ data: courseCats }, { data: menuCats }, { data: items }] = await Promise.all([
    sb
      .from('course_categories')
      .select('id, name, display_order')
      .eq('venue_id', venue.id)
      .order('display_order') as unknown as Promise<{ data: CourseCategoryRow[] | null }>,
    sb
      .from('menu_categories')
      .select('id, course_category_id, name, display_order')
      .eq('venue_id', venue.id)
      .eq('is_active', true)
      .order('display_order') as unknown as Promise<{ data: MenuCategoryRow[] | null }>,
    sb
      .from('menu_items')
      .select('id, category_id, name, description, price, is_available, display_order')
      .eq('venue_id', venue.id)
      .eq('is_active', true)
      .order('display_order') as unknown as Promise<{ data: MenuItemRow[] | null }>,
  ])

  const itemsByCategory = new Map<string, MenuItemRow[]>()
  for (const item of items ?? []) {
    const list = itemsByCategory.get(item.category_id) ?? []
    list.push(item)
    itemsByCategory.set(item.category_id, list)
  }

  // Only categories that actually have at least one item to show.
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

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo compact={false} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1rem' }}>
            {venue.name}
          </h1>
        </div>

        {orderedCourseCats.map((cc) => (
          <section key={cc.id} style={{ marginBottom: '2rem' }}>
            {cc.name && (
              <h2
                style={{
                  fontSize: '1.0625rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                  color: 'var(--brand-dark)',
                }}
              >
                {cc.name}
              </h2>
            )}
            {menuCatsByCourse.get(cc.id)!.map((mc) => (
              <div key={mc.id} style={{ marginBottom: '1.25rem' }}>
                <h3
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '0.5rem',
                  }}
                >
                  {mc.name}
                </h3>
                <div className="card" style={{ padding: '0.25rem 1rem' }}>
                  {itemsByCategory.get(mc.id)!.map((item, i, arr) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.875rem 0',
                        borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                        opacity: item.is_available ? 1 : 0.5,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                          {item.name}
                          {!item.is_available && (
                            <span
                              style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                color: 'var(--text-3)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                              }}
                            >
                              Sold out
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginTop: '0.125rem' }}>
                            {item.description}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', whiteSpace: 'nowrap' }}>
                        {formatPrice(item.price, venue.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-3)', fontSize: '0.8125rem' }}>
          powered by metiflow
        </p>
      </div>
    </div>
  )
}
