import {
  allVideoDurations,
  getImageResolution,
  getGrokDuration,
  getGrokResolution,
  getSeedance2MiniDuration,
  getSeedance2MiniResolution,
  getSeedance2Duration,
  getSeedanceDuration,
  normalizeVideoDurationForModel,
  getVideoDurationOptions,
  getVideoResolution,
  supportsVideoEndFrameGuidance,
  supportsVideoFirstLastFramePair,
} from '@/lib/generation/model-mapping'
import type {
  CarouselDraft,
  GenerationCostEstimate,
  GenerationCostRate,
  GenerationSnapshot,
  KiePricingMatrix,
  MarketVideoResolution,
  MotionControlDraft,
  StandardVideoResolution,
  VideoAudio,
  VideoDuration,
  VideoModelOption,
} from '@/lib/generation/types'

type NumericVideoDuration = Exclude<VideoDuration, 'base' | 'extended'>

export const KIE_CREDIT_USD_RATE = 0.005
export const KIE_PRICING_TTL_MS = 15 * 60_000

export type KiePricingApiRecord = {
  creditPrice: string
  modelDescription: string
  usdPrice: string
}

function normalizeDescription(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseNumericValue(value: string, label: string) {
  const parsed = Number.parseFloat(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`KIE pricing row is missing a usable ${label} value.`)
  }

  return parsed
}

function parseRate(record: KiePricingApiRecord): GenerationCostRate {
  return {
    credits: parseNumericValue(record.creditPrice, 'creditPrice'),
    usd: parseNumericValue(record.usdPrice, 'usdPrice'),
  }
}

function multiplyRate(rate: GenerationCostRate, factor: number): GenerationCostRate {
  return {
    credits: Number((rate.credits * factor).toFixed(3)),
    usd: Number((rate.usd * factor).toFixed(3)),
  }
}

function findRecord(
  records: KiePricingApiRecord[],
  expectedDescription: string,
) {
  const normalizedDescription = normalizeDescription(expectedDescription)
  const record = records.find(
    (candidate) =>
      normalizeDescription(candidate.modelDescription) === normalizedDescription,
  )

  if (!record) {
    throw new Error(`KIE pricing row not found for "${expectedDescription}".`)
  }

  return record
}

function findRecordByPatterns(
  records: KiePricingApiRecord[],
  patterns: RegExp[],
) {
  return records.find((candidate) => {
    const description = normalizeDescription(candidate.modelDescription)
    return patterns.every((pattern) => pattern.test(description))
  })
}

function findFirstRecord(
  records: KiePricingApiRecord[],
  expectedDescriptions: string[],
) {
  for (const description of expectedDescriptions) {
    const record = records.find(
      (candidate) =>
        normalizeDescription(candidate.modelDescription) ===
        normalizeDescription(description),
    )

    if (record) {
      return record
    }
  }

  throw new Error(
    `KIE pricing row not found for "${expectedDescriptions.join('" or "')}".`,
  )
}

function findFirstRecordByPatterns(
  records: KiePricingApiRecord[],
  patternSets: RegExp[][],
) {
  for (const patterns of patternSets) {
    const record = findRecordByPatterns(records, patterns)

    if (record) {
      return record
    }
  }

  return null
}

function unavailableRate(): GenerationCostRate {
  return {
    credits: Number.NaN,
    usd: Number.NaN,
  }
}

function createUnavailableDurationRates() {
  return {
    ...Object.fromEntries(
      allVideoDurations.map((duration) => [duration, unavailableRate()]),
    ),
    base: unavailableRate(),
    extended: unavailableRate(),
  } as Record<VideoDuration, GenerationCostRate>
}

function createDurationRates(
  model: VideoModelOption,
  resolveRate: (duration: NumericVideoDuration) => GenerationCostRate,
) {
  const durationRates = createUnavailableDurationRates()
  const durations = getVideoDurationOptions(model)

  for (const duration of durations) {
    durationRates[duration] = resolveRate(duration)
  }

  const baseDuration = normalizeVideoDurationForModel(model, 'base')
  const extendedDuration = normalizeVideoDurationForModel(model, 'extended')

  durationRates.base = durationRates[baseDuration]
  durationRates.extended = durationRates[extendedDuration]

  return durationRates
}

function derivePerSecondRate(
  durations: NumericVideoDuration[],
  resolveRate: (duration: NumericVideoDuration) => GenerationCostRate,
) {
  const perSecondRates = durations
    .map((duration) => {
      const rate = resolveRate(duration)

      return Number.isFinite(rate.credits) && Number.isFinite(rate.usd)
        ? {
            credits: rate.credits / duration,
            usd: rate.usd / duration,
          }
        : null
    })
    .filter((rate): rate is GenerationCostRate => rate !== null)

  if (perSecondRates.length === 0) {
    return null
  }

  const totals = perSecondRates.reduce(
    (sum, rate) => ({
      credits: sum.credits + rate.credits,
      usd: sum.usd + rate.usd,
    }),
    { credits: 0, usd: 0 },
  )

  return {
    credits: totals.credits / perSecondRates.length,
    usd: totals.usd / perSecondRates.length,
  }
}

