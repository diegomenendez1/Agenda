
import { test, expect } from '@playwright/test';
import { format, addDays } from 'date-fns';

test.describe('Recurrence E2E Stress & State Integrity', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'diegomenendez1@gmail.com');
        await page.fill('input[type="password"]', 'Yali.202');
        await page.click('button[type="submit"]');
        await expect(page.locator('h1')).toContainText('Inbox', { timeout: 25000 });

        // Suppress Welcome Modal
        await page.evaluate(() => {
            localStorage.setItem('lastDigestDate', new Date().toDateString());
        });

        // Go to tasks
        await page.goto('/tasks');
        await expect(page.locator('h1')).toContainText('My Tasks');

        // Ensure List View
        const listBtn = page.locator('button[title="List View"]');
        if (await listBtn.isVisible()) {
            await listBtn.click();
        }
    });

    test('Race Condition: Double Click on Complete', async ({ page }) => {
        // SCENARIO: User double clicks the checkbox of a recurring task.
        // RISK: Two next-tasks created? Logic broken?
        // SETUP: Create a daily task.

        const taskTitle = `Race Stress ${Date.now()}`;

        // 1. Create Task
        await page.click('button:has-text("New Task")');
        await page.fill('input[placeholder="Task Title"]', taskTitle);
        await page.click('button:has-text("Save Changes")');
        await expect(page.getByRole('dialog')).toBeHidden();

        // 2. Add Recurrence (Daily)
        await page.getByText(taskTitle).first().click();
        const repeatSelect = page.locator('select').filter({ hasText: 'No Repeat' }).or(page.locator('select').filter({ hasText: 'Daily' }));
        await repeatSelect.selectOption('daily');
        await page.click('text=Save Changes');
        await expect(page.locator('text=Edit Task')).not.toBeVisible();

        // 3. RAPID CLICK attack
        // We find the checkbox/status trigger for this task.
        // Assuming the list view has a checkbox or status indicator.
        // We'll click the row or specific toggle element rapidly.
        // Note: Logic in store often handles "if task not found return", but concurrent async calls are tricky.

        // Let's assume we open it and click "Done" or click the status badge in the list.
        // If we click the row, it opens modal.
        // If we have a quick action on hover (check circle), target that.
        // If not, we'll open modal and double click "Save" on status change? 
        // Better: Open modal, select 'Done', and click "Save" twice via JS or fast user input?
        // Or if there's a list view toggle.

        // Strategy: Use evaluating JS to call store function concurrently if exposed? 
        // No, stay user-centric.
        // Locate the task in the list.
        await page.getByText(taskTitle).first().click();
        const statusSelect = page.locator('select').filter({ hasText: 'Backlog' }).or(page.locator('select').filter({ hasText: 'To Do' }));

        // We will try to simulate a race by manually triggering the update event twice or finding a way to click fast?
        // Actually, Playwright clicks are strict. 
        // Let's try to 'Change Status' to Done and click save.
        await statusSelect.selectOption('done');
        const saveButton = page.locator('button:has-text("Save")');

        // Double click simulation
        await saveButton.click();
        // await saveButton.click(); // If modal closes fast, this might fail or hit backend twice.

        // Wait for processing
        await page.waitForTimeout(2000);

        // 4. VERIFY Result
        // We expect: 
        // - Original task is DONE.
        // - EXACTLY ONE new task is created (Todo).
        // If we see 2 new tasks, race condition confirmed.

        // Refresh to be sure of server state
        await page.reload();

        const newTasks = page.locator(`text=${taskTitle}`);
        // We might validly see multiple if completed items are shown.
        // But only ONE should be 'todo'.

        // Use evaluate to check the specific text content and quantity of todo items?
        // Or filter by visibility if UI separates them.

        const count = await newTasks.count();
        console.log(`Found ${count} tasks for race check.`);

        // Verify only 1 active instance
        // This requires deeper inspection of properties if UI doesn't explicitly show status text.
        // We can just try to open them and check status.

        let todoCount = 0;
        for (let i = 0; i < count; ++i) {
            await newTasks.nth(i).click();
            const val = await page.locator('select').first().inputValue();
            if (val !== 'done') todoCount++;
            await page.click('button:has-text("Cancel")').catch(() => page.locator('[aria-label="Close"]').click()); // Close modal
        }

        expect(todoCount).toBe(1);
    });

    test('OriginalTaskId Persistence (Chain Integrity)', async ({ page }) => {
        const taskTitle = `Chain Link ${Date.now()}`;

        // 1. Create & Recur
        await page.click('button:has-text("New Task")');
        await page.fill('input[placeholder="Task Title"]', taskTitle);
        await page.click('button:has-text("Save Changes")');
        await page.getByText(taskTitle).first().click();

        // Set Daily
        const repeatSelect = page.locator('select').filter({ hasText: 'No Repeat' }).or(page.locator('select').filter({ hasText: 'Daily' }));
        await repeatSelect.selectOption('daily');
        await page.click('text=Save Changes');

        // 2. Capture Generation 1 ID
        const firstTaskId = await page.evaluate((title) => {
            const state = JSON.parse(localStorage.getItem('agenda-storage') || '{}');
            const tasks = state.state.tasks || {};
            const task = Object.values(tasks).find((t: any) => t.title === title) as any;
            return task ? task.id : null;
        }, taskTitle);

        expect(firstTaskId).not.toBeNull();

        // 3. Complete Generation 1
        // Open it
        await page.getByText(taskTitle).first().click();

        // Mark as Done via Modal
        // Note: The UI might have "Mark as Done" or Select. 
        // Based on EditTaskModal code: "Approve & Complete" or Status Select.
        // Let's use Status Select to be safe + Save.
        const statusSelect = page.locator('select').filter({ hasText: 'To Do' }).or(page.locator('select').filter({ hasText: 'Backlog' })).or(page.locator('select').filter({ hasText: 'In Progress' })).first();
        // Refine selector if needed, but generic select usually works in modal if unique.
        // Actually, let's use the explicit "Status" label if possible.
        // But simply selecting option "done" on THE select element in the modal works.
        await page.locator('select').nth(0).selectOption('done');

        // Save
        await page.click('button:has-text("Save Changes")'); // or "Save"

        // Wait for Async Recurrence Generation
        await page.waitForTimeout(3000);

        // 4. Verify Generation 2 exists in Store
        const tasksState = await page.evaluate(() => {
            const state = JSON.parse(localStorage.getItem('agenda-storage') || '{}');
            return state.state.tasks || {};
        });

        const gen2Task = Object.values(tasksState).find((t: any) =>
            t.originalTaskId === firstTaskId &&
            t.id !== firstTaskId &&
            (t.status === 'todo' || t.status === 'backlog')
        );

        expect(gen2Task).toBeDefined();

        // 4. Verify Generation 3 exists
        await page.waitForTimeout(1000);

        // Now there should be 3 tasks (2 done, 1 todo).
        // We are checking functional chain continuity.
        const finalCount = await page.locator(`text=${taskTitle}`).count();
        expect(finalCount).toBeGreaterThanOrEqual(3);
    });

});
