import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('Analytics Module Production Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate
        await page.goto('/auth');
        await page.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await page.click('button[type="submit"]');

        // Wait for redirect and navigate to KPIs
        await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
        await page.goto('/kpis');
        // Use more specific locator
        await expect(page.locator('h1', { hasText: 'Analytics & KPIs' })).toBeVisible({ timeout: 15000 });
    });

    test('1. Metric Cards Rendering', async ({ page }) => {
        // Check for the 4 key stat cards by their labels
        await expect(page.getByText('Total Tasks', { exact: true })).toBeVisible();
        await expect(page.getByText('Completed', { exact: true })).toBeVisible();
        await expect(page.getByText('Pending', { exact: true })).toBeVisible();
        await expect(page.getByText('Overdue / Critical')).toBeVisible();
    });

    test('2. Chart and Sections Visibility', async ({ page }) => {
        await expect(page.getByText('Activity Velocity')).toBeVisible();
        await expect(page.getByText('Completion Status')).toBeVisible();
        await expect(page.getByText('Access Context')).toBeVisible();
    });

    test('3. Priority Breakdown', async ({ page }) => {
        // Check priority breakdown labels
        const priorities = ['critical', 'high', 'medium', 'low'];
        for (const p of priorities) {
            await expect(page.locator(`text=${p}`).first()).toBeVisible();
        }
    });
});
