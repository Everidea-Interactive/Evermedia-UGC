import type {
  CreativeBrief,
  CreativePlan,
  CreativeStyle,
  CtaOption,
  GuidedAnalysisPlan,
  ProductCategory,
  StoryboardShot,
} from '@/lib/generation/types'

const audienceLabels: Record<CreativeBrief['audience'], string> = {
  broad: 'broad online shoppers',
  'beauty-shoppers': 'beauty-focused shoppers',
  'fitness-shoppers': 'fitness-oriented shoppers',
  'gen-z': 'Gen Z viewers',
  parents: 'busy parents',
  'young-professionals': 'young professionals',
}

const goalLabels: Record<CreativeBrief['goal'], string> = {
  awareness: 'stop the scroll and create immediate product recall',
  consideration: 'build trust and explain why the product deserves attention',
  conversion: 'create buying intent and push a clear next step',
}

const platformLabels: Record<CreativeBrief['platform'], string> = {
  'instagram-reels': 'Instagram Reels',
  'meta-ads': 'Meta Ads',
  shopee: 'Shopee',
  tiktok: 'TikTok',
  tokopedia: 'Tokopedia',
  'youtube-shorts': 'YouTube Shorts',
}

const categoryEnvironmentMap: Record<ProductCategory, string> = {
  clothing:
    'Use a styled location with clean wardrobe continuity, believable lifestyle surfaces, and enough open negative space for movement.',
  cosmetics:
    'Use flattering beauty-friendly environments with mirrors, soft highlights, clean counters, and premium but approachable grooming context.',
  electronics:
    'Use organized desks, modern rooms, practical surfaces, and subtle lifestyle context that supports product functionality.',
  'food-drink':
    'Use fresh food styling, natural kitchen or cafe context, appetizing texture detail, and clean supporting props.',
  jewelry:
    'Use premium close-up environments with soft reflections, elegant hands, and understated luxury styling.',
  miscellaneous:
    'Use simple, commerce-friendly environments that make the product the hero without visual clutter.',
}

const styleDirectionMap: Record<CreativeStyle, string> = {
  cinematic:
    'Favor depth, intentional composition, cinematic lighting contrast, and premium visual rhythm.',
  'elite-product-commercial':
    'Favor glossy product heroism, clean premium surfaces, and luxury retail polish.',
  'tv-commercial':
    'Favor direct selling clarity, readable product interaction, and ad-friendly pacing.',
  'ugc-lifestyle':
    'Favor relatable creator framing, natural hand movement, and believable lived-in context.',
}

