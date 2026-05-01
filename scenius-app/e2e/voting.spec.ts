import { expect, test } from '@playwright/test'

// Requires: pnpm dev running + .env.local populated
// Run: pnpm test:e2e

const stamp = Date.now()
const email = `vote-${stamp}@scenius-test.invalid`
const password = 'vote-pass-123!'
const username = `voter${stamp}`

test.describe('voting', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/register')
    await page.fill('input[id="username"]', username)
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
    await page.close()
  })

  test('upvote increments score, page reload preserves it, toggle off decrements', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // Create a post to vote on
    await page.goto('/posts/new')
    await page.fill('input[id="title"]', 'Vote E2E test post')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/posts\/\d+/)

    // Get initial score (should be 0)
    const scoreEl = page.locator('span.tabular-nums').first()
    await expect(scoreEl).toHaveText('0')

    // Upvote
    await page.getByRole('button', { name: 'Upvote' }).click()
    await expect(scoreEl).toHaveText('1')

    // Reload — score persists
    await page.reload()
    await expect(page.locator('span.tabular-nums').first()).toHaveText('1')

    // Toggle off (upvote again)
    await page.getByRole('button', { name: 'Upvote' }).click()
    await expect(page.locator('span.tabular-nums').first()).toHaveText('0')
  })

  test('flip from upvote to downvote moves score by 2', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    await page.goto('/posts/new')
    await page.fill('input[id="title"]', 'Vote flip test post')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/posts\/\d+/)

    const scoreEl = page.locator('span.tabular-nums').first()

    await page.getByRole('button', { name: 'Upvote' }).click()
    await expect(scoreEl).toHaveText('1')

    await page.getByRole('button', { name: 'Downvote' }).click()
    await expect(scoreEl).toHaveText('-1')
  })
})
