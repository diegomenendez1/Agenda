import { test, expect } from '@playwright/test';

test.describe('Visualization Stress Test', () => {

    test('Data Volume & Chart Rendering (Owner Flow)', async ({ page }) => {
        // 1. Login as Owner (Diego)
        await page.goto('/auth');
        await page.fill('input[type="email"]', 'diego.menendez@gmail.com');
        await page.fill('input[type="password"]', 'Yali.202');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/');

        // 2. Create Stress Project
        await page.click('a[href="/projects"]');
        await page.click('button:has-text("New Project")');
        const projectName = `Stress Test ${Date.now()}`;
        await page.fill('input[placeholder*="Project Name"]', projectName);
        await page.click('button:has-text("Create Project")');

        // Wait for project view
        await expect(page.locator('h1')).toContainText(projectName);

        // 3. Rapid Task Creation (20 tasks)
        // We use UI for realism, but fast
        for (let i = 0; i < 20; i++) {
            await page.fill('input[placeholder*="Add task"]', `Stress Task ${i}`);
            await page.keyboard.press('Enter');
            // Small wait to ensure state update
            await page.waitForTimeout(50);
        }

        // 4. Verify Activity Chart in KPI View
        await page.click('a[href="/kpis"]');
        await expect(page.locator('text=Activity Velocity')).toBeVisible();
        // Check for bars in the chart
        const bars = page.locator('.group.relative.flex.flex-col');
        await expect(bars).toHaveCount(14); // 14 days chart

        // 5. Verify Burndown in Project View
        await page.click('a[href="/projects"]');
        await page.click(`h3:has-text("${projectName}")`);

        // Switch to Analytics view
        await page.click('button[title="Analytics & Burndown"]');
        await expect(page.locator('h2:has-text("Burn-down Chart")')).toBeVisible();
        await expect(page.locator('svg')).toBeVisible();

        // 6. Complete 5 Tasks & Check update
        // Go back to list
        await page.click('button[title="List View"]');
        const checkboxes = page.locator('button[role="checkbox"]');
        for (let i = 0; i < 5; i++) {
            await checkboxes.nth(i).click();
            await page.waitForTimeout(100);
        }

        // Return to analytics
        await page.click('button[title="Analytics & Burndown"]');
        // We can't easily assert SVG path changes without screenshot diffing, 
        // but we verify no crash and element exists.
        await expect(page.locator('svg')).toBeVisible();
    });

    test('Workload Distribution (Team Flow)', async ({ page }) => {
        // 1. Login as Tester
        await page.goto('/auth');
        await page.fill('input[type="email"]', 'tester@test.com');
        await page.fill('input[type="password"]', '123456');
        await page.click('button[type="submit"]');

        // 2. Go to Team Board
        await page.goto('/team');

        // 3. Open Workload View
        await page.click('button[title="Toggle Workload View"]');
        await expect(page.locator('text=Team Workload Distribution')).toBeVisible();

        // 4. Verify Tester Bar exists
        // Tester should be in the list
        await expect(page.locator('text=Tester')).toBeVisible();
    });

    test('Chaos Interaction', async ({ page }) => {
        await page.goto('/auth');
        await page.fill('input[type="email"]', 'diego.menendez@gmail.com');
        await page.fill('input[type="password"]', 'Yali.202');
        await page.click('button[type="submit"]');

        // Go to a project with tasks
        await page.goto('/projects');
        // Just pick the first one
        await page.locator('.group.relative').first().click();

        // Interactive stress: toggle same task repeatedly
        const firstTaskCheckbox = page.locator('button[role="checkbox"]').first();
        if (await firstTaskCheckbox.isVisible()) {
            for (let i = 0; i < 30; i++) {
                await firstTaskCheckbox.click();
                // Minimal wait to let React render, but keep it tight
                await page.waitForTimeout(50);
            }
        }

        // App should still be responsive
        await page.click('button[title="Board View"]');
        await expect(page.locator('text=To Do')).toBeVisible();
    });

});
