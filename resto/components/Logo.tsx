'use client'
export function Logo({
  size = 48,
  compact = false,
  iconOnly = false,
}: {
  size?: number
  compact?: boolean
  iconOnly?: boolean
}) {
  const box = (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: '#E8651A', borderRadius: size * 0.22,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: '#fff', fontSize: size * 0.6, fontWeight: 800, lineHeight: 1 }}>M</span>
    </div>
  )

  // Just the icon mark, no wordmark text — for a small, secondary credit
  // (e.g. VenueHeader's "via metiflow" line) where the venue's own name/
  // logo is meant to be the actual heading.
  if (iconOnly) return box

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {box}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.2, lineHeight: 1.2 }}>metiflow</div>
          <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 0.5 }}>Resto</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {box}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: 0.2 }}>metiflow</div>
        <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 0.5 }}>Resto</div>
      </div>
    </div>
  )
}
