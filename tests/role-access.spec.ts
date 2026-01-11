
import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control', () => {

    // Test 1: Admin/Owner Access
    test('Admin (Lead) can access Admin Console', async ({ page }) => {
        // 1. Login as Lead
        await page.goto('/');
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.reload();

        await page.fill('input[type="email"]', 'lead@test.com');
        await page.fill('input[type="password"]', 'SocialTest.2026');
        await page.click('button[type="submit"]');

        // Wait for Login Success (Inbox)
        await expect(page.locator('text=Inbox').first()).toBeVisible({ timeout: 15000 });

        // 2. Verify Sidebar Link
        const adminLink = page.locator('a[href="/admin"]');
        await expect(adminLink).toBeVisible({ timeout: 10000 });
        await adminLink.click();

        // 3. Verify Admin Console
        await expect(page.getByText('Admin Console')).toBeVisible();
        await expect(page.getByText('Manage workspace members')).toBeVisible();
    });

    // Test 2: User Access Denial
    test('User (Developer) is denied access to Admin Console', async ({ page }) => {
        try {
            // 1. Login as Dev
            await page.goto('/');
            await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
            await page.reload();

            await page.fill('input[type="email"]', 'dev@test.com');
            await page.fill('input[type="password"]', 'SocialTest.2026');
            await page.click('button[type="submit"]');

            // Wait for Login Success (Inbox) to ensure session is active
            await expect(page.locator('text=Inbox').first()).toBeVisible({ timeout: 15000 });

            // 2. Verify Sidebar Link NOT visible
            const adminLink = page.locator('a[href="/admin"]');
            await expect(adminLink).toBeHidden();

            // 3. Force Navigation
            await page.goto('/admin');

            // 4. Verify Access Denied
            console.log("Checking for Access Denied message...");
            await expect(page.getByText('Access Denied')).toBeVisible({ timeout: 5000 });
            await expect(page.getByText('restricted to workspace administrators')).toBeVisible();
        } catch (e) {
            console.error("Test Failed: Dev access check", e);
            await page.screenshot({ path: 'dev-admin-failure.png' });
            throw e;
        }
    });

    // Test 3: Team Board Visibility (God Mode vs Isolation)
    test('Team Board: Owner sees all, User sees only assigned', async ({ page }) => {
        const taskTitle = 'Main Stage UX Polish';

        // 1. Login as Lead (Owner/Admin)
        await page.goto('/');
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.reload();

        await page.fill('input[type="email"]', 'lead@test.com');
        await page.fill('input[type="password"]', 'SocialTest.2026');
        await page.click('button[type="submit"]');

        // Wait for Dashboard
        await expect(page.locator('text=Inbox').first()).toBeVisible({ timeout: 15000 });

        // Check Team Board
        await page.click('text=Team');
        await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible();

        // 2. Login as Developer (User)
        await page.goto('/');
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.reload();

        await page.fill('input[type="email"]', 'dev@test.com');
        await page.fill('input[type="password"]', 'SocialTest.2026');
        await page.click('button[type="submit"]');

        // Wait for Dashboard
        await expect(page.locator('text=Inbox').first()).toBeVisible({ timeout: 15000 });

        // Check Team Board
        await page.click('text=Team');
        await expect(page.locator(`text=${taskTitle}`).first()).toBeHidden();
    });

});
