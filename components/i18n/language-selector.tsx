'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  getLocaleToggleLabel,
  type Locale,
} from '@/lib/i18n'
import { useLocale } from '@/components/i18n/locale-provider'

const localeToggleOrder: Locale[] = ['id', 'en']

export function LanguageSelector({ className }: { className?: string }) {
  const router = useRouter()
  const labelId = useId()
  const [isSaving, setIsSaving] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { dictionary, locale } = useLocale()

  async function setLocale(nextLocale: Locale) {
    if (nextLocale === locale) {
      return
    }

    setIsSaving(true)

    try {
      await fetch('/api/locale', {
        body: JSON.stringify({ locale: nextLocale }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
    } finally {
      setIsSaving(false)
    }

    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className={className ?? 'inline-flex items-center gap-2 text-sm text-muted-foreground'}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" id={labelId}>
        {dictionary.shared.language.label}
      </span>
      <div
        aria-label={dictionary.shared.language.label}
        aria-labelledby={labelId}
        className="inline-grid grid-cols-[1fr_auto_1fr] items-center text-sm font-semibold"
        role="group"
      >
        {localeToggleOrder.map((option, index) => {
          const isActive = locale === option

          return (
            <div className="contents" key={option}>
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="text-border"
                >
                  |
                </span>
              ) : null}
              <button
                aria-label={
                  option === 'id'
                    ? dictionary.shared.language.indonesian
                    : dictionary.shared.language.english
                }
                aria-pressed={isActive}
                className={[
                  'px-1 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
                disabled={isSaving || isPending}
                onClick={() => {
                  void setLocale(option)
                }}
                type="button"
              >
                {getLocaleToggleLabel(option)}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
