import { VenueHeader } from '@/components/VenueHeader'
import { MenuList } from '@/components/MenuList'
import { CallWaiterButton } from '@/components/CallWaiterButton'
import { CategoryQuickNav } from '@/components/CategoryQuickNav'
import { CartProvider } from '@/components/CartProvider'
import { CartBar } from '@/components/CartBar'
import { resolveVenue, fetchMenu } from '@/lib/venueMenu'
import { getCart, getPlacedOrder } from '@/lib/cart'
import { notFound } from 'next/navigation'
import { callWaiterAction } from './actions'

// Public, unauthenticated per-table page (metiflow.com/v/<slug-or-id>/<table>)
// — what a table's own printed QR code now opens directly, replacing the
// standalone /call page as the primary landing point (that page still
// works for any already-printed QR codes pointing at it). Shows the same
// menu as the tableless /v/<slug> page, plus a Call Waiter button, which
// is available here unconditionally: whether a business wants this at all
// is decided by whether the owner prints/places a table QR in the first
// place, not a separate setting to toggle.
export default async function VenueTablePage({
  params,
}: {
  params: Promise<{ slug: string; table: string }>
}) {
  const { slug, table } = await params
  const tableLabel = decodeURIComponent(table)
  const venue = await resolveVenue(slug)
  if (!venue) notFound()

  const { orderedCourseCats, menuCatsByCourse, itemsByCategory, groupsByItem, optionsByGroup } =
    await fetchMenu(venue.id)
  const venueId = venue.id
  const ordering = venue.enable_qr_ordering
  const initialCart = ordering ? await getCart(venueId, tableLabel) : []
  const initialPlacedOrder = ordering ? await getPlacedOrder(venueId, tableLabel) : null

  const page = (
    <div style={{ minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <VenueHeader venue={venue} tableLabel={tableLabel} />

        <div style={{ marginBottom: '2rem' }}>
          <CallWaiterButton
            action={async () => {
              'use server'
              await callWaiterAction(venueId, tableLabel)
            }}
          />
        </div>

        <CategoryQuickNav orderedCourseCats={orderedCourseCats} />

        <MenuList
          orderedCourseCats={orderedCourseCats}
          menuCatsByCourse={menuCatsByCourse}
          itemsByCategory={itemsByCategory}
          groupsByItem={groupsByItem}
          optionsByGroup={optionsByGroup}
          currency={venue.currency}
          showAddButtons={ordering}
        />

        {ordering && <CartBar currency={venue.currency} />}
      </div>
    </div>
  )

  return ordering ? (
    <CartProvider
      venueId={venueId}
      table={tableLabel}
      initialCart={initialCart}
      initialPlacedOrder={initialPlacedOrder}
    >
      {page}
    </CartProvider>
  ) : (
    page
  )
}
