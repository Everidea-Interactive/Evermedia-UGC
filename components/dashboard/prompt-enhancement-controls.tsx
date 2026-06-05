'use client'

import { Megaphone, Mic2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLocale } from '@/components/i18n/locale-provider'
import { getPromptCtaOptions } from '@/lib/generation/prompt-enhancements'
import type { PromptEnhancement, WorkspaceTab } from '@/lib/generation/types'
import { cn } from '@/lib/utils'

const rowClassName = 'rounded-lg border border-border bg-background'
const fieldLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'

type PromptEnhancementControlsProps = {
  className?: string
  enhancement: PromptEnhancement
  onChange: (patch: Partial<PromptEnhancement>) => void
  workspace: WorkspaceTab
}

export function PromptEnhancementControls({
  className,
  enhancement,
  onChange,
  workspace,
}: PromptEnhancementControlsProps) {
  const { locale } = useLocale()
  const ctaOptions = getPromptCtaOptions(locale)
  const copy =
    locale === 'id'
      ? {
          ctaOff: 'CTA Nonaktif',
          ctaOn: 'CTA Aktif',
          ctaOptions: 'Opsi CTA',
          ctaDescription:
            'Pilih satu CTA opsional untuk dimasukkan ke prompt render final.',
          voiceoverDescription:
            'Edit kalimat suara yang akan dimasukkan ke prompt render video.',
          customCtaPlaceholder: 'Tulis CTA custom...',
          voiceoverLabel: 'Skrip VO',
          voiceoverOff: 'VO Nonaktif',
          voiceoverOn: 'VO Aktif',
          voiceoverPlaceholder:
            'Tulis kalimat voiceover persis seperti yang ingin dimasukkan ke video...',
        }
      : {
          ctaOff: 'CTA Off',
          ctaOn: 'CTA On',
          ctaOptions: 'CTA Options',
          ctaDescription:
            'Pick one optional CTA to append into the final render prompt.',
          voiceoverDescription:
            'Edit the spoken line that will be appended into the video render prompt.',
          customCtaPlaceholder: 'Write a custom CTA...',
          voiceoverLabel: 'VO Script',
          voiceoverOff: 'VO Off',
          voiceoverOn: 'VO On',
          voiceoverPlaceholder:
            'Write the exact voiceover line to include in the generated video...',
        }

  if (workspace === 'image') {
    return (
      <section className={cn('grid gap-3', className)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={fieldLabelClassName}>{copy.ctaOptions}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {copy.ctaDescription}
            </p>
          </div>
          <Button
            onClick={() => onChange({ ctaEnabled: !enhancement.ctaEnabled })}
            size="sm"
            type="button"
            variant={enhancement.ctaEnabled ? 'secondary' : 'outline'}
          >
            <Megaphone data-icon="inline-start" suppressHydrationWarning />
            {enhancement.ctaEnabled ? copy.ctaOn : copy.ctaOff}
          </Button>
        </div>

        <div
          className={cn(
            'grid gap-3 md:grid-cols-2 xl:grid-cols-4',
            !enhancement.ctaEnabled && 'opacity-60',
          )}
        >
          {ctaOptions.map((cta) => {
            const isSelected = enhancement.selectedCtaId === cta.id

            return (
              <button
                className={cn(
                  rowClassName,
                  'grid min-h-[9rem] gap-2 px-4 py-3 text-left transition-colors',
                  isSelected
                    ? 'border-foreground/35 bg-secondary'
                    : 'hover:border-foreground/20',
                )}
                disabled={!enhancement.ctaEnabled}
                key={cta.id}
                onClick={() => onChange({ selectedCtaId: cta.id })}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium leading-5 text-foreground">{cta.label}</p>
                  <Badge variant={isSelected ? 'default' : 'outline'}>
                    {cta.placement}
                  </Badge>
                </div>
                {cta.id === 'custom' ? (
                  <Input
                    aria-label={copy.customCtaPlaceholder}
                    disabled={!enhancement.ctaEnabled}
                    onChange={(event) =>
                      onChange({
                        customCtaText: event.target.value,
                        selectedCtaId: cta.id,
                      })
                    }
                    onClick={(event) => event.stopPropagation()}
                    placeholder={copy.customCtaPlaceholder}
                    value={enhancement.customCtaText}
                  />
                ) : null}
                <p className="text-sm leading-6 text-muted-foreground">
                  {cta.rationale}
                </p>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <section className={cn('grid gap-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={fieldLabelClassName}>{copy.voiceoverLabel}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {copy.voiceoverDescription}
          </p>
        </div>
        <Button
          onClick={() =>
            onChange({ voiceoverEnabled: !enhancement.voiceoverEnabled })
          }
          size="sm"
          type="button"
          variant={enhancement.voiceoverEnabled ? 'secondary' : 'outline'}
        >
          <Mic2 data-icon="inline-start" suppressHydrationWarning />
          {enhancement.voiceoverEnabled ? copy.voiceoverOn : copy.voiceoverOff}
        </Button>
      </div>
      <Textarea
        aria-label="Voiceover script"
        className="min-h-24"
        disabled={!enhancement.voiceoverEnabled}
        onChange={(event) =>
          onChange({
            voiceoverScript: event.target.value,
          })
        }
        placeholder={copy.voiceoverPlaceholder}
        value={enhancement.voiceoverScript}
      />
    </section>
  )
}
