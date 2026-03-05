import { test, expect } from '@playwright/test';

test('example test - homepage loads', async ({ page }) => {
  await page.goto('/');

  // 验证页面标题
  await expect(page).toHaveTitle(/Scryer/);
});
