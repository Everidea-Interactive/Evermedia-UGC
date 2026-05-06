// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LocaleProvider } from '@/components/i18n/locale-provider'

describe('LocaleProvider', () => {
  it('restores original text after switching from Indonesian back to English', async () => {
    const { rerender } = render(
      <LocaleProvider locale="id">
        <span>References</span>
      </LocaleProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Referensi')).toBeTruthy()
    })

    rerender(
      <LocaleProvider locale="en">
        <span>References</span>
      </LocaleProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('References')).toBeTruthy()
    })
  })
})
