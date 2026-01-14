
import { test, expect } from '@playwright/test';

test.describe('Clear Completed Stress Test', () => {

    // Helper to seed tasks directly into the store
    async function seedCompletedTask(page: any, title: string) {
        await page.evaluate(async (taskTitle: string) => {
            // @ts-ignore
            const store = window.useStore?.getState ? window.useStore : null;
            // Note: we need to access the store instance. 
            // If useStore is not exposed to window, we cannot do this.
            // We will assume for this test we CANNOT access window.useStore easily unless exposed.
            // So we might need another way or verify if we can expose it.

            // Actually, let's stick to UI if we can, OR expose store in main.tsx/App.tsx for testing.
            // But modifying App code for testing isn't ideal in this flow.

            // Let's try to populate via the "Smart Input" if it exists in Sidebar or CommandPalette? 
            // No, that's Inbox.

            // Let's try filling the task via the UI "Task Title" placeholder which IS in EditTaskModal
            // IF we can open it.

            // Let's Dispatch the event!
            window.dispatchEvent(new CustomEvent('open-task-modal'));
        }, title);
    }

    test('Happy Path: Should clear completed tasks', async ({ page }) => {
        await page.goto('/tasks');

        // 1. Create Task via UI (using Event Dispatch to open modal)
        const taskName = `Task to Delete ${Date.now()}`;

        // Open Modal
        await page.getByRole('button', { name: 'New Task' }).click();

        // Fill Modal
        await expect(page.getByPlaceholder('Task Title')).toBeVisible();
        await page.getByPlaceholder('Task Title').fill(taskName);

        // Save
        await page.getByRole('button', { name: 'Save Changes' }).click();
        await expect(page.getByPlaceholder('Task Title')).toBeHidden();

        // Verify Created
        await expect(page.getByText(taskName)).toBeVisible();

        // Mark as Done (Checkbox)
        // Finding the specific checkbox for the row
        // Assuming the row contains the text and a checkbox
        await page.getByRole('checkbox', { name: taskName }).check();

        // Wait for "Clear Completed" button (it appears when logic matches)
        await expect(page.getByRole('button', { name: 'Clear Completed' })).toBeVisible();

        // Clear
        page.on('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Clear Completed' }).click();

        // Verify Gone
        await expect(page.getByText(taskName)).toBeHidden();
    });

    test('Rollback: Should restore task if Network Fails', async ({ page }) => {
        await page.goto('/tasks');
        const taskName = `Zombie Task ${Date.now()}`;

        // Create
        await page.getByRole('button', { name: 'New Task' }).click();
        await page.getByPlaceholder('Task Title').fill(taskName);
        await page.getByRole('button', { name: 'Save Changes' }).click();

        // Complete
        await page.getByRole('checkbox', { name: taskName }).check();
        await expect(page.getByRole('button', { name: 'Clear Completed' })).toBeVisible();

        // Intercept DELETE
        await page.route('**/rest/v1/tasks*', async route => {
            if (route.request().method() === 'DELETE') {
                // console.log('Aborting DELETE');
                await route.abort('internet-disconnected');
            } else {
                await route.continue();
            }
        });

        // Action
        page.on('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Clear Completed' }).click();

        // Verify Rollback (Task should be visible)
        await expect(page.getByText(taskName)).toBeVisible({ timeout: 5000 });
    });
});
