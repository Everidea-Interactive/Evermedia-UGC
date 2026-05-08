import 'server-only'

import { parse, type DefaultTreeAdapterTypes } from 'parse5'

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

type HtmlNode = DefaultTreeAdapterTypes.Node
type HtmlParentNode = DefaultTreeAdapterTypes.ParentNode
type HtmlElement = DefaultTreeAdapterTypes.Element
type HtmlTextNode = DefaultTreeAdapterTypes.TextNode

type MetaSelector = {
  attribute: 'name' | 'property'
  value: string
}

function isElement(node: HtmlNode): node is HtmlElement {
  return 'tagName' in node
}

function hasChildNodes(node: HtmlNode): node is HtmlParentNode {
  return 'childNodes' in node
}

function isTextNode(node: HtmlNode): node is HtmlTextNode {
  return 'value' in node
}

function getAttribute(
  element: HtmlElement,
  attributeName: string,
) {
  const attribute = element.attrs.find((entry) => entry.name === attributeName)

  return attribute?.value?.trim() || null
}

function getTextContent(node: HtmlNode): string {
  if (isTextNode(node)) {
    return node.value
  }

  if (!hasChildNodes(node)) {
    return ''
  }

  return node.childNodes.map((child) => getTextContent(child)).join('')
}

function collectElements(
  root: HtmlNode,
  tagName: string,
) {
  const elements: HtmlElement[] = []

  function visit(node: HtmlNode) {
    if (isElement(node) && node.tagName === tagName) {
      elements.push(node)
    }

    if (!hasChildNodes(node)) {
      return
    }

    for (const child of node.childNodes) {
      visit(child)
    }
  }

  visit(root)

  return elements
}

function getMetaContent(
  metaElements: HtmlElement[],
  selectors: MetaSelector[],
) {
  for (const selector of selectors) {
    const metaElement = metaElements.find((element) => getAttribute(element, selector.attribute) === selector.value)
    const content = metaElement ? getAttribute(metaElement, 'content') : null

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
  if (Array.isArray(value)) {
    for (const offer of value) {
      const result = readOfferField(offer, field)

      if (result) {
        return result
      }
    }
  }

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
  scriptElements: HtmlElement[],
  pageUrl: URL,
) {
  const productNodes = scriptElements
    .filter((element) => getAttribute(element, 'type') === 'application/ld+json')
    .map((element) => getTextContent(element))
    .flatMap((content) => safeJsonParse(content))
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
  const document = parse(html)
  const metaElements = collectElements(document, 'meta')
  const scriptElements = collectElements(document, 'script')
  const titleElement = collectElements(document, 'title')[0] ?? null
  const jsonLd = extractJsonLdProduct(scriptElements, pageUrl)

  return {
    brand: jsonLd.brand,
    currency: jsonLd.currency,
    description: getMetaContent(metaElements, [{ attribute: 'name', value: 'description' }]),
    images: [
      ...jsonLd.images,
      ...resolveImageUrls(
        pageUrl,
        getMetaContent(metaElements, [
          { attribute: 'property', value: 'og:image' },
          { attribute: 'name', value: 'twitter:image' },
        ]),
      ),
    ].filter((value, index, items) => items.indexOf(value) === index),
    jsonLdName: jsonLd.jsonLdName,
    ogDescription: getMetaContent(metaElements, [{ attribute: 'property', value: 'og:description' }]),
    ogTitle: getMetaContent(metaElements, [{ attribute: 'property', value: 'og:title' }]),
    price: jsonLd.price,
    title: titleElement ? readStringField(getTextContent(titleElement)) : null,
    url: pageUrl.toString(),
  }
}
