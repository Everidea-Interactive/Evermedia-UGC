import { expect, test, type Page } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const AUTH_EMAIL = process.env.PLAYWRIGHT_AUTH_EMAIL ?? 'verendless@outlook.com'
const AUTH_PASSWORD =
  process.env.PLAYWRIGHT_AUTH_PASSWORD ?? '625KZ9iE7roXLbeETr9Uh3Vy'

async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle' })

  // Use specific ID selector to avoid strict mode violation with multiple auth forms
  const emailInput = page.locator('#sign-in-email')
  const passwordInput = page.locator('input[type="password"][id="sign-in-password"]')

  await emailInput.fill(AUTH_EMAIL)
  await passwordInput.fill(AUTH_PASSWORD)

  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/sign-in'), { timeout: 15_000 }),
    page.getByRole('button', { name: /sign in|login|continue/i }).first().click(),
  ])
}

async function openManualWorkspace(page: Page) {
  const manualSwitcher = page
    .getByRole('tab', { name: /manual/i })
    .or(page.getByRole('button', { name: /manual/i }))
    .first()

  if (await manualSwitcher.isVisible()) {
    await manualSwitcher.click()
  }

  await expect(page.getByRole('button', { name: /generate|run generation/i }).first()).toBeVisible()
}

test.describe('Phase 1 accessibility improvements', () => {
  test('shows focus-visible rings for desktop sign-out icon button', async ({ page }) => {
    await signIn(page)

    const signOutButton = page.getByRole('button', { name: /sign out/i }).first()
    await signOutButton.focus()

    await expect(signOutButton).toBeFocused()
    await expect(signOutButton).toHaveClass(/focus-visible:ring-2/)
    await expect(signOutButton).toHaveClass(/focus-visible:ring-ring/)
  })

  test.describe('mobile navigation', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('shows focus ring for mobile menu toggle and sets aria-current', async ({ page }) => {
      await signIn(page)

      const menuToggle = page.getByRole('button', { name: /open navigation menu|close navigation menu/i })
      await menuToggle.focus()

      await expect(menuToggle).toBeFocused()
      await expect(menuToggle).toHaveClass(/focus-visible:ring-2/)

      await menuToggle.click()

      const currentMobileLink = page.locator('nav a[aria-current="page"]:visible').first()
      await expect(currentMobileLink).toBeVisible()
      await expect(currentMobileLink).toHaveAttribute('aria-current', 'page')
    })
  })

  test('sets aria-current on active desktop navigation link', async ({ page }) => {
    await signIn(page)

    const currentDesktopLink = page.locator('nav a[aria-current="page"]').first()

    await expect(currentDesktopLink).toBeVisible()
    await expect(currentDesktopLink).toHaveAttribute('aria-current', 'page')
  })

  test('uses semantic button for manual upload and supports keyboard activation', async ({ page }) => {
    await signIn(page)
    await openManualWorkspace(page)

    // Find the visible button that triggers file upload (not the hidden input)
    const uploadButton = page.locator('button:has-text("Choose File"), button:has-text("Upload")').first()
    await expect(uploadButton).toBeVisible()
    await expect(uploadButton).toHaveAttribute('type', 'button')

    const fileChooserPromise = page.waitForEvent('filechooser')
    await uploadButton.focus()
    await page.keyboard.press('Enter')
    await fileChooserPromise
  })
})

test.describe('Phase 2 accessibility improvements', () => {
  test.fixme('announces async generation helper state through polite live region', async ({ page }) => {
    test.skip(true, 'Requires complex fixture setup - verify manually')
    await signIn(page)
    await openManualWorkspace(page)

    const liveRegion = page.locator('p[aria-live="polite"]').filter({ hasText: /generate|run|ready|rendering/i }).first()
    await expect(liveRegion).toBeVisible()

    const generateButton = page.getByRole('button', { name: /generate|run generation/i }).first()
    await generateButton.click()

    await expect(liveRegion).not.toHaveText('', { timeout: 10_000 })
    await expect(liveRegion).toHaveAttribute('aria-live', 'polite')
  })

  test('keeps auth page tokenized styling variables present', async ({ page }) => {
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle' })

    const rootBackgroundVar = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
    })

    const rootBorderVar = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--border').trim()
    })

    expect(rootBackgroundVar.length).toBeGreaterThan(0)
    expect(rootBorderVar.length).toBeGreaterThan(0)
  })
})

test.describe('Phase 3 accessibility improvements', () => {
  test.describe('responsive breakpoint transitions', () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
      // Go to dashboard/studio page
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
    })

    test('maintains content visibility at intermediate 1100px width', async ({ page }) => {
      await page.setViewportSize({ width: 1100, height: 768 })

      // Main content should not be compressed
      const mainContent = page.locator('main').first()
      await expect(mainContent).toBeVisible()

      // Check no horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
    })

    test('shows responsive layout at 1024px without overflow', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 })

      // Verify page loads without horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      expect(hasHorizontalScroll).toBe(false)
    })

    test('shows responsive layout at 1280px without overflow', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })

      // Verify page loads without horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      expect(hasHorizontalScroll).toBe(false)
    })
  })
})
