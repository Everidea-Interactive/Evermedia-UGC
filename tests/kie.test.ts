import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  getKieStatus,
  parseGenerationFormData,
  resolveSubmission,
  submitGenerationRequest,
} from '../lib/generation/kie'
import type { UploadedAssetDescriptor } from '../lib/generation/types'

function buildBaseFormData(batchSize: string) {
  const formData = new FormData()

  formData.append('workspace', 'image')
  formData.append('imageModel', 'nano-banana')
  formData.append('videoModel', 'veo-3.1')
  formData.append('productCategory', 'cosmetics')
  formData.append('creativeStyle', 'ugc-lifestyle')
  formData.append('subjectMode', 'lifestyle')
  formData.append('shotEnvironment', 'indoor')
  formData.append('characterGender', 'any')
  formData.append('characterAgeGroup', 'any')
  formData.append('figureArtDirection', 'none')
  formData.append('batchSize', batchSize)
  formData.append('textPrompt', 'Create a polished hero campaign image.')
  formData.append('videoDuration', 'base')
  formData.append('outputQuality', '1080p')
  formData.append('cameraMovement', '')

  return formData
}

function makeUploadedAsset(
  overrides: Partial<UploadedAssetDescriptor> = {},
): UploadedAssetDescriptor {
  return {
    fieldName: 'asset_face1',
    kind: 'named',
    key: 'face1',
    label: 'Face 1',
    order: 0,
    remoteUrl: 'https://files.example.com/face-1.png',
    ...overrides,
  }
}

