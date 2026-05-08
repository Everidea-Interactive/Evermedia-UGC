import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { scrapeProductPage } from '../lib/generation/product-page'

describe('scrapeProductPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('extracts title, meta, og, and JSON-LD product fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          `
            <html>
              <head>
                <title>Silk Dress</title>
                <meta name="description" content="Soft premium silk dress" />
                <meta property="og:title" content="Silk Dress OG" />
                <meta property="og:description" content="OG description" />
                <meta property="og:image" content="/images/og.png" />
                <script type="application/ld+json">
                  {
                    "@context": "https://schema.org",
                    "@type": "Product",
                    "name": "Silk Dress Product",
                    "brand": { "name": "Evermedia" },
                    "image": ["/images/product.png"],
                    "offers": {
                      "@type": "Offer",
                      "price": "79.00",
                      "priceCurrency": "USD"
                    }
                  }
                </script>
              </head>
              <body></body>
            </html>
          `,
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
            },
          },
        ),
      ),
    )

    const result = await scrapeProductPage('https://example.com/products/silk-dress')

    expect(result.title).toBe('Silk Dress')
    expect(result.description).toBe('Soft premium silk dress')
    expect(result.ogTitle).toBe('Silk Dress OG')
    expect(result.ogDescription).toBe('OG description')
    expect(result.jsonLdName).toBe('Silk Dress Product')
    expect(result.brand).toBe('Evermedia')
    expect(result.price).toBe('79.00')
    expect(result.currency).toBe('USD')
    expect(result.images).toEqual(
      expect.arrayContaining([
        'https://example.com/images/product.png',
        'https://example.com/images/og.png',
      ]),
    )
  })

  it('reads product details from @graph JSON-LD and falls back to twitter image metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          `
            <html>
              <head>
                <title>Summer &amp; Co</title>
                <meta name="description" content="Layered linen set" />
                <meta name="twitter:image" content="/images/twitter.png" />
                <script type="application/ld+json">
                  {
                    "@context": "https://schema.org",
                    "@graph": [
                      {
                        "@type": "BreadcrumbList",
                        "name": "Ignored"
                      },
                      {
                        "@type": "Product",
                        "name": "Summer Linen Set",
                        "brand": "Evermedia Studio",
                        "image": { "url": "/images/hero.png" },
                        "offers": [
                          {
                            "@type": "Offer",
                            "price": "119.00",
                            "priceCurrency": "IDR"
                          }
                        ]
                      }
                    ]
                  }
                </script>
              </head>
              <body></body>
            </html>
          `,
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
            },
          },
        ),
      ),
    )

    const result = await scrapeProductPage('https://example.com/products/summer-linen-set')

    expect(result.title).toBe('Summer & Co')
    expect(result.description).toBe('Layered linen set')
    expect(result.jsonLdName).toBe('Summer Linen Set')
    expect(result.brand).toBe('Evermedia Studio')
    expect(result.price).toBe('119.00')
    expect(result.currency).toBe('IDR')
    expect(result.images).toEqual([
      'https://example.com/images/hero.png',
      'https://example.com/images/twitter.png',
    ])
  })
})
