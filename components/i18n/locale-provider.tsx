'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
  t: (value: string) => string
}

const LocaleContext = createContext<LocaleContextValue>({
  dictionary: getDictionary(defaultLocale),
  locale: defaultLocale,
  t: (value) => value,
})

function translateNodeText(locale: Locale, root: ParentNode) {
  if (locale !== 'id' || typeof document === 'undefined') {
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
    const original = node.nodeValue ?? ''
    const trimmed = original.trim()
    const translated = translateText(locale, trimmed)

    if (translated !== trimmed) {
      node.nodeValue = original.replace(trimmed, translated)
    }
  }

  for (const element of Array.from(root.querySelectorAll<HTMLElement>('[placeholder],[aria-label],[title]'))) {
    for (const attr of ['placeholder', 'aria-label', 'title']) {
      const value = element.getAttribute(attr)

      if (!value) {
        continue
      }

      const translated = translateText(locale, value)

      if (translated !== value) {
        element.setAttribute(attr, translated)
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
  const value = useMemo<LocaleContextValue>(
    () => ({
      dictionary: getDictionary(locale),
      locale,
      t: (text) => translateText(locale, text),
    }),
    [locale],
  )

  useEffect(() => {
    translateNodeText(locale, document.body)

    if (locale !== 'id') {
      return
    }

    const observer = new MutationObserver(() => {
      translateNodeText(locale, document.body)
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
  }, [locale])

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
