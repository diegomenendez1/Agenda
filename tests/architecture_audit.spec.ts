
import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('SaaS Security & Architecture Audit', () => {

    test('AC-001: Member access to Workspace Admin is strictly prohibited', async ({ page }) => {
        // Login as Member (tester@test.com)
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.fill('input[type="email"]', 'tester@test.com');
        await page.fill('input[type="password"]', '123456');
        await page.click('button[type="submit"]');

        await expect(page.locator('text=Inbox').first()).toBeVisible({ timeout: 15000 });

        // Check sidebar: Workspace Admin should NOT exist
        const adminLink = page.locator('text=Workspace Admin');
        await expect(adminLink).toBeHidden();

        // Force navigation to /admin
        await page.goto('/admin');
        await expect(page.getByText('Access Denied')).toBeVisible();
    });

    test('AC-002: AI Context Isolation check (Persistence)', async ({ page }) => {

        // Login as Admin (diegomenendez1@gmail.com)
        await page.goto('/');
        const email = TEST_CREDENTIALS.OWNER_EMAIL;
        const password = TEST_CREDENTIALS.OWNER_PASSWORD;
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');

        await expect(page.locator('text=Inbox').first()).toBeVisible({ timeout: 20000 });

        await page.goto('/admin');
        await expect(page.getByText('Workspace Admin')).toBeVisible({ timeout: 10000 });

        // Select 'Karol Enciso' row to test updating ANOTHER user
        const karolRow = page.locator('tr').filter({ hasText: 'Karol Enciso' });
        await expect(karolRow).toBeVisible();

        const botButton = karolRow.locator('button[title="Configure AI Context"]');
        await botButton.click();

        const testPrompt = `Compliance Audit ${Date.now()}`;
        await page.fill('textarea', testPrompt);
        await page.click('button:has-text("Save Changes")');

        // Wait for success toast and modal to close
        await expect(page.locator('text=AI Context updated successfully')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=AI Context Settings')).toBeHidden();

        // Verify Persistence (Reload and check)
        await page.reload();
        await expect(page.getByText('Workspace Admin')).toBeVisible({ timeout: 10000 });

        await karolRow.locator('button[title="Configure AI Context"]').click();
        await expect(page.locator('textarea')).not.toHaveValue('', { timeout: 10000 });
        const value = await page.inputValue('textarea');
        expect(value).toBe(testPrompt);
    });

    test('AC-003: No Ghost Invitation flows in Workspace Admin', async ({ page }) => {
        // Login as Admin
        await page.goto('/');
        await page.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await page.click('button[type="submit"]');

        await page.goto('/admin');

        // Check for old "Invite" buttons or "Pending Invitations" text
        await expect(page.getByText('Pending Invitations')).toBeHidden();
        const inviteBtn = page.locator('button:has-text("Invite")');
        // If there are buttons with "Invite", ensure they are NOT the ones from before
        // The current Admin Console has NO Invite buttons.
        const inviteCount = await inviteBtn.count();
        expect(inviteCount).toBe(0);
    });

    test('AC-004: My Team as central Invitational Hub', async ({ page }) => {
        // Login as Admin/Manager
        await page.goto('/');
        await page.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await page.click('button[type="submit"]');

        // Go to My Team
        await page.click('text=Team');
        await expect(page.getByText('Pending Invitations')).toBeVisible();
        await expect(page.locator('button:has-text("Invite Member")')).toBeVisible();
    });
});
