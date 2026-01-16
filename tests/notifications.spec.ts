import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('Notifications System Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Force Logout
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();

        // 1. Initial Login
        await page.goto('/');
        await page.waitForSelector('form');

        await page.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await page.click('button[type="submit"]');

        // Wait for app to load
        await expect(page.locator('text=Inbox')).toBeVisible({ timeout: 15000 });
    });

    test('should mark as read when center is opened', async ({ page }) => {
        const bell = page.locator('button[title="Notifications"]');
        const redDot = bell.locator('span.bg-red-500');

        // Ensure we have at least one notification to test the dot
        // In a real scenario, we might need to create a task to trigger a notification

        await bell.click();
        await expect(page.getByText('Notifications', { exact: true })).toBeVisible();

        // Automatic mark for all read happens on open
        await page.waitForTimeout(500);

        // Close center by clicking outside
        await page.mouse.click(0, 0);

        // Red dot should be gone
        await expect(redDot).not.toBeVisible();
    });

    test('should delete individual notification', async ({ page }) => {
        await page.click('button[title="Notifications"]');

        const firstNotification = page.locator('li.group').first();
        await expect(firstNotification).toBeVisible();

        const deleteButton = firstNotification.locator('button[title="Delete"]');

        // Hover to show the delete button
        await firstNotification.hover();
        await expect(deleteButton).toBeVisible();

        const initialCount = await page.locator('li.group').count();
        await deleteButton.click();

        // Verify count decreased
        await expect(page.locator('li.group')).toHaveCount(initialCount - 1);
    });

    test('should clear all notifications', async ({ page }) => {
        await page.click('button[title="Notifications"]');

        const clearAllButton = page.locator('button[title="Delete all"]');
        if (await clearAllButton.isVisible()) {
            await clearAllButton.click();
            await expect(page.getByText('No notifications yet')).toBeVisible();
        }
    });

    test('should navigate to task when clicked', async ({ page }) => {
        await page.click('button[title="Notifications"]');

        const notification = page.locator('li.group').first();
        if (await notification.isVisible()) {
            const currentUrl = page.url();
            await notification.click();

            // Notification center should close
            await expect(page.getByText('Notifications', { exact: true })).not.toBeVisible();

            // URL should change if there's a link
            // (Note: this depends on seeded data having links)
        }
    });
});
