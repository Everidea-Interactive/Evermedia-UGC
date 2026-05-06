import { describe, expect, it } from 'vitest'

import tailwindConfig from '../tailwind.config'

describe('tailwind config', () => {
  it('scans UI source files without scanning server domain modules', () => {
    expect(tailwindConfig.content).toEqual([
      './app/**/*.{ts,tsx}',
      './components/**/*.{ts,tsx}',
    ])
  })
})
