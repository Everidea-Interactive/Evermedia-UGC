// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GuidedWorkspace } from '@/components/dashboard/guided-workspace'
import { LocaleProvider } from '@/components/i18n/locale-provider'
import { useGenerationStore } from '@/store/use-generation-store'

afterEach(() => {
  cleanup()
  useGenerationStore.getState().disposeGenerationState()
})

describe('GuidedWorkspace', () => {
  it('uses the shared manual workspace section and preview sizing tokens', async () => {
    const { workspacePreviewMinHeightClassName, workspaceSectionClassName } = await import(
      '@/components/dashboard/manual-workspace-ui'
    )

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

    const analyzeHeading = await screen.findByText('Analyze input')
    const analyzeSection = analyzeHeading.closest('section')

    expect(analyzeSection?.className).toContain(workspaceSectionClassName)

    // The "Upload Image" button is a direct child of the preview flex container,
    // so closest('div') reliably reaches the outer container with min-height tokens.
    const uploadBtn = screen.getByRole('button', { name: 'Upload Image' })
    expect(uploadBtn.closest('div')?.className).toContain(
      workspacePreviewMinHeightClassName,
    )
  })

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

    expect(options).toEqual(['Seedance 1.5 Pro', 'Seedance 2.0', 'Veo 3.1'])
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

  it('forwards a successful guided image result into guided video re-analysis', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('guided-forward', {
          headers: {
            'Content-Disposition': 'attachment; filename="guided-forward.png"',
            'Content-Type': 'image/png',
          },
          status: 200,
        }),
      ),
    )

    await act(async () => {
      useGenerationStore.getState().setExperience('guided')
      useGenerationStore.getState().setActiveTab('image')
      useGenerationStore.getState().setGuidedPlan({
        creativeStyle: 'ugc-lifestyle',
        productCategory: 'cosmetics',
        shots: [
          {
            prompt: 'Prompt 1',
            shotEnvironment: 'indoor',
            slug: 'prompt-1',
            subjectMode: 'product-only',
            tags: [],
            title: 'Prompt 1',
          },
        ],
        summary: 'Summary',
      })
      useGenerationStore.getState().updateGenerationRun({
        experience: 'guided',
        runId: 'guided-image-run',
        status: 'success',
        workspace: 'image',
      })
      useGenerationStore.getState().setGenerationVariants([
        {
          completedAt: null,
          createdAt: null,
          error: null,
          index: 1,
          profile: 'Shot 1',
          prompt: 'Prompt 1',
          result: {
            model: 'nano-banana',
            taskId: 'task-1',
            type: 'image',
            url: '/api/media/guided-output-1',
          },
          status: 'success',
          taskId: 'task-1',
          variantId: 'variant-1',
        },
      ])
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

    const resultsTab = await screen.findByRole('tab', { name: 'Results' })
    fireEvent.mouseDown(resultsTab)
    fireEvent.click(resultsTab)

    fireEvent.click(await screen.findByRole('button', { name: 'Forward to Video' }))

    expect(await screen.findByText('Analyze input')).toBeTruthy()

    const state = useGenerationStore.getState()
    expect(state.experience).toBe('guided')
    expect(state.activeTab).toBe('video')
    expect(state.guidedInput.heroAsset.file?.name).toBe('guided-forward.png')
    expect(state.guidedPlan).toBeNull()
    expect(state.analysisStatus).toBe('idle')
  })
})
