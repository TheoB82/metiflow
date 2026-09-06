import { VenueHeader } from '@/components/VenueHeader'
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
        <VenueHeader venue={venue} />

        <CategoryQuickNav orderedCourseCats={orderedCourseCats} />

        <MenuList
          orderedCourseCats={orderedCourseCats}
          menuCatsByCourse={menuCatsByCourse}
          itemsByCategory={itemsByCategory}
          groupsByItem={groupsByItem}
          optionsByGroup={optionsByGroup}
          currency={venue.currency}
        />
      </div>
    </div>
  )
}
