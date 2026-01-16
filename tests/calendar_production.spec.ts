import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('Calendar - Production Verification', () => {

    // Unique task title for this run
    const TASK_TITLE = `CalTask ${Date.now()}`;

    test.beforeEach(async ({ page }) => {
        // Authenticate
        await page.goto('/auth');
        await page.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page.locator('h1')).toContainText('Inbox', { timeout: 15000 });

        // Navigate to Calendar
        // Assuming navigation link exists or direct URL
        await page.goto('/calendar');
        // Header contains "Month Year" (e.g. October 2023). Check for Calendar Icon or generic header text.
        await expect(page.locator('.lucide-calendar').first()).toBeVisible();
    });

    test('1. Grid & Navigation', async ({ page }) => {
        // Verify Day Headers (Mon, Tue, Wed...)
        // We look for typical day names. Format is 'EEE' (Sun, Mon...)
        // Let's just check for 'TIME' column header which is static
        await expect(page.getByText('TIME')).toBeVisible();

        // Verify "Today" button works (presence check mostly)
        const todayButton = page.getByRole('button', { name: 'Today' });
        await expect(todayButton).toBeVisible();
        await todayButton.click();

        // Visual sanity check: current time indicator
        // The red line for "Today" should be present if we are on current week
        // Locator based on class 'bg-red-500' or similar distinctive style
        await expect(page.locator('.border-red-500')).toBeVisible();
    });

    test('2. Task Creation via Click', async ({ page }) => {
        // Click on a slot. e.g. Mon 9:00 AM (approx position or using nth)
        // Since slots are generated in a loop, we pick one arbitrary slot container
        const slots = page.locator('.group\\/cell'); // Escaping slash for CSS selector
        // Wait for slots to load
        await slots.first().waitFor();

        // Hover and Click the "Plus" button that appears or just double click?
        // Code says: onClick={() => handleSlotClick(day, hour)} -> renders EditTaskModal
        // The slot has a BUTTON inside it for the '+' icon
        // Let's click the first available '+' button
        const firstPlusBtn = slots.nth(10).locator('button'); // 10th slot (e.g. 10am Mon)

        // Force click because it might be opacity-0 until hover
        await firstPlusBtn.click({ force: true });

        // Verify Modal Opens
        await expect(page.getByText('Create Task')).toBeVisible(); // Or similar modal title

        // Close it
        await page.keyboard.press('Escape');
    });

    test('3. Drag & Drop Scheduling', async ({ page }) => {
        // 1. Create a task with specific time for Today 8:00 AM
        // We'll use the API/Store shortcut if possible, or just create one via UI.
        // Let's use UI creation for robustness.

        const slots = page.locator('.group\\/cell');
        const slot8am = slots.nth(8); // row 8 (0-23) -> 8am. Assuming flat list order (Mon 0-23, Tue 0-23...)
        // Actually grid is: Day Columns -> Hour Cells. 
        // Code: {weekDays.map... {hours.map...}} 
        // So correct logic: First Column (Mon) -> 8th child (8am)

        const firstDayCol = page.locator('.group\\/column').first();
        const cell8am = firstDayCol.locator('.group\\/cell').nth(8);

        await cell8am.locator('button').click({ force: true });

        // Fill Modal
        // Fill Modal
        const taskTitleInput = page.getByPlaceholder('Task Title');
        await taskTitleInput.waitFor();
        await taskTitleInput.fill(TASK_TITLE);
        await page.click('button:has-text("Create Task")'); // Or "Save"

        // Verify it appears roughly in that position
        // Check for text
        const taskCard = page.getByText(TASK_TITLE).first();
        await expect(taskCard).toBeVisible();

        // 2. Drag to 12:00 PM (nth 12)
        const cell12pm = firstDayCol.locator('.group\\/cell').nth(12);

        await taskCard.dragTo(cell12pm);

        // Verify text still visible (it shouldn't disappear)
        await expect(taskCard).toBeVisible();

        // Optional: Open it and verify time changed? 
        // Can read the text "12:00" in the metadata row if rendered
        await expect(page.getByText('12:00')).toBeVisible();
    });

});
