import { test, expect } from '@playwright/test'

test.describe('Auth', () => {
  test('login sahifa ochiladi va formda email/parol maydoni bor', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByPlaceholder(/email/i).or(page.locator('input[type="email"]'))).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('notoʻgʻri credentials bilan xato koʻrsatiladi', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('wrong@example.com')
    await page.locator('input[type="password"]').fill('WrongPassword123')
    await page.getByRole('button', { name: /kirish|login/i }).click()
    await expect(page.locator('body')).toContainText(/notoʻgʻri|xato|error/i, { timeout: 10_000 })
  })

  test('muvaffaqiyatli login → dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('admin@toshmatov.uz')
    await page.locator('input[type="password"]').fill('Admin@123')
    await page.getByRole('button', { name: /kirish|login/i }).click()
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  })
})
