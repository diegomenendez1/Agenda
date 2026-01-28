
import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('Invitation Visibility Standards', () => {

    // Generate unique email for this test run
    const INVITEE_EMAIL = `visibility_check_${Date.now()}@example.com`;

    test('Owner should see invitations created by Head', async ({ browser }) => {
        // 1. HEAD invites someone
        const headContext = await browser.newContext();
        const headPage = await headContext.newPage();

        console.log('--- Logging in as Global Head ---');
        await headPage.goto('/login');
        await headPage.fill('input[type="email"]', TEST_CREDENTIALS.HEAD_EMAIL);
        await headPage.fill('input[type="password"]', TEST_CREDENTIALS.HEAD_PASSWORD);
        await headPage.click('button[type="submit"]');
        await expect(headPage).toHaveURL(/\/inbox/);

        // Go to Team and Invite
        await headPage.goto('/my-team');
        await headPage.getByText('Invite Member').click();
        await expect(headPage.getByRole('heading', { name: 'Invite Team Member' })).toBeVisible();

        await headPage.fill('input[type="email"]', INVITEE_EMAIL);
        await headPage.click('button:has-text("Send Invitation")');

        // Wait for modal to close and success toast
        await expect(headPage.getByRole('heading', { name: 'Invite Team Member' })).not.toBeVisible();
        await expect(headPage.getByText('Invitation sent')).toBeVisible();

        // Allow UI to settle
        await headPage.waitForTimeout(1000);

        // Verify locally for Head first
        // await headPage.getByTestId('tab-invitations').click();
        // await expect(headPage.getByText(INVITEE_EMAIL)).toBeVisible();

        await headContext.close();

        // 2. OWNER checks visibility
        const ownerContext = await browser.newContext();
        const ownerPage = await ownerContext.newPage();

        console.log('--- Logging in as Owner ---');
        await ownerPage.goto('/login');
        await ownerPage.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await ownerPage.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await ownerPage.click('button[type="submit"]');
        await expect(ownerPage).toHaveURL(/\/inbox/);

        // Go to Team -> Invitations
        await ownerPage.goto('/my-team');
        await ownerPage.getByTestId('tab-invitations').click();

        // FINAL ASSERTION: The Owner MUST see the invitation made by the Head
        const inviteRow = ownerPage.locator('div').filter({ hasText: INVITEE_EMAIL }).first();
        await expect(inviteRow).toBeVisible({ timeout: 10000 });

        console.log(`CONFIRMED: Owner can see invitation for ${INVITEE_EMAIL} created by Head.`);

        // Clean up: Owner revokes it
        ownerPage.once('dialog', dialog => dialog.accept());
        await inviteRow.getByText('Revoke').click();
        await expect(ownerPage.getByText('Invitation revoked')).toBeVisible();

        await ownerContext.close();
    });
});
