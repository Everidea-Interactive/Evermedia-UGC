import { describe, expect, it } from 'vitest'

import {
  defaultLocale,
  dictionaries,
  getLocaleToggleLabel,
  isLocale,
  localeCookieName,
  normalizeLocale,
  translateText,
} from '@/lib/i18n'

describe('i18n locale utilities', () => {
  it('defaults unsupported locale values to English', () => {
    expect(defaultLocale).toBe('en')
    expect(localeCookieName).toBe('evermedia_locale')
    expect(normalizeLocale('id')).toBe('id')
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('fr')).toBe('en')
    expect(normalizeLocale(null)).toBe('en')
  })

  it('exposes complete English and Indonesian dictionaries', () => {
    expect(isLocale('id')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('bahasa')).toBe(false)
    expect(dictionaries.en.shared.language.label).toBe('Language')
    expect(dictionaries.id.shared.language.label).toBe('Bahasa')
    expect(dictionaries.id.ideation.outputLanguageInstruction).toContain(
      'Bahasa Indonesia',
    )
    expect(dictionaries.en.dashboard.workspaceTabs.motionControl).toBe(
      'Motion Control',
    )
    expect(dictionaries.id.dashboard.workspaceTabs.motionControl).toBe(
      'Kontrol Gerak',
    )
    expect(Object.keys(dictionaries.id.dashboard.experienceTabs)).toEqual(
      Object.keys(dictionaries.en.dashboard.experienceTabs),
    )
  })

  it('formats compact language toggle labels', () => {
    expect(getLocaleToggleLabel('id')).toBe('ID')
    expect(getLocaleToggleLabel('en')).toBe('EN')
  })

  it('translates motion-control UI and validation strings into Indonesian', () => {
    expect(
      translateText(
        'id',
        'Build the motion-control input set',
      ),
    ).toBe('Siapkan materi input kontrol gerak')
    expect(
      translateText(
        'id',
        'Upload one character reference image and one motion video. Kling Motion Control uses the character image as a strong global visual reference, so the result may inherit wardrobe, props, or held products from that image.',
      ),
    ).toBe(
      'Unggah satu gambar referensi karakter dan satu video gerakan. Kling Motion Control menggunakan gambar karakter sebagai referensi visual global yang kuat, sehingga hasilnya dapat mewarisi wardrobe, properti, atau produk yang dipegang dari gambar tersebut.',
    )
    expect(
      translateText('id', 'Motion Control workspace requires a reference image and motion video.'),
    ).toBe(
      'Workspace Kontrol Gerak memerlukan gambar referensi dan video gerakan.',
    )
    expect(
      translateText('id', 'Checking motion video duration.'),
    ).toBe('Memeriksa durasi video gerakan.')
  })
})
