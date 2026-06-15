// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Film } from 'lucide-react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  ReferenceCard,
  SectionHeader,
  insetPanelClassName,
  panelClassName,
  rowClassName,
  workspaceFieldLabelClassName,
  workspacePreviewMinHeightClassName,
  workspaceSectionClassName,
} from '@/components/dashboard/manual-workspace-ui'

afterEach(() => {
  cleanup()
})

describe('manual workspace shared ui', () => {
  it('exports the manual workspace tokens used as cross-mode source of truth', () => {
    expect(panelClassName).toBe('rounded-2xl border border-border bg-card')
    expect(insetPanelClassName).toBe('rounded-xl border border-border bg-background')
    expect(rowClassName).toBe('rounded-lg border border-border bg-background')
    expect(workspaceSectionClassName).toContain('p-4')
    expect(workspaceSectionClassName).toContain('sm:p-5')
    expect(workspaceFieldLabelClassName).toContain('text-[11px]')
    expect(workspacePreviewMinHeightClassName).toContain('min-h-[24rem]')
  })

  it('renders the shared section header typography contract', () => {
    render(
      <SectionHeader
        description="Shared body copy"
        eyebrow="Shared Eyebrow"
        title="Shared Title"
      />,
    )

    expect(screen.getByText('Shared Eyebrow').className).toContain('tracking-[0.24em]')
    expect(screen.getByText('Shared Title').className).toContain('font-display')
    expect(screen.getByText('Shared body copy').className).toContain('leading-6')
  })

  it('renders staged video references through the shared preview trigger', () => {
    render(
      <ReferenceCard
        accept="video/*"
        emptyStateLabel="Upload video"
        icon={Film}
        inputId="motion-video"
        onClear={() => {}}
        onSelect={() => {}}
        slot={{
          error: null,
          file: null,
          id: 'motion-video',
          label: 'Motion Video',
          mimeType: 'video/mp4',
          previewUrl: 'blob:motion-video',
          size: 1024,
          uploadStatus: 'idle',
        }}
      />,
    )

    expect(
      screen.getAllByRole('button').some((button) =>
        button.className.includes('cursor-zoom-in'),
      ),
    ).toBe(true)
    expect(screen.getByTestId('video-thumbnail-overlay')).toBeTruthy()
  })

  it('renders best-effort image previews for heic uploads', () => {
    render(
      <ReferenceCard
        accept="image/*"
        emptyStateLabel="Upload image"
        icon={Film}
        inputId="heic-image"
        onClear={() => {}}
        onSelect={() => {}}
        slot={{
          error: null,
          file: new File(['image'], 'photo.heic', { type: '' }),
          id: 'heic-image',
          label: 'Reference Image',
          mimeType: 'image/*',
          previewUrl: 'blob:heic-image',
          size: 1024,
          uploadStatus: 'staged',
        }}
      />,
    )

    expect(screen.getByAltText('Reference Image reference preview')).toBeTruthy()
    expect(
      screen.getAllByRole('button').some((button) =>
        button.className.includes('cursor-zoom-in'),
      ),
    ).toBe(true)
  })

  it('keeps staged image files actionable when preview decode fails', () => {
    render(
      <ReferenceCard
        accept="image/*"
        emptyStateLabel="Upload image"
        icon={Film}
        inputId="heic-image"
        onClear={() => {}}
        onSelect={() => {}}
        slot={{
          error: null,
          file: new File(['image'], 'photo.heic', { type: '' }),
          id: 'heic-image',
          label: 'Reference Image',
          mimeType: 'image/*',
          previewUrl: 'blob:heic-image',
          size: 1024,
          uploadStatus: 'staged',
        }}
      />,
    )

    fireEvent.error(screen.getByAltText('Reference Image reference preview'))

    expect(screen.getByText('Preview unavailable for this format')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Clear Reference Image' })).toBeTruthy()
    expect(screen.getByText('Ready')).toBeTruthy()
  })
})
