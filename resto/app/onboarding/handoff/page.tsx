'use client'
import { useRouter } from 'next/navigation'
import { OnboardingShell } from '@/components/OnboardingShell'
import { t } from '@/lib/i18n'

export default function HandoffPage() {
  const router = useRouter()

  function finishNow() {
    sessionStorage.removeItem('onboarding_venue_id')
    sessionStorage.removeItem('onboarding_type')
    sessionStorage.removeItem('onboarding_copy_from')
    sessionStorage.removeItem('onboarding_multi')
    router.push('/dashboard')
  }

  return (
    <OnboardingShell step={3}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t('handoffTitle')}</h1>
      <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{t('handoffDesc')}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={() => router.push('/onboarding/features')}
          style={{
            display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left',
            padding: '1rem', borderRadius: 10, cursor: 'pointer',
            border: '2px solid var(--brand)', background: 'var(--brand-light)',
          }}
        >
          <span style={{ fontWeight: 700 }}>{t('handoffGuided')}</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{t('handoffGuidedDesc')}</span>
        </button>

        <button
          type="button"
          onClick={finishNow}
          style={{
            display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left',
            padding: '1rem', borderRadius: 10, cursor: 'pointer',
            border: '1.5px solid var(--border)', background: 'var(--surface)',
          }}
        >
          <span style={{ fontWeight: 700 }}>{t('handoffQuick')}</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>{t('handoffQuickDesc')}</span>
        </button>
      </div>
    </OnboardingShell>
  )
}
