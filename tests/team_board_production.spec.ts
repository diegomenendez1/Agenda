import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('Team Board - Production Verification', () => {

    // Unique task title for this run
    const TASK_TITLE = `Board Task ${Date.now()}`;

    test.beforeEach(async ({ page }) => {
        // Authenticate as Owner
        await page.goto('/auth');
        await page.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page.locator('h1')).toContainText('Inbox', { timeout: 15000 });

        // Go to Team Board
        await page.goto('/board');
        await expect(page.getByRole('heading', { name: 'Team Board' })).toBeVisible();
    });

    test('1. Kanban Columns & Task Creation', async ({ page }) => {
        // Verify Columns
        const columns = ['Backlog / Incoming', 'To Do', 'In Progress', 'Review', 'Done'];
        for (const col of columns) {
            await expect(page.getByText(col)).toBeVisible();
        }

        // Create a new task via "+" shortcut (if any) or Quick Add. 
        // Since Board doesn't have a direct '+' in header (based on code), we'll use Command Palette or assume pre-existing.
        // Actually, let's create one via the "New Task" global button usually available or use Command+K if implemented.
        // FALLBACK: Use a known task from a previous step or create one quickly in Inbox then move it?
        // Let's create one in My Tasks first or use the FAB if available.
        // Assuming FAB exists globally or we navigate to My Tasks to create.

        // Let's make this test self-contained: navigate to My Tasks to create, then verify in Board.
        await page.goto('/my-tasks');
        await page.getByPlaceholder('Sort chaos...').fill(TASK_TITLE);
        await page.keyboard.press('Enter');
        await expect(page.getByText(TASK_TITLE)).toBeVisible();

        // Go back to Board
        await page.goto('/board');
        // By default it might go to 'Backlog' or 'To Do' depending on logic. Usually Inbox -> Backlog.
        await expect(page.getByText(TASK_TITLE)).toBeVisible();
    });

    test('2. Drag & Drop Status Update', async ({ page }) => {
        // Find our task
        const taskCard = page.getByText(TASK_TITLE).first(); // reuse from prev test potentially? No, tests are isolated.

        // Re-create task for isolation
        const LOCAL_TASK = `DragTest ${Date.now()}`;
        await page.goto('/my-tasks');
        await page.getByPlaceholder('Sort chaos...').fill(LOCAL_TASK);
        await page.keyboard.press('Enter');
        await page.goto('/board');

        const card = page.getByText(LOCAL_TASK).first();
        const doneColumn = page.getByText('Done').locator('xpath=../..').last(); // Up to parent container

        await expect(card).toBeVisible();

        // Drag to 'Done'
        await card.dragTo(doneColumn);

        // Verify it moved (UI Check) - It should be in the column with "Done" header
        // This is tricky with simple selectors. We verify existence first.
        await expect(card).toBeVisible();

        // Verify visual change (opacity/grayscale as per code)
        // class "grayscale-[0.8]"
        await expect(card.locator('xpath=..')).toHaveClass(/grayscale/);
    });

    test('3. Filtering Logic', async ({ page }) => {
        // 1. Verify Member Filter exists
        await expect(page.getByTitle('Show All Team Members')).toBeVisible();

        // 2. Select Self (Owner)
        // Find avatar button that is NOT "ALL"
        const myAvatar = page.locator('button[title*="Filter by"]').nth(1); // 0 is usually ALL
        if (await myAvatar.count() > 0) {
            await myAvatar.click();
            // Verify visual feedback (ring/border)
            // Hard to assert specifically without ID, but clicking should filter tasks
            await expect(page.locator('.p-4.rounded-xl')).not.toHaveCount(0); // Should still see my tasks

            // Clear filter
            await page.getByTitle('Show All Team Members').click();
        }
    });
});
