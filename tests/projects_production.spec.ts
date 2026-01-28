import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('Projects Module Production Verification', () => {
    const timestamp = Date.now();
    const projectName = `Test Project ${timestamp}`;
    // const projectGoal = `Goal for ${timestamp}`; // Not used in quick create

    test.beforeEach(async ({ page }) => {
        // Authenticate (Manual flow)
        await page.goto('/auth');
        await page.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await page.click('button[type="submit"]');

        // Wait for redirect to Inbox or Dashboard, then go to Projects
        await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });
        await page.goto('/projects');

        // Ensure we are on the projects page
        await expect(page.locator('button', { hasText: 'New Project' })).toBeVisible();
    });

    test('1. Create a New Project', async ({ page }) => {
        // 1. Open Create Form
        await page.click('text=New Project');
        await expect(page.getByPlaceholder('e.g., Marketing Campaign Q1')).toBeVisible();

        // 2. Fill Form
        // Note: ProjectsView.tsx line 53 has `autoFocus`, but good to fill explicitly
        await page.fill('input[placeholder="e.g., Marketing Campaign Q1"]', projectName);

        // 3. Submit
        await page.click('button:has-text("Create")');

        // 4. Verify in List
        await expect(page.getByText(projectName)).toBeVisible();

        // Verify default "No specific goal" text because quick create doesn't ask for goal
        await expect(page.getByText('No specific goal defined yet.', { exact: false }).first()).toBeVisible();
    });

    test('2. Navigate to Project Details & Verify Layout', async ({ page }) => {
        // We need a stable project. Since tests run in isolation/parallel potential, create a new one.
        const uniqueProjectName = `Details Test ${timestamp}`;

        await page.click('text=New Project');
        await page.fill('input[placeholder="e.g., Marketing Campaign Q1"]', uniqueProjectName);
        await page.click('button:has-text("Create")');

        // Locate and click the specific project card
        // Use locator filter to be precise
        await page.locator('div.group', { hasText: uniqueProjectName }).click();

        // Verify URL pattern
        await expect(page).toHaveURL(/\/projects\/.+/);

        // Verify Header
        await expect(page.getByRole('heading', { level: 1, name: uniqueProjectName })).toBeVisible();

        // Verify View Toggles
        await expect(page.getByTitle('List View')).toBeVisible();
        await expect(page.getByTitle('Board View')).toBeVisible();
        await expect(page.getByTitle('Project Notes')).toBeVisible();

        // Check Burndown Chart View
        await page.click('button[title="Analytics & Burndown"]');
        await expect(page.getByText('Burn-down Chart')).toBeVisible();
    });

    test('3. Project Interconnection: Create Task in Project', async ({ page }) => {
        // Setup: Create Project
        const pName = `Interconnection ${timestamp}`;
        await page.click('text=New Project');
        await page.fill('input[placeholder="e.g., Marketing Campaign Q1"]', pName);
        await page.click('button:has-text("Create")');
        await page.locator('div.group', { hasText: pName }).click();

        // Create Task via Quick Add in Project Details (List View default)
        const taskName = `Project Task ${timestamp}`;
        const quickAddInput = page.getByPlaceholder(`Add task to ${pName}...`);
        await expect(quickAddInput).toBeVisible();

        await quickAddInput.fill(taskName);
        await quickAddInput.press('Enter');

        // Verify Task Appears in List
        await expect(page.getByText(taskName)).toBeVisible();

        // Verify Progress Bar (0/1 tasks)
        await expect(page.getByText('0/1 tasks', { exact: false })).toBeVisible();

        // Navigate back to Projects List
        await page.click('text=Back to Projects');

        // Verify Card shows "Active" status (default)
        const projectCard = page.locator('div.group', { hasText: pName });
        await expect(projectCard.getByText('active')).toBeVisible();
    });
});