export function buildKiePricingMatrix(input: {
  grokRecords: KiePricingApiRecord[]
  gptImageRecords?: KiePricingApiRecord[]
  klingRecords: KiePricingApiRecord[]
  kling30Override?: {
    promptOnly: Record<StandardVideoResolution, Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>>
    withReference: Record<StandardVideoResolution, Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>>
  } | null
  kling30MotionControlOverride?: Record<StandardVideoResolution, GenerationCostRate> | null
  nanoRecords: KiePricingApiRecord[]
  seedance15Override?: {
    promptOnly: Record<StandardVideoResolution, Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>>
    withReference: Record<StandardVideoResolution, Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>>
  } | null
  seedanceRecords: KiePricingApiRecord[]
  veoRecords: KiePricingApiRecord[]
}): KiePricingMatrix {
  const gptImageRecords = input.gptImageRecords ?? []
  const nanoRate1KRecord = findRecordByPatterns(input.nanoRecords, [
    /\bnano banana 2\b/,
    /\b1k\b/,
  ])
  const nanoRate2KRecord = findRecordByPatterns(input.nanoRecords, [
    /\bnano banana 2\b/,
    /\b2k\b/,
  ])
  const nanoRate4KRecord = findRecordByPatterns(input.nanoRecords, [
    /\bnano banana 2\b/,
    /\b4k\b/,
  ])

  if (!nanoRate1KRecord || !nanoRate2KRecord) {
    throw new Error('KIE pricing rows for Nano Banana 2 (1K/2K) are missing.')
  }

  const nanoRatesByResolution = {
    '1K': parseRate(
      nanoRate1KRecord,
    ),
    '2K': parseRate(
      nanoRate2KRecord,
    ),
    '4K': nanoRate4KRecord ? parseRate(nanoRate4KRecord) : null,
  }
  const grokImageRates = {
    'image-to-image': parseRate(
      findRecord(input.grokRecords, 'grok-imagine, image-to-image'),
    ),
    'text-to-image': parseRate(
      findRecord(input.grokRecords, 'grok-imagine, text-to-image'),
    ),
  }
  const gptImageRatesByMode = {
    promptOnly: {
      '1K': parseRate(
        findRecordByPatterns(gptImageRecords, [
          /\bgpt image 2\b/,
          /\btext-to-image\b/,
          /\b1k\b/,
        ]) ?? findRecord(input.nanoRecords, 'Google nano banana 2, 1K'),
      ),
      '2K': parseRate(
        findRecordByPatterns(gptImageRecords, [
          /\bgpt image 2\b/,
          /\btext-to-image\b/,
          /\b2k\b/,
        ]) ?? findRecord(input.nanoRecords, 'Google nano banana 2, 2K'),
      ),
      '4K': parseRate(
        findRecordByPatterns(gptImageRecords, [
          /\bgpt image 2\b/,
          /\btext-to-image\b/,
          /\b4k\b/,
        ]) ??
          (findRecordByPatterns(input.nanoRecords, [/\bnano banana 2\b/, /\b4k\b/]) ??
            findRecord(input.nanoRecords, 'Google nano banana 2, 2K')),
      ),
    },
    withReference: {
      '1K': parseRate(
        findRecordByPatterns(gptImageRecords, [
          /\bgpt image 2\b/,
          /\bimage-to-image\b/,
          /\b1k\b/,
        ]) ?? findRecord(input.nanoRecords, 'Google nano banana 2, 1K'),
      ),
      '2K': parseRate(
        findRecordByPatterns(gptImageRecords, [
          /\bgpt image 2\b/,
          /\bimage-to-image\b/,
          /\b2k\b/,
        ]) ?? findRecord(input.nanoRecords, 'Google nano banana 2, 2K'),
      ),
      '4K': parseRate(
        findRecordByPatterns(gptImageRecords, [
          /\bgpt image 2\b/,
          /\bimage-to-image\b/,
          /\b4k\b/,
        ]) ??
          (findRecordByPatterns(input.nanoRecords, [/\bnano banana 2\b/, /\b4k\b/]) ??
            findRecord(input.nanoRecords, 'Google nano banana 2, 2K')),
      ),
    },
  }
  const grokVideoRatesByInput = {
    'image-to-video': {
      '480p': parseRate(
        findFirstRecord(
          input.grokRecords,
          [
            'grok-imagine-video-1-5-preview, image-to-video, 480p',
            'grok-imagine, image-to-video, 480p',
          ],
        ),
      ),
      '720p': parseRate(
        findFirstRecord(
          input.grokRecords,
          [
            'grok-imagine-video-1-5-preview, image-to-video, 720p',
            'grok-imagine, image-to-video, 720p',
          ],
        ),
      ),
    },
    'text-to-video': {
      '480p': parseRate(
        findFirstRecordByPatterns(input.grokRecords, [
          [/\bgrok-imagine-video-1-5-preview\b/, /\btext-to-video\b/, /\b480p\b/],
          [/\bgrok-imagine\b/, /\btext-to-video\b/, /\b480p\b/],
          [/\bgrok-imagine-video-1-5-preview\b/, /\bimage-to-video\b/, /\b480p\b/],
          [/\bgrok-imagine\b/, /\bimage-to-video\b/, /\b480p\b/],
        ]) ??
          findFirstRecord(input.grokRecords, [
            'grok-imagine-video-1-5-preview, image-to-video, 480p',
            'grok-imagine, image-to-video, 480p',
          ]),
      ),
      '720p': parseRate(
        findFirstRecordByPatterns(input.grokRecords, [
          [/\bgrok-imagine-video-1-5-preview\b/, /\btext-to-video\b/, /\b720p\b/],
          [/\bgrok-imagine\b/, /\btext-to-video\b/, /\b720p\b/],
          [/\bgrok-imagine-video-1-5-preview\b/, /\bimage-to-video\b/, /\b720p\b/],
          [/\bgrok-imagine\b/, /\bimage-to-video\b/, /\b720p\b/],
        ]) ??
          findFirstRecord(input.grokRecords, [
            'grok-imagine-video-1-5-preview, image-to-video, 720p',
            'grok-imagine, image-to-video, 720p',
          ]),
      ),
    },
  }
  const klingRatesByInput = {
    'image-to-video': {
      '10': {
        'no-audio': parseRate(
          findFirstRecord(input.klingRecords, [
            'kling 2.6, image-to-video, without audio-10.0s',
            'kling 2.6, image-to-video, without audio-10s',
          ]),
        ),
        'with-audio': (() => {
          const record = findRecordByPatterns(input.klingRecords, [
            /\bkling 2\.6\b/,
            /\bimage-to-video\b/,
            /\bwith audio\b/,
            /\b10(\.0)?s\b/,
          ])

          return record ? parseRate(record) : unavailableRate()
        })(),
      },
      '5': {
        'no-audio': parseRate(
          findFirstRecord(input.klingRecords, [
            'kling 2.6, image-to-video, without audio-5.0s',
            'kling 2.6, image-to-video, without audio-5s',
          ]),
        ),
        'with-audio': (() => {
          const record = findRecordByPatterns(input.klingRecords, [
            /\bkling 2\.6\b/,
            /\bimage-to-video\b/,
            /\bwith audio\b/,
            /\b5(\.0)?s\b/,
          ])

          return record ? parseRate(record) : unavailableRate()
        })(),
      },
    },
    'text-to-video': {
      '10': {
        'no-audio': parseRate(
          findFirstRecord(input.klingRecords, [
            'kling 2.6, text-to-video, without audio-10.0s',
            'kling 2.6, text-to-video, without audio-10s',
          ]),
        ),
        'with-audio': (() => {
          const record = findRecordByPatterns(input.klingRecords, [
            /\bkling 2\.6\b/,
            /\btext-to-video\b/,
            /\bwith audio\b/,
            /\b10(\.0)?s\b/,
          ])

          return record ? parseRate(record) : unavailableRate()
        })(),
      },
      '5': {
        'no-audio': parseRate(
          findFirstRecord(input.klingRecords, [
            'kling 2.6, text-to-video, without audio-5.0s',
            'kling 2.6, text-to-video, without audio-5s',
          ]),
        ),
        'with-audio': (() => {
          const record = findRecordByPatterns(input.klingRecords, [
            /\bkling 2\.6\b/,
            /\btext-to-video\b/,
            /\bwith audio\b/,
            /\b5(\.0)?s\b/,
          ])

          return record ? parseRate(record) : unavailableRate()
        })(),
      },
    },
  }
  const veoRates = {
    'image-to-video': {
      '720p': parseRate(
        findRecordByPatterns(input.veoRecords, [
          /\bgoogle veo 3\.1\b/,
          /\bimage-to-video\b/,
          /\bfast-720p\b/,
        ]) ?? findRecord(input.veoRecords, 'Google veo 3.1, image-to-video, Fast'),
      ),
      '1080p': parseRate(
        findRecordByPatterns(input.veoRecords, [
          /\bgoogle veo 3\.1\b/,
          /\bimage-to-video\b/,
          /\bfast-1080p\b/,
        ]) ?? findRecord(input.veoRecords, 'Google veo 3.1, image-to-video, Fast'),
      ),
    },
    'text-to-video': {
      '720p': parseRate(
        findRecordByPatterns(input.veoRecords, [
          /\bgoogle veo 3\.1\b/,
          /\btext-to-video\b/,
          /\bfast-720p\b/,
        ]) ?? findRecord(input.veoRecords, 'Google veo 3.1, text-to-video, Fast'),
      ),
      '1080p': parseRate(
        findRecordByPatterns(input.veoRecords, [
          /\bgoogle veo 3\.1\b/,
          /\btext-to-video\b/,
          /\bfast-1080p\b/,
        ]) ?? findRecord(input.veoRecords, 'Google veo 3.1, text-to-video, Fast'),
      ),
    },
  }
  const seedanceRatesByInput = input.seedance15Override
    ? null
    : (() => {
        const withReference720 = input.seedanceRecords.find(
          (candidate) =>
            normalizeDescription(candidate.modelDescription) ===
            normalizeDescription('bytedance/seedance-1.5-pro, 720p with video input'),
        )
        const withReference1080 = input.seedanceRecords.find(
          (candidate) =>
            normalizeDescription(candidate.modelDescription) ===
            normalizeDescription('bytedance/seedance-1.5-pro, 1080p with video input'),
        )
        const promptOnly720 = input.seedanceRecords.find(
          (candidate) =>
            normalizeDescription(candidate.modelDescription) ===
            normalizeDescription('bytedance/seedance-1.5-pro, 720p no video input'),
        )
        const promptOnly1080 = input.seedanceRecords.find(
          (candidate) =>
            normalizeDescription(candidate.modelDescription) ===
            normalizeDescription('bytedance/seedance-1.5-pro, 1080p no video input'),
        )

        if (
          !withReference720 ||
          !withReference1080 ||
          !promptOnly720 ||
          !promptOnly1080
        ) {
          return null
        }

        return {
          withReference: {
            '720p': parseRate(withReference720),
            '1080p': parseRate(withReference1080),
          },
          promptOnly: {
            '720p': parseRate(promptOnly720),
            '1080p': parseRate(promptOnly1080),
          },
        }
      })()
  const seedance2RatesByInput = (() => {
    const withReference720 = input.seedanceRecords.find(
      (candidate) =>
        normalizeDescription(candidate.modelDescription) ===
        normalizeDescription('bytedance/seedance-2, 720p with video input'),
    )
    const withReference1080 = input.seedanceRecords.find(
      (candidate) =>
        normalizeDescription(candidate.modelDescription) ===
        normalizeDescription('bytedance/seedance-2, 1080p with video input'),
    )
    const promptOnly720 = input.seedanceRecords.find(
      (candidate) =>
        normalizeDescription(candidate.modelDescription) ===
        normalizeDescription('bytedance/seedance-2, 720p no video input'),
    )
    const promptOnly1080 = input.seedanceRecords.find(
      (candidate) =>
        normalizeDescription(candidate.modelDescription) ===
        normalizeDescription('bytedance/seedance-2, 1080p no video input'),
    )

    if (
      !withReference720 ||
      !withReference1080 ||
      !promptOnly720 ||
      !promptOnly1080
    ) {
      return null
    }

    return {
      withReference: {
        '720p': parseRate(withReference720),
        '1080p': parseRate(withReference1080),
      },
      promptOnly: {
        '720p': parseRate(promptOnly720),
        '1080p': parseRate(promptOnly1080),
      },
    }
  })()
  const seedance2MiniRatesByInput = (() => {
    const withReference480 = input.seedanceRecords.find(
      (candidate) =>
        normalizeDescription(candidate.modelDescription) ===
        normalizeDescription('bytedance/seedance-2-mini, 480p with video'),
    )
    const withReference720 = input.seedanceRecords.find(
      (candidate) =>
        normalizeDescription(candidate.modelDescription) ===
        normalizeDescription('bytedance/seedance-2-mini, 720p with video'),
    )
    const promptOnly480 = input.seedanceRecords.find(
      (candidate) =>
        normalizeDescription(candidate.modelDescription) ===
        normalizeDescription('bytedance/seedance-2-mini, 480p no video'),
    )
    const promptOnly720 = input.seedanceRecords.find(
      (candidate) =>
        normalizeDescription(candidate.modelDescription) ===
        normalizeDescription('bytedance/seedance-2-mini, 720p no video'),
    )

    if (
      !withReference480 ||
      !withReference720 ||
      !promptOnly480 ||
      !promptOnly720
    ) {
      return null
    }

    return {
      withReference: {
        '480p': parseRate(withReference480),
        '720p': parseRate(withReference720),
      },
      promptOnly: {
        '480p': parseRate(promptOnly480),
        '720p': parseRate(promptOnly720),
      },
    }
  })()

  const standardVideoQualities: StandardVideoResolution[] = ['720p', '1080p']
  const marketVideoQualities: MarketVideoResolution[] = ['480p', '720p']
  const grokPricingByInputMode = {
    promptOnly: grokVideoRatesByInput['text-to-video'],
    withReference: grokVideoRatesByInput['image-to-video'],
  }

  const grokVideoMatrix = {
    promptOnly:
      {} as KiePricingMatrix['video']['grok-imagine-video-1.5']['promptOnly'],
    withReference:
      {} as KiePricingMatrix['video']['grok-imagine-video-1.5']['withReference'],
  }

  for (const mode of ['promptOnly', 'withReference'] as const) {
    for (const quality of marketVideoQualities) {
      const perSecondRate = grokPricingByInputMode[mode][getGrokResolution(quality)]
      grokVideoMatrix[mode][quality] = createDurationRates(
        'grok-imagine-video-1.5',
        (duration) => multiplyRate(perSecondRate, getGrokDuration(duration)),
      )
    }
  }

  const klingMatrix = {
    promptOnly: {} as KiePricingMatrix['video']['kling']['promptOnly'],
    withReference: {} as KiePricingMatrix['video']['kling']['withReference'],
  }
  const seedanceMatrix = input.seedance15Override
    ? input.seedance15Override
    : {
        promptOnly:
          {} as KiePricingMatrix['video']['seedance-1.5-pro']['promptOnly'],
        withReference:
          {} as KiePricingMatrix['video']['seedance-1.5-pro']['withReference'],
      }
  const seedance2Matrix = {
    promptOnly: {} as KiePricingMatrix['video']['seedance-2']['promptOnly'],
    withReference: {} as KiePricingMatrix['video']['seedance-2']['withReference'],
  }
  const seedance2MiniMatrix = {
    promptOnly: {} as KiePricingMatrix['video']['seedance-2-mini']['promptOnly'],
    withReference:
      {} as KiePricingMatrix['video']['seedance-2-mini']['withReference'],
  }
  const kling30MotionControlMatrix =
    {} as KiePricingMatrix['video']['kling-3.0-motion-control']
  const kling30Matrix = {
    promptOnly: {} as KiePricingMatrix['video']['kling-3.0']['promptOnly'],
    withReference: {} as KiePricingMatrix['video']['kling-3.0']['withReference'],
  }
  const kling30MotionControlLiveRates = {
    '720p':
      findRecordByPatterns(input.klingRecords, [
        /\bkling 3\.0 motion control\b/,
        /\bvideo(?:\s|-)?to(?:\s|-)?video\b/,
        /\b720p\b/,
      ]) ?? null,
    '1080p':
      findRecordByPatterns(input.klingRecords, [
        /\bkling 3\.0 motion control\b/,
        /\bvideo(?:\s|-)?to(?:\s|-)?video\b/,
        /\b1080p\b/,
      ]) ?? null,
  } as const

  if (!input.seedance15Override && seedanceRatesByInput) {
    for (const quality of standardVideoQualities) {
      seedanceMatrix.promptOnly[quality] = {
        'no-audio': createDurationRates('seedance-1.5-pro', (duration) =>
          multiplyRate(seedanceRatesByInput.promptOnly[quality], getSeedanceDuration(duration)),
        ),
        'with-audio': createDurationRates('seedance-1.5-pro', (duration) =>
          multiplyRate(seedanceRatesByInput.promptOnly[quality], getSeedanceDuration(duration)),
        ),
      }
      seedanceMatrix.withReference[quality] = {
        'no-audio': createDurationRates('seedance-1.5-pro', (duration) =>
          multiplyRate(seedanceRatesByInput.withReference[quality], getSeedanceDuration(duration)),
        ),
        'with-audio': createDurationRates('seedance-1.5-pro', (duration) =>
          multiplyRate(seedanceRatesByInput.withReference[quality], getSeedanceDuration(duration)),
        ),
      }
    }
  }

  if (!input.seedance15Override && !seedanceRatesByInput) {
    for (const quality of standardVideoQualities) {
      seedanceMatrix.promptOnly[quality] = {
        'no-audio': createUnavailableDurationRates(),
        'with-audio': createUnavailableDurationRates(),
      }
      seedanceMatrix.withReference[quality] = {
        'no-audio': createUnavailableDurationRates(),
        'with-audio': createUnavailableDurationRates(),
      }
    }
  }

  if (seedance2RatesByInput) {
    for (const quality of standardVideoQualities) {
      seedance2Matrix.promptOnly[quality] = {
        'no-audio': createDurationRates('seedance-2', (duration) =>
          multiplyRate(seedance2RatesByInput.promptOnly[quality], getSeedance2Duration(duration)),
        ),
        'with-audio': createDurationRates('seedance-2', (duration) =>
          multiplyRate(seedance2RatesByInput.promptOnly[quality], getSeedance2Duration(duration)),
        ),
      }
      seedance2Matrix.withReference[quality] = {
        'no-audio': createDurationRates('seedance-2', (duration) =>
          multiplyRate(seedance2RatesByInput.withReference[quality], getSeedance2Duration(duration)),
        ),
        'with-audio': createDurationRates('seedance-2', (duration) =>
          multiplyRate(seedance2RatesByInput.withReference[quality], getSeedance2Duration(duration)),
        ),
      }
    }
  } else {
    for (const quality of standardVideoQualities) {
      seedance2Matrix.promptOnly[quality] = {
        'no-audio': createUnavailableDurationRates(),
        'with-audio': createUnavailableDurationRates(),
      }
      seedance2Matrix.withReference[quality] = {
        'no-audio': createUnavailableDurationRates(),
        'with-audio': createUnavailableDurationRates(),
      }
    }
  }

  if (seedance2MiniRatesByInput) {
    for (const quality of marketVideoQualities) {
      seedance2MiniMatrix.promptOnly[quality] = {
        'no-audio': createDurationRates('seedance-2-mini', (duration) =>
          multiplyRate(
            seedance2MiniRatesByInput.promptOnly[getSeedance2MiniResolution(quality)],
            getSeedance2MiniDuration(duration),
          ),
        ),
        'with-audio': createDurationRates('seedance-2-mini', (duration) =>
          multiplyRate(
            seedance2MiniRatesByInput.promptOnly[getSeedance2MiniResolution(quality)],
            getSeedance2MiniDuration(duration),
          ),
        ),
      }
      seedance2MiniMatrix.withReference[quality] = {
        'no-audio': createDurationRates('seedance-2-mini', (duration) =>
          multiplyRate(
            seedance2MiniRatesByInput.withReference[getSeedance2MiniResolution(quality)],
            getSeedance2MiniDuration(duration),
          ),
        ),
        'with-audio': createDurationRates('seedance-2-mini', (duration) =>
          multiplyRate(
            seedance2MiniRatesByInput.withReference[getSeedance2MiniResolution(quality)],
            getSeedance2MiniDuration(duration),
          ),
        ),
      }
    }
  } else {
    for (const quality of marketVideoQualities) {
      seedance2MiniMatrix.promptOnly[quality] = {
        'no-audio': createUnavailableDurationRates(),
        'with-audio': createUnavailableDurationRates(),
      }
      seedance2MiniMatrix.withReference[quality] = {
        'no-audio': createUnavailableDurationRates(),
        'with-audio': createUnavailableDurationRates(),
      }
    }
  }

  const klingPromptOnlyNoAudioPerSecond = derivePerSecondRate(
    [5, 10],
    (duration) => klingRatesByInput['text-to-video'][String(duration) as '5' | '10']['no-audio'],
  )
  const klingPromptOnlyWithAudioPerSecond = derivePerSecondRate(
    [5, 10],
    (duration) => klingRatesByInput['text-to-video'][String(duration) as '5' | '10']['with-audio'],
  )
  const klingWithReferenceNoAudioPerSecond = derivePerSecondRate(
    [5, 10],
    (duration) => klingRatesByInput['image-to-video'][String(duration) as '5' | '10']['no-audio'],
  )
  const klingWithReferenceWithAudioPerSecond = derivePerSecondRate(
    [5, 10],
    (duration) => klingRatesByInput['image-to-video'][String(duration) as '5' | '10']['with-audio'],
  )

  klingMatrix.promptOnly['no-audio'] = createDurationRates(
    'kling-3.0',
    (duration) =>
      klingPromptOnlyNoAudioPerSecond
        ? multiplyRate(klingPromptOnlyNoAudioPerSecond, duration)
        : unavailableRate(),
  )
  klingMatrix.promptOnly['with-audio'] = createDurationRates(
    'kling-3.0',
    (duration) =>
      klingPromptOnlyWithAudioPerSecond
        ? multiplyRate(klingPromptOnlyWithAudioPerSecond, duration)
        : unavailableRate(),
  )
  klingMatrix.withReference['no-audio'] = createDurationRates(
    'kling-3.0',
    (duration) =>
      klingWithReferenceNoAudioPerSecond
        ? multiplyRate(klingWithReferenceNoAudioPerSecond, duration)
        : unavailableRate(),
  )
  klingMatrix.withReference['with-audio'] = createDurationRates(
    'kling-3.0',
    (duration) =>
      klingWithReferenceWithAudioPerSecond
        ? multiplyRate(klingWithReferenceWithAudioPerSecond, duration)
        : unavailableRate(),
  )

  // Kling 3.0 uses hardcoded pricing (similar to Seedance 1.5 Pro).
  if (input.kling30Override) {
    for (const quality of standardVideoQualities) {
      const promptOnlyRate = input.kling30Override.promptOnly[quality]
      const withReferenceRate = input.kling30Override.withReference[quality]
      const promptOnlyNoAudioPerSecond = derivePerSecondRate(
        [5, 10],
        (duration) => promptOnlyRate['no-audio'][duration],
      )
      const promptOnlyWithAudioPerSecond = derivePerSecondRate(
        [5, 10],
        (duration) => promptOnlyRate['with-audio'][duration],
      )
      const withReferenceNoAudioPerSecond = derivePerSecondRate(
        [5, 10],
        (duration) => withReferenceRate['no-audio'][duration],
      )
      const withReferenceWithAudioPerSecond = derivePerSecondRate(
        [5, 10],
        (duration) => withReferenceRate['with-audio'][duration],
      )

      kling30Matrix.promptOnly[quality] = {
        'no-audio': createDurationRates(
          'kling-3.0',
          (duration) =>
            promptOnlyNoAudioPerSecond
              ? multiplyRate(promptOnlyNoAudioPerSecond, duration)
              : unavailableRate(),
        ),
        'with-audio': createDurationRates(
          'kling-3.0',
          (duration) =>
            promptOnlyWithAudioPerSecond
              ? multiplyRate(promptOnlyWithAudioPerSecond, duration)
              : unavailableRate(),
        ),
      }
      kling30Matrix.withReference[quality] = {
        'no-audio': createDurationRates(
          'kling-3.0',
          (duration) =>
            withReferenceNoAudioPerSecond
              ? multiplyRate(withReferenceNoAudioPerSecond, duration)
              : unavailableRate(),
        ),
        'with-audio': createDurationRates(
          'kling-3.0',
          (duration) =>
            withReferenceWithAudioPerSecond
              ? multiplyRate(withReferenceWithAudioPerSecond, duration)
              : unavailableRate(),
        ),
      }
    }
  } else {
    for (const quality of standardVideoQualities) {
      kling30Matrix.promptOnly[quality] = {
        'no-audio': createUnavailableDurationRates(),
        'with-audio': createUnavailableDurationRates(),
      }
      kling30Matrix.withReference[quality] = {
        'no-audio': createUnavailableDurationRates(),
        'with-audio': createUnavailableDurationRates(),
      }
    }
  }

  for (const quality of standardVideoQualities) {
    const liveRate = kling30MotionControlLiveRates[quality]

    kling30MotionControlMatrix[quality] = liveRate
      ? parseRate(liveRate)
      : input.kling30MotionControlOverride?.[quality] ?? unavailableRate()
  }

  return {
    image: {
      'grok-imagine': {
        promptOnly: grokImageRates['text-to-image'],
        withReference: grokImageRates['image-to-image'],
      },
      'gpt-image-2': gptImageRatesByMode,
      'nano-banana': {
        '1K': nanoRatesByResolution['1K'],
        '2K': nanoRatesByResolution['2K'],
        '4K':
          nanoRatesByResolution['4K'] ??
          nanoRatesByResolution['2K'] ??
          nanoRatesByResolution['1K'],
      },
    },
    video: {
      'grok-imagine-video-1.5': grokVideoMatrix,
      kling: klingMatrix,
      'kling-3.0': kling30Matrix,
      'kling-3.0-motion-control': kling30MotionControlMatrix,
      'veo-3.1': {
        promptOnly: veoRates['text-to-video'],
        withReference: veoRates['image-to-video'],
      },
      'seedance-1.5-pro': seedanceMatrix,
      'seedance-2-mini': seedance2MiniMatrix,
      'seedance-2': seedance2Matrix,
    },
  }
}

