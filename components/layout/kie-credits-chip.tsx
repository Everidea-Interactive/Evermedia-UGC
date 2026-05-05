'use client'

import { useEffect, useState } from 'react'

import { useLocale } from '@/components/i18n/locale-provider'
import { translateText } from '@/lib/i18n'
import type { KieStatusResponse } from '@/lib/generation/types'

const emptyKieStatus: KieStatusResponse = {
  connected: false,
  credits: null,
  error: null,
  fetchedAt: null,
  source: null,
}

const refreshIntervalMs = 60_000

function getCreditsValue(status: KieStatusResponse, isLoading: boolean, locale: string) {
  if (isLoading) {
    return '...'
  }

  if (!status.connected) {
    return locale === 'id' ? 'Offline' : 'Offline'
  }

  if (status.credits === null) {
    return '-'
  }

  return status.credits.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')
}

export function KieCreditsChip() {
  const { locale, t } = useLocale()
  const [status, setStatus] = useState<KieStatusResponse>(emptyKieStatus)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      try {
        const response = await fetch('/api/kie/status', { cache: 'no-store' })
        const payload = (await response.json()) as KieStatusResponse

        if (cancelled) {
          return
        }

        setStatus(
          response.ok
            ? payload
            : {
                connected: false,
                credits: null,
                error:
                  payload.error ??
                  translateText(locale, 'Unable to read KIE status.'),
                fetchedAt: new Date().toISOString(),
                source: null,
              },
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        setStatus({
          connected: false,
          credits: null,
          error:
            error instanceof Error
              ? error.message
              : translateText(locale, 'Unable to read KIE status.'),
          fetchedAt: new Date().toISOString(),
          source: null,
        })
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void refresh()
    const intervalId = window.setInterval(() => {
      void refresh()
    }, refreshIntervalMs)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [locale])

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
