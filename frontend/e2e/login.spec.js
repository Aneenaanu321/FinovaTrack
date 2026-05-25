import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('shows sign in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/you@bank/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('can switch to register', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /register/i }).click();
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });
});
