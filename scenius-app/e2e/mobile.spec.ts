import { expect, test } from '@playwright/test'

// Requires: pnpm dev running + .env.local populated
// Run: pnpm test:e2e

const stamp = Date.now()
const email = `mobile-${stamp}@scenius-test.invalid`
const password = 'mobile-pass-123!'
const username = `mobileuser${stamp}`

const MOBILE_VIEWPORT = { width: 390, height: 844 } // iPhone 14

test.use({ viewport: MOBILE_VIEWPORT })

test.describe('mobile — voting is atomic', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto('/register')
    await page.fill('input[id="username"]', username)
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.close()
  })

  test('rapid taps only register one vote', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    await page.goto('/posts/new')
    await page.fill('input[id="title"]', 'Mobile vote test')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/posts\/\d+/)

    const upvote = page.getByRole('button', { name: 'Upvote' })
    const score = page.locator('span.tabular-nums').first()

    // Simulate rapid taps — three clicks in quick succession
    await upvote.click()
    await upvote.click()
    await upvote.click()

    // Score should be exactly 1, not 3
    await expect(score).toHaveText('1')

    // Reload confirms only one vote was persisted
    await page.reload()
    await expect(page.locator('span.tabular-nums').first()).toHaveText('1')
  })

  test('vote buttons meet 44px touch target size', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    await page.goto('/posts/new')
    await page.fill('input[id="title"]', 'Touch target test')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/posts\/\d+/)

    const upvote = page.getByRole('button', { name: 'Upvote' })
    const downvote = page.getByRole('button', { name: 'Downvote' })
    const upBox = await upvote.boundingBox()
    const downBox = await downvote.boundingBox()

    expect(upBox!.height).toBeGreaterThanOrEqual(44)
    expect(upBox!.width).toBeGreaterThanOrEqual(44)
    expect(downBox!.height).toBeGreaterThanOrEqual(44)
    expect(downBox!.width).toBeGreaterThanOrEqual(44)
  })
})
