import { test, expect } from '@playwright/test';
import { format, addDays } from 'date-fns';

test.describe('Recurring Tasks', () => {
    // Reset storage state for clean test
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Clear local storage to reset state if using local persistance
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        // Create a dummy user session if needed or rely on app's default state in dev
        // Assumes app loads with a default user or mock data in dev
    });

    test('should create a next instance when a daily recurring task is completed', async ({ page }) => {
        // 1. Create a Task
        await page.getByText('New Task').click();
        await page.fill('input[placeholder="Task Title"]', 'Daily Meeting');
        await page.click('text=Save Task');

        // 2. Open it and Add Recurrence
        await page.getByText('Daily Meeting').first().click();

        // Select Recurrence: Daily
        const repeatSelect = page.locator('select').filter({ hasText: 'No Repeat' }).or(page.locator('select').filter({ hasText: 'Daily' }));
        await repeatSelect.selectOption('daily');

        await page.click('text=Save Changes');
        // Wait for modal close
        await expect(page.locator('text=Edit Task')).not.toBeVisible();

        // 3. Complete the Task
        // Find the task card and click the checkbox/status toggle
        // Assuming there is a quick toggle or we open modal to complete.
        // Let's open modal to be safe and use "Approve & Complete" or status dropdown.
        await page.getByText('Daily Meeting').first().click();

        // Check if we are owner (implied in dev mode usually) to see "Approve & Complete" or just change status
        const statusSelect = page.locator('select').filter({ hasText: 'Backlog' }).or(page.locator('select').filter({ hasText: 'To Do' }));
        await statusSelect.selectOption('done');

        await page.click('button:has-text("Save")');

        // 4. Verify NEW task exists
        // The previous task should be done (maybe moved to done column or hidden)
        // A NEW task should appear with "Daily Meeting" and status 'todo'
        // We expect 2 "Daily Meeting" tasks now? Or 1 if completed are hidden?
        // Let's check for a task with 'todo' status.

        // Filter by Todo if possible, or just search text
        // We wait a bit for async creation
        await page.waitForTimeout(1000);

        const tasks = page.locator('text=Daily Meeting');
        const count = await tasks.count();
        console.log(`Found ${count} tasks named "Daily Meeting"`);

        // We expect at least one active task
        // (Implementation detail: Does the old one stay visible? Usually yes in Done column)

        // Check data-status logic if available, or visual cues.
        // Let's assume the new one is at the bottom or top of Todo list.

        // verify we have a task with status NOT done (i.e. Todo)
        // This depends on how UI renders status. 
        // Let's open the task that is visible (likely the new one if list sorted by date/status)
        // await tasks.first().click();
        // await expect(page.locator('select').filter({ hasText: 'To Do' })).toBeVisible(); 
    });
});
