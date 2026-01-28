import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('Settings Module Production Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate
        await page.goto('/auth');
        await page.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await page.click('button[type="submit"]');

        // Wait for redirect and navigate to Settings
        await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
        await page.goto('/settings');
        await page.goto('/settings');
        // Use a more specific locator for the header
        await expect(page.locator('h1', { hasText: 'Account Settings' })).toBeVisible({ timeout: 20000 });
    });

    test('1. Profile Information Display & Read-Only Email', async ({ page }) => {
        // Verify Header
        await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();

        // Verify Email Field is disabled
        const emailInput = page.locator('input[type="email"]');
        await expect(emailInput).toBeVisible();
        await expect(emailInput).toBeDisabled();
        await expect(emailInput).toHaveValue(TEST_CREDENTIALS.OWNER_EMAIL);
    });

    test('2. Update Profile Name', async ({ page }) => {
        const timestamp = Date.now();
        const newName = `Diego Verified ${timestamp}`;

        // Find Name input (first text input usually, or by label "Full Name")
        const nameInput = page.locator('input[type="text"]').first();
        await nameInput.fill(newName);

        // Click Save
        await page.click('button:has-text("Save Changes")');

        // Verify toast or persistence (reload page)
        // For now, reload and check
        await page.reload();
        await expect(page.locator('input[type="text"]').first()).toHaveValue(newName);
    });

    test('3. Theme Toggle Interaction', async ({ page }) => {
        // Default might be system or light. Let's switch to Dark.
        const darkBtn = page.getByRole('button', { name: 'dark', exact: true }); // Exact match if button text is just 'dark'

        // Ensure buttons exist
        await expect(darkBtn).toBeVisible();
        await darkBtn.click();

        // Check for 'dark' class on html element
        const html = page.locator('html');
        await expect(html).toHaveClass(/dark/);
    });

    test('4. AI Context Visibility (Owner)', async ({ page }) => {
        // Since we are logged in as Owner, this section should be visible
        await expect(page.getByText('AI Assistant Context')).toBeVisible();

        const contextArea = page.locator('textarea');
        await expect(contextArea).toBeVisible();

        // Optional: Update context
        const testContext = "Test Context for Automated Verification";
        await contextArea.fill(testContext);
        await page.click('button:has-text("Save Changes")');

        await page.reload();
        await expect(page.locator('textarea')).toHaveValue(testContext);
    });
});
