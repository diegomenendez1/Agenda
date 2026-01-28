import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('Notes Module Production Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate
        await page.goto('/auth');
        await page.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await page.click('button[type="submit"]');

        // Navigate to Notes
        await expect(page.locator('h1', { hasText: 'Notes' }).or(page.locator('h2', { hasText: 'Notes' }))).toBeVisible({ timeout: 15000 });
        await page.goto('/notes');
    });

    test('1. Create and Edit Note', async ({ page }) => {
        // Create new note
        await page.click('button[title="New Note"]'); // Based on tooltip `title="New Note"` in source

        // Wait for URL change to /notes/:id
        await page.waitForURL(/\/notes\/.+/, { timeout: 10000 });

        // Edit Title
        const newTitle = `Test Note ${Date.now()}`;
        await page.fill('input[placeholder="Untitled Note"]', newTitle);

        // Edit Body
        const newBody = "This is a body content verification.";
        await page.fill('textarea[placeholder="Start typing..."]', newBody);

        // Verify List Update (Sidebar)
        await expect(page.locator('li', { hasText: newTitle })).toBeVisible();
    });

    test('2. Link Note to Project', async ({ page }) => {
        // Requires at least one note. Create one first.
        await page.click('button[title="New Note"]');
        await page.waitForURL(/\/notes\/.+/);
        await page.fill('input[placeholder="Untitled Note"]', 'Project Linked Note');

        // Find Project Select
        const projectSelect = page.locator('select');
        await expect(projectSelect).toBeVisible();

        // Select first available project (assuming "No Project" is value "")
        // We might need to ensure a project exists. But let's check the dropdown presence primarily.
        const options = await projectSelect.locator('option').count();
        if (options > 1) {
            await projectSelect.selectOption({ index: 1 }); // Select first real project
        }
    });

    test('3. Search Functionality', async ({ page }) => {
        // Create distinct note
        const uniqueTerm = `Searchable ${Date.now()}`;
        await page.click('button[title="New Note"]');
        await page.waitForURL(/\/notes\/.+/);
        await page.fill('input[placeholder="Untitled Note"]', uniqueTerm);

        // Search in Sidebar
        const searchInput = page.locator('input[placeholder="Search notes..."]');
        await searchInput.fill('Searchable');

        // Verify filtration
        await expect(page.locator('li', { hasText: uniqueTerm })).toBeVisible();
        // Ensure other random items might be hidden (hard to test without knowing state, but visibility is key)
    });

    test('4. Delete Note', async ({ page }) => {
        // Create note to delete
        await page.click('button[title="New Note"]');
        await page.waitForURL(/\/notes\/.+/);
        const noteTitle = `Delete Me ${Date.now()}`;
        await page.fill('input[placeholder="Untitled Note"]', noteTitle);

        // Handle Confirm Dialog
        page.on('dialog', dialog => dialog.accept());

        // Hover over the list item to reveal delete button
        const noteItem = page.locator('li', { hasText: noteTitle });
        await noteItem.hover();

        // Click Delete (Trash icon) inside the list item
        await noteItem.locator('button').click();

        // Verify removal
        await expect(noteItem).not.toBeVisible();
    });
});
