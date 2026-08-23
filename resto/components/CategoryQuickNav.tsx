import type { CourseCategoryRow } from '@/lib/venueMenu'

// Plain anchor links + CSS scroll-behavior, no client JS needed — jumps to
// each course category's section (see the matching id on MenuList's
// <section>). Horizontally scrollable so it doesn't wrap awkwardly with
// more than 3-4 categories on a narrow phone screen.
export function CategoryQuickNav({
  orderedCourseCats,
}: {
  orderedCourseCats: CourseCategoryRow[]
}) {
  const named = orderedCourseCats.filter((cc) => cc.name)
  if (named.length < 2) return null

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        marginBottom: '1.5rem',
        padding: '0.75rem 0',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
      }}
    >
      {named.map((cc) => (
        <a
          key={cc.id}
          href={`#cat-${cc.id}`}
          style={{
            flexShrink: 0,
            padding: '0.375rem 0.875rem',
            borderRadius: 999,
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {cc.name}
        </a>
      ))}
    </nav>
  )
}
