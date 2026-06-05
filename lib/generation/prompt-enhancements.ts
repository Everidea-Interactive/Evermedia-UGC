import type { CtaOption, PromptEnhancement, WorkspaceTab } from '@/lib/generation/types'
import type { Locale } from '@/lib/i18n'

const promptCtaOptionContent = [
  {
    id: 'custom',
    placement: 'visual-overlay',
    labels: {
      en: 'Custom CTA',
      id: 'CTA custom',
    },
    rationales: {
      en: 'Write your own CTA for this render.',
      id: 'Tulis CTA sendiri untuk render ini.',
    },
  },
  {
    id: 'shop-now',
    placement: 'closing-shot',
    labels: {
      en: 'Shop now',
      id: 'Belanja sekarang',
    },
    rationales: {
      en: 'Best for direct conversion and a clear final product push.',
      id: 'Paling cocok untuk konversi langsung dan dorongan produk yang jelas.',
    },
  },
  {
    id: 'see-variant',
    placement: 'caption',
    labels: {
      en: 'See details and variants',
      id: 'Lihat detail dan variannya',
    },
    rationales: {
      en: 'Fits when shoppers need one more reason to explore before buying.',
      id: 'Cocok saat audiens perlu dorongan kecil sebelum klik.',
    },
  },
  {
    id: 'find-fit',
    placement: 'visual-overlay',
    labels: {
      en: 'Find your best fit',
      id: 'Temukan yang paling cocok',
    },
    rationales: {
      en: 'Useful when the image should invite shoppers to choose the right option.',
      id: 'Cocok saat gambar mengajak audiens memilih opsi yang paling sesuai.',
    },
  },
] as const

export function getPromptCtaOptions(locale: Locale): CtaOption[] {
  return promptCtaOptionContent.map((option) => ({
    id: option.id,
    label: option.labels[locale],
    placement: option.placement,
    rationale: option.rationales[locale],
  }))
}

export function getPromptCtaOption(id: string, locale: Locale) {
  const options = getPromptCtaOptions(locale)

  return options.find((option) => option.id === id) ?? options[0]
}

export function createInitialPromptEnhancement(): PromptEnhancement {
  return {
    ctaEnabled: true,
    customCtaText: '',
    selectedCtaId: promptCtaOptionContent[0]?.id ?? 'shop-now',
    voiceoverEnabled: true,
    voiceoverScript: '',
  }
}

export function getPromptEnhancementText(
  enhancement: PromptEnhancement,
  workspace: WorkspaceTab,
  locale: Locale,
) {
  if (workspace === 'image' && enhancement.ctaEnabled) {
    const cta = getPromptCtaOption(enhancement.selectedCtaId, locale)
    const label =
      enhancement.selectedCtaId === 'custom'
        ? enhancement.customCtaText.trim()
        : cta?.label.trim()

    if (!label) {
      return ''
    }

    return [
      `CTA direction: include the call to action exactly as "${label}".`,
      'Use Latin letters only and do not translate, replace, or add extra readable text.',
    ].join(' ')
  }

  if (workspace === 'video' && enhancement.voiceoverEnabled) {
    const script = enhancement.voiceoverScript.trim()

    if (!script) {
      return ''
    }

    return [
      `Voiceover direction: include spoken voiceover that says exactly: "${script.replace(/"/g, '\\"')}".`,
      'Keep the voiceover in the same language and do not add subtitles or translated captions.',
    ].join(' ')
  }

  return ''
}

export function appendPromptEnhancement(input: {
  enhancement: PromptEnhancement
  locale: Locale
  prompt: string
  workspace: WorkspaceTab
}) {
  const enhancementText = getPromptEnhancementText(
    input.enhancement,
    input.workspace,
    input.locale,
  )

  return [input.prompt.trim(), enhancementText]
    .filter((segment) => segment.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}
