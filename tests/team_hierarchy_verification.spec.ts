
import { test, expect } from '@playwright/test';

test.describe('Team Visibility and Hierarchy Verification', () => {

    test('Owner (Head) can see full team list', async ({ page }) => {
        // Using 'test1' (Head) which we know works and should have visibility
        await page.goto('http://localhost:3000/auth');
        await page.fill('input[type="email"]', 'test1@test.com');
        await page.fill('input[type="password"]', '123456');
        await page.click('button:has-text("Sign In")');

        // Wait for dashboard and ensure we are logged in
        // We look for the user name in the sidebar or header
        await expect(page.locator('text=tester1')).toBeVisible({ timeout: 20000 });

        // 2. Navigate to "My Team"
        await page.click('a[href="/my-team"]');
        await expect(page.locator('h1')).toContainText('My Team', { timeout: 10000 });

        // 3. Verify all members are present
        // Depending on screen size/layout, we might need to scroll, but usually list is small
        await expect(page.locator('text=tester1')).toBeVisible(); // Head
        await expect(page.locator('text=tester2')).toBeVisible(); // Lead
        await expect(page.locator('text=test3')).toBeVisible();   // Member
    });

    test('Organigram renders correctly', async ({ page }) => {
        await page.goto('http://localhost:3000/auth');
        await page.fill('input[type="email"]', 'test1@test.com');
        await page.fill('input[type="password"]', '123456');
        await page.click('button:has-text("Sign In")');
        await expect(page.locator('text=tester1')).toBeVisible({ timeout: 20000 });

        await page.click('a[href="/my-team"]');
        await page.click('text=Team Structure');

        // Verify nodes exist in the tree view
        await expect(page.locator('text=tester1')).toBeVisible();
        await expect(page.locator('text=tester2')).toBeVisible();
        // test3 might be deeper or require expansion, but if default is expanded:
        await expect(page.locator('text=test3')).toBeVisible();
    });

    test('Member (test3) can see their team context', async ({ page }) => {
        await page.goto('http://localhost:3000/auth');
        await page.fill('input[type="email"]', 'test3@test.com');
        await page.fill('input[type="password"]', '123456');
        await page.click('button:has-text("Sign In")');

        await expect(page.locator('text=test3')).toBeVisible({ timeout: 20000 });

        await page.click('a[href="/my-team"]');
        // They should see at least themselves and their manager (tester2)
        await expect(page.locator('text=tester2')).toBeVisible();
        await expect(page.locator('text=test3')).toBeVisible();
    });

    test('Hierarchy-based Task Visibility', async ({ page, browser }) => {
        // A. Member creates a task
        const memberContext = await browser.newContext();
        const memberPage = await memberContext.newPage();

        await memberPage.goto('http://localhost:3000/auth');
        await memberPage.fill('input[type="email"]', 'test3@test.com');
        await memberPage.fill('input[type="password"]', '123456');
        await memberPage.click('button:has-text("Sign In")');
        await expect(memberPage.locator('text=test3')).toBeVisible({ timeout: 20000 });

        const uniqueTaskTitle = `Hierarchy Verify ${Date.now()}`;

        // Go to Tasks view
        await memberPage.click('a[href="/tasks"]');

        // Use the manual input at the top of the list if available (Quick Add)
        // Or wait for the list to load first
        await expect(memberPage.locator('text=My Tasks')).toBeVisible();

        // Try filling the input "Add a new task..."
        const quickAddInput = memberPage.locator('input[placeholder="Add a new task..."]');
        if (await quickAddInput.isVisible()) {
            await quickAddInput.fill(uniqueTaskTitle);
            await memberPage.keyboard.press('Enter');
        } else {
            // Try "New Task" button which might open a modal
            await memberPage.click('button:has-text("New Task")');
            await memberPage.fill('[placeholder="Task title"]', uniqueTaskTitle);
            await memberPage.click('button:has-text("Create Task")');
        }

        // Verify it appears in the list
        await expect(memberPage.locator(`text=${uniqueTaskTitle}`)).toBeVisible();

        await memberContext.close();

        // B. Lead (tester2) logs in
        const leadContext = await browser.newContext();
        const leadPage = await leadContext.newPage();

        await leadPage.goto('http://localhost:3000/auth');
        await leadPage.fill('input[type="email"]', 'test2@test.com');
        await leadPage.fill('input[type="password"]', '123456');
        await leadPage.click('button:has-text("Sign In")');
        await expect(leadPage.locator('text=tester2')).toBeVisible({ timeout: 20000 });

        await leadPage.click('a[href="/tasks"]');

        // Should be visible
        await expect(leadPage.locator(`text=${uniqueTaskTitle}`)).toBeVisible();

        await leadContext.close();
    });

});
