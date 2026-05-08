import { describe, expect, it } from 'vitest'

import {
  defaultLocale,
  dictionaries,
  getLocaleToggleLabel,
  isLocale,
  localeCookieName,
  normalizeLocale,
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
    expect(Object.keys(dictionaries.id.dashboard.experienceTabs)).toEqual(
      Object.keys(dictionaries.en.dashboard.experienceTabs),
    )
  })

  it('formats compact language toggle labels', () => {
    expect(getLocaleToggleLabel('id')).toBe('ID')
    expect(getLocaleToggleLabel('en')).toBe('EN')
  })
})
