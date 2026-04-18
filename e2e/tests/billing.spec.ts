import { test, expect } from '@playwright/test'

test.describe('Billing', () => {
  test('tariflar sahifasi ochiq va 4 tarif koʻrinadi', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByRole('heading', { name: /tariflar/i })).toBeVisible()
    await expect(page.getByText(/bepul/i)).toBeVisible()
    await expect(page.getByText(/boshlovchi/i)).toBeVisible()
    await expect(page.getByText(/biznes/i)).toBeVisible()
  })

  test('oylik/yillik toggle ishlaydi', async ({ page }) => {
    await page.goto('/pricing')
    const yearly = page.getByRole('button', { name: /yillik/i })
    await yearly.click()
    await expect(yearly).toBeVisible()
  })

  test('"Mashhur" badge koʻrinadi', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByText(/mashhur/i)).toBeVisible()
  })
})
