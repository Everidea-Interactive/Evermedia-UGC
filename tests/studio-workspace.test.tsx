// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
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
})
