// @vitest-environment jsdom

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/components/i18n/locale-provider'

const workspaceMountCounts = vi.hoisted(() => ({
  guided: 0,
  ideation: 0,
}))

const originalRequestAnimationFrame = globalThis.requestAnimationFrame
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame

vi.mock('next/dynamic', async () => {
  const React = await import('react')

  return {
    default: (load: () => Promise<unknown>) => {
      return function DynamicComponent(props: Record<string, unknown>) {
        const [LoadedComponent, setLoadedComponent] =
          React.useState<null | ((props: Record<string, unknown>) => React.ReactNode)>(
            null,
          )

        React.useEffect(() => {
          let isCancelled = false

          void load().then((module) => {
            if (!isCancelled) {
              setLoadedComponent(() => module as typeof LoadedComponent)
            }
          })

          return () => {
            isCancelled = true
          }
        }, [])

        return LoadedComponent ? <LoadedComponent {...props} /> : null
      }
    },
  }
})

vi.mock('@/lib/generation/use-kie-pricing', () => ({
  useKiePricing: () => ({
    error: null,
    isLoading: false,
    pricing: null,
  }),
}))

vi.mock('@/lib/generation/use-kie-status', () => ({
  useKieStatus: () => ({
    error: null,
    isLoading: false,
    refreshStatus: async () => undefined,
    status: {
      credits: null,
      error: null,
      provider: null,
      refreshedAt: null,
    },
  }),
}))

vi.mock('@/components/dashboard/guided-workspace', () => ({
  GuidedWorkspace: () => {
    workspaceMountCounts.guided += 1
    return <div>guided-workspace</div>
  },
}))

vi.mock('@/components/dashboard/guided-workspace-shell', () => ({
  GuidedWorkspaceShell: () => {
    workspaceMountCounts.guided += 1
    return <div>guided-workspace</div>
  },
}))

vi.mock('@/components/dashboard/ideation-workspace', () => ({
  IdeationWorkspace: () => {
    workspaceMountCounts.ideation += 1
    return <div>ideation-workspace</div>
  },
}))

afterEach(async () => {
  cleanup()
  workspaceMountCounts.guided = 0
  workspaceMountCounts.ideation = 0
  globalThis.requestAnimationFrame = originalRequestAnimationFrame
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame
  if (typeof URL.revokeObjectURL !== 'function') {
    URL.revokeObjectURL = () => undefined
  }

  const { useGenerationStore } = await import('@/store/use-generation-store')
  useGenerationStore.getState().disposeGenerationState()
})

