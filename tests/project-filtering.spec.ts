
import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('Project Filtering & Stress Test', () => {

    test('Scenario 1: Functional Filtering', async ({ page }) => {
        // 1. Force Clean State
        await page.goto('http://localhost:5173/');
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.reload();

        // 2. Login as Owner
        console.log("Logging in Owner...");
        const emailInput = page.locator('input[type="email"]');
        if (await emailInput.isVisible()) {
            await emailInput.fill('diegomenendez1@gmail.com');
            await page.locator('input[type="password"]').fill('Yali.202');
            await page.locator('button[type="submit"]').click();
        }

        // 3. Navigate to Team Board
        // Increase timeout for login/load
        await expect(page.locator('#cortex-sidebar-title')).toBeVisible({ timeout: 15000 });
        await page.getByRole('link', { name: 'Team Board' }).click();

        // 4. Verify Filter Button Exists
        console.log("Verifying Team Board...");
        await expect(page.getByRole('heading', { name: "Team Board" })).toBeVisible({ timeout: 10000 });
        const filterButton = page.getByRole('button', { name: /Filters|Project/i }); // Regex for flexibility
        await expect(filterButton).toBeVisible();

        // 5. Test Dropdown Interaction
        await filterButton.click();
        // Just verify it opens something
        await expect(page.locator('input[placeholder*="Find"]')).toBeVisible();
    });

    test('Scenario 2: Multi-User Stress Simulation', async ({ browser }) => {
        // Create two separate contexts
        const contextOwner = await browser.newContext();
        const contextTester = await browser.newContext();

        const pageOwner = await contextOwner.newPage();
        const pageTester = await contextTester.newPage();

        // --- OWNER LOGIN ---
        await pageOwner.goto('http://localhost:5173/');
        await pageOwner.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await pageOwner.reload();
        await pageOwner.waitForSelector('input[type="email"]');

        // Login as Admin
        await pageOwner.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await pageOwner.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await pageOwner.click('button[type="submit"]');
        await expect(pageOwner.locator('#cortex-sidebar-title')).toBeVisible({ timeout: 15000 });

        // --- TESTER LOGIN ---
        await pageTester.goto('http://localhost:5173/');
        await pageTester.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await pageTester.reload();

        if (await pageTester.locator('input[type="email"]').isVisible()) {
            await pageTester.locator('input[type="email"]').fill('tester@test.com');
            await pageTester.locator('input[type="password"]').fill('123456');
            await pageTester.locator('button[type="submit"]').click();
            await expect(pageTester.locator('#cortex-sidebar-title')).toBeVisible({ timeout: 15000 });
        } else {
            await expect(pageTester.locator('#cortex-sidebar-title')).toBeVisible({ timeout: 15000 });
        }

        // --- INTERACTIONS ---

        // Owner goes to Team Board
        await pageOwner.getByRole('link', { name: 'Team Board' }).click();
        // Tester goes to Team Board
        await pageTester.getByRole('link', { name: 'Team Board' }).click();

        // Stress: Toggle filters rapidly on Owner side
        const filters = pageOwner.getByRole('button', { name: /Filters|Project/i });
        if (await filters.isVisible()) {
            await filters.click();
            // Try to click randomized projects if any exist
            const projectOptions = pageOwner.locator('button > .rounded-full'); // Color dots indicating projects in dropdown
            const count = await projectOptions.count();

            if (count > 0) {
                console.log(`Found ${count} projects. Stressing filter...`);
                // Click randomly 20 times to simulate rapid user input
                for (let i = 0; i < 20; i++) {
                    const idx = Math.floor(Math.random() * count);
                    await projectOptions.nth(idx).click();
                    await pageOwner.waitForTimeout(50);
                }
            } else {
                console.log("No projects found to filter (clean state?), moving on.");
            }
        }

        // VERIFY STABILITY
        await expect(pageOwner.getByRole('heading', { name: 'Team Board' })).toBeVisible();
        await expect(pageTester.getByRole('heading', { name: 'Team Board' })).toBeVisible();

        console.log("Stress test completed.");

        await contextOwner.close();
        await contextTester.close();
    });

});
