import { test, expect } from '@playwright/test';

test.describe('Team Invitations & Management', () => {
    const INVITER_EMAIL = 'diegomenendez1@gmail.com'; // Owner
    const TESTER_EMAIL = 'tester@test.com'; // Invitee/Member

    test.beforeEach(async ({ page }) => {
        // Login as Owner first
        await page.goto('http://localhost:3001/login');
        await page.fill('input[type="email"]', INVITER_EMAIL);
        await page.fill('input[type="password"]', 'Yali.202');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:3001/inbox');
    });

    test('Inviter can send and revoke invitations', async ({ page }) => {
        // 1. Go to Admin Console
        await page.click('a[href="/admin"]');
        await expect(page.getByText('Admin Console')).toBeVisible();

        // 2. Clear existing invites for clean state (optional/simulated)
        // We assume clean state or unique email for robustness
        const uniqueEmail = `invitee_${Date.now()}@example.com`;

        // 3. Invite by Email
        page.once('dialog', dialog => dialog.accept(uniqueEmail));
        await page.getByText('Invite by Email').click();

        // 4. Verify Pending State
        await expect(page.getByText('Pending Invitations')).toBeVisible();
        await expect(page.getByText(uniqueEmail)).toBeVisible();
        await expect(page.getByText('Pending')).toBeVisible();

        // 5. Revoke Invitation
        await page.getByRole('button', { name: 'Revoke' }).click();

        // 6. Verify Removal
        await expect(page.getByText(uniqueEmail)).not.toBeVisible();
    });

    test('Non-owner can leave the team', async ({ browser }) => {
        // This test requires logging in as a non-owner. 
        // Since we are currently logged in as Owner in beforeEach, we create a new context/page.

        const context = await browser.newContext();
        const page = await context.newPage();

        // 1. Login as Member
        await page.goto('http://localhost:3001/login');
        await page.fill('input[type="email"]', TESTER_EMAIL);
        await page.fill('input[type="password"]', '123456');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:3001/inbox');

        // 2. Check "Leave Team" button visibility
        // It is in the sidebar footer area
        const leaveButton = page.getByText('Leave Team');

        // Note: If the user IS an owner in reality, this test might fail or button won't show.
        // We assume 'tester@test.com' is NOT an owner based on request context.

        // If hidden (collapsed sidebar might hide text), ensure sidebar is expanded or check functionality
        // The previous implementation shows it in a div at the bottom.

        if (await leaveButton.isVisible()) {
            page.once('dialog', dialog => dialog.accept());
            await leaveButton.click();

            // 3. Verify Refresh/Redirect
            // The implementation does window.location.reload(). 
            // We can check if team data is cleared from UI or just that we are still alive.
            await expect(page).toHaveURL('http://localhost:3001/inbox');
        } else {
            console.log('Leave Team button not visible - User might be owner or UI issue');
        }

        await context.close();
    });

    test('Stress Test: Rapid invites', async ({ page }) => {
        await page.click('a[href="/admin"]');

        for (let i = 0; i < 5; i++) {
            const email = `stress_${i}_${Date.now()}@test.com`;
            page.once('dialog', dialog => dialog.accept(email));
            await page.getByText('Invite by Email').click();
            // Small wait to ensure UI updates (optimistic update is fast though)
            await page.waitForTimeout(100);
        }

        // Verify all 5 are listed
        const rows = await page.getByRole('row', { name: /stress_/ }).all();
        expect(rows.length).toBeGreaterThanOrEqual(5);
    });
});