describe('StudioWorkspace', () => {
  it('preserves preloaded video staging across a strict-mode studio mount', async () => {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(0), 0)
    globalThis.cancelAnimationFrame = (handle: number) => {
      window.clearTimeout(handle)
    }

    const { StudioWorkspace } = await import('@/components/dashboard/studio-workspace')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    await act(async () => {
      useGenerationStore.getState().forwardManualImageResultToVideo(
        new File(['forwarded'], 'forwarded.png', { type: 'image/png' }),
      )
    })

    render(
      <StrictMode>
        <StudioWorkspace />
      </StrictMode>,
    )

    await screen.findByRole('tab', { name: 'References' })

    const state = useGenerationStore.getState()
    expect(state.activeTab).toBe('video')
    expect(state.experience).toBe('manual')
    expect(state.videoReferences[0]?.file?.name).toBe('forwarded.png')
  })

  it('preserves generation state when switching away from manual and only disposes on studio unmount', async () => {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(0), 0)
    globalThis.cancelAnimationFrame = (handle: number) => {
      window.clearTimeout(handle)
    }

    const { StudioWorkspace } = await import('@/components/dashboard/studio-workspace')
    const { useGenerationStore } = await import('@/store/use-generation-store')
    const { unmount } = render(<StudioWorkspace />)

    expect(screen.getByText('Manual')).toBeTruthy()
    await screen.findByText('References')

    await act(async () => {
      useGenerationStore.getState().setTextPrompt('persistent draft')
      useGenerationStore.getState().setExperience('guided')
    })

    await screen.findByText('guided-workspace')
    expect(useGenerationStore.getState().experience).toBe('guided')
    expect(useGenerationStore.getState().textPrompt).toBe('persistent draft')

    unmount()

    await waitFor(() => {
      expect(useGenerationStore.getState().experience).toBe('manual')
      expect(useGenerationStore.getState().textPrompt).toBe('')
    })
  })

  it('returns the same section regardless of active tab', async () => {
    const { normalizeManualSection } = await import(
      '@/components/dashboard/dashboard-shell'
    )

    expect(normalizeManualSection('outputs')).toBe('outputs')
    expect(normalizeManualSection('references')).toBe('references')
    expect(normalizeManualSection('setup')).toBe('setup')
  })

  it('renders the manual shell without mounting guided or ideation workspaces', async () => {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(0), 0)
    globalThis.cancelAnimationFrame = (handle: number) => {
      window.clearTimeout(handle)
    }

    const { StudioWorkspace } = await import('@/components/dashboard/studio-workspace')

    render(<StudioWorkspace />)

    expect(screen.getByText('Manual')).toBeTruthy()
    await screen.findByText('References')
    expect(screen.queryByText('guided-workspace')).toBeNull()
    expect(screen.queryByText('ideation-workspace')).toBeNull()
    expect(workspaceMountCounts.guided).toBe(0)
    expect(workspaceMountCounts.ideation).toBe(0)
  })

  it('hides the reference board when another manual section is selected', async () => {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(0), 0)
    globalThis.cancelAnimationFrame = (handle: number) => {
      window.clearTimeout(handle)
    }

    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')

    render(
      <DashboardShell
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

    await screen.findByText('Build the input set')

    const presetTab = screen.getByRole('tab', { name: 'Preset' })
    fireEvent.mouseDown(presetTab)
    fireEvent.click(presetTab)

    expect(screen.queryByText('Build the input set')).toBeNull()
  })

  it('switches to outputs when a manual generation run starts rendering', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    render(
      <DashboardShell
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

    expect(await screen.findByText('Build the input set')).toBeTruthy()

    await act(async () => {
      useGenerationStore.getState().updateGenerationRun({
        experience: 'manual',
        runId: 'manual-run-start',
        startedAt: Date.now(),
        status: 'rendering',
        workspace: 'image',
      })
    })

    expect(await screen.findByText('Render output')).toBeTruthy()
  })

  it('renders each empty reference card label only once', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')

    render(
      <DashboardShell
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

    await screen.findByText('Build the input set')

    expect(screen.getAllByText('Face 2')).toHaveLength(1)
    expect(screen.getAllByText('Product 1')).toHaveLength(1)
    expect(screen.getAllByText('Location')).toHaveLength(1)
  })

  it('reveals manual video reference cards progressively up to the selected model limit', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    await act(async () => {
      useGenerationStore.getState().setActiveTab('video')
    })

    render(
      <DashboardShell
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

    await screen.findByText('Build the input set')

    expect(screen.getAllByText('Reference 1')).toHaveLength(1)
    expect(screen.queryByText('Reference 2')).toBeNull()
    expect(screen.queryByText('Reference 3')).toBeNull()
    expect(screen.queryByText('People')).toBeNull()
    expect(screen.queryByText('Style & Environment')).toBeNull()
    expect(screen.queryByText('Products')).toBeNull()

    await act(async () => {
      useGenerationStore.getState().setVideoReferenceFile(
        'video-reference-1',
        new File(['ref-1'], 'ref-1.png', { type: 'image/png' }),
      )
    })

    expect(await screen.findByText('Reference 2')).toBeTruthy()
    expect(screen.queryByText('Reference 3')).toBeNull()

    await act(async () => {
      useGenerationStore.getState().setVideoReferenceFile(
        'video-reference-2',
        new File(['ref-2'], 'ref-2.png', { type: 'image/png' }),
      )
    })

    expect(await screen.findByText('Reference 3')).toBeTruthy()
    expect(screen.getAllByText('End Frame')).toHaveLength(1)
  })

  it('keeps Seedance manual video references capped to two visible cards', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    await act(async () => {
      useGenerationStore.getState().setActiveTab('video')
      useGenerationStore.getState().setVideoModel('seedance-1.5-pro')
      useGenerationStore.getState().setVideoReferenceFile(
        'video-reference-1',
        new File(['ref-1'], 'ref-1.png', { type: 'image/png' }),
      )
      useGenerationStore.getState().setVideoReferenceFile(
        'video-reference-2',
        new File(['ref-2'], 'ref-2.png', { type: 'image/png' }),
      )
    })

    render(
      <DashboardShell
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

    await screen.findByText('Build the input set')

    expect(screen.queryAllByText('Reference 1').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Reference 2').length).toBeGreaterThan(0)
    expect(screen.queryByText('Reference 3')).toBeNull()
    expect(screen.queryByText('End Frame')).toBeNull()
  })

  it('shows the End Frame card for Seedance 2.0 manual video mode', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    await act(async () => {
      useGenerationStore.getState().setActiveTab('video')
      useGenerationStore.getState().setVideoModel('seedance-2')
    })

    render(
      <DashboardShell
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

    await screen.findByText('Build the input set')

    expect(screen.queryAllByText('Reference 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('First Frame')).toHaveLength(1)
    expect(screen.queryByText('End Frame')).toBeNull()
  })

  it('shows only first-frame guidance cards for Kling 3.0 manual video mode', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    await act(async () => {
      useGenerationStore.getState().setActiveTab('video')
      useGenerationStore.getState().setVideoModel('kling-3.0')
    })

    render(
      <DashboardShell
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

    await screen.findByText('Build the input set')

    expect(screen.queryByText('Reference 1')).toBeNull()
    expect(screen.getAllByText('First Frame')).toHaveLength(1)
    expect(screen.queryByText('End Frame')).toBeNull()
  })

  it('only reveals the Seedance 2.0 End Frame card after the First Frame is staged', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    await act(async () => {
      useGenerationStore.getState().setActiveTab('video')
      useGenerationStore.getState().setVideoModel('seedance-2')
    })

    render(
      <DashboardShell
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

    await screen.findByText('Build the input set')

    expect(screen.getAllByText('First Frame')).toHaveLength(1)
    expect(screen.queryByText('End Frame')).toBeNull()

    await act(async () => {
      useGenerationStore.getState().setNamedAssetFile(
        'firstFrame',
        new File(['first'], 'first.png', { type: 'image/png' }),
      )
    })

    expect(await screen.findByText('End Frame')).toBeTruthy()
  })

  it('shows a single clip-length option for Veo 3.1', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    await act(async () => {
      useGenerationStore.getState().setActiveTab('video')
      useGenerationStore.getState().setVideoModel('veo-3.1')
    })

    render(
      <DashboardShell
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

    await screen.findByText('Review and run generation')

    const durationSelect = screen.getByLabelText('Video Duration')
    const options = Array.from(durationSelect.querySelectorAll('option')).map((option) =>
      option.textContent?.trim(),
    )

    expect(options).toEqual(['8s'])
  })

  it('keeps motion-control setup summary to asset-only fields', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    const referenceImage = new File(['image'], 'reference.png', { type: 'image/png' })
    const motionVideo = new File(['video'], 'motion.mp4', { type: 'video/mp4' })

    await act(async () => {
      const store = useGenerationStore.getState()
      store.setActiveTab('motion-control')
      store.setMotionControlReferenceImageFile(referenceImage)
      store.setMotionControlMotionVideoFile(motionVideo)
      store.setMotionControlResolution('1080p')
    })

    render(
      <DashboardShell
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

    await screen.findByText('Review and run generation')

    expect(screen.getByText('Primary input')).toBeTruthy()
    expect(screen.getByText('Staged assets')).toBeTruthy()
    expect(screen.queryByText('Model')).toBeNull()
    expect(screen.queryByText('Resolution')).toBeNull()
    expect(screen.queryByText('Category')).toBeNull()
    expect(screen.queryByText('Style')).toBeNull()
    expect(screen.queryByText('Subject')).toBeNull()
    expect(screen.queryByText('Environment')).toBeNull()
    expect(screen.queryByText('Casting')).toBeNull()
    expect(screen.queryByText('Camera')).toBeNull()
  })

  it('only exposes active manual video generation models', async () => {
    const { videoModels } = await import(
      '@/components/dashboard/manual-workspace-config'
    )

    expect(videoModels.map((model) => model.value)).toEqual([
      'seedance-2',
      'seedance-1.5-pro',
      'veo-3.1',
    ])
    expect(videoModels.map((model) => model.label)).not.toContain('Grok Imagine')
    expect(videoModels.map((model) => model.label)).not.toContain('Kling')
  })

  it('keeps reference cards readable on mobile without wrapping the file CTA', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')

    const { container } = render(
      <DashboardShell
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

    await screen.findByText('Build the input set')

    const groupGrid = screen.getByText('People').nextElementSibling
    const firstCard = container.querySelector('.reference-card')
    const fileCta = screen
      .getAllByText('Choose file')[0]
      ?.closest('.reference-upload-chip')

    expect(groupGrid?.className).toContain('grid-cols-1')
    expect(groupGrid?.className).toContain('sm:grid-cols-2')
    expect(firstCard?.className).toContain('min-h-[14rem]')
    expect(firstCard?.className).toContain('sm:aspect-square')
    expect(fileCta?.className).toContain('whitespace-nowrap')
  })

  it('translates manual workspace subtext when the active locale is Indonesian', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')

    render(
      <LocaleProvider locale="id">
        <DashboardShell
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

    expect(await screen.findByText('Siapkan materi input')).toBeTruthy()
    expect(
      screen.getByText(
        'Kumpulkan semua materi visual di sini terlebih dahulu. Biarkan susunannya tetap rapi agar orang, styling, lokasi, dan produk mudah ditinjau.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Orang')).toBeTruthy()
    expect(screen.getAllByText('Unggah gambar atau video').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pilih file').length).toBeGreaterThan(0)
  })

  it('translates review, preset (including motion), and output helper copy when the active locale is Indonesian', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    await act(async () => {
      useGenerationStore.getState().setActiveTab('video')
      useGenerationStore.getState().setVideoModel('seedance-1.5-pro')
    })

    render(
      <LocaleProvider locale="id">
        <DashboardShell
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

    expect(await screen.findByText('Panel ringkasan')).toBeTruthy()
    expect(screen.getByText('Workspace video')).toBeTruthy()
    expect(
      screen.getByText(
        'Periksa pengaturannya, pilih model dan batch, lalu mulai generate.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText('Pilihan model yang sudah disesuaikan untuk workspace ini.'),
    ).toBeTruthy()
    expect(screen.getByText('Generasi video ByteDance 8d atau 12d pro')).toBeTruthy()

    const presetTab = screen.getByRole('tab', { name: 'Preset' })
    fireEvent.mouseDown(presetTab)
    fireEvent.click(presetTab)

    expect(await screen.findByText('Susun preset generasi')).toBeTruthy()
    expect(
      screen.getByText(
        'Atur preset dasarnya lebih dulu, lalu tambahkan arahan bebas jika perlu.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Visual lifestyle dengan seseorang yang berinteraksi alami dengan produk.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Makanan & Minuman')).toBeTruthy()
    expect(screen.getByText('Bahasa pergerakan')).toBeTruthy()
    expect(
      screen.getByText(
        'Pergerakan kamera diperlakukan sebagai pengubah prompt terstruktur.',
      ),
    ).toBeTruthy()

    const outputsTab = screen.getByRole('tab', { name: 'Output' })
    fireEvent.mouseDown(outputsTab)
    fireEvent.click(outputsTab)

    expect(await screen.findByText('Hasil render')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Buka Library' })).toBeTruthy()
    expect(await screen.findByText('Belum ada referensi media yang dimuat')).toBeTruthy()
    expect(
      screen.getByText(
        'Siapkan papan referensi terlebih dahulu, atau gunakan brief tertulis jika Anda hanya ingin generate dari prompt.',
      ),
    ).toBeTruthy()
  })

  it('does not keep the upload spinner visible after a reference preview exists', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    await act(async () => {
      const state = useGenerationStore.getState()
      useGenerationStore.setState({
        assets: {
          ...state.assets,
          face1: {
            ...state.assets.face1,
            file: new File(['face'], 'face.png', { type: 'image/png' }),
            mimeType: 'image/png',
            previewUrl: 'blob:face-preview',
            size: 4,
            uploadStatus: 'staged',
          },
        },
      })
    })

    const { container } = render(
      <DashboardShell
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

    await screen.findByText('Ready')

    const faceCard = container.querySelector('.reference-card')

    expect(faceCard?.querySelector('.animate-spin')).toBeNull()
  })

  it('keeps guided-style loading copy and tile rendering paths in manual output', async () => {
    const source = await readFile(
      join(process.cwd(), 'components/dashboard/manual-output-panel.tsx'),
      'utf8',
    )

    expect(source).toContain('OutputPendingCard')
    expect(source).toContain("variant.status === 'rendering' ? 'Generating...'")
    expect(source).toContain('runState.variants.map((variant) => (')
  })

  it('renders carousel as a manual workspace tab', async () => {
    const { StudioWorkspace } = await import('@/components/dashboard/studio-workspace')

    render(<StudioWorkspace />)

    expect(await screen.findByRole('tab', { name: /carousel/i })).toBeTruthy()
  })

  it('adds and removes carousel panels from the setup section', async () => {
    const { useGenerationStore } = await import('@/store/use-generation-store')

    const { ManualWorkspace } = await import(
      '@/components/dashboard/manual-workspace'
    )

    // Flush any pending setTimeout(0) from the previous test's unmount cleanup
    await new Promise((resolve) => setTimeout(resolve, 5))

    useGenerationStore.getState().setActiveTab('carousel')
    useGenerationStore.getState().addCarouselPanel()

    render(<ManualWorkspace />)

    // Carousel starts with Setup tab — panel content renders there
    const setupTab = await screen.findByRole('tab', { name: 'Setup' })
    fireEvent.mouseDown(setupTab)
    fireEvent.click(setupTab)

    await screen.findByText('Panel 1')

    act(() => {
      useGenerationStore.getState().addCarouselPanel()
    })
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /panel \d content/i })).toHaveLength(2)
    })

    act(() => {
      const secondPanel = useGenerationStore.getState().carouselDraft.panels[1]
      if (secondPanel) {
        useGenerationStore.getState().deleteCarouselPanel(secondPanel.id)
      }
    })
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /panel \d content/i })).toHaveLength(1)
    })
  })

  it('returns to setup tab after forwarding an image into carousel', async () => {
    const { useGenerationStore } = await import('@/store/use-generation-store')

    const { ManualWorkspace } = await import('@/components/dashboard/manual-workspace')

    // Flush any pending setTimeout(0) from the previous test's unmount cleanup
    await new Promise((resolve) => setTimeout(resolve, 5))

    useGenerationStore.getState().setActiveTab('carousel')
    useGenerationStore.getState().forwardManualImageResultToCarousel(
      new File(['seed'], 'seed.png', { type: 'image/png' }),
    )

    render(<ManualWorkspace />)
    expect(await screen.findByRole('tab', { name: /setup/i, selected: true })).toBeTruthy()
  })

  it('keeps the manual workspace on the eager studio path', async () => {
    const source = await readFile(
      join(process.cwd(), 'components/dashboard/studio-shell.tsx'),
      'utf8',
    )

    expect(source).toContain(
      "import { ManualWorkspace } from '@/components/dashboard/manual-workspace'",
    )
    expect(source).not.toContain('const ManualWorkspace = dynamic(')
  })

  it('keeps manual generation controller subscriptions outside the dashboard shell', async () => {
    const source = await readFile(
      join(process.cwd(), 'components/dashboard/dashboard-shell.tsx'),
      'utf8',
    )

    expect(source).toContain('ManualRunControlPanelShell')
    expect(source).not.toContain('useManualGenerationController')
  })

  it.each(['guided', 'ideation'] as const)(
    'shows the shared generation error modal on the %s workspace',
    async (experience) => {
      globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
        window.setTimeout(() => callback(0), 0)
      globalThis.cancelAnimationFrame = (handle: number) => {
        window.clearTimeout(handle)
      }

      const { StudioWorkspace } = await import('@/components/dashboard/studio-workspace')
      const { useGenerationStore } = await import('@/store/use-generation-store')

      render(<StudioWorkspace />)

      await act(async () => {
        useGenerationStore.getState().setExperience(experience)
      })

      await waitFor(() => {
        expect(useGenerationStore.getState().experience).toBe(experience)
      })

      await act(async () => {
        useGenerationStore
          .getState()
          .setGenerationError('Provider temporarily unavailable.')
      })

      expect(await screen.findByText('Generation failed')).toBeTruthy()
      expect(screen.getByText('Provider temporarily unavailable.')).toBeTruthy()
    },
  )

  it('forwards a successful manual image result into manual video references', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response('manual-forward', {
            headers: {
              'Content-Disposition': 'attachment; filename="manual-forward.png"',
              'Content-Type': 'image/png',
            },
            status: 200,
          }),
        ),
      ),
    )

    await act(async () => {
      useGenerationStore.getState().setActiveTab('image')
      useGenerationStore.getState().setExperience('manual')
      useGenerationStore.getState().updateGenerationRun({
        experience: 'manual',
        runId: 'manual-image-run',
        status: 'success',
        workspace: 'image',
      })
      useGenerationStore.getState().setGenerationVariants([
        {
          completedAt: null,
          createdAt: null,
          error: null,
          index: 1,
          profile: 'Primary render',
          prompt: 'Image prompt',
          result: {
            model: 'nano-banana',
            taskId: 'task-1',
            type: 'image',
            url: '/api/media/output-1',
          },
          status: 'success',
          taskId: 'task-1',
          variantId: 'variant-1',
        },
      ])
    })

    render(
      <DashboardShell
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

    const outputsTab = await screen.findByRole('tab', { name: 'Outputs' })
    fireEvent.mouseDown(outputsTab)
    fireEvent.click(outputsTab)

    fireEvent.click(await screen.findByRole('button', { name: 'Forward to Video' }))

    expect(await screen.findByText('Build the input set')).toBeTruthy()

    const state = useGenerationStore.getState()
    expect(state.activeTab).toBe('video')
    expect(state.experience).toBe('manual')
    expect(state.videoReferences[0]?.file?.name).toBe('manual-forward.png')
    expect(state.videoReferences[1]?.file).toBeNull()
  })

  it('forwards a successful manual image result into carousel references from the output panel', async () => {
    const { DashboardShell } = await import('@/components/dashboard/dashboard-shell')
    const { useGenerationStore } = await import('@/store/use-generation-store')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response('manual-carousel-forward', {
            headers: {
              'Content-Disposition': 'attachment; filename="manual-carousel-forward.png"',
              'Content-Type': 'image/png',
            },
            status: 200,
          }),
        ),
      ),
    )

    await act(async () => {
      useGenerationStore.getState().setActiveTab('image')
      useGenerationStore.getState().setExperience('manual')
      useGenerationStore.getState().updateGenerationRun({
        experience: 'manual',
        runId: 'manual-carousel-run',
        status: 'success',
        workspace: 'image',
      })
      useGenerationStore.getState().setGenerationVariants([
        {
          completedAt: null,
          createdAt: null,
          error: null,
          index: 1,
          profile: 'Primary render',
          prompt: 'Image prompt',
          result: {
            model: 'nano-banana',
            taskId: 'task-1',
            type: 'image',
            url: '/api/media/carousel-output-1',
          },
          status: 'success',
          taskId: 'task-1',
          variantId: 'variant-carousel-1',
        },
      ])
    })

    render(
      <DashboardShell
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

    const outputsTab = await screen.findByRole('tab', { name: 'Outputs' })
    fireEvent.mouseDown(outputsTab)
    fireEvent.click(outputsTab)

    fireEvent.click(await screen.findByRole('button', { name: 'Forward to Carousel' }))

    await waitFor(() => {
      const state = useGenerationStore.getState()
      expect(state.activeTab).toBe('carousel')
    })

    const finalState = useGenerationStore.getState()
    expect(finalState.carouselDraft.baseTemplateMode).toBe('manual')
    expect(finalState.carouselDraft.baseTemplateAsset?.file?.name).toBe('manual-carousel-forward.png')
  })

  it('supports base template prompt with per-panel template override in carousel setup', async () => {
    const { useGenerationStore } = await import('@/store/use-generation-store')

    const { ManualWorkspace } = await import(
      '@/components/dashboard/manual-workspace'
    )

    // Flush any pending setTimeout(0) from the previous test's unmount cleanup
    await new Promise((resolve) => setTimeout(resolve, 5))

    await act(async () => {
      useGenerationStore.getState().setActiveTab('carousel')
      useGenerationStore.getState().addCarouselPanel()
    })

    render(<ManualWorkspace />)

    const setupTab = await screen.findByRole('tab', { name: 'Setup' })
    fireEvent.mouseDown(setupTab)
    fireEvent.click(setupTab)

    const baseTemplateInput = await screen.findByLabelText(/base template prompt/i)
    fireEvent.change(baseTemplateInput, {
      target: { value: 'white panel with top image' },
    })

    await waitFor(() => {
      const state = useGenerationStore.getState()
      expect(state.carouselDraft.baseTemplatePrompt).toContain('white panel')
    })

    // Expand the override section for panel 1
    fireEvent.click(screen.getByText('Override base panel template'))

    fireEvent.click(screen.getByText('Override'))

    await waitFor(() => {
      const state = useGenerationStore.getState()
      expect(state.carouselDraft.panels[0]?.templateMode).toBe('override')
    })
  })

  it('uses a single panel header for carousel panel controls', async () => {
    const source = await readFile(
      join(process.cwd(), 'components/dashboard/manual-carousel-setup-section.tsx'),
      'utf8',
    )

    expect(source).not.toContain('function PanelSummaryRow(')

    const { useGenerationStore } = await import('@/store/use-generation-store')
    const { ManualWorkspace } = await import(
      '@/components/dashboard/manual-workspace'
    )

    await new Promise((resolve) => setTimeout(resolve, 5))

    await act(async () => {
      useGenerationStore.getState().setActiveTab('carousel')
      useGenerationStore.getState().addCarouselPanel()
    })

    render(<ManualWorkspace />)

    const setupTab = await screen.findByRole('tab', { name: 'Setup' })
    fireEvent.mouseDown(setupTab)
    fireEvent.click(setupTab)

    expect(screen.queryByText('Panel 1 — Content')).toBeNull()
    expect(await screen.findByText('Panel 1')).toBeTruthy()
    expect(screen.getByLabelText('Move panel down')).toBeTruthy()
    expect(screen.getByLabelText('Delete panel')).toBeTruthy()
  })

  it('shows carousel-specific run controls without image batch assumptions', async () => {
    const { useGenerationStore } = await import('@/store/use-generation-store')

    await act(async () => {
      useGenerationStore.getState().setActiveTab('carousel')
    })

    const { ManualWorkspace } = await import(
      '@/components/dashboard/manual-workspace'
    )

    render(<ManualWorkspace />)

    expect(await screen.findByText('Carousel workspace')).toBeTruthy()
    expect(screen.queryByLabelText(/batch size/i)).toBeNull()
    expect(screen.queryByText('Setup summary')).toBeNull()
    expect(screen.getByLabelText('Image Model')).toBeTruthy()
    expect(screen.getByLabelText('Image Resolution')).toBeTruthy()
  })

  it('renders carousel outputs with shared image-card ordering and no redundant carousel-forward CTA', async () => {
    const { useGenerationStore } = await import('@/store/use-generation-store')

    function makeCarouselOutputVariant(id: string, order: 1 | 2 | 3 | 4) {
      return {
        completedAt: '2026-06-03T00:00:00.000Z',
        createdAt: '2026-06-03T00:00:00.000Z',
        error: null,
        index: order,
        profile: `Panel ${order}`,
        prompt: `Prompt for panel ${order}`,
        result: {
          label: `Panel ${order}`,
          model: 'nano-banana-2',
          taskId: `task-${id}`,
          type: 'image' as const,
          url: `/api/media/panel-${order}`,
        },
        status: 'success' as const,
        taskId: `task-${id}`,
        variantId: `variant-${id}`,
      }
    }

    function seedCarouselRunState(
      variants: ReturnType<typeof makeCarouselOutputVariant>[],
    ) {
      useGenerationStore.getState().updateGenerationRun({
        experience: 'manual',
        runId: 'carousel-run-1',
        startedAt: Date.now(),
        status: 'success',
        workspace: 'carousel',
      })
      useGenerationStore.getState().setGenerationVariants(variants)
    }

    seedCarouselRunState([
      makeCarouselOutputVariant('panel-2', 2),
      makeCarouselOutputVariant('panel-1', 1),
    ])

    useGenerationStore.getState().setActiveTab('carousel')

    const { ManualWorkspace } = await import(
      '@/components/dashboard/manual-workspace'
    )

    render(<ManualWorkspace />)

    const outputsTab = screen.getByRole('tab', { name: 'Outputs' })
    fireEvent.mouseDown(outputsTab)
    fireEvent.click(outputsTab)

    const labels = await screen.findAllByText(/^#\d$/)
    expect(labels.map((node) => node.textContent)).toEqual(['#1', '#2'])
    expect(screen.queryByRole('button', { name: 'Forward to Carousel' })).toBeNull()
  })
})
