import { expect, test } from '@playwright/test'

// Requires: pnpm dev running + .env.local populated
// Note: the full reset flow (email link → /callback → /login/reset-password) requires
// email interception and is not covered here. These tests cover the UI paths that can be
// verified without inbox access.

test.describe('forgot password', () => {
  test('login page has a "Forgot password?" link pointing to the forgot-password page', async ({
    page,
  }) => {
    await page.goto('/login')
    const link = page.getByRole('link', { name: /forgot password/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/login/forgot-password')
  })

  test('forgot-password page renders and accepts a valid email submission', async ({ page }) => {
    await page.goto('/login/forgot-password')
    await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible()

    await page.fill('input[id="email"]', 'any@example.com')
    await page.click('button[type="submit"]')

    // Always redirects to /sent regardless of whether the email exists
    await page.waitForURL('/login/forgot-password/sent')
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible()
  })

  test('forgot-password page shows validation error for an invalid email', async ({ page }) => {
    await page.goto('/login/forgot-password')
    await page.fill('input[id="email"]', 'not-an-email')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/invalid email/i)).toBeVisible()
    await expect(page).toHaveURL('/login/forgot-password')
  })

  test('/login/reset-password rejects a direct submission without a recovery cookie', async ({
    page,
  }) => {
    // Navigating directly (no recovery email flow) means no pw_reset_pending cookie.
    // The action should return an error rather than updating the password.
    await page.goto('/login/reset-password')
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible()

    await page.fill('input[id="password"]', 'newpassword1')
    await page.fill('input[id="confirmPassword"]', 'newpassword1')
    await page.click('button[type="submit"]')

    await expect(
      page.getByText(/invalid or expired reset link/i),
    ).toBeVisible()
  })
})
