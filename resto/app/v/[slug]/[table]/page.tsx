import { Logo } from '@/components/Logo'
import { MenuList } from '@/components/MenuList'
import { CallWaiterButton } from '@/components/CallWaiterButton'
import { resolveVenue, fetchMenu } from '@/lib/venueMenu'
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

  const { orderedCourseCats, menuCatsByCourse, itemsByCategory } = await fetchMenu(venue.id)
  const venueId = venue.id

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Logo compact={false} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1rem' }}>
            {venue.name}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Table {tableLabel}
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <CallWaiterButton
            action={async () => {
              'use server'
              await callWaiterAction(venueId, tableLabel)
            }}
          />
        </div>

        <MenuList
          orderedCourseCats={orderedCourseCats}
          menuCatsByCourse={menuCatsByCourse}
          itemsByCategory={itemsByCategory}
          currency={venue.currency}
        />

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-3)', fontSize: '0.8125rem' }}>
          powered by metiflow
        </p>
      </div>
    </div>
  )
}
