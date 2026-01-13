import { test, expect } from '@playwright/test';

// Credentials from User Request
const LEAD_USER = { email: 'diego.menendez@gmail.com', pass: 'Yali.202' };
const TESTER_USER = { email: 'tester@test.com', pass: '123456' };

test.describe('Task Review Flow & Security', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/auth');
        // Clear local storage and session storage to ensure a clean state
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
    });

    test('Tester cannot move Lead\'s task to Done directly (forces Review)', async ({ page }) => {
        // 1. Lead creates a task and assigns Tester
        await page.fill('input[type="email"]', LEAD_USER.email);
        await page.fill('input[type="password"]', LEAD_USER.pass);
        await page.click('button[type="submit"]');

        const taskTitle = `Review Test ${Date.now()}`;

        // Wait for inbox to load before clicking Add
        await expect(page.locator('h1:has-text("Inbox")')).toBeVisible({ timeout: 15000 });
        await page.click('button:has-text("Add")');

        await page.fill('input[placeholder*="Task Title"]', taskTitle);

        // Assign Tester
        await page.click('button:has-text("Share / Delegate")');
        await page.fill('input[placeholder*="Find member"]', 'tester');
        await page.click(`button:has-text("tester")`);

        await page.click('button:has-text("Save Changes")');
        await expect(page.locator(`text="${taskTitle}"`)).toBeVisible();

        // Sign Out
        await page.click('button:has-text("Sign Out")');

        // 2. Tester tries to mark it as Done
        await page.goto('/auth');
        await page.fill('input[type="email"]', TESTER_USER.email);
        await page.fill('input[type="password"]', TESTER_USER.pass);
        await page.click('button[type="submit"]');

        // Find the task and open it
        await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({ timeout: 15000 });
        await page.click(`text="${taskTitle}"`);

        // Select 'Done' in the dropdown
        await page.selectOption('select', { label: 'Done' });

        // Button should change text to "Submit for Review"
        await expect(page.locator('button:has-text("Submit for Review")')).toBeVisible();
        await page.click('button:has-text("Submit for Review")');

        // Verify state is 'review', not 'done'
        await expect(page.locator(`text="${taskTitle}"`)).toBeVisible();
        await page.click(`text="${taskTitle}"`);
        const statusValue = await page.locator('select').inputValue();
        expect(statusValue).toBe('review');

        await page.click('button:has-text("Sign Out")');

        // 3. Lead approves it
        await page.goto('/auth');
        await page.fill('input[type="email"]', LEAD_USER.email);
        await page.fill('input[type="password"]', LEAD_USER.pass);
        await page.click('button[type="submit"]');

        await expect(page.locator(`text="${taskTitle}"`)).toBeVisible({ timeout: 15000 });
        await page.click(`text="${taskTitle}"`);

        // Lead should see "Approve & Complete"
        await expect(page.locator('button:has-text("Approve & Complete")')).toBeVisible();
        await page.click('button:has-text("Approve & Complete")');

        // Verify it's now Done
        await expect(page.locator(`text="${taskTitle}"`)).toBeVisible();
        await page.click(`text="${taskTitle}"`);
        const finalStatus = await page.locator('select').inputValue();
        expect(finalStatus).toBe('done');
    });

    test('Unauthorized user cannot see private tasks', async ({ page }) => {
        // 1. Lead creates Private Task
        await page.fill('input[type="email"]', LEAD_USER.email);
        await page.fill('input[type="password"]', LEAD_USER.pass);
        await page.click('button[type="submit"]');

        const privateTitle = `Secret ${Date.now()}`;
        await expect(page.locator('h1:has-text("Inbox")')).toBeVisible({ timeout: 15000 });
        await page.click('button:has-text("Add")');
        await page.fill('input[placeholder*="Task Title"]', privateTitle);
        await page.click('button:has-text("Save Changes")');

        await expect(page.locator(`text="${privateTitle}"`)).toBeVisible();
        await page.click('button:has-text("Sign Out")');

        // 2. Tester should NOT see it
        await page.goto('/auth');
        await page.fill('input[type="email"]', TESTER_USER.email);
        await page.fill('input[type="password"]', TESTER_USER.pass);
        await page.click('button[type="submit"]');

        await page.waitForTimeout(2000); // Wait for potential async load
        const taskElement = page.locator(`text="${privateTitle}"`);
        await expect(taskElement).not.toBeVisible();
    });
});
