'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  defaultLocale,
  getDictionary,
  translateText,
  type Dictionary,
  type Locale,
} from '@/lib/i18n'

type LocaleContextValue = {
  dictionary: Dictionary
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (value: string) => string
}

type TranslatableAttribute = 'placeholder' | 'aria-label' | 'title'

const LocaleContext = createContext<LocaleContextValue>({
  dictionary: getDictionary(defaultLocale),
  locale: defaultLocale,
  setLocale: () => undefined,
  t: (value) => value,
})

const originalTextByNode = new WeakMap<Text, string>()
const originalAttributesByElement = new WeakMap<
  HTMLElement,
  Partial<Record<TranslatableAttribute, string>>
>()
const translatableAttributes: readonly TranslatableAttribute[] = [
  'placeholder',
  'aria-label',
  'title',
]

function translateNodeText(locale: Locale, root: ParentNode) {
  if (typeof document === 'undefined') {
    return
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []

  while (walker.nextNode()) {
    const node = walker.currentNode

    if (node.nodeValue?.trim()) {
      textNodes.push(node as Text)
    }
  }

  for (const node of textNodes) {
    const currentValue = node.nodeValue ?? ''
    const original = originalTextByNode.get(node) ?? currentValue
    const trimmed = original.trim()
    const translatedTrimmed = translateText(locale, trimmed)
    const nextValue =
      locale === 'id'
        ? original.replace(trimmed, translatedTrimmed)
        : original

    if (
      locale === 'id' &&
      translatedTrimmed !== trimmed &&
      !originalTextByNode.has(node)
    ) {
      originalTextByNode.set(node, currentValue)
    }

    if (nextValue !== currentValue) {
      node.nodeValue = nextValue
    }
  }

  for (const element of Array.from(
    root.querySelectorAll<HTMLElement>('[placeholder],[aria-label],[title]'),
  )) {
    for (const attr of translatableAttributes) {
      const currentValue = element.getAttribute(attr)

      if (!currentValue) {
        continue
      }

      const originalAttributes = originalAttributesByElement.get(element) ?? {}
      const originalValue = originalAttributes[attr] ?? currentValue
      const translatedValue = translateText(locale, originalValue)
      const nextValue = locale === 'id' ? translatedValue : originalValue

      if (
        locale === 'id' &&
        translatedValue !== originalValue &&
        !(attr in originalAttributes)
      ) {
        originalAttributes[attr] = currentValue
        originalAttributesByElement.set(element, originalAttributes)
      }

      if (nextValue !== currentValue) {
        element.setAttribute(attr, nextValue)
      }
    }
  }
}

export function LocaleProvider({
  children,
  locale,
}: {
  children: ReactNode
  locale: Locale
}) {
  const [activeLocale, setActiveLocale] = useState(locale)

  useEffect(() => {
    setActiveLocale(locale)
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    setActiveLocale(nextLocale)
  }, [])

  const value = useMemo<LocaleContextValue>(
    () => ({
      dictionary: getDictionary(activeLocale),
      locale: activeLocale,
      setLocale,
      t: (text) => translateText(activeLocale, text),
    }),
    [activeLocale, setLocale],
  )

  useEffect(() => {
    translateNodeText(activeLocale, document.body)

    if (activeLocale !== 'id') {
      return
    }

    const observer = new MutationObserver(() => {
      if (typeof document === 'undefined') {
        return
      }

      translateNodeText(activeLocale, document.body)
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-label', 'placeholder', 'title'],
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [activeLocale])

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
