// @vitest-environment jsdom

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

    expect(useGenerationStore.getState().experience).toBe('manual')
    expect(useGenerationStore.getState().textPrompt).toBe('')
  })

  it('normalizes the manual section when image mode cannot show motion controls', async () => {
    const { normalizeManualSection } = await import(
      '@/components/dashboard/dashboard-shell'
    )

    expect(normalizeManualSection('motion', 'image')).toBe('references')
    expect(normalizeManualSection('motion', 'video')).toBe('motion')
    expect(normalizeManualSection('outputs', 'image')).toBe('outputs')
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

      await screen.findByText(
        experience === 'guided' ? 'guided-workspace' : 'ideation-workspace',
      )

      await act(async () => {
        useGenerationStore
          .getState()
          .setGenerationError('Provider temporarily unavailable.')
      })

      expect(await screen.findByText('Generation failed')).toBeTruthy()
      expect(screen.getByText('Provider temporarily unavailable.')).toBeTruthy()
    },
  )
})
