import { test, expect } from '@playwright/test';

const unique = () => `e2e-${Date.now()}@test.local`;

test.describe('Client workflow', () => {
  test('register, add client, see on list', async ({ page }) => {
    const email = unique();
    const password = 'E2eTestPass123!';
    const clientName = `E2E Client ${Date.now()}`;

    await page.goto('/login');
    await page.getByRole('button', { name: /register/i }).click();
    await page.getByPlaceholder(/john smith/i).fill('E2E User');
    await page.getByPlaceholder(/you@bank/i).fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/attention/);

    await page.goto('/clients');
    await page.getByRole('button', { name: /\+ add client/i }).click();
    await page.getByLabel(/name/i).fill(clientName);
    await page.getByRole('button', { name: /^add client$/i }).click();

    await expect(page.getByRole('link', { name: clientName })).toBeVisible({ timeout: 15000 });
  });
});
