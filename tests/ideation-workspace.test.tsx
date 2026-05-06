// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/components/i18n/locale-provider'
import { IdeationWorkspace } from '@/components/dashboard/ideation-workspace'
import { useGenerationStore } from '@/store/use-generation-store'

const outputLanguageLabel = /Output Language|Bahasa Output/i
const productUrlLabel = /Product URL|URL Produk/i
const analyzeIdeationButtonLabel = /Analyze Content Ideation|Analisis Ideasi Konten/i

function renderIdeationWorkspace(locale: 'en' | 'id') {
  return render(
    <LocaleProvider locale={locale}>
      <IdeationWorkspace />
    </LocaleProvider>,
  )
}

describe('IdeationWorkspace', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    useGenerationStore.getState().disposeGenerationState()
  })

  afterEach(() => {
    cleanup()
    useGenerationStore.getState().disposeGenerationState()
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('defaults the ideation output language to the active app locale', async () => {
    renderIdeationWorkspace('id')

    await waitFor(() => {
      expect(
        (screen.getByLabelText(outputLanguageLabel) as HTMLSelectElement).value,
      ).toBe('id')
    })

    expect(useGenerationStore.getState().ideationInput.outputLanguage).toBe('id')
  })

  it('translates ideation helper copy and subtext when the active locale is Indonesian', async () => {
    renderIdeationWorkspace('id')

    expect(
      await screen.findByText(
        'Mengatur bahasa yang digunakan dalam brief ideasi yang dihasilkan.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText('Pilih bias strategis sebelum ideasi dijalankan.'),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Tambahkan minimal satu sumber materi. Ideasi bisa berjalan dari gambar utama, URL produk, atau keduanya.',
      ),
    ).toBeTruthy()
  })

  it('submits the selected ideation output language to the analyze endpoint', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        result: {
          concepts: [
            {
              angle: 'Angle 1',
              audience: 'Audience 1',
              cta: 'CTA 1',
              hook: 'Hook 1',
              keyMessage: 'Message 1',
              title: 'Concept 1',
              visualDirection: 'Visual 1',
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
          summary: 'Three ideation concepts.',
        },
      }),
      ok: true,
    } as Response)

    renderIdeationWorkspace('id')

    fireEvent.change(screen.getByLabelText(productUrlLabel), {
      target: { value: 'https://example.com/product' },
    })
    fireEvent.change(screen.getByLabelText(outputLanguageLabel), {
      target: { value: 'en' },
    })

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: analyzeIdeationButtonLabel }),
      )
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, request] = fetchMock.mock.calls[0]
    expect(request).toBeDefined()
    const formData = request?.body as FormData

    expect(formData.get('outputLanguage')).toBe('en')
  })
})
