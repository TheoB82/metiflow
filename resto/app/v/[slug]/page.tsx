import { Logo } from '@/components/Logo'
import { MenuList } from '@/components/MenuList'
import { CategoryQuickNav } from '@/components/CategoryQuickNav'
import { resolveVenue, fetchMenu } from '@/lib/venueMenu'
import { notFound } from 'next/navigation'

// Public, unauthenticated venue menu page (metiflow.com/v/<slug-or-id> —
// the address reserved in Settings → Your Venue Page), no table context.
// Reached via a general/shared link (website, socials) rather than a
// table QR — see the [table] sibling route for the per-table version
// with the Call Waiter bell.
export default async function VenueMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const venue = await resolveVenue(slug)
  if (!venue) notFound()

  const { orderedCourseCats, menuCatsByCourse, itemsByCategory, groupsByItem, optionsByGroup } =
    await fetchMenu(venue.id)

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo compact={false} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1rem' }}>
            {venue.name}
          </h1>
        </div>

        <CategoryQuickNav orderedCourseCats={orderedCourseCats} />

        <MenuList
          orderedCourseCats={orderedCourseCats}
          menuCatsByCourse={menuCatsByCourse}
          itemsByCategory={itemsByCategory}
          groupsByItem={groupsByItem}
          optionsByGroup={optionsByGroup}
          currency={venue.currency}
        />

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-3)', fontSize: '0.8125rem' }}>
          powered by metiflow
        </p>
      </div>
    </div>
  )
}
