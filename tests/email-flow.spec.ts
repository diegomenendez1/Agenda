
import { test, expect } from '@playwright/test';

test('Email Simulation Flow', async ({ page }) => {
    // 1. Login as Team Lead (sender)
    await page.goto('http://localhost:3000');
    await page.fill('input[type="email"]', 'test2@test.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('text=Sign In');

    // Wait to be inside
    await expect(page.locator('text=Overview')).toBeVisible({ timeout: 15000 });

    // 2. Open Create Modal
    await page.click('button:has-text("New Task")');

    // 3. Fill Task Details
    const taskTitle = `Email Test Task ${Date.now()}`;
    await page.fill('input[placeholder="Task title"]', taskTitle);
    await page.fill('textarea[placeholder="Description"]', 'Testing email notifications');

    // 4. Assign to Owner (diegomenendez1) to trigger email
    // First, ensure the visibility is set correctly if needed, or just select assignee
    // Trigger assignee dropdown
    await page.click('text=Assign to...');
    // Select Diego (Owner)
    await page.click('text=Diego Menendez', { timeout: 5000 });
    // Close dropdown (click outside or escape)
    await page.keyboard.press('Escape');

    // 5. Submit
    await page.click('button:has-text("Create Task")');

    // 6. Verify Task Created
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible();

    console.log('✅ Task created and assigned successfully. Email should have been triggered via SQL.');
});
