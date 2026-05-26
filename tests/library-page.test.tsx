// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/components/i18n/locale-provider'
import { LibraryPage } from '@/components/library/library-page'
import { useGenerationStore } from '@/store/use-generation-store'

const refreshMock = vi.fn()
const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

describe('LibraryPage', () => {
  beforeEach(async () => {
    refreshMock.mockReset()
    pushMock.mockReset()
    vi.unstubAllGlobals()

    await act(async () => {
      useGenerationStore.getState().resetGenerationState()
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('forwards a saved image result into the manual video workspace', async () => {
    const forwardedFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            configSnapshot: {
              activeTab: 'image',
              batchSize: 2,
              cameraMovement: 'dolly',
              characterAgeGroup: 'adult',
              characterGender: 'female',
              creativeStyle: 'cinematic',
              experience: 'manual',
              figureArtDirection: 'curvaceous-editorial',
              guided: null,
              imageModel: 'nano-banana',
              outputQuality: '4k',
              productCategory: 'jewelry',
              shotEnvironment: 'outdoor',
              subjectMode: 'lifestyle',
              textPrompt: 'Recovered preset prompt',
              videoAudio: 'no-audio',
              videoDuration: 'base',
              videoModel: 'veo-3.1',
            },
            run: {
              runId: 'run-1',
              status: 'success',
            },
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response('library-forward', {
          headers: {
            'Content-Disposition': 'attachment; filename="library-forward.png"',
            'Content-Type': 'image/png',
          },
          status: 200,
        }),
      )

    vi.stubGlobal('fetch', forwardedFetch)

    await act(async () => {
      useGenerationStore.getState().resetGenerationState()
      useGenerationStore.getState().setActiveTab('image')
      useGenerationStore.getState().setExperience('manual')
    })

    render(
      <LibraryPage
        ideations={[]}
        outputs={[
          {
            output: {
              createdAt: '2026-05-12T00:00:00.000Z',
              fileSize: 1024,
              id: 'output-1',
              label: 'Output 1',
              mimeType: 'image/png',
              ownerEmail: 'owner-1@example.com',
              originalName: 'output-1.png',
              runId: 'run-1',
              storagePath: '/tmp/output-1.png',
              userId: 'user-1',
            },
            run: {
              completedAt: null,
              createdAt: '2026-05-12T00:00:00.000Z',
              id: 'run-1',
              model: 'model-a',
              promptSnapshot: 'sample prompt',
              provider: 'market',
              status: 'success',
              workspace: 'image',
            },
            variant: {
              completedAt: '2026-05-12T00:00:05.000Z',
              createdAt: '2026-05-12T00:00:00.000Z',
              error: null,
              id: 'variant-1',
              profile: 'profile',
              prompt: 'prompt',
              status: 'success',
              taskId: 'task-1',
              variantIndex: 1,
            },
          },
        ]}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Forward to Video' }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/')
      expect(forwardedFetch).toHaveBeenCalledWith('/api/generation/runs/run-1', {
        cache: 'no-store',
      })
      expect(forwardedFetch).toHaveBeenCalledWith('/api/media/output-1?download=1', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
    })

    const state = useGenerationStore.getState()
    expect(state.activeTab).toBe('video')
    expect(state.experience).toBe('manual')
    expect(state.creativeStyle).toBe('cinematic')
    expect(state.productCategory).toBe('jewelry')
    expect(state.cameraMovement).toBe('dolly')
    expect(state.textPrompt).toBe('Recovered preset prompt')
    expect(state.outputQuality).toBe('1080p')
    expect(state.videoReferences[0]?.file?.name).toBe('library-forward.png')
    expect(state.videoReferences[1]?.file).toBeNull()
  })

  it('translates library archive copy when the active locale is Indonesian', async () => {
    render(
      <LocaleProvider locale="id">
        <LibraryPage ideations={[]} outputs={[]} />
      </LocaleProvider>,
    )

    expect(await screen.findByText('Library')).toBeTruthy()
    expect(screen.getAllByText('Media tersimpan').length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        'Belum ada set media tersimpan. Hasil generasi yang selesai akan muncul di sini.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Belum ada media tersimpan untuk set media ini.')).toBeTruthy()
  })

  it('shows the owner tag on saved sessions', async () => {
    render(
      <LibraryPage
        ideations={[]}
        outputs={[
          {
            output: {
              createdAt: '2026-05-12T00:00:00.000Z',
              fileSize: 1024,
              id: 'output-1',
              label: 'Output 1',
              mimeType: 'image/png',
              ownerEmail: 'owner-1@example.com',
              originalName: 'output-1.png',
              runId: 'run-1',
              storagePath: '/tmp/output-1.png',
              userId: 'user-1',
            },
            run: {
              completedAt: null,
              createdAt: '2026-05-12T00:00:00.000Z',
              id: 'run-1',
              model: 'model-a',
              promptSnapshot: 'sample prompt',
              provider: 'market',
              status: 'success',
              workspace: 'image',
            },
            variant: {
              completedAt: '2026-05-12T00:00:05.000Z',
              createdAt: '2026-05-12T00:00:00.000Z',
              error: null,
              id: 'variant-1',
              profile: 'profile',
              prompt: 'prompt',
              status: 'success',
              taskId: 'task-1',
              variantIndex: 1,
            },
          },
          {
            output: {
              createdAt: '2026-05-13T00:00:00.000Z',
              fileSize: 1024,
              id: 'output-2',
              label: 'Output 2',
              mimeType: 'image/png',
              ownerEmail: 'owner-2@example.com',
              originalName: 'output-2.png',
              runId: 'run-2',
              storagePath: '/tmp/output-2.png',
              userId: 'user-2',
            },
            run: {
              completedAt: null,
              createdAt: '2026-05-13T00:00:00.000Z',
              id: 'run-2',
              model: 'model-b',
              promptSnapshot: 'sample prompt 2',
              provider: 'market',
              status: 'success',
              workspace: 'image',
            },
            variant: {
              completedAt: '2026-05-13T00:00:05.000Z',
              createdAt: '2026-05-13T00:00:00.000Z',
              error: null,
              id: 'variant-2',
              profile: 'profile 2',
              prompt: 'prompt 2',
              status: 'success',
              taskId: 'task-2',
              variantIndex: 1,
            },
          },
        ]}
      />,
    )

    expect(await screen.findByText('owner-1@example.com')).toBeTruthy()
    expect(screen.getAllByText('owner-2@example.com').length).toBeGreaterThan(0)
  })

  it('shows the owner tag in briefs view', async () => {
    render(
      <LibraryPage
        ideations={[
          {
            createdAt: '2026-05-12T00:00:00.000Z',
            id: 'ideation-1',
            inputSnapshot: {
              analysisModel: 'gemini-2.5-flash',
              briefText: 'Short brief',
              contentConcept: 'affiliate',
              contentFormat: 'photos',
              heroImageName: null,
              heroImageUrl: null,
              outputLanguage: 'en',
              productUrl: null,
            },
            result: {
              concepts: [
                {
                  angle: 'Angle',
                  audience: 'Audience',
                  cta: 'CTA',
                  hook: 'Hook',
                  keyMessage: 'Message',
                  title: 'Concept 1',
                  visualDirection: 'Visual',
                },
                {
                  angle: 'Angle 2',
                  audience: 'Audience 2',
                  cta: 'CTA 2',
                  hook: 'Hook 2',
                  keyMessage: 'Message 2',
                  title: 'Concept 2',
                  visualDirection: 'Visual 2',
                },
                {
                  angle: 'Angle 3',
                  audience: 'Audience 3',
                  cta: 'CTA 3',
                  hook: 'Hook 3',
                  keyMessage: 'Message 3',
                  title: 'Concept 3',
                  visualDirection: 'Visual 3',
                },
              ],
              summary: 'Test summary',
            },
            ownerEmail: 'owner-1@example.com',
            userId: 'user-1',
          },
          {
            createdAt: '2026-05-13T00:00:00.000Z',
            id: 'ideation-2',
            inputSnapshot: {
              analysisModel: 'gemini-2.5-flash',
              briefText: 'Short brief 2',
              contentConcept: 'affiliate',
              contentFormat: 'photos',
              heroImageName: null,
              heroImageUrl: null,
              outputLanguage: 'en',
              productUrl: null,
            },
            result: {
              concepts: [
                {
                  angle: 'Angle',
                  audience: 'Audience',
                  cta: 'CTA',
                  hook: 'Hook',
                  keyMessage: 'Message',
                  title: 'Concept 1',
                  visualDirection: 'Visual',
                },
                {
                  angle: 'Angle 2',
                  audience: 'Audience 2',
                  cta: 'CTA 2',
                  hook: 'Hook 2',
                  keyMessage: 'Message 2',
                  title: 'Concept 2',
                  visualDirection: 'Visual 2',
                },
                {
                  angle: 'Angle 3',
                  audience: 'Audience 3',
                  cta: 'CTA 3',
                  hook: 'Hook 3',
                  keyMessage: 'Message 3',
                  title: 'Concept 3',
                  visualDirection: 'Visual 3',
                },
              ],
              summary: 'Test summary 2',
            },
            ownerEmail: 'owner-2@example.com',
            userId: 'user-2',
          },
        ]}
        outputs={[]}
      />,
    )

    screen.getByRole('button', { name: 'Saved ideation' }).click()
    expect(await screen.findAllByText('owner-1@example.com')).toBeTruthy()
    expect(screen.getAllByText('owner-2@example.com').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Delete brief' }).length).toBeGreaterThan(0)
  })
})
