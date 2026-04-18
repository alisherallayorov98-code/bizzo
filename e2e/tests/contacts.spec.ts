import { test, expect } from '@playwright/test'

async function login(page: any) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('admin@toshmatov.uz')
  await page.locator('input[type="password"]').fill('Admin@123')
  await page.getByRole('button', { name: /kirish|login/i }).click()
  await page.waitForURL(/dashboard/, { timeout: 15_000 })
}

test.describe('Contacts', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('kontaktlar roʻyxat sahifasi ochiladi', async ({ page }) => {
    await page.goto('/contacts')
    await expect(page).toHaveURL(/contacts/)
  })

  test('yangi kontakt yaratish formasiga oʻtish', async ({ page }) => {
    await page.goto('/contacts/new')
    await expect(page).toHaveURL(/contacts\/new/)
  })

  test('qidiruv inputi mavjud', async ({ page }) => {
    await page.goto('/contacts')
    await expect(page.locator('input[type="search"], input[placeholder*="idir" i]').first()).toBeVisible()
  })
})
