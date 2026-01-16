
import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

const initialUsers = {
    primary: {
        email: 'diegomenendez1@gmail.com',
        password: 'Yali.202'
    }
};


test.describe('Smart Input Detection & AI Context', () => {

    test('Should detect Manual input correctly (Fast Task)', async ({ page }) => {
        // Login
        await page.goto('/');
        await page.getByPlaceholder('Email').fill(initialUsers.primary.email);
        await page.getByPlaceholder('Password').fill(initialUsers.primary.password);
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page.locator('h1')).toContainText('Inbox');

        // Type a long manual task (should NOT be email)
        const manualText = "This is a very long manual task note that should be detected as manual input because it lacks specific email headers despite being quite verbose and descriptive about the task at hand.";

        await page.getByPlaceholder('Ask me anything, or paste an entire email chain...').fill(manualText);

        // Check for "Fast Task" badge (which means Manual/Voice default)
        await expect(page.locator('text=Fast Task')).toBeVisible();
        await expect(page.locator('text=Email Context')).not.toBeVisible();

        // Capture
        await page.keyboard.press('Control+Enter');

        // Verify it appears in the list (wait for network/store update)
        await expect(page.locator('.text-text-primary').first()).toContainText(manualText);
    });

    test('Should detect Email input correctly', async ({ page }) => {
        // Login
        await page.goto('/');
        await page.getByPlaceholder('Email').fill(initialUsers.primary.email);
        await page.getByPlaceholder('Password').fill(initialUsers.primary.password);
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Paste an email
        const emailText = `From: Boss\nSubject: Critical Issue\nTo: Me\n\nPlease fix the server ASAP.`;

        await page.getByPlaceholder('Ask me anything, or paste an entire email chain...').fill(emailText);

        // Check for "Email Context" badge
        await expect(page.locator('text=Email Context')).toBeVisible();
        await expect(page.locator('text=Fast Task')).not.toBeVisible();

        // Capture
        await page.keyboard.press('Control+Enter');

        // Verify item in list has Mail icon (blue background)
        // We look for the container with blue text/bg which indicates email source
        await expect(page.locator('.text-blue-500').first()).toBeVisible();
    });

    test('Should detect Voice Transcript detected but UI might be ambiguous', async ({ page }) => {
        // Login
        await page.goto('/');
        await page.getByPlaceholder('Email').fill(initialUsers.primary.email);
        await page.getByPlaceholder('Password').fill(initialUsers.primary.password);
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Paste a transcript
        const voiceText = `[00:01] Speaker A: Hello there.\n[00:05] Speaker B: Let's discuss the project.\nWe need to deploy by Friday.`;

        await page.getByPlaceholder('Ask me anything, or paste an entire email chain...').fill(voiceText);

        // CURRENT EXPECTATION: It likely shows "Fast Task" because we haven't implemented a specific Voice badge in UI yet.
        // This test serves to DOCUMENT the finding.
        const fastTaskVisible = await page.locator('text=Fast Task').isVisible();
        const emailContextVisible = await page.locator('text=Email Context').isVisible();

        console.log(`Voice Input - Fast Task Visible: ${fastTaskVisible}`);
        console.log(`Voice Input - Email Context Visible: ${emailContextVisible}`);

        // We assert it is NOT Email Context
        expect(emailContextVisible).toBeFalsy();
    });
});
