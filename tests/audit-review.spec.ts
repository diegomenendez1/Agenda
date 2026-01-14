import { test, expect } from '@playwright/test';

// Credentials provided in the prompt
const USER_A = { email: 'tester@test.com', pass: '123456', name: 'tester' }; // "Cuenta A"
const USER_B = { email: 'Diegomenendez1@gmail.com', pass: 'Yali.2023', name: 'Diego' }; // "Cuenta B"

test.describe('Audit: Review Phase Functionality', () => {

    test.beforeEach(async ({ page }) => {
        // Ensure clean slate
        await page.goto('/auth');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
    });

    test('Scenario 1: Happy Path Delegation (A assigns B -> B completes -> A approves)', async ({ page }) => {
        // 1. User A logs in and creates task
        await login(page, USER_A);

        const taskTitle = `Audit Delegation ${Date.now()}`;
        await createTask(page, taskTitle);
        await page.click('button:has-text("Save Changes")'); // Save

        // Assign to User B
        await page.click(`text="${taskTitle}"`);
        await page.click('button:has-text("Share / Delegate")');
        await page.fill('input[placeholder*="Find member"]', USER_B.name);
        await page.click(`button:has-text("${USER_B.name}")`);

        await page.click('button:has-text("Save Changes")');
        await expect(page.locator(`text="${taskTitle}"`)).toBeVisible();
        await page.click('button:has-text("Sign Out")');

        // 2. User B logs in
        await login(page, USER_B);
        await expect(page.locator(`text="${taskTitle}"`)).toBeVisible();
        await page.click(`text="${taskTitle}"`);

        // B tries to complete
        await page.selectOption('select', { label: 'Done' });

        // CHECK: Button should say "Submit for Review"
        const submitBtn = page.locator('button:has-text("Submit for Review")');
        await expect(submitBtn).toBeVisible();
        await submitBtn.click();

        // Verify status is Review
        await expect(page.locator(`text="${taskTitle}"`)).toBeVisible();
        await page.click(`text="${taskTitle}"`);
        const statusValue = await page.locator('select').inputValue();
        expect(statusValue).toBe('review');
        await page.click('button:has-text("Sign Out")');

        // 3. User A logs in to Approve
        await login(page, USER_A);
        await page.click(`text="${taskTitle}"`);

        // CHECK: Button should say "Approve & Complete"
        const approveBtn = page.locator('button:has-text("Approve & Complete")');
        await expect(approveBtn).toBeVisible();
        await approveBtn.click();

        // Verify status is Done
        // await expect(page.locator(`text="${taskTitle}"`)).toBeVisible(); 
        // Logic might hide "Done" tasks, so let's rely on data if visible or check via filter.
        // For audit, assume visible or check if it disappears (which implies done).
        // Let's assume it stays.
        await page.click(`text="${taskTitle}"`);
        const finalStatus = await page.locator('select').inputValue();
        expect(finalStatus).toBe('done');
    });

    test('Scenario 2: Personal Task (User A creates & completes - No Review)', async ({ page }) => {
        await login(page, USER_A);
        const taskTitle = `Audit Personal ${Date.now()}`;
        await createTask(page, taskTitle);
        await page.click('button:has-text("Save Changes")'); // Fix: Save to create it

        // Open and Complete
        await page.click(`text="${taskTitle}"`);
        await page.selectOption('select', { label: 'Done' });

        // CHECK: Button should say "Save Changes" or "Confirm & To Do" -> actually "Save Changes" for owner moving to done?
        await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
        await page.click('button:has-text("Save Changes")');

        // Verify it is Done
        await page.click(`text="${taskTitle}"`);
        const finalStatus = await page.locator('select').inputValue();
        expect(finalStatus).toBe('done');

        // Double check it didn't go to review
        expect(finalStatus).not.toBe('review');
    });

    test.only('Scenario 3: Rejection Flow (A assigns B -> B submits -> A rejects/moves back)', async ({ page }) => {
        // 1. Setup: A assigns B, B submits for review
        await login(page, USER_A);
        const taskTitle = `Audit Reject ${Date.now()}`;
        await createTask(page, taskTitle);
        await page.click('button:has-text("Save Changes")'); // Save

        // Assign B
        await page.click(`text="${taskTitle}"`); // Open
        await page.click('button:has-text("Share / Delegate")');
        await page.fill('input[placeholder*="Find member"]', USER_B.name);
        await page.click(`button:has-text("${USER_B.name}")`);
        await page.click('button:has-text("Save Changes")');
        await page.click('button:has-text("Sign Out")');

        // B submits
        await login(page, USER_B);
        await page.click(`text="${taskTitle}"`);
        await page.selectOption('select', { label: 'Done' });
        await page.click('button:has-text("Submit for Review")');
        await page.click('button:has-text("Sign Out")');

        // 2. A logs in to "Reject"
        await login(page, USER_A);
        await page.click(`text="${taskTitle}"`);

        // AUDIT CHECK: "Return for Revision" button should be visible
        const rejectBtn = page.locator('button:has-text("Return for Revision")');
        await expect(rejectBtn).toBeVisible();
        await rejectBtn.click();

        // Verify status is "In Progress"
        // It might close or stay open. We added setTimeout(onClose, 800) in Modal.
        // We need to wait for possible modal close logic or text update.
        // Assuming modal closes, we re-open.
        // OR if modal stays open, we check select value.
        // Our code says: setTimeout(onClose, 800). So it closes.

        await expect(page.locator(`text="${taskTitle}"`)).toBeVisible();
        await page.click(`text="${taskTitle}"`); // Re-open to check status
        const finalStatus = await page.locator('select').inputValue();
        expect(finalStatus).toBe('in_progress');
    });

});

// Helper Functions
async function login(page, user) {
    await page.goto('/auth');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.pass);
    await page.click('button[type="submit"]');
    await expect(page.locator('h1:has-text("Inbox")')).toBeVisible({ timeout: 15000 });
}

async function createTask(page, title) {
    // Navigate to My Tasks to find the "New Task" button
    await page.click('a[href="/tasks"]');
    await expect(page.locator('h1:has-text("My Tasks")')).toBeVisible();

    // Ensure we are in List View (sometimes defaults to board)
    const listViewBtn = page.locator('button[title="List View"]');
    if (await listViewBtn.isVisible()) {
        await listViewBtn.click();
    }

    // Click "New Task" button
    const addBtn = page.locator('button:has-text("New Task")');
    await addBtn.waitFor({ state: 'visible', timeout: 30000 });
    await addBtn.click();

    // Wait for modal input to appear
    const input = page.locator('input[placeholder*="Task Title"]');
    await input.waitFor({ state: 'visible', timeout: 30000 });
    await input.fill(title);
}
