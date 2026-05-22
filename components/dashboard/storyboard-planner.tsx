'use client'

import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import type { CreativePlan, StoryboardShot } from '@/lib/generation/types'
import { cn } from '@/lib/utils'

const panelClassName = 'rounded-2xl border border-border bg-card'
const insetPanelClassName = 'rounded-xl border border-border bg-background'
const fieldLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'

const subjectModeLabels: Record<StoryboardShot['subjectMode'], string> = {
  lifestyle: 'Lifestyle',
  'product-only': 'Product Only',
}

const shotEnvironmentLabels: Record<StoryboardShot['shotEnvironment'], string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
}

type StoryboardPlannerProps = {
  creativePlan: CreativePlan | null
  updateStoryboardShot: (slug: string, patch: Partial<StoryboardShot>) => void
}

function StoryboardField({
  description,
  label,
  onChange,
  value,
}: {
  description: string
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <p className={fieldLabelClassName}>{label}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <Textarea className="min-h-24" onChange={(event) => onChange(event.target.value)} value={value} />
    </div>
  )
}

function StoryboardShotCard({
  index,
  shot,
  updateStoryboardShot,
}: {
  index: number
  shot: StoryboardShot
  updateStoryboardShot: (slug: string, patch: Partial<StoryboardShot>) => void
}) {
  return (
    <article className={cn(insetPanelClassName, 'grid gap-4 p-4')}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Shot {index + 1}</Badge>
            <p className="font-medium text-foreground">{shot.title}</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{shot.objective}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{subjectModeLabels[shot.subjectMode]}</Badge>
          <Badge variant="secondary">
            {shotEnvironmentLabels[shot.shotEnvironment]}
          </Badge>
          <Badge variant="outline">{shot.durationSeconds}s</Badge>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <StoryboardField
          description="Narrative purpose for this scene."
          label="Shot Objective"
          onChange={(value) => updateStoryboardShot(shot.slug, { objective: value })}
          value={shot.objective}
        />
        <StoryboardField
          description="Voiceover or spoken guidance tied to this scene."
          label="VO Line"
          onChange={(value) => updateStoryboardShot(shot.slug, { voiceoverLine: value })}
          value={shot.voiceoverLine}
        />
        <StoryboardField
          description="Visual composition, movement, product framing, and talent direction."
          label="Visual Prompt"
          onChange={(value) => updateStoryboardShot(shot.slug, { visualPrompt: value })}
          value={shot.visualPrompt}
        />
        <StoryboardField
          description="Set dressing, location tone, and environmental constraints."
          label="Environment Prompt"
          onChange={(value) =>
            updateStoryboardShot(shot.slug, { environmentPrompt: value })
          }
          value={shot.environmentPrompt}
        />
        <StoryboardField
          description="Music vibe, pacing, ambience, or SFX cues for the scene."
          label="Sound Prompt"
          onChange={(value) => updateStoryboardShot(shot.slug, { soundPrompt: value })}
          value={shot.soundPrompt}
        />
        <StoryboardField
          description="Optional CTA copy if this shot needs a direct next step."
          label="CTA Text"
          onChange={(value) => updateStoryboardShot(shot.slug, { ctaText: value })}
          value={shot.ctaText}
        />
      </div>

      <StoryboardField
        description="This merged prompt is what will be sent to generation."
        label="Render Prompt"
        onChange={(value) =>
          updateStoryboardShot(shot.slug, {
            prompt: value,
            renderPrompt: value,
          })
        }
        value={shot.renderPrompt}
      />
    </article>
  )
}

export function StoryboardPlanner({
  creativePlan,
  updateStoryboardShot,
}: StoryboardPlannerProps) {
  return (
    <section className={cn(panelClassName, 'p-4 sm:p-5')}>
      <div className="grid gap-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Step 3
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold">
              Storyboard and shot planner
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Refine each scene before rendering. These fields are designed to be
              stable enough for real generation once KIE credits are available again.
            </p>
          </div>

          {creativePlan ? (
            <Badge className="self-start" variant="outline">
              {creativePlan.storyboard.length} storyboard shot
              {creativePlan.storyboard.length === 1 ? '' : 's'}
            </Badge>
          ) : null}
        </div>

        {creativePlan ? (
          <div className="grid gap-3">
            {creativePlan.storyboard.map((shot, index) => (
              <StoryboardShotCard
                index={index}
                key={shot.slug}
                shot={shot}
                updateStoryboardShot={updateStoryboardShot}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background/70 px-6 text-center">
            <p className="font-medium text-foreground">No storyboard yet</p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Generate the creative plan first. The storyboard will appear here as
              a fully editable per-shot planning layer.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