function unavailableEstimate(reason: string): GenerationCostEstimate {
  return {
    available: false,
    credits: null,
    reason,
    usd: null,
  }
}

function getCarouselGeneratedPanelCount(draft: CarouselDraft | null | undefined) {
  if (!draft) {
    return 0
  }

  return Math.ceil(draft.panels.length / 4)
}

export function formatCreditAmount(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value)
}

export function getGenerationCreditValidation(input: {
  balanceCredits: number | null
  balanceError?: string | null
  estimate: GenerationCostEstimate
  pricingError?: string | null
}) {
  if (!input.estimate.available || input.estimate.credits === null) {
    return {
      canGenerate: false,
      reason:
        input.pricingError ??
        input.estimate.reason ??
        'Live pricing unavailable. Generation stays locked until the estimate loads.',
    }
  }

  if (input.balanceCredits === null) {
    return {
      canGenerate: false,
      reason:
        input.balanceError ??
        'Checking KIE credit balance. Generation unlocks once the balance loads.',
    }
  }

  if (input.balanceCredits < input.estimate.credits) {
    return {
      canGenerate: false,
      reason: `Not enough KIE credits. ${formatCreditAmount(
        input.estimate.credits,
      )} required, ${formatCreditAmount(input.balanceCredits)} available.`,
    }
  }

  return {
    canGenerate: true,
    reason: null,
  }
}

