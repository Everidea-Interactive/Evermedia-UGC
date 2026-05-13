// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { GuidedWorkspace } from '@/components/dashboard/guided-workspace'
import { LocaleProvider } from '@/components/i18n/locale-provider'
import { useGenerationStore } from '@/store/use-generation-store'

afterEach(() => {
  cleanup()
  useGenerationStore.getState().disposeGenerationState()
})

describe('GuidedWorkspace', () => {
  it('only exposes active guided video generation models', async () => {
    await act(async () => {
      useGenerationStore.getState().setActiveTab('video')
    })

    render(
      <GuidedWorkspace
        isPricingLoading={false}
        kiePricing={null}
        kiePricingError={null}
        kieStatus={{
          connected: true,
          credits: 100,
          error: null,
          fetchedAt: null,
          source: 'chat-credit',
        }}
      />,
    )

    const videoModelSelect = await screen.findByLabelText('Video model')
    const options = Array.from(videoModelSelect.querySelectorAll('option')).map(
      (option) => option.textContent?.trim(),
    )

    expect(options).toEqual(['Seedance 1.5 Pro', 'Veo 3.1'])
    expect(options).not.toContain('Grok Imagine')
    expect(options).not.toContain('Kling')
  })

  it('translates guided analyze, plan, and results copy when the active locale is Indonesian', async () => {
    await act(async () => {
      useGenerationStore.getState().setActiveTab('image')
    })

    render(
      <LocaleProvider locale="id">
        <GuidedWorkspace
          isPricingLoading={false}
          kiePricing={null}
          kiePricingError={null}
          kieStatus={{
            connected: true,
            credits: 100,
            error: null,
            fetchedAt: null,
            source: 'chat-credit',
          }}
        />
      </LocaleProvider>,
    )

    expect(await screen.findByText('Analisis input')).toBeTruthy()
    expect(screen.getByText('Reset mode terpandu')).toBeTruthy()
    expect(screen.getByText('Unggah Gambar')).toBeTruthy()
    expect(
      screen.getByText(
        'Unggah gambar produk utama, tambahkan konteks halaman bila perlu, lalu buat daftar shot awal sebelum mengedit prompt.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Tambahan konteks opsional untuk judul halaman, deskripsi, dan schema produk.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Jumlah shot')).toBeTruthy()
    expect(
      screen.getByText('Pilih model analisis yang paling pas untuk tahap perencanaan.'),
    ).toBeTruthy()
    expect(screen.getByText('Buat batch terpandu')).toBeTruthy()
    expect(screen.getByText('Kualitas hasil')).toBeTruthy()

    const planTab = screen.getByRole('tab', { name: 'Rencana' })
    fireEvent.mouseDown(planTab)
    fireEvent.click(planTab)

    expect(await screen.findByText('Belum ada set prompt terpandu')).toBeTruthy()
    expect(
      screen.getByText(
        'Jalankan analisis terpandu dulu. Daftar shot akan muncul di sini dan bisa langsung Anda edit.',
      ),
    ).toBeTruthy()

    const resultsTab = screen.getByRole('tab', { name: 'Hasil' })
    fireEvent.mouseDown(resultsTab)
    fireEvent.click(resultsTab)

    expect(await screen.findByText('Belum ada batch terpandu')).toBeTruthy()
    expect(
      screen.getByText(
        'Analisis produknya, rapikan prompt-nya, lalu render batch terpandu untuk mengisi grid ini.',
      ),
    ).toBeTruthy()
  })
})
