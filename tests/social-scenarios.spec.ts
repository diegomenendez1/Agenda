
import { test, expect } from '@playwright/test';

test.describe('Social Scenarios UI', () => {

    test('Lead can view task and add comment', async ({ page }) => {
        try {
            await page.goto('/');

            // Force Logout
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });
            await page.reload();

            // Login
            console.log("Logging in...");
            await page.fill('input[type="email"]', 'lead@test.com');
            await page.fill('input[type="password"]', 'SocialTest.2026');
            await page.click('button[type="submit"]');

            // Navigate to Projects
            console.log("Navigating to Projects...");
            await page.click('text=Projects'); // Sidebar

            // Open Project
            console.log("Opening Project...");
            await page.click('text=Launch Event 2026');

            // Project Detail View Defaults to LIST view usually? 
            // We see buttons for toggling view.
            // Let's verify we can find the task in the list first, OR switch to Kanban if we want to test that.
            // The original goal is to click the task. List view works fine for that.

            // Find task in List or Board
            console.log("Locating Task...");
            const taskLocator = page.locator('text=Main Stage UX Polish').first();
            await expect(taskLocator).toBeVisible({ timeout: 10000 });

            console.log("Opening Task Details...");
            await taskLocator.click();

            // Activity Feed Check
            console.log("Verifying Activity Feed...");
            await expect(page.getByText('Activity & Comments')).toBeVisible({ timeout: 10000 });

            // Post Comment
            console.log("Posting Comment...");
            await page.getByPlaceholder('Write a comment...').fill('Playwright UI Verification');
            await page.keyboard.press('Enter');

            // Verify
            await expect(page.getByText('Playwright UI Verification').first()).toBeVisible();
            console.log("Success!");

        } catch (error) {
            console.error("Test Failed!", error);
            await page.screenshot({ path: 'test-failure.png', fullPage: true });
            throw error;
        }
    });

});
