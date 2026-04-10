import 'server-only'

import { load } from 'cheerio'

export type ScrapedProductPage = {
  brand: string | null
  currency: string | null
  description: string | null
  images: string[]
  jsonLdName: string | null
  ogDescription: string | null
  ogTitle: string | null
  price: string | null
  title: string | null
  url: string
}

function getMetaContent(
  $: ReturnType<typeof load>,
  selectors: string[],
) {
  for (const selector of selectors) {
    const content = $(selector).attr('content')?.trim()

    if (content) {
      return content
    }
  }

  return null
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function collectJsonLdNodes(value: unknown): Record<string, unknown>[] {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectJsonLdNodes(entry))
  }

  if (typeof value !== 'object') {
    return []
  }

  const record = value as Record<string, unknown>
  const nestedGraph = record['@graph']

  return [record, ...collectJsonLdNodes(nestedGraph)]
}

function hasProductType(record: Record<string, unknown>) {
  const typeValue = record['@type']

  if (typeof typeValue === 'string') {
    return typeValue.toLowerCase() === 'product'
  }

  return Array.isArray(typeValue)
    ? typeValue.some((entry) => typeof entry === 'string' && entry.toLowerCase() === 'product')
    : false
}

function readStringField(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function readOfferField(
  value: unknown,
  field: 'price' | 'priceCurrency',
): string | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>

  if (Array.isArray(record.offers)) {
    for (const offer of record.offers) {
      const result = readOfferField(offer, field)

      if (result) {
        return result
      }
    }
  }

  return readStringField(record[field])
}

function resolveImageUrls(
  baseUrl: URL,
  values: unknown,
) {
  if (!values) {
    return []
  }

  const rawValues = Array.isArray(values) ? values : [values]

  return rawValues.flatMap((value) => {
    const urlValue =
      typeof value === 'string'
        ? value
        : value && typeof value === 'object' && 'url' in value && typeof value.url === 'string'
          ? value.url
          : null

    if (!urlValue) {
      return []
    }

    try {
      return [new URL(urlValue, baseUrl).toString()]
    } catch {
      return []
    }
  })
}

function extractJsonLdProduct(
  $: ReturnType<typeof load>,
  pageUrl: URL,
) {
  const productNodes = $('script[type="application/ld+json"]')
    .toArray()
    .flatMap((node) => safeJsonParse($(node).text()))
    .flatMap((payload) => collectJsonLdNodes(payload))
    .filter((record) => hasProductType(record))

  const firstProduct = productNodes[0]

  if (!firstProduct) {
    return {
      brand: null,
      currency: null,
      images: [],
      jsonLdName: null,
      price: null,
    }
  }

  const brandValue = firstProduct.brand
  const brand =
    typeof brandValue === 'string'
      ? brandValue.trim()
      : brandValue && typeof brandValue === 'object'
        ? readStringField((brandValue as Record<string, unknown>).name)
        : null

  return {
    brand,
    currency: readOfferField(firstProduct.offers, 'priceCurrency'),
    images: resolveImageUrls(pageUrl, firstProduct.image),
    jsonLdName: readStringField(firstProduct.name),
    price: readOfferField(firstProduct.offers, 'price'),
  }
}

export async function scrapeProductPage(url: string): Promise<ScrapedProductPage> {
  let pageUrl: URL

  try {
    pageUrl = new URL(url)
  } catch {
    throw new Error('Product URL is invalid.')
  }

  if (pageUrl.protocol !== 'http:' && pageUrl.protocol !== 'https:') {
    throw new Error('Product URL must use HTTP or HTTPS.')
  }

  const response = await fetch(pageUrl, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'Evermedia-UGC/1.0',
    },
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) {
    throw new Error(`Product URL returned ${response.status}.`)
  }

  const html = await response.text()
  const $ = load(html)
  const jsonLd = extractJsonLdProduct($, pageUrl)

  return {
    brand: jsonLd.brand,
    currency: jsonLd.currency,
    description: readStringField($('meta[name="description"]').attr('content')),
    images: [
      ...jsonLd.images,
      ...resolveImageUrls(
        pageUrl,
        getMetaContent($, [
          'meta[property="og:image"]',
          'meta[name="twitter:image"]',
        ]),
      ),
    ].filter((value, index, items) => items.indexOf(value) === index),
    jsonLdName: jsonLd.jsonLdName,
    ogDescription: getMetaContent($, ['meta[property="og:description"]']),
    ogTitle: getMetaContent($, ['meta[property="og:title"]']),
    price: jsonLd.price,
    title: readStringField($('title').text()),
    url: pageUrl.toString(),
  }
}
