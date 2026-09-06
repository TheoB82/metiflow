import type { Venue } from '@/lib/venueMenu'

// The venue's own identity leads the page — a logo image if the owner has
// uploaded one, else their name as a plain heading — with metiflow reduced
// to a small, secondary credit line underneath rather than the large logo
// that used to sit at the very top. Businesses appreciate their own
// branding being what customers see first; metiflow still gets a mention,
// just a discreet one, and only once per page (no separate "powered by"
// footer further down duplicating it).
export function VenueHeader({
  venue,
  tableLabel,
}: {
  venue: Venue
  tableLabel?: string
}) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
      {venue.logo_url ? (
        // A logo the owner uploaded is trusted to already carry the
        // venue's name/branding — showing venue.name as text underneath it
        // too would just repeat it, so the logo image is the whole heading.
        <img
          src={venue.logo_url}
          alt={venue.name}
          style={{ maxHeight: 72, maxWidth: '85%', objectFit: 'contain' }}
        />
      ) : (
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{venue.name}</h1>
      )}
      {tableLabel && (
        <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Table {tableLabel}
        </p>
      )}
      <p
        style={{
          color: 'var(--text-3)',
          fontSize: '0.6875rem',
          letterSpacing: '0.3px',
          marginTop: '0.75rem',
        }}
      >
        via metiflow
      </p>
    </div>
  )
}
