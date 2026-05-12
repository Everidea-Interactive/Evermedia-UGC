import {
  choosePrimaryReferenceSlot,
  getImageResolution,
  getGrokDuration,
  getGrokResolution,
  getKlingDuration,
  getSeedanceDuration,
  getVideoResolution,
  hasVeoReferenceSlot,
} from '@/lib/generation/model-mapping'
import type {
  GenerationCostEstimate,
  GenerationCostRate,
  GenerationSnapshot,
  KiePricingMatrix,
  VideoAudio,
  VideoResolution,
  VideoDuration,
} from '@/lib/generation/types'

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

function unavailableRate(): GenerationCostRate {
  return {
    credits: Number.NaN,
    usd: Number.NaN,
  }
}

export function buildKiePricingMatrix(input: {
  grokRecords: KiePricingApiRecord[]
  gptImageRecords?: KiePricingApiRecord[]
  klingRecords: KiePricingApiRecord[]
  nanoRecords: KiePricingApiRecord[]
  seedance15Override?: {
    promptOnly: Record<VideoResolution, Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>>
    withReference: Record<VideoResolution, Record<VideoAudio, Record<VideoDuration, GenerationCostRate>>>
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
        findRecord(input.grokRecords, 'grok-imagine, image-to-video, 480p'),
      ),
      '720p': parseRate(
        findRecord(input.grokRecords, 'grok-imagine, image-to-video, 720p'),
      ),
    },
    'text-to-video': {
      '480p': parseRate(
        findRecord(input.grokRecords, 'grok-imagine, text-to-video, 480p'),
      ),
      '720p': parseRate(
        findRecord(input.grokRecords, 'grok-imagine, text-to-video, 720p'),
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
    'image-to-video': parseRate(
      findRecord(input.veoRecords, 'Google veo 3.1, image-to-video, Fast'),
    ),
    'text-to-video': parseRate(
      findRecord(input.veoRecords, 'Google veo 3.1, text-to-video, Fast'),
    ),
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

  const videoQualities: VideoResolution[] = ['720p', '1080p']
  const videoDurations: VideoDuration[] = ['base', 'extended']
  const grokPricingByInputMode = {
    promptOnly: grokVideoRatesByInput['text-to-video'],
    withReference: grokVideoRatesByInput['image-to-video'],
  }

  const grokVideoMatrix = {
    promptOnly: {} as KiePricingMatrix['video']['grok-imagine']['promptOnly'],
    withReference: {} as KiePricingMatrix['video']['grok-imagine']['withReference'],
  }

  for (const mode of ['promptOnly', 'withReference'] as const) {
    for (const quality of videoQualities) {
      const resolution = getGrokResolution(quality)
      const perSecondRate = grokPricingByInputMode[mode][resolution]
      grokVideoMatrix[mode][quality] = {
        base: multiplyRate(
          perSecondRate,
          Number.parseInt(getGrokDuration('base'), 10),
        ),
        extended: multiplyRate(
          perSecondRate,
          Number.parseInt(getGrokDuration('extended'), 10),
        ),
      }
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

  if (!input.seedance15Override && seedanceRatesByInput) {
    for (const duration of videoDurations) {
      const durationSeconds = Number.parseInt(getSeedanceDuration(duration), 10)

      for (const quality of ['720p', '1080p'] as const) {
        const promptOnlyDurationRate = multiplyRate(
          seedanceRatesByInput.promptOnly[quality],
          durationSeconds,
        )
        const withReferenceDurationRate = multiplyRate(
          seedanceRatesByInput.withReference[quality],
          durationSeconds,
        )
        seedanceMatrix.promptOnly[quality] = {
          'no-audio': {
            ...(seedanceMatrix.promptOnly[quality]?.['no-audio'] ?? {}),
            [duration]: promptOnlyDurationRate,
          },
          'with-audio': {
            ...(seedanceMatrix.promptOnly[quality]?.['with-audio'] ?? {}),
            [duration]: promptOnlyDurationRate,
          },
        }
        seedanceMatrix.withReference[quality] = {
          'no-audio': {
            ...(seedanceMatrix.withReference[quality]?.['no-audio'] ?? {}),
            [duration]: withReferenceDurationRate,
          },
          'with-audio': {
            ...(seedanceMatrix.withReference[quality]?.['with-audio'] ?? {}),
            [duration]: withReferenceDurationRate,
          },
        }
      }
    }
  }

  if (!input.seedance15Override && !seedanceRatesByInput) {
    for (const quality of ['720p', '1080p'] as const) {
      seedanceMatrix.promptOnly[quality] = {
        'no-audio': {
          base: unavailableRate(),
          extended: unavailableRate(),
        },
        'with-audio': {
          base: unavailableRate(),
          extended: unavailableRate(),
        },
      }
      seedanceMatrix.withReference[quality] = {
        'no-audio': {
          base: unavailableRate(),
          extended: unavailableRate(),
        },
        'with-audio': {
          base: unavailableRate(),
          extended: unavailableRate(),
        },
      }
    }
  }

  for (const duration of videoDurations) {
    const durationKey = getKlingDuration(duration)

    klingMatrix.promptOnly['no-audio'] = {
      ...(klingMatrix.promptOnly['no-audio'] ?? {}),
      [duration]: klingRatesByInput['text-to-video'][durationKey]['no-audio'],
    }
    klingMatrix.promptOnly['with-audio'] = {
      ...(klingMatrix.promptOnly['with-audio'] ?? {}),
      [duration]: klingRatesByInput['text-to-video'][durationKey]['with-audio'],
    }
    klingMatrix.withReference['no-audio'] = {
      ...(klingMatrix.withReference['no-audio'] ?? {}),
      [duration]: klingRatesByInput['image-to-video'][durationKey]['no-audio'],
    }
    klingMatrix.withReference['with-audio'] = {
      ...(klingMatrix.withReference['with-audio'] ?? {}),
      [duration]: klingRatesByInput['image-to-video'][durationKey]['with-audio'],
    }
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
      'grok-imagine': grokVideoMatrix,
      kling: klingMatrix,
      'veo-3.1': {
        promptOnly: veoRates['text-to-video'],
        withReference: veoRates['image-to-video'],
      },
      'seedance-1.5-pro': seedanceMatrix,
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
    | 'videoDuration'
    | 'videoAudio'
    | 'videoModel'
  >,
  pricingMatrix: KiePricingMatrix | null,
): GenerationCostEstimate {
  if (!pricingMatrix) {
    return unavailableEstimate('Live pricing unavailable.')
  }

  let perTaskRate: GenerationCostRate | null = null

  if (snapshot.activeTab === 'image') {
    const imageResolution = getImageResolution(snapshot.outputQuality)
    perTaskRate = pricingMatrix.image['nano-banana'][imageResolution] ?? null
  } else if (snapshot.videoModel === 'veo-3.1') {
    perTaskRate = hasVeoReferenceSlot({
      assets: snapshot.assets,
      products: snapshot.products,
      subjectMode: snapshot.subjectMode,
    })
      ? pricingMatrix.video['veo-3.1'].withReference
      : pricingMatrix.video['veo-3.1'].promptOnly
  } else if (snapshot.videoModel === 'kling') {
    const hasReference = Boolean(
      choosePrimaryReferenceSlot({
        assets: snapshot.assets,
        products: snapshot.products,
        subjectMode: snapshot.subjectMode,
      }),
    )

    perTaskRate = hasReference
      ? pricingMatrix.video.kling.withReference[snapshot.videoAudio][snapshot.videoDuration]
      : pricingMatrix.video.kling.promptOnly[snapshot.videoAudio][snapshot.videoDuration]
  } else if (snapshot.videoModel === 'seedance-1.5-pro') {
    const videoResolution = getVideoResolution(snapshot.outputQuality)
    const hasReference = Boolean(
      choosePrimaryReferenceSlot({
        assets: snapshot.assets,
        products: snapshot.products,
        subjectMode: snapshot.subjectMode,
      }),
    )

    perTaskRate = hasReference
      ? pricingMatrix.video['seedance-1.5-pro'].withReference[videoResolution][
          snapshot.videoAudio
        ][snapshot.videoDuration]
      : pricingMatrix.video['seedance-1.5-pro'].promptOnly[videoResolution][
          snapshot.videoAudio
        ][snapshot.videoDuration]
  } else {
    const videoResolution = getVideoResolution(snapshot.outputQuality)
    const hasReference = Boolean(
      choosePrimaryReferenceSlot({
        assets: snapshot.assets,
        products: snapshot.products,
        subjectMode: snapshot.subjectMode,
      }),
    )

    perTaskRate = hasReference
      ? pricingMatrix.video['grok-imagine'].withReference[videoResolution][
          snapshot.videoDuration
        ]
      : pricingMatrix.video['grok-imagine'].promptOnly[videoResolution][
          snapshot.videoDuration
        ]
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

  return {
    available: true,
    credits: Number((perTaskRate.credits * snapshot.batchSize).toFixed(3)),
    reason: null,
    usd: Number((perTaskRate.usd * snapshot.batchSize).toFixed(3)),
  }
}
