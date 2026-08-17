'use client'
import { Logo } from './Logo'

// Default (guided) path. Callers on a shorter branch (e.g. the quick-start
// or copy-from-venue paths) pass their own `steps` list instead — the bar
// always reflects the path the owner is actually on, not a fixed total.
const DEFAULT_STEPS = ['Your venue', 'Type', 'Plan', 'Next steps', 'Features', 'Settings']

export function OnboardingShell({
  step,
  steps = DEFAULT_STEPS,
  children,
}: {
  step: number
  steps?: string[]
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo size={40} />
        </div>

        {/* Step bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '0.5rem' }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 99,
              background: i < step ? '#c2410c' : i === step ? '#E8651A' : '#e2e8f0',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>
          Step {step + 1} of {steps.length} — {steps[step]}
        </p>

        <div className="card">{children}</div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-3)', fontSize: '0.8125rem' }}>
          powered by metiflow
        </p>
      </div>
    </div>
  )
}
