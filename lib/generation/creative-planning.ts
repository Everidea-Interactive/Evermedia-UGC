import type {
  CreativeBrief,
  CreativePlan,
  CreativeStyle,
  CtaOption,
  GuidedAnalysisPlan,
  ProductCategory,
  StoryboardShot,
  VideoDuration,
  VideoModelOption,
} from '@/lib/generation/types'
import type { Locale } from '@/lib/i18n'
import { getVideoDurationSeconds } from '@/lib/generation/model-mapping'

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

function escapeQuotedPromptValue(value: string) {
  return value.replace(/"/g, '\\"').trim()
}

function sanitizeAnalyzedSummary(summary: string) {
  return normalizeSentence(summary)
    .replace(/^single shot\s+/i, '')
    .replace(/^this shot\s+/i, '')
    .replace(/\s+to drive trust and conversion\.?$/i, '')
    .replace(/\s+to drive trust and conversion$/i, '')
    .trim()
}

function extractAnalyzedBenefit(summary: string) {
  const sanitized = sanitizeAnalyzedSummary(summary)

  if (!sanitized) {
    return ''
  }

  const firstSentence = sanitized.split(/[.!?]/)[0]?.trim() ?? sanitized
  const concise = firstSentence
    .replace(/^show\s+/i, '')
    .replace(/^highlight\s+/i, '')
    .replace(/^focus on\s+/i, '')
    .trim()

  if (
    /(hook to cta|trust and conversion|shot summary|prompt set)/i.test(concise) ||
    /^(show)\s+(the\s+)?product benefit/i.test(concise) ||
    /^(the\s+)?product benefit\b/i.test(concise) ||
    /^tampilkan manfaat produk/i.test(concise)
  ) {
    return ''
  }

  return concise
}

function buildVoiceoverLanguageDirection(outputLanguage: Locale) {
  return outputLanguage === 'id'
    ? 'Spoken narration language: Bahasa Indonesia only, with natural Indonesian pronunciation. Keep brand names and model names in their original form.'
    : 'Spoken narration language: English only, with natural English pronunciation. Keep brand names and model names in their original form.'
}

function stripInstructionalLead(value: string) {
  return value
    .replace(/^(show|highlight|focus on|mention|explain|tell|describe)\s+/i, '')
    .replace(/^(tampilkan|sorot|fokus pada|jelaskan|sampaikan)\s+/i, '')
    .replace(/^(and|or)\s+/i, '')
    .replace(/^(dan|atau)\s+/i, '')
    .trim()
}

function formatFeaturePhrase(value: string) {
  return value
    .split(/\s+/)
    .map((token) => {
      if (!token) {
        return token
      }

      if (/^(?:\d+[A-Za-z]+|[A-Z0-9&/-]{2,})$/.test(token)) {
        return token.toUpperCase()
      }

      if (/^[A-Z][a-z0-9&/-]*$/.test(token) || /^[a-z0-9&/-]+$/.test(token)) {
        return token
      }

      const lower = token.toLowerCase()

      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function summarizeProductHighlights(highlight: string) {
  const normalized = normalizeSentence(highlight).replace(/[.!?]+$/, '')

  if (!normalized) {
    return ''
  }

  const looksInstructional =
    /(audience|bahasa|caption|cta|explain|instruction|jelas|jelaskan|mention|pengguna|prompt|sampaikan|show|tell|voiceover|yakinkan)/i.test(
      normalized,
    )

  if (looksInstructional) {
    return ''
  }

  const featureParts = normalized
    .split(/[,\n;|]+/)
    .map((part) =>
      stripInstructionalLead(
        part
          .replace(/[()]/g, ' ')
          .replace(/\s*&\s*/g, ' and ')
          .replace(/\s{2,}/g, ' ')
          .trim(),
      ),
    )
    .filter(Boolean)
    .filter(
      (part) =>
        part.length >= 4 &&
        !/(hook|cta|prompt|voiceover|subtitle|caption|audience)/i.test(part),
    )

  if (featureParts.length >= 2) {
    const selected = featureParts.slice(0, 3).map((part) => formatFeaturePhrase(part))

    if (selected.length === 2) {
      return `${selected[0]} and ${selected[1]}`
    }

    return `${selected.slice(0, -1).join(', ')}, and ${selected.at(-1)}`
  }

  if (featureParts.length === 1) {
    return formatFeaturePhrase(featureParts[0]!)
  }

  return normalized.split(' ').length > 12 ? '' : normalized
}

function selectVoiceoverBenefit(input: {
  productHighlights: string
  summary: string
}) {
  const highlightBenefit = summarizeProductHighlights(input.productHighlights)

  if (highlightBenefit) {
    return highlightBenefit
  }

  const analyzedBenefit = extractAnalyzedBenefit(input.summary)

  return analyzedBenefit || 'the clearest product benefit'
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

function allocateStoryboardDurations(totalSeconds: number, shotCount: number) {
  if (shotCount <= 0) {
    return []
  }

  const weights = Array.from({ length: shotCount }, (_, index) => {
    if (shotCount === 1) {
      return 1
    }

    if (index === 0 || index === shotCount - 1) {
      return 1.15
    }

    return 1
  })
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const rawDurations = weights.map((weight) => (totalSeconds * weight) / totalWeight)
  const roundedDurations = rawDurations.map((value) => Math.max(1, Math.floor(value)))
  let assignedSeconds = roundedDurations.reduce((sum, value) => sum + value, 0)

  while (assignedSeconds < totalSeconds) {
    const nextIndex = rawDurations.reduce((bestIndex, value, index) => {
      const currentRemainder = value - roundedDurations[index]!
      const bestRemainder = rawDurations[bestIndex]! - roundedDurations[bestIndex]!

      return currentRemainder > bestRemainder ? index : bestIndex
    }, 0)

    roundedDurations[nextIndex] = (roundedDurations[nextIndex] ?? 1) + 1
    assignedSeconds += 1
  }

  while (assignedSeconds > totalSeconds) {
    const nextIndex = roundedDurations.reduce((bestIndex, value, index) => {
      if (value <= 1) {
        return bestIndex
      }

      if (roundedDurations[bestIndex]! <= 1) {
        return index
      }

      const currentRemainder = rawDurations[index]! - value
      const bestRemainder = rawDurations[bestIndex]! - roundedDurations[bestIndex]!

      return currentRemainder < bestRemainder ? index : bestIndex
    }, 0)

    if ((roundedDurations[nextIndex] ?? 1) <= 1) {
      break
    }

    roundedDurations[nextIndex] -= 1
    assignedSeconds -= 1
  }

  return roundedDurations
}

function buildVoiceoverScript(input: {
  brief: CreativeBrief
  outputLanguage: Locale
  plan: GuidedAnalysisPlan
}) {
  const benefitFocus = selectVoiceoverBenefit({
    productHighlights: input.brief.productHighlights,
    summary: input.plan.summary,
  })

  return input.plan.shots
    .map((shot, index) => {
      if (input.outputLanguage === 'id') {
        if (index === 0) {
          return normalizeSentence(
            `Inilah produk yang menghadirkan ${benefitFocus}.`,
          )
        }

        if (index === input.plan.shots.length - 1) {
          return normalizeSentence(
            input.brief.goal === 'conversion'
              ? 'Coba lihat lebih dekat dan tentukan apakah ini cocok untuk Anda.'
              : 'Lihat hasilnya dengan jelas dan tentukan apakah ini sesuai kebutuhan Anda.',
          )
        }

        return normalizeSentence(
          input.brief.goal === 'consideration'
            ? `Produk ini membantu menjaga fokus pada ${benefitFocus} dengan cara yang terasa mudah dipercaya.`
            : `Produk ini menjaga fokus pada ${benefitFocus} dengan hasil yang jelas dan mudah dipahami.`,
        )
      }

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

function buildCtaOptions(input: {
  brief: CreativeBrief
  outputLanguage: Locale
}): CtaOption[] {
  const platform = platformLabels[input.brief.platform]

  if (input.outputLanguage === 'id') {
    return [
      {
        id: 'cta-shop-now',
        label: `Belanja sekarang di ${platform}`,
        placement: 'closing-shot',
        rationale: 'Paling cocok untuk penutupan yang fokus konversi dan lockup produk terakhir.',
      },
      {
        id: 'cta-check-details',
        label: 'Lihat detail dan variannya',
        placement: 'caption',
        rationale: 'Cocok saat audiens masih butuh dorongan kecil sebelum klik.',
      },
      {
        id: 'cta-try-it',
        label: 'Coba dan rasakan bedanya',
        placement: 'voiceover',
        rationale: 'Bagus untuk penutupan ala creator yang lebih halus tapi tetap persuasif.',
      },
    ]
  }

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
  durationSeconds: number
  index: number
  outputLanguage: Locale
  plan: GuidedAnalysisPlan
  brief: CreativeBrief
  messageAngle: string
  totalDurationSeconds: number
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
    `${shot.prompt} ${styleDirectionMap[input.plan.creativeStyle]} Keep the frame optimized for ${platformLabels[input.brief.platform]}. This shot should read in about ${input.durationSeconds} second${
      input.durationSeconds === 1 ? '' : 's'
    } as part of a ${input.totalDurationSeconds}-second overall clip.`,
  )
  const soundPrompt = normalizeSentence(
    `${input.index === 0 ? 'Opening beat:' : 'Supporting beat:'} ${buildSoundDirectionSummary({
      brief: input.brief,
    })}`,
  )
  const ctaText = input.index === input.plan.shots.length - 1 ? input.cta.label : ''
  const spokenVoiceoverDirection = input.voiceoverLine
    ? `Include clear spoken voiceover that says exactly: "${escapeQuotedPromptValue(
        input.voiceoverLine,
      )}".`
    : ''
  const spokenCtaDirection = ctaText
    ? `End with a spoken CTA that says exactly: "${escapeQuotedPromptValue(ctaText)}".`
    : ''
  const visibleCtaDirection = ctaText
    ? `If any readable on-screen CTA text appears, it must be exactly "${escapeQuotedPromptValue(
        ctaText,
      )}" in Latin letters only. Do not translate or replace it.`
    : 'Do not show subtitles, captions, or any readable on-screen text.'
  const renderPrompt = normalizeSentence(
    `${visualPrompt} ${environmentPrompt} ${buildVoiceoverLanguageDirection(
      input.outputLanguage,
    )} ${spokenVoiceoverDirection} ${soundPrompt} ${spokenCtaDirection} ${visibleCtaDirection} Avoid foreign-language characters, translated captions, extra UI text, logos, or watermarks.`,
  )

  return {
    ...shot,
    ctaText,
    durationSeconds: input.durationSeconds,
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
  outputLanguage: Locale
  plan: GuidedAnalysisPlan
  videoDuration?: VideoDuration
  videoModel?: VideoModelOption
}): CreativePlan {
  const totalDurationSeconds = getVideoDurationSeconds(
    input.videoModel ?? 'veo-3.1',
    input.videoDuration ?? 8,
  )
  const shotDurations = allocateStoryboardDurations(
    totalDurationSeconds,
    input.plan.shots.length,
  )
  const messageAngle = buildMessageAngle(input)
  const voiceoverScript = buildVoiceoverScript(input)
  const ctaOptions = buildCtaOptions({
    brief: input.brief,
    outputLanguage: input.outputLanguage,
  })
  const selectedCta = ctaOptions[0]
  const voiceoverLines = voiceoverScript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const storyboard = input.plan.shots.map((_, index) =>
    buildStoryboardShot({
      brief: input.brief,
      cta: selectedCta,
      durationSeconds: shotDurations[index] ?? 1,
      index,
      messageAngle,
      outputLanguage: input.outputLanguage,
      plan: input.plan,
      totalDurationSeconds,
      voiceoverLine:
        voiceoverLines[index] ??
        (input.outputLanguage === 'id'
          ? 'Sampaikan manfaat produk dengan bahasa yang natural, singkat, dan jelas.'
          : 'Keep the voiceover natural, concise, and focused on the product benefit.'),
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
