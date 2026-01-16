import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('Inbox - Production Verification', () => {

    // Unique item text
    const ITEM_TEXT = `Idea ${Date.now()}`;
    const EDITED_TEXT = `${ITEM_TEXT} (Refined)`;

    test.beforeEach(async ({ page }) => {
        // Authenticate
        await page.goto('/auth');
        await page.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page.locator('h1')).toContainText('Inbox', { timeout: 15000 });

        // Ensure we are on Inbox (Auth redirects there usually, but safe check)
        if (!page.url().includes('/inbox')) {
            await page.goto('/inbox');
        }
    });

    test('1. Rapid Capture', async ({ page }) => {
        // Locate Smart Input
        const input = page.getByPlaceholder(/Ask me anything/i);
        await expect(input).toBeVisible();

        // Type and Enter
        await input.fill(ITEM_TEXT);
        await input.press('Enter');

        // Verify it appears in the list
        await expect(page.getByText(ITEM_TEXT)).toBeVisible();

        // Check Source Icon (Manual = User icon usually, or generic)
        const newItemRow = page.locator('div').filter({ hasText: ITEM_TEXT }).last();
        await expect(newItemRow.getByText('manual')).toBeVisible();
    });

    test('2. Inline Editing', async ({ page }) => {
        // Find the item we just created
        const itemRow = page.locator('div').filter({ hasText: ITEM_TEXT }).last();

        // Click Edit button (Pencil)
        // It appears on hover, so force click or hover first
        await itemRow.hover();
        const editBtn = itemRow.getByTitle('Edit');
        await editBtn.click({ force: true });

        // Textarea should appear
        const textarea = itemRow.locator('textarea');
        await expect(textarea).toBeVisible();
        await expect(textarea).toHaveValue(ITEM_TEXT);

        // Edit
        await textarea.fill(EDITED_TEXT);
        // Save
        await itemRow.getByText('Save', { exact: true }).click();

        // Verify Update
        await expect(page.getByText(EDITED_TEXT)).toBeVisible();
        await expect(page.getByText(ITEM_TEXT)).not.toBeVisible();
    });

    test('3. Bulk Selection & Delete', async ({ page }) => {
        // Activate Selection Mode
        await page.getByText('Select Multiple').click();

        // Select the item (EDITED_TEXT)
        const itemRow = page.locator('div').filter({ hasText: EDITED_TEXT }).last();
        // The click handler on the row toggles selection in this mode
        await itemRow.click();

        // Verify Checkbox state (visual check: bg-violet-500/5 or similar)
        // We'll check the metadata: "1 items selected"
        await expect(page.getByText('1 items selected')).toBeVisible();

        // Delete
        // Handle Confirm Dialog
        page.on('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Delete Items' }).click();

        // Verify Removal
        await expect(page.getByText(EDITED_TEXT)).not.toBeVisible();

        // Verify Exit Selection Mode (Delete exits mode)
        await expect(page.getByText('Select Multiple')).toBeVisible(); // Button resets
    });

});
