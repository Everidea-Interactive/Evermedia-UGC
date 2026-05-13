import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  KIE_REQUEST_TIMEOUT_MS,
  fetchKieWithTimeout,
  getKieStatus,
  parseGenerationFormData,
  resolveSubmission,
  submitProviderTask,
  submitGenerationRequest,
  uploadFileToKie,
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
  formData.append('videoAudio', 'no-audio')
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

  it('falls back to the default image model for video workspace submissions', () => {
    const formData = buildBaseFormData('1')
    formData.set('workspace', 'video')
    formData.set('imageModel', 'grok-imagine')
    formData.append('assetManifest', '[]')

    const parsed = parseGenerationFormData(formData)

    expect(parsed.workspace).toBe('video')
    expect(parsed.imageModel).toBe('nano-banana')
  })

  it('keeps strict image model validation for image workspace submissions', () => {
    const formData = buildBaseFormData('1')
    formData.set('workspace', 'image')
    formData.set('imageModel', 'grok-imagine')
    formData.append('assetManifest', '[]')

    expect(() => parseGenerationFormData(formData)).toThrow(
      'Invalid value for imageModel.',
    )
  })

  it('ignores invalid video model values for image workspace submissions', () => {
    const formData = buildBaseFormData('1')
    formData.set('workspace', 'image')
    formData.set('videoModel', 'veo-4')
    formData.append('assetManifest', '[]')

    const parsed = parseGenerationFormData(formData)

    expect(parsed.workspace).toBe('image')
    expect(parsed.videoModel).toBe('veo-3.1')
  })

  it('uploads assets once and expands each manual image grid task into four variants', async () => {
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
    expect(response.variants).toHaveLength(12)
    expect(response.variants.map((variant) => variant.taskId)).toEqual([
      'task-1',
      'task-1',
      'task-1',
      'task-1',
      'task-2',
      'task-2',
      'task-2',
      'task-2',
      'task-3',
      'task-3',
      'task-3',
      'task-3',
    ])
    expect(response.variants.map((variant) => variant.index)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
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
            prompt: expect.stringContaining('exactly one clean 2x2 grid'),
            resolution: '2K',
          }),
        }),
      ]),
    )
  })

  it('applies a timeout signal to KIE file uploads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          url: 'https://files.example.com/product.png',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    await uploadFileToKie(
      'test-key',
      new File(['product'], 'product.png', { type: 'image/png' }),
      'image',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://kieai.redpandaai.co/api/file-stream-upload',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it.each([
    [
      'data string',
      {
        success: true,
        code: 200,
        msg: 'File uploaded successfully',
        data: 'https://files.example.com/product.png',
      },
    ],
    [
      'snake case download URL',
      {
        success: true,
        code: 200,
        data: {
          download_url: 'https://files.example.com/product.png',
        },
      },
    ],
    [
      'nested file URL object',
      {
        success: true,
        code: 200,
        data: {
          file: {
            remote_url: 'https://files.example.com/product.png',
          },
        },
      },
    ],
    [
      'URL inside array payload',
      {
        success: true,
        code: 200,
        result: [
          {
            meta: 'uploaded',
          },
          {
            asset: {
              href: 'https://files.example.com/product.png',
            },
          },
        ],
      },
    ],
  ])('accepts KIE upload responses with a %s', async (_label, payload) => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      uploadFileToKie(
        'test-key',
        new File(['product'], 'product.png', { type: 'image/png' }),
        'image',
      ),
    ).resolves.toBe('https://files.example.com/product.png')
  })

  it('prefers canonical downloadUrl over url when both are present in upload payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            downloadUrl: 'https://kieai.redpandaai.co/download/file_abc123456',
            url: 'https://tempfile.redpandaai.co/kieai/tmp-upload.png',
          },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      uploadFileToKie(
        'test-key',
        new File(['product'], 'product.png', { type: 'image/png' }),
        'image',
      ),
    ).resolves.toBe('https://kieai.redpandaai.co/download/file_abc123456')
  })

  it('prefers fileUrl over downloadUrl for base64 image upload responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            downloadUrl: 'https://kieai.redpandaai.co/download/file_abc123456',
            fileUrl: 'https://kieai.redpandaai.co/files/images/my-image.jpg',
          },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const { uploadImageFileToKieBase64 } = await import('../lib/generation/kie')
    await expect(
      uploadImageFileToKieBase64(
        'test-key',
        new File(['product'], 'product.png', { type: 'image/png' }),
      ),
    ).resolves.toBe('https://kieai.redpandaai.co/files/images/my-image.jpg')
  })

  it('normalizes tempfile.redpandaai.co URLs via common download-url for base64 uploads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: {
              downloadUrl:
                'https://tempfile.redpandaai.co/kieai/966458/evermedia-ugc/image/9_000000000256.jpg',
            },
            success: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 200,
            data: 'https://tempfile.1f6cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxbd98',
            msg: 'success',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    vi.stubGlobal('fetch', fetchMock)

    const { uploadImageFileToKieBase64 } = await import('../lib/generation/kie')
    await expect(
      uploadImageFileToKieBase64(
        'test-key',
        new File(['product'], 'product.png', { type: 'image/png' }),
      ),
    ).resolves.toBe('https://tempfile.1f6cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxbd98')
  })

  it('uses canonical /download/<fileId> URL when base64 upload response includes fileId', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            fileId: 'file_abc123456',
            downloadUrl:
              'https://tempfile.redpandaai.co/kieai/966458/evermedia-ugc/image/9_000000000256.jpg',
          },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const { uploadImageFileToKieBase64 } = await import('../lib/generation/kie')
    await expect(
      uploadImageFileToKieBase64(
        'test-key',
        new File(['product'], 'product.png', { type: 'image/png' }),
      ),
    ).resolves.toBe('https://kieai.redpandaai.co/download/file_abc123456')
  })

  it('does not send a fixed fileName in base64 uploads to avoid stale overwrite cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            fileUrl: 'https://kieai.redpandaai.co/files/images/generated-random.jpg',
          },
          success: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const { uploadImageFileToKieBase64 } = await import('../lib/generation/kie')
    await uploadImageFileToKieBase64(
      'test-key',
      new File(['product'], 'product.png', { type: 'image/png' }),
    )

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      base64Data: string
      fileName?: string
      uploadPath: string
    }

    expect(requestBody.base64Data.startsWith('data:image/png;base64,')).toBe(true)
    expect(requestBody.uploadPath).toBe('evermedia-ugc/image')
    expect('fileName' in requestBody).toBe(false)
  })

  it('returns a clear timeout error when a KIE request is aborted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')),
    )

    await expect(
      fetchKieWithTimeout(
        'https://api.kie.ai/test',
        { method: 'POST' },
        'KIE guided analysis',
      ),
    ).rejects.toThrow(
      `KIE guided analysis timed out after ${Math.round(
        KIE_REQUEST_TIMEOUT_MS / 1000,
      )} seconds.`,
    )
  })

  it('surfaces KIE application errors returned without a task ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 422,
          msg: 'input.input_urls is required',
          data: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      submitProviderTask('test-key', {
        endpoint: 'https://api.kie.ai/api/v1/jobs/createTask',
        modelName: 'gpt-image-2-image-to-image',
        provider: 'market',
        requestBody: {
          model: 'gpt-image-2-image-to-image',
          input: {
            prompt: 'Generate a product image',
            input_urls: ['https://files.example.com/product.png'],
          },
        },
      }),
    ).rejects.toThrow('input.input_urls is required')
  })

  it('accepts KIE task identifiers returned as task_id for GPT Image 2 calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            task_id: 'gpt2-task-1',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const taskId = await submitProviderTask('test-key', {
      endpoint: 'https://api.kie.ai/api/v1/jobs/createTask',
      modelName: 'gpt-image-2-text-to-image',
      provider: 'market',
      requestBody: {
        model: 'gpt-image-2-text-to-image',
        input: {
          prompt: 'Generate a product image',
        },
      },
    })

    expect(taskId).toBe('gpt2-task-1')
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
    expect(taskRequests[0].input.prompt).not.toContain('exactly one clean 2x2 grid')
  })

  it('accepts guided video metadata and submits edited prompts through the video provider', async () => {
    const formData = buildBaseFormData('2')
    const heroFile = new File(['product'], 'product.png', { type: 'image/png' })
    const endFrameFile = new File(['end'], 'end.png', { type: 'image/png' })

    formData.append('experience', 'guided')
    formData.set('workspace', 'video')
    formData.set('videoModel', 'veo-3.1')
    formData.set('videoDuration', 'extended')
    formData.set('cameraMovement', 'dolly')
    formData.set('creativeStyle', 'tv-commercial')
    formData.set('subjectMode', 'product-only')
    formData.set('shotEnvironment', 'indoor')
    formData.append('guidedSummary', 'Guided video summary')
    formData.append('guidedContentConcept', 'driven-ads')
    formData.append('analysisModel', 'gemini-2.5-flash')
    formData.append('productUrl', 'https://example.com/product')
    formData.append(
      'guidedShots',
      JSON.stringify([
        {
          prompt: 'Video prompt 1',
          shotEnvironment: 'indoor',
          slug: 'shot-1',
          subjectMode: 'product-only',
          tags: ['hero'],
          title: 'Shot 1',
        },
        {
          prompt: 'Video prompt 2',
          shotEnvironment: 'outdoor',
          slug: 'shot-2',
          subjectMode: 'lifestyle',
          tags: ['motion'],
          title: 'Shot 2',
        },
      ]),
    )
    formData.set(
      'assetManifest',
      JSON.stringify([
        {
          fieldName: 'asset_endFrame',
          kind: 'named',
          key: 'endFrame',
          label: 'End Frame',
          order: 4,
        },
        {
          fieldName: 'product_guided_hero',
          kind: 'product',
          label: 'Hero Product',
          order: 100,
          productId: 'guided-hero',
        },
      ]),
    )
    formData.append('asset_endFrame', endFrameFile)
    formData.append('product_guided_hero', heroFile)

    const fetchMock = vi.fn()

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          url: 'https://files.example.com/end.png',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
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
            taskId: 'video-task-1',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            taskId: 'video-task-2',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const parsedRequest = parseGenerationFormData(formData)
    const response = await submitGenerationRequest(parsedRequest)

    expect(parsedRequest.experience).toBe('guided')
    expect(parsedRequest.workspace).toBe('video')
    expect(parsedRequest.batchSize).toBe(1)
    expect(parsedRequest.guided?.summary).toBe('Guided video summary')
    expect(response.workspace).toBe('video')
    expect(response.model).toBe('veo3_fast')
    expect(response.provider).toBe('veo')
    expect(response.variants.map((variant) => variant.taskId)).toEqual(['video-task-1'])

    const taskRequests = fetchMock.mock.calls
      .filter(([url]) => String(url).includes('/api/v1/veo/generate'))
      .map(([, init]) => JSON.parse(String(init?.body)))

    expect(taskRequests).toEqual([
      expect.objectContaining({
        generationType: 'FIRST_AND_LAST_FRAMES_2_VIDEO',
        imageUrls: [
          'https://files.example.com/product.png',
          'https://files.example.com/end.png',
        ],
        prompt: 'Video prompt 1',
      }),
    ])
  })

  it('builds Seedance 1.5 Pro video payloads with model-specific duration and references', () => {
    const submission = resolveSubmission({
      assets: [
        makeUploadedAsset({
          fieldName: 'asset_endFrame',
          key: 'endFrame',
          label: 'End Frame',
          order: 4,
          remoteUrl: 'https://files.example.com/end.png',
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
      prompt: 'Create a polished product motion clip.',
      subjectMode: 'product-only',
      videoDuration: 'extended',
      videoAudio: 'no-audio',
      videoModel: 'seedance-1.5-pro',
      workspace: 'video',
    })

    expect(submission.endpoint).toContain('/api/v1/jobs/createTask')
    expect(submission.modelName).toBe('bytedance/seedance-1.5-pro')
    expect(submission.provider).toBe('market')
    expect(submission.requestBody).toMatchObject({
      model: 'bytedance/seedance-1.5-pro',
      input: {
        aspect_ratio: '16:9',
        duration: '12',
        fixed_lens: false,
        generate_audio: false,
        input_urls: [
          'https://files.example.com/product.png',
          'https://files.example.com/end.png',
        ],
        nsfw_checker: false,
        prompt: 'Create a polished product motion clip.',
        resolution: '1080p',
      },
    })
  })

  it('uses all uploaded references for grok image-to-video payloads', () => {
    const submission = resolveSubmission({
      assets: [
        makeUploadedAsset({
          fieldName: 'asset_face1',
          key: 'face1',
          label: 'Face 1',
          order: 0,
          remoteUrl: 'https://files.example.com/face-1.png',
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
      ],
      cameraMovement: null,
      creativeStyle: 'ugc-lifestyle',
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      prompt: 'Create a polished product motion clip.',
      subjectMode: 'lifestyle',
      videoDuration: 'base',
      videoAudio: 'no-audio',
      videoModel: 'grok-imagine',
      workspace: 'video',
    })

    expect(submission.requestBody).toMatchObject({
      model: 'grok-imagine/image-to-video',
      input: {
        image_urls: [
          'https://files.example.com/face-1.png',
          'https://files.example.com/clothing.png',
          'https://files.example.com/location.png',
        ],
      },
    })
  })

  it('uses all uploaded references for kling image-to-video payloads', () => {
    const submission = resolveSubmission({
      assets: [
        makeUploadedAsset({
          fieldName: 'product_slot_1',
          kind: 'product',
          label: 'Product 1',
          order: 100,
          productId: 'product-1',
          remoteUrl: 'https://files.example.com/product.png',
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
      ],
      cameraMovement: null,
      creativeStyle: 'ugc-lifestyle',
      imageModel: 'nano-banana',
      outputQuality: '1080p',
      productCategory: 'cosmetics',
      prompt: 'Create a polished product motion clip.',
      subjectMode: 'product-only',
      videoDuration: 'base',
      videoAudio: 'with-audio',
      videoModel: 'kling',
      workspace: 'video',
    })

    expect(submission.requestBody).toMatchObject({
      model: 'kling-2.6/image-to-video',
      input: {
        image_urls: [
          'https://files.example.com/product.png',
          'https://files.example.com/clothing.png',
          'https://files.example.com/location.png',
        ],
        sound: true,
      },
    })
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
      videoAudio: 'no-audio',
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
        resolution: '2K',
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
      videoAudio: 'no-audio',
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
      videoAudio: 'no-audio',
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
      videoAudio: 'no-audio',
      videoModel: 'veo-3.1',
      workspace: 'image',
    })

    expect(submission.modelName).toBe('nano-banana-2')
    expect(submission.requestBody).toMatchObject({
      model: 'nano-banana-2',
      input: {
        prompt: expect.stringContaining(
          'Create exactly one clean 2x2 grid image',
        ),
        image_input: [],
        aspect_ratio: '1:1',
        resolution: '4K',
        output_format: 'png',
        google_search: false,
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