describe('KIE batch submission', () => {
  beforeEach(() => {
    process.env.KIE_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.KIE_API_KEY
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('rejects invalid batch sizes during form parsing', () => {
    const formData = buildBaseFormData('5')
    formData.append('assetManifest', '[]')

    expect(() => parseGenerationFormData(formData)).toThrow(
      'Batch size must be between 1 and 4.',
    )
  })

  it('parses the expanded preset fields', () => {
    const formData = buildBaseFormData('1')
    formData.set('productCategory', 'miscellaneous')
    formData.set('creativeStyle', 'elite-product-commercial')
    formData.set('shotEnvironment', 'outdoor')
    formData.set('characterGender', 'female')
    formData.set('characterAgeGroup', 'young-adult')
    formData.set('figureArtDirection', 'curvaceous-editorial')
    formData.append('assetManifest', '[]')

    const parsed = parseGenerationFormData(formData)

    expect(parsed.productCategory).toBe('miscellaneous')
    expect(parsed.creativeStyle).toBe('elite-product-commercial')
    expect(parsed.shotEnvironment).toBe('outdoor')
    expect(parsed.characterGender).toBe('female')
    expect(parsed.characterAgeGroup).toBe('young-adult')
    expect(parsed.figureArtDirection).toBe('curvaceous-editorial')
    expect(parsed.experience).toBe('manual')
  })

  it('rejects invalid environment values during form parsing', () => {
    const formData = buildBaseFormData('1')
    formData.set('shotEnvironment', 'space')
    formData.append('assetManifest', '[]')

    expect(() => parseGenerationFormData(formData)).toThrow(
      'Invalid value for shotEnvironment.',
    )
  })

  it('uploads assets once and submits one provider task per variation', async () => {
    const formData = buildBaseFormData('3')
    const faceFile = new File(['face'], 'face.png', { type: 'image/png' })

    formData.append(
      'assetManifest',
      JSON.stringify([
        {
          fieldName: 'asset_face1',
          kind: 'named',
          key: 'face1',
          label: 'Face 1',
          order: 0,
        },
      ]),
    )
    formData.append('asset_face1', faceFile)

    const fetchMock = vi.fn()

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          url: 'https://files.example.com/face-1.png',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    for (let index = 1; index <= 3; index += 1) {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              taskId: `task-${index}`,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
    }

    vi.stubGlobal('fetch', fetchMock)

    const parsedRequest = parseGenerationFormData(formData)
    const response = await submitGenerationRequest(parsedRequest)

    expect(response.status).toBe('rendering')
    expect(response.variants).toHaveLength(3)
    expect(response.variants.map((variant) => variant.taskId)).toEqual([
      'task-1',
      'task-2',
      'task-3',
    ])
    expect(response.variants.every((variant) => variant.status === 'rendering')).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/api/v1/jobs/createTask'),
      ),
    ).toHaveLength(3)

    const taskRequests = fetchMock.mock.calls
      .filter(([url]) => String(url).includes('/api/v1/jobs/createTask'))
      .map(([, init]) => JSON.parse(String(init?.body)))

    expect(taskRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          model: 'nano-banana-2',
          input: expect.objectContaining({
            aspect_ratio: '2:3',
            google_search: false,
            image_input: ['https://files.example.com/face-1.png'],
            output_format: 'png',
            resolution: '1K',
          }),
        }),
      ]),
    )
  })

  it('parses guided shot metadata and submits the edited guided prompts directly', async () => {
    const formData = buildBaseFormData('2')
    const heroFile = new File(['product'], 'product.png', { type: 'image/png' })

    formData.append('experience', 'guided')
    formData.set('creativeStyle', 'tv-commercial')
    formData.set('subjectMode', 'product-only')
    formData.set('shotEnvironment', 'indoor')
    formData.append('guidedSummary', 'Guided summary')
    formData.append('guidedContentConcept', 'driven-ads')
    formData.append('analysisModel', 'gemini-2.5-flash')
    formData.append('productUrl', 'https://example.com/product')
    formData.append(
      'guidedShots',
      JSON.stringify([
        {
          prompt: 'Prompt 1',
          shotEnvironment: 'indoor',
          slug: 'shot-1',
          subjectMode: 'product-only',
          tags: ['hero'],
          title: 'Shot 1',
        },
        {
          prompt: 'Prompt 2',
          shotEnvironment: 'outdoor',
          slug: 'shot-2',
          subjectMode: 'lifestyle',
          tags: ['lifestyle'],
          title: 'Shot 2',
        },
      ]),
    )
    formData.set(
      'assetManifest',
      JSON.stringify([
        {
          fieldName: 'product_guided_hero',
          kind: 'product',
          label: 'Hero Product',
          order: 100,
          productId: 'guided-hero',
        },
      ]),
    )
    formData.append('product_guided_hero', heroFile)

    const fetchMock = vi.fn()

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          url: 'https://files.example.com/product.png',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            taskId: 'task-1',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            taskId: 'task-2',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const parsedRequest = parseGenerationFormData(formData)
    const response = await submitGenerationRequest(parsedRequest)

    expect(parsedRequest.experience).toBe('guided')
    expect(parsedRequest.guided?.summary).toBe('Guided summary')
    expect(response.variants.map((variant) => variant.profile)).toEqual([
      'Shot 1',
      'Shot 2',
    ])

    const taskRequests = fetchMock.mock.calls
      .filter(([url]) => String(url).includes('/api/v1/jobs/createTask'))
      .map(([, init]) => JSON.parse(String(init?.body)))

    expect(taskRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: expect.stringContaining('Prompt 1'),
          }),
        }),
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: expect.stringContaining('Prompt 2'),
          }),
        }),
      ]),
    )
  })

  it('uses Nano Banana 2 image inputs for uploaded supporting references', () => {
    const submission = resolveSubmission({
      assets: [
        makeUploadedAsset({
          fieldName: 'asset_clothing',
          key: 'clothing',
          label: 'Clothing',
          order: 2,
          remoteUrl: 'https://files.example.com/clothing.png',
        }),
        makeUploadedAsset({
          fieldName: 'asset_location',
          key: 'location',
          label: 'Location',
          order: 3,
          remoteUrl: 'https://files.example.com/location.png',
        }),
      ],
      cameraMovement: null,
      creativeStyle: 'ugc-lifestyle',
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      prompt: 'Create a polished hero campaign image.',
      subjectMode: 'lifestyle',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
      workspace: 'image',
    })

    expect(submission.modelName).toBe('nano-banana-2')
    expect(submission.requestBody).toMatchObject({
      model: 'nano-banana-2',
      input: {
        prompt: expect.stringContaining(
          'Image 1 (Clothing) Use it only for wardrobe and styling cues. Ignore any face in this image.',
        ),
        aspect_ratio: '2:3',
        google_search: false,
        image_input: [
          'https://files.example.com/clothing.png',
          'https://files.example.com/location.png',
        ],
        output_format: 'png',
        resolution: '1K',
      },
    })
  })

  it('prioritizes identity and product references for nano-banana and caps to three images', () => {
    const submission = resolveSubmission({
      assets: [
        makeUploadedAsset(),
        makeUploadedAsset({
          fieldName: 'asset_face2',
          key: 'face2',
          label: 'Face 2',
          order: 1,
          remoteUrl: 'https://files.example.com/face-2.png',
        }),
        makeUploadedAsset({
          fieldName: 'asset_clothing',
          key: 'clothing',
          label: 'Clothing',
          order: 2,
          remoteUrl: 'https://files.example.com/clothing.png',
        }),
        makeUploadedAsset({
          fieldName: 'asset_location',
          key: 'location',
          label: 'Location',
          order: 3,
          remoteUrl: 'https://files.example.com/location.png',
        }),
        makeUploadedAsset({
          fieldName: 'product_slot_1',
          kind: 'product',
          label: 'Product 1',
          order: 100,
          productId: 'product-1',
          remoteUrl: 'https://files.example.com/product.png',
        }),
      ],
      cameraMovement: null,
      creativeStyle: 'ugc-lifestyle',
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      prompt: 'Create a polished hero campaign image.',
      subjectMode: 'lifestyle',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
      workspace: 'image',
    })

    expect(submission.requestBody).toMatchObject({
      model: 'nano-banana-2',
      input: {
        prompt: expect.stringContaining(
          'Image 1 (Face 1) This is the identity anchor. Preserve the same person and facial likeness.',
        ),
        image_input: [
          'https://files.example.com/face-1.png',
          'https://files.example.com/product.png',
          'https://files.example.com/clothing.png',
        ],
      },
    })
  })

  it('treats face2 as the identity anchor when it is the only face reference for nano-banana', () => {
    const submission = resolveSubmission({
      assets: [
        makeUploadedAsset({
          fieldName: 'asset_face2',
          key: 'face2',
          label: 'Face 2',
          order: 1,
          remoteUrl: 'https://files.example.com/face-2.png',
        }),
      ],
      cameraMovement: null,
      creativeStyle: 'ugc-lifestyle',
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      prompt: 'Create a polished hero campaign image.',
      subjectMode: 'lifestyle',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
      workspace: 'image',
    })

    expect(submission.requestBody).toMatchObject({
      model: 'nano-banana-2',
      input: {
        prompt: expect.stringContaining(
          'Image 1 (Face 2) This is the identity anchor. Preserve the same person and facial likeness.',
        ),
        image_input: ['https://files.example.com/face-2.png'],
      },
    })
  })

  it('uses Nano Banana 2 for text-only image generation without switching models', () => {
    const submission = resolveSubmission({
      assets: [],
      cameraMovement: null,
      creativeStyle: 'ugc-lifestyle',
      imageModel: 'nano-banana',
      outputQuality: '4k',
      productCategory: 'cosmetics',
      prompt: 'Create a polished hero campaign image.',
      subjectMode: 'product-only',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
      workspace: 'image',
    })

    expect(submission.modelName).toBe('nano-banana-2')
    expect(submission.requestBody).toMatchObject({
      model: 'nano-banana-2',
      input: {
        prompt: 'Create a polished hero campaign image.',
        image_input: [],
        aspect_ratio: '1:1',
        resolution: '2K',
        output_format: 'png',
        google_search: false,
      },
    })
  })

  it('uses the first available uploaded reference for grok image edits and tags the prompt', () => {
    const submission = resolveSubmission({
      assets: [
        makeUploadedAsset({
          fieldName: 'asset_clothing',
          key: 'clothing',
          label: 'Clothing',
          order: 2,
          remoteUrl: 'https://files.example.com/clothing.png',
        }),
      ],
      cameraMovement: null,
      creativeStyle: 'ugc-lifestyle',
      imageModel: 'grok-imagine',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      prompt: 'Create a polished hero campaign image.',
      subjectMode: 'lifestyle',
      videoDuration: 'base',
      videoModel: 'veo-3.1',
      workspace: 'image',
    })

    expect(submission.modelName).toBe('grok-imagine/image-to-image')
    expect(submission.requestBody).toMatchObject({
      model: 'grok-imagine/image-to-image',
      input: {
        prompt: '@image1 Create a polished hero campaign image.',
        image_urls: ['https://files.example.com/clothing.png'],
      },
    })
  })
})

describe('KIE status', () => {
  afterEach(() => {
    delete process.env.KIE_API_KEY
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('normalizes credit balance from the primary chat-credit endpoint', async () => {
    process.env.KIE_API_KEY = 'test-key'
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 200,
          data: 1234,
          msg: 'success',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const status = await getKieStatus()

    expect(status.connected).toBe(true)
    expect(status.credits).toBe(1234)
    expect(status.source).toBe('chat-credit')
  })

  it('falls back to the user-credits endpoint when the primary endpoint fails', async () => {
    process.env.KIE_API_KEY = 'test-key'
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: 'Not Found',
          }),
          { status: 404, statusText: 'Not Found' },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              balance: 88,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    vi.stubGlobal('fetch', fetchMock)

    const status = await getKieStatus()

    expect(status.connected).toBe(true)
    expect(status.credits).toBe(88)
    expect(status.source).toBe('user-credits')
  })

  it('returns a safe disconnected payload when the API key is missing', async () => {
    const status = await getKieStatus()

    expect(status.connected).toBe(false)
    expect(status.credits).toBeNull()
    expect(status.error).toContain('KIE_API_KEY')
  })
})
