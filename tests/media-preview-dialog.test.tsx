// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MediaPreviewDialog } from '@/components/media/media-preview-dialog'

describe('MediaPreviewDialog', () => {
  it('opens and closes for an image preview trigger', () => {
    render(
      <MediaPreviewDialog
        alt="Preview image"
        label="Preview image"
        mimeType="image/png"
        src="/preview.png"
      >
        <button type="button">Open preview</button>
      </MediaPreviewDialog>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open preview' }))

    expect(screen.getByRole('dialog')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /close preview/i }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens video content in the shared modal shell', () => {
    render(
      <MediaPreviewDialog
        alt="Preview video"
        label="Preview video"
        mimeType="video/mp4"
        src="/preview.mp4"
      >
        <button type="button">Open video preview</button>
      </MediaPreviewDialog>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open video preview' }))

    const dialog = screen.getByRole('dialog')

    expect(dialog).toBeTruthy()
    expect(within(dialog).getByRole('video')).toBeTruthy()
  })

  it('keeps native video playback controls in the shared preview', () => {
    render(
      <MediaPreviewDialog
        alt="Preview video"
        label="Preview video"
        mimeType="video/mp4"
        src="/preview.mp4"
      >
        <button type="button">Open video preview</button>
      </MediaPreviewDialog>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open video preview' }))

    const video = within(screen.getByRole('dialog')).getByRole('video')
    expect(video.tagName).toBe('VIDEO')
    expect(video.getAttribute('controls')).not.toBeNull()
  })
})
