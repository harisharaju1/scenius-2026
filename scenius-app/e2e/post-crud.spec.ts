import { expect, test } from '@playwright/test'

// Requires: pnpm dev running + .env.local populated
// Run: pnpm test:e2e

const stamp = Date.now()
const email = `e2e-${stamp}@scenius-test.invalid`
const password = 'e2e-pass-123!'
const username = `e2euser${stamp}`

test.describe('post CRUD', () => {
  test.beforeAll(async ({ browser }) => {
    // Register a user via the UI
    const page = await browser.newPage()
    await page.goto('/register')
    await page.fill('input[id="username"]', username)
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
    await page.close()
  })

  test('creates a post and sees it in the feed', async ({ page }) => {
    // Log in
    await page.goto('/login')
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // Create post
    await page.goto('/posts/new')
    await page.fill('input[id="title"]', 'E2E test post')
    await page.fill('textarea[id="body"]', 'Written by Playwright')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/posts\/\d+/)

    // Post detail visible
    await expect(page.getByRole('heading', { name: 'E2E test post' })).toBeVisible()
    await expect(page.getByText('Written by Playwright')).toBeVisible()

    // Appears in feed
    await page.goto('/')
    await expect(page.getByText('E2E test post')).toBeVisible()
  })

  test('owner can delete their post', async ({ page }) => {
    // Log in and create a post to delete
    await page.goto('/login')
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    await page.goto('/posts/new')
    await page.fill('input[id="title"]', 'Post to delete')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/posts\/\d+/)

    // Delete
    await page.getByRole('button', { name: 'Delete post' }).click()
    page.on('dialog', (d) => d.accept())
    await page.waitForURL('/')

    await expect(page.getByText('Post to delete')).not.toBeVisible()
  })
})
