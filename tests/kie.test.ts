import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  getKieStatus,
  parseGenerationFormData,
  submitGenerationRequest,
} from '../lib/generation/kie'

function buildBaseFormData(batchSize: string) {
  const formData = new FormData()

  formData.append('workspace', 'image')
  formData.append('imageModel', 'nano-banana')
  formData.append('videoModel', 'veo-3.1')
  formData.append('productCategory', 'cosmetics')
  formData.append('creativeStyle', 'ugc-lifestyle')
  formData.append('subjectMode', 'lifestyle')
  formData.append('batchSize', batchSize)
  formData.append('textPrompt', 'Create a polished hero campaign image.')
  formData.append('videoDuration', 'base')
  formData.append('outputQuality', '1080p')
  formData.append('cameraMovement', '')

  return formData
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

    expect(response.uploadedAssets).toHaveLength(1)
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