function normalizeSentence(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function pickVoiceoverBenefit(highlight: string) {
  const normalized = normalizeSentence(highlight).replace(/[.!?]+$/, '')

  if (!normalized) {
    return 'the clearest product benefit'
  }

  const looksInstructional =
    normalized.split(' ').length > 10 ||
    /(audience|bahasa|caption|cta|explain|instruction|jelas|jelaskan|mention|pengguna|prompt|sampaikan|show|tell|voiceover|yakinkan)/i.test(
      normalized,
    )

  return looksInstructional ? 'the clearest product benefit' : normalized
}

function buildMessageAngle(input: {
  brief: CreativeBrief
  plan: GuidedAnalysisPlan
}) {
  const audience = audienceLabels[input.brief.audience]
  const goal = goalLabels[input.brief.goal]
  const highlight = input.brief.productHighlights.trim()

  return normalizeSentence(
    `Position the product for ${audience} and ${goal}. ${
      highlight
        ? `Keep the strongest emphasis on ${highlight}.`
        : 'Emphasize the most instantly understandable product benefit first.'
    }`,
  )
}

function buildVisualDirectionSummary(input: {
  brief: CreativeBrief
  plan: GuidedAnalysisPlan
}) {
  return normalizeSentence(
    `${styleDirectionMap[input.plan.creativeStyle]} Compose each shot for ${
      platformLabels[input.brief.platform]
    } with product readability first, scroll-stopping openings, and clean transitions between shot objectives.`,
  )
}

function buildEnvironmentDirectionSummary(input: {
  brief: CreativeBrief
  plan: GuidedAnalysisPlan
}) {
  const tone = input.brief.tone.trim()

  return normalizeSentence(
    `${categoryEnvironmentMap[input.plan.productCategory]} ${
      tone ? `The emotional tone should feel ${tone}.` : ''
    } Keep the environment supportive rather than distracting.`,
  )
}

function buildSoundDirectionSummary(input: { brief: CreativeBrief }) {
  const baseMood =
    input.brief.goal === 'conversion'
      ? 'Use upbeat, punchy pacing with confident transitions and crisp emphasis cues.'
      : input.brief.goal === 'consideration'
        ? 'Use warm, trustworthy pacing with soft accent cues that support explanation.'
        : 'Use instantly catchy pacing with a strong opening beat and light momentum.'

  return normalizeSentence(
    `${baseMood} Mix subtle interface-safe SFX, tactile interaction cues, and avoid dense audio that would compete with the voiceover.`,
  )
}

function buildVoiceoverScript(input: {
  brief: CreativeBrief
  plan: GuidedAnalysisPlan
}) {
  const benefitFocus = pickVoiceoverBenefit(input.brief.productHighlights)

  return input.plan.shots
    .map((shot, index) => {
      if (index === 0) {
        return normalizeSentence(
          `Here is the product that delivers ${benefitFocus}.`,
        )
      }

      if (index === input.plan.shots.length - 1) {
        return normalizeSentence(
          input.brief.goal === 'conversion'
            ? `Take a closer look and decide if this is the right fit for you.`
            : `See the result clearly and decide if it fits what you need.`,
        )
      }

      return normalizeSentence(
        input.brief.goal === 'consideration'
          ? `It keeps the experience focused on ${benefitFocus} in a way that feels easy to trust.`
          : `It keeps the focus on ${benefitFocus} with a clear, easy-to-follow payoff.`,
      )
    })
    .join('\n')
}

function buildCtaOptions(input: { brief: CreativeBrief }): CtaOption[] {
  const platform = platformLabels[input.brief.platform]

  return [
    {
      id: 'cta-shop-now',
      label: `Shop now on ${platform}`,
      placement: 'closing-shot',
      rationale: 'Best for direct conversion endings and final product lockup.',
    },
    {
      id: 'cta-check-details',
      label: 'See details and variants',
      placement: 'caption',
      rationale: 'Works when the audience still needs a small nudge before clicking.',
    },
    {
      id: 'cta-try-it',
      label: 'Try it and feel the difference',
      placement: 'voiceover',
      rationale: 'Good for creator-led closes that want a softer but still persuasive tone.',
    },
  ]
}

function buildStoryboardShot(input: {
  cta: CtaOption
  index: number
  plan: GuidedAnalysisPlan
  brief: CreativeBrief
  messageAngle: string
  voiceoverLine: string
}): StoryboardShot {
  const shot = input.plan.shots[input.index]
  const objective =
    input.index === 0
      ? 'Deliver the hook and establish the product promise immediately.'
      : input.index === input.plan.shots.length - 1
        ? 'Close the sequence with proof, payoff, and a clear next step.'
        : 'Build the product story with one clear benefit and a visual proof point.'
  const environmentPrompt = normalizeSentence(
    `${categoryEnvironmentMap[input.plan.productCategory]} Align the set dressing to the ${shot.shotEnvironment} context and keep visual clutter low.`,
  )
  const visualPrompt = normalizeSentence(
    `${shot.prompt} ${styleDirectionMap[input.plan.creativeStyle]} Keep the frame optimized for ${platformLabels[input.brief.platform]}.`,
  )
  const soundPrompt = normalizeSentence(
    `${input.index === 0 ? 'Opening beat:' : 'Supporting beat:'} ${buildSoundDirectionSummary({
      brief: input.brief,
    })}`,
  )
  const ctaText = input.index === input.plan.shots.length - 1 ? input.cta.label : ''
  const endingVisualDirection = ctaText
    ? 'End on a decisive purchase-intent visual payoff without rendering any on-screen CTA text.'
    : ''
  const renderPrompt = normalizeSentence(
    `${visualPrompt} ${environmentPrompt} ${endingVisualDirection} No subtitles, captions, logos, watermarks, UI text, or foreign-language characters.`,
  )

  return {
    ...shot,
    ctaText,
    durationSeconds: input.index === 0 ? 3 : input.index === input.plan.shots.length - 1 ? 4 : 5,
    environmentPrompt,
    objective,
    prompt: renderPrompt,
    renderPrompt,
    soundPrompt,
    visualPrompt,
    voiceoverLine: input.voiceoverLine,
  }
}

export function createCreativePlan(input: {
  brief: CreativeBrief
  plan: GuidedAnalysisPlan
}): CreativePlan {
  const messageAngle = buildMessageAngle(input)
  const voiceoverScript = buildVoiceoverScript(input)
  const ctaOptions = buildCtaOptions(input)
  const selectedCta = ctaOptions[0]
  const voiceoverLines = voiceoverScript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const storyboard = input.plan.shots.map((_, index) =>
    buildStoryboardShot({
      brief: input.brief,
      cta: selectedCta,
      index,
      messageAngle,
      plan: input.plan,
      voiceoverLine:
        voiceoverLines[index] ??
        'Keep the voiceover natural, concise, and focused on the product benefit.',
    }),
  )

  return {
    ctaOptions,
    environmentDirectionSummary: buildEnvironmentDirectionSummary(input),
    messageAngle,
    selectedCtaId: selectedCta.id,
    soundDirectionSummary: buildSoundDirectionSummary({ brief: input.brief }),
    storyboard,
    visualDirectionSummary: buildVisualDirectionSummary(input),
    voiceoverScript,
  }
}
