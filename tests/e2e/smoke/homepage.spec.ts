import { expect, test } from '@playwright/test'

test('homepage responds and renders title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Meen|Charity|Donation/i)
})
