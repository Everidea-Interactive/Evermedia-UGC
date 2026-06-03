// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  SectionHeader,
  insetPanelClassName,
  panelClassName,
  rowClassName,
  workspaceFieldLabelClassName,
  workspacePreviewMinHeightClassName,
  workspaceSectionClassName,
} from '@/components/dashboard/manual-workspace-ui'

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
})
