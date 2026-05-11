// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/components/i18n/locale-provider'
import { LibraryPage } from '@/components/library/library-page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

describe('LibraryPage', () => {
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

  it('shows the account tag on saved sessions', async () => {
    render(
      <LibraryPage
        accountTag="owner@example.com"
        ideations={[]}
        outputs={[
          {
            output: {
              createdAt: '2026-05-12T00:00:00.000Z',
              fileSize: 1024,
              id: 'output-1',
              label: 'Output 1',
              mimeType: 'image/png',
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
              provider: 'kie',
              status: 'completed',
              workspace: 'product',
            },
            variant: {
              completedAt: '2026-05-12T00:00:05.000Z',
              createdAt: '2026-05-12T00:00:00.000Z',
              error: null,
              id: 'variant-1',
              profile: 'profile',
              prompt: 'prompt',
              status: 'completed',
              taskId: 'task-1',
              variantIndex: 1,
            },
          },
        ]}
      />,
    )

    expect(await screen.findByText('owner@example.com')).toBeTruthy()
  })

  it('shows the account tag in briefs view', async () => {
    render(
      <LibraryPage
        accountTag="owner@example.com"
        ideations={[
          {
            createdAt: '2026-05-12T00:00:00.000Z',
            id: 'ideation-1',
            inputSnapshot: {
              analysisModel: 'KIE-ai',
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
              ],
              summary: 'Test summary',
            },
            userId: 'user-1',
          },
        ]}
        outputs={[]}
      />,
    )

    screen.getByRole('button', { name: 'Saved ideation' }).click()
    expect(await screen.findAllByText('owner@example.com')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete brief' })).toBeTruthy()
  })
})
