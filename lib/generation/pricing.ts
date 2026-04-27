import {
  choosePrimaryReferenceSlot,
  getGrokDuration,
  getGrokResolution,
  getKlingDuration,
  getNanoBananaResolution,
  getSeedanceDuration,
  hasVeoReferenceSlot,
} from '@/lib/generation/model-mapping'
import type {
  GenerationCostEstimate,
  GenerationCostRate,
  GenerationSnapshot,
  KiePricingMatrix,
  OutputQuality,
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

export function buildKiePricingMatrix(input: {
  grokRecords: KiePricingApiRecord[]
  klingRecords: KiePricingApiRecord[]
  nanoRecords: KiePricingApiRecord[]
  seedanceRecords: KiePricingApiRecord[]
  veoRecords: KiePricingApiRecord[]
}): KiePricingMatrix {
  const nanoRatesByResolution = {
    '1K': parseRate(
      findRecord(input.nanoRecords, 'Google nano banana 2, 1K'),
    ),
    '2K': parseRate(
      findRecord(input.nanoRecords, 'Google nano banana 2, 2K'),
    ),
  }
  const grokImageRates = {
    'image-to-image': parseRate(
      findRecord(input.grokRecords, 'grok-imagine, image-to-image'),
    ),
    'text-to-image': parseRate(
      findRecord(input.grokRecords, 'grok-imagine, text-to-image'),
    ),
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
      '10': parseRate(
        findRecord(
          input.klingRecords,
          'kling 2.6, image-to-video, without audio-10.0s',
        ),
      ),
      '5': parseRate(
        findRecord(
          input.klingRecords,
          'kling 2.6, image-to-video, without audio-5.0s',
        ),
      ),
    },
    'text-to-video': {
      '10': parseRate(
        findRecord(
          input.klingRecords,
          'kling 2.6, text-to-video, without audio-10.0s',
        ),
      ),
      '5': parseRate(
        findRecord(
          input.klingRecords,
          'kling 2.6, text-to-video, without audio-5.0s',
        ),
      ),
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
  const seedanceRatesByInput = {
    withReference: {
      '720p': parseRate(
        findFirstRecord(input.seedanceRecords, [
          'bytedance/seedance-1.5-pro, 720p with video input',
          'bytedance/seedance-2, 720p with video input',
        ]),
      ),
      '1080p': parseRate(
        findFirstRecord(input.seedanceRecords, [
          'bytedance/seedance-1.5-pro, 1080p with video input',
          'bytedance/seedance-2, 1080p with video input',
        ]),
      ),
    },
    promptOnly: {
      '720p': parseRate(
        findFirstRecord(input.seedanceRecords, [
          'bytedance/seedance-1.5-pro, 720p no video input',
          'bytedance/seedance-2, 720p no video input',
        ]),
      ),
      '1080p': parseRate(
        findFirstRecord(input.seedanceRecords, [
          'bytedance/seedance-1.5-pro, 1080p no video input',
          'bytedance/seedance-2, 1080p no video input',
        ]),
      ),
    },
  }

  const imageQualities: OutputQuality[] = ['720p', '1080p', '4k']
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
    for (const quality of imageQualities) {
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
  const seedanceMatrix = {
    promptOnly:
      {} as KiePricingMatrix['video']['seedance-1.5-pro']['promptOnly'],
    withReference:
      {} as KiePricingMatrix['video']['seedance-1.5-pro']['withReference'],
  }

  for (const duration of videoDurations) {
    const durationSeconds = Number.parseInt(getSeedanceDuration(duration), 10)

    for (const quality of ['720p', '1080p'] as const) {
      seedanceMatrix.promptOnly[quality] = {
        ...seedanceMatrix.promptOnly[quality],
        [duration]: multiplyRate(
          seedanceRatesByInput.promptOnly[quality],
          durationSeconds,
        ),
      }
      seedanceMatrix.withReference[quality] = {
        ...seedanceMatrix.withReference[quality],
        [duration]: multiplyRate(
          seedanceRatesByInput.withReference[quality],
          durationSeconds,
        ),
      }
    }
  }

  for (const duration of videoDurations) {
    const durationKey = getKlingDuration(duration)

    klingMatrix.promptOnly[duration] =
      klingRatesByInput['text-to-video'][durationKey]
    klingMatrix.withReference[duration] =
      klingRatesByInput['image-to-video'][durationKey]
  }

  return {
    image: {
      'grok-imagine': {
        promptOnly: grokImageRates['text-to-image'],
        withReference: grokImageRates['image-to-image'],
      },
      'nano-banana': {
        '720p': nanoRatesByResolution[getNanoBananaResolution('720p')],
        '1080p': nanoRatesByResolution[getNanoBananaResolution('1080p')],
        '4k': nanoRatesByResolution[getNanoBananaResolution('4k')],
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
    | 'videoModel'
  >,
  pricingMatrix: KiePricingMatrix | null,
): GenerationCostEstimate {
  if (!pricingMatrix) {
    return unavailableEstimate('Live pricing unavailable.')
  }

  let perTaskRate: GenerationCostRate | null = null

  if (snapshot.activeTab === 'image') {
    if (snapshot.imageModel === 'nano-banana') {
      perTaskRate =
        pricingMatrix.image['nano-banana'][snapshot.outputQuality] ?? null
    } else {
      const hasReference = Boolean(
        choosePrimaryReferenceSlot({
          assets: snapshot.assets,
          products: snapshot.products,
          subjectMode: snapshot.subjectMode,
        }),
      )

      perTaskRate = hasReference
        ? pricingMatrix.image['grok-imagine'].withReference
        : pricingMatrix.image['grok-imagine'].promptOnly
    }
  } else if (snapshot.videoModel === 'veo-3.1') {
    if (snapshot.outputQuality === '4k') {
      return unavailableEstimate('4K Veo upgrades are not enabled.')
    }

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
      ? pricingMatrix.video.kling.withReference[snapshot.videoDuration]
      : pricingMatrix.video.kling.promptOnly[snapshot.videoDuration]
  } else if (snapshot.videoModel === 'seedance-1.5-pro') {
    if (snapshot.outputQuality === '4k') {
      return unavailableEstimate('4K Seedance 1.5 Pro output is not supported.')
    }

    const hasReference = Boolean(
      choosePrimaryReferenceSlot({
        assets: snapshot.assets,
        products: snapshot.products,
        subjectMode: snapshot.subjectMode,
      }),
    )

    perTaskRate = hasReference
      ? pricingMatrix.video['seedance-1.5-pro'].withReference[
          snapshot.outputQuality
        ][snapshot.videoDuration]
      : pricingMatrix.video['seedance-1.5-pro'].promptOnly[
          snapshot.outputQuality
        ][snapshot.videoDuration]
  } else {
    const hasReference = Boolean(
      choosePrimaryReferenceSlot({
        assets: snapshot.assets,
        products: snapshot.products,
        subjectMode: snapshot.subjectMode,
      }),
    )

    perTaskRate = hasReference
      ? pricingMatrix.video['grok-imagine'].withReference[snapshot.outputQuality][
          snapshot.videoDuration
        ]
      : pricingMatrix.video['grok-imagine'].promptOnly[snapshot.outputQuality][
          snapshot.videoDuration
        ]
  }

  if (!perTaskRate) {
    return unavailableEstimate('Pricing is not available for this configuration.')
  }

  return {
    available: true,
    credits: Number((perTaskRate.credits * snapshot.batchSize).toFixed(3)),
    reason: null,
    usd: Number((perTaskRate.usd * snapshot.batchSize).toFixed(3)),
  }
}
