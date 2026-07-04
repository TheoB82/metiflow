'use client'
export function Logo({ size = 48 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size, height: size,
        background: '#E8651A', borderRadius: size * 0.22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: '#fff', fontSize: size * 0.6, fontWeight: 800, lineHeight: 1 }}>M</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: 0.2 }}>metiflow</div>
        <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 0.5 }}>Resto</div>
      </div>
    </div>
  )
}
