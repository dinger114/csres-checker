import { expect, test } from '@playwright/test'

test('app loads with INPUT panel and header', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('C S R E S')).toBeVisible()
  await expect(page.getByRole('main').getByText('INPUT')).toBeVisible()
})

test('runs a query and shows log output', async ({ page }) => {
  await page.goto('/')
  const textarea = page.locator('textarea')
  await textarea.fill('GB 50010-2010')
  await page.getByRole('button', { name: /RUN/i }).click()

  // 查询启动后日志面板出现 START 记录
  await expect(page.getByText(/═══ START/)).toBeVisible({ timeout: 10000 })
})

test('help panel opens and closes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'HELP' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Close button uses × character
  await dialog.locator('.close-btn').click()
  await expect(dialog).toBeHidden()
})

test('theme toggle switches between dark and light', async ({ page }) => {
  await page.goto('/')
  const root = page.locator('html')
  const initial = await root.getAttribute('data-theme')
  // Theme toggle button uses aria-label "Switch to ..."
  await page.locator('.theme-toggle').click()
  const after = await root.getAttribute('data-theme')
  expect(after).not.toBe(initial)
})
