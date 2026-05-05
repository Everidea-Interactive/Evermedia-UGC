'use client'

import { useLocale } from '@/components/i18n/locale-provider'
import type { KieStatusResponse } from '@/lib/generation/types'
import { useSharedKieStatus } from '@/lib/generation/use-kie-status'

function getCreditsValue(status: KieStatusResponse, isLoading: boolean, locale: string) {
  if (isLoading) {
    return '...'
  }

  if (!status.connected) {
    return 'Offline'
  }

  if (status.credits === null) {
    return '-'
  }

  return status.credits.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')
}

export function KieCreditsChip() {
  const { locale, t } = useLocale()
  const { isLoading, status } = useSharedKieStatus()

  return (
    <div
      aria-live="polite"
      className="flex items-baseline gap-2 px-1 py-1"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/90">
        {t('KIE Credits')}
      </span>
      <span className="text-sm font-semibold text-foreground/90">
        {getCreditsValue(status, isLoading, locale)}
      </span>
    </div>
  )
}