export function getGenerationCostEstimate(
  snapshot: Pick<
    GenerationSnapshot,
    | 'activeTab'
    | 'assets'
    | 'batchSize'
    | 'imageModel'
    | 'outputQuality'
    | 'products'
    | 'subjectMode'
    | 'videoReferences'
    | 'videoDuration'
    | 'videoAudio'
    | 'videoModel'
  > & {
    carouselDraft?: CarouselDraft | null
    motionControl?: MotionControlDraft
  },
  pricingMatrix: KiePricingMatrix | null,
): GenerationCostEstimate {
  if (!pricingMatrix) {
    return unavailableEstimate('Live pricing unavailable.')
  }

  if (snapshot.activeTab === 'motion-control') {
    const motionVideoDurationSeconds = snapshot.motionControl?.motionVideo.durationSeconds
    const motionControlResolution = snapshot.motionControl?.resolution

    if (
      !motionControlResolution ||
      typeof motionVideoDurationSeconds !== 'number' ||
      !Number.isFinite(motionVideoDurationSeconds) ||
      motionVideoDurationSeconds <= 0
    ) {
      return unavailableEstimate('Checking motion video duration.')
    }

    const perSecondRate =
      pricingMatrix.video['kling-3.0-motion-control'][motionControlResolution]

    if (
      !Number.isFinite(perSecondRate.credits) ||
      !Number.isFinite(perSecondRate.usd)
    ) {
      return unavailableEstimate('Live pricing unavailable for Motion Control.')
    }

    return {
      available: true,
      credits: Number((perSecondRate.credits * motionVideoDurationSeconds).toFixed(3)),
      reason: null,
      usd: Number((perSecondRate.usd * motionVideoDurationSeconds).toFixed(3)),
    }
  }

  const hasManualVideoStartReference = snapshot.videoReferences.some((slot) =>
    Boolean(slot.file || slot.previewUrl),
  )
  const hasSupportedFirstFrame =
    supportsVideoFirstLastFramePair(snapshot.videoModel) &&
    Boolean(snapshot.assets.firstFrame.file || snapshot.assets.firstFrame.previewUrl)
  const hasSupportedEndFrame =
    supportsVideoEndFrameGuidance(snapshot.videoModel) &&
    (!supportsVideoFirstLastFramePair(snapshot.videoModel) ||
      Boolean(snapshot.assets.firstFrame.file || snapshot.assets.firstFrame.previewUrl)) &&
    Boolean(snapshot.assets.endFrame.file || snapshot.assets.endFrame.previewUrl)
  const hasManualVideoReference =
    snapshot.videoModel === 'seedance-2-mini' ||
    snapshot.videoModel === 'seedance-2' ||
    snapshot.videoModel === 'kling-3.0'
      ? hasManualVideoStartReference || hasSupportedFirstFrame || hasSupportedEndFrame
      : hasManualVideoStartReference || hasSupportedEndFrame

  let perTaskRate: GenerationCostRate | null = null

  if (snapshot.activeTab === 'image' || snapshot.activeTab === 'carousel') {
    const imageResolution = getImageResolution(snapshot.outputQuality)
    perTaskRate = pricingMatrix.image['nano-banana'][imageResolution] ?? null
  } else if (snapshot.videoModel === 'veo-3.1') {
    const videoResolution = getVideoResolution(snapshot.outputQuality)
    const baseRate = hasManualVideoReference
      ? pricingMatrix.video['veo-3.1'].withReference[videoResolution]
      : pricingMatrix.video['veo-3.1'].promptOnly[videoResolution]
    perTaskRate = multiplyRate(
      baseRate,
      normalizeVideoDurationForModel(snapshot.videoModel, snapshot.videoDuration) / 8,
    )
  } else if (snapshot.videoModel === 'seedance-1.5-pro') {
    const videoResolution = getVideoResolution(snapshot.outputQuality)
    const hasReference = hasManualVideoReference

    perTaskRate = hasReference
      ? pricingMatrix.video['seedance-1.5-pro'].withReference[videoResolution][
          snapshot.videoAudio
        ][snapshot.videoDuration]
      : pricingMatrix.video['seedance-1.5-pro'].promptOnly[videoResolution][
          snapshot.videoAudio
        ][snapshot.videoDuration]
  } else if (snapshot.videoModel === 'grok-imagine-video-1.5') {
    const videoResolution = getGrokResolution(snapshot.outputQuality)

    perTaskRate = hasManualVideoReference
      ? pricingMatrix.video['grok-imagine-video-1.5'].withReference[videoResolution][
          snapshot.videoDuration
        ]
      : pricingMatrix.video['grok-imagine-video-1.5'].promptOnly[videoResolution][
          snapshot.videoDuration
        ]
  } else if (snapshot.videoModel === 'seedance-2-mini') {
    const videoResolution = getSeedance2MiniResolution(snapshot.outputQuality)
    const hasReference = hasManualVideoReference

    perTaskRate = hasReference
      ? pricingMatrix.video['seedance-2-mini'].withReference[videoResolution][
          snapshot.videoAudio
        ][snapshot.videoDuration]
      : pricingMatrix.video['seedance-2-mini'].promptOnly[videoResolution][
          snapshot.videoAudio
        ][snapshot.videoDuration]
  } else if (snapshot.videoModel === 'seedance-2') {
    const videoResolution = getVideoResolution(snapshot.outputQuality)
    const hasReference = hasManualVideoReference

    perTaskRate = hasReference
      ? pricingMatrix.video['seedance-2'].withReference[videoResolution][
          snapshot.videoAudio
        ][snapshot.videoDuration]
      : pricingMatrix.video['seedance-2'].promptOnly[videoResolution][
          snapshot.videoAudio
        ][snapshot.videoDuration]
  } else if (snapshot.videoModel === 'kling-3.0') {
    const videoResolution = getVideoResolution(snapshot.outputQuality)
    const hasReference = hasManualVideoReference

    perTaskRate = hasReference
      ? pricingMatrix.video['kling-3.0'].withReference[videoResolution][
          snapshot.videoAudio
        ][snapshot.videoDuration]
      : pricingMatrix.video['kling-3.0'].promptOnly[videoResolution][
          snapshot.videoAudio
        ][snapshot.videoDuration]
  }

  if (!perTaskRate) {
    return unavailableEstimate('Pricing is not available for this configuration.')
  }

  if (
    !Number.isFinite(perTaskRate.credits) ||
    !Number.isFinite(perTaskRate.usd)
  ) {
    return unavailableEstimate('Live pricing unavailable for this video/audio configuration.')
  }

  if (snapshot.activeTab === 'carousel') {
    const generatedPanelCount = getCarouselGeneratedPanelCount(
      snapshot.carouselDraft,
    )

    return {
      available: true,
      credits: Number((perTaskRate.credits * generatedPanelCount).toFixed(3)),
      reason: null,
      usd: Number((perTaskRate.usd * generatedPanelCount).toFixed(3)),
    }
  }

  return {
    available: true,
    credits: Number((perTaskRate.credits * snapshot.batchSize).toFixed(3)),
    reason: null,
    usd: Number((perTaskRate.usd * snapshot.batchSize).toFixed(3)),
  }
}
