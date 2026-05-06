// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/components/i18n/locale-provider'
import { LibraryPage } from '@/components/library/library-page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

describe('LibraryPage', () => {
  it('translates library archive copy when the active locale is Indonesian', async () => {
    render(
      <LocaleProvider locale="id">
        <LibraryPage ideations={[]} outputs={[]} />
      </LocaleProvider>,
    )

    expect(await screen.findByText('Library')).toBeTruthy()
    expect(screen.getAllByText('Hasil tersimpan').length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        'Belum ada sesi tersimpan. Hasil generasi yang selesai akan muncul di sini.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('Belum ada output tersimpan untuk sesi ini.')).toBeTruthy()
  })
})
