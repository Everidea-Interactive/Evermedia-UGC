'use client'

import { LoaderCircle, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type {
  CreativeBrief,
  CreativePlan,
  CreativePlanningStatus,
  CtaOption,
} from '@/lib/generation/types'
import { cn } from '@/lib/utils'

const panelClassName = 'rounded-2xl border border-border bg-card'
const insetPanelClassName = 'rounded-xl border border-border bg-background'
const rowClassName = 'rounded-lg border border-border bg-background'
const fieldLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'

const audienceOptions: Array<{
  label: string
  value: CreativeBrief['audience']
}> = [
  { label: 'Broad Shoppers', value: 'broad' },
  { label: 'Gen Z', value: 'gen-z' },
  { label: 'Young Professionals', value: 'young-professionals' },
  { label: 'Beauty Shoppers', value: 'beauty-shoppers' },
  { label: 'Parents', value: 'parents' },
  { label: 'Fitness Shoppers', value: 'fitness-shoppers' },
]

const goalOptions: Array<{
  label: string
  value: CreativeBrief['goal']
}> = [
  { label: 'Awareness', value: 'awareness' },
  { label: 'Consideration', value: 'consideration' },
  { label: 'Conversion', value: 'conversion' },
]

const platformOptions: Array<{
  label: string
  value: CreativeBrief['platform']
}> = [
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Instagram Reels', value: 'instagram-reels' },
  { label: 'YouTube Shorts', value: 'youtube-shorts' },
  { label: 'Meta Ads', value: 'meta-ads' },
  { label: 'Shopee', value: 'shopee' },
  { label: 'Tokopedia', value: 'tokopedia' },
]

const ctaPlacementLabels: Record<CtaOption['placement'], string> = {
  caption: 'Caption',
  'closing-shot': 'Closing Shot',
  'visual-overlay': 'Visual CTA',
  voiceover: 'Voiceover',
}

type CreativePlanningPanelProps = {
  canGeneratePlan: boolean
  creativeBrief: CreativeBrief
  creativePlan: CreativePlan | null
  error: string | null
  onBriefChange: <Key extends keyof CreativeBrief>(
    key: Key,
    value: CreativeBrief[Key],
  ) => void
  onGeneratePlan: () => void
  onSelectCta: (ctaId: string) => void
  status: CreativePlanningStatus
}

function DirectionCard({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return (
    <div className={cn(insetPanelClassName, 'grid gap-2 p-4')}>
      <p className={fieldLabelClassName}>{title}</p>
      <p className="text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  )
}

function CtaCard({
  cta,
  isSelected,
  onSelect,
}: {
  cta: CtaOption
  isSelected: boolean
  onSelect: (ctaId: string) => void
}) {
  return (
    <button
      className={cn(
        rowClassName,
        'grid gap-2 px-4 py-3 text-left transition-colors',
        isSelected ? 'border-foreground/35 bg-secondary' : 'hover:border-foreground/20',
      )}
      onClick={() => onSelect(cta.id)}
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-foreground">{cta.label}</p>
        <Badge variant={isSelected ? 'default' : 'outline'}>
          {ctaPlacementLabels[cta.placement]}
        </Badge>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{cta.rationale}</p>
    </button>
  )
}

export function CreativePlanningPanel({
  canGeneratePlan,
  creativeBrief,
  creativePlan,
  error,
  onBriefChange,
  onGeneratePlan,
  onSelectCta,
  status,
}: CreativePlanningPanelProps) {
  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5')}>
      <div className="grid gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Step 2
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold">
              Build the creative plan
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Turn the guided shot seed into messaging, sound direction, CTA, and a
              storyboard-ready prompt pack before rendering.
            </p>
          </div>

          <Button
            className="min-h-11 sm:min-w-[13rem]"
            disabled={!canGeneratePlan}
            onClick={onGeneratePlan}
          >
            {status === 'planning' ? (
              <LoaderCircle className="animate-spin" suppressHydrationWarning />
            ) : (
              <Sparkles suppressHydrationWarning />
            )}
            {status === 'planning' ? 'Building Plan...' : 'Generate Creative Plan'}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className={cn(insetPanelClassName, 'grid gap-3 p-4')}>
            <label className={fieldLabelClassName} htmlFor="creative-audience">
              Audience
            </label>
            <Select
              id="creative-audience"
              onChange={(event) =>
                onBriefChange('audience', event.target.value as CreativeBrief['audience'])
              }
              value={creativeBrief.audience}
            >
              {audienceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className={cn(insetPanelClassName, 'grid gap-3 p-4')}>
            <label className={fieldLabelClassName} htmlFor="creative-goal">
              Goal
            </label>
            <Select
              id="creative-goal"
              onChange={(event) =>
                onBriefChange('goal', event.target.value as CreativeBrief['goal'])
              }
              value={creativeBrief.goal}
            >
              {goalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className={cn(insetPanelClassName, 'grid gap-3 p-4')}>
            <label className={fieldLabelClassName} htmlFor="creative-platform">
              Platform
            </label>
            <Select
              id="creative-platform"
              onChange={(event) =>
                onBriefChange('platform', event.target.value as CreativeBrief['platform'])
              }
              value={creativeBrief.platform}
            >
              {platformOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={cn(insetPanelClassName, 'grid gap-3 p-4')}>
            <label className={fieldLabelClassName} htmlFor="creative-highlights">
              Product Highlights
            </label>
            <Textarea
              className="min-h-28"
              id="creative-highlights"
              onChange={(event) => onBriefChange('productHighlights', event.target.value)}
              placeholder="List the strongest proof points, benefits, ingredients, materials, or differentiators to emphasize."
              value={creativeBrief.productHighlights}
            />
          </div>

          <div className={cn(insetPanelClassName, 'grid gap-3 p-4')}>
            <label className={fieldLabelClassName} htmlFor="creative-tone">
              Tone
            </label>
            <Input
              id="creative-tone"
              onChange={(event) => onBriefChange('tone', event.target.value)}
              placeholder="Confident, playful, premium, cozy, clean, urgent..."
              value={creativeBrief.tone}
            />
            <p className="text-sm leading-6 text-muted-foreground">
              This influences environment styling, pacing, and how assertive the
              message should feel.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/45 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
            {error}
          </div>
        ) : null}

        {creativePlan ? (
          <div className="grid gap-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <DirectionCard
                body={creativePlan.visualDirectionSummary}
                title="Visual Direction"
              />
              <DirectionCard
                body={creativePlan.environmentDirectionSummary}
                title="Environment Direction"
              />
              <DirectionCard
                body={creativePlan.soundDirectionSummary}
                title="Sound Direction"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className={cn(insetPanelClassName, 'grid gap-3 p-4')}>
                <p className={fieldLabelClassName}>VO / Script</p>
                <p className="text-sm leading-6 text-muted-foreground whitespace-pre-line">
                  {creativePlan.voiceoverScript}
                </p>
              </div>

              <div className={cn(insetPanelClassName, 'grid gap-3 p-4')}>
                <p className={fieldLabelClassName}>Message Angle</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {creativePlan.messageAngle}
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <p className={fieldLabelClassName}>CTA Options</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Pick the CTA that should appear on the final storyboard shot and
                  final render prompt.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {creativePlan.ctaOptions.map((cta) => (
                  <CtaCard
                    cta={cta}
                    isSelected={creativePlan.selectedCtaId === cta.id}
                    key={cta.id}
                    onSelect={onSelectCta}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/70 px-6 text-center">
            <Sparkles className="size-8 text-muted-foreground" suppressHydrationWarning />
            <div>
              <p className="font-medium text-foreground">No creative plan yet</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Analyze the hero product first, then build the creative planning
                layer to unlock storyboard-ready prompts.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
