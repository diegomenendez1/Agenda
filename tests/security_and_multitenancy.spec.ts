
import { test, expect } from '@playwright/test';

// Use a unique email for every run to act as a "New Intruder"
const intruderEmail = `intruder_${Date.now()}@test.com`;
const intruderName = 'Mr. Intruder';

test.describe('Security & Multi-tenancy', () => {

    test('New user is forced to Onboarding and cannot see existing data', async ({ page }) => {
        // 1. Sign Up as New User
        await page.goto('http://localhost:5173/auth');
        await page.fill('input[type="email"]', intruderEmail);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button:has-text("Sign Up")');

        // 2. Verify Onboarding Redirect
        // Should NOT go to /inbox, but to /onboarding (or show onboarding UI)
        // Note: The app might redirect to /inbox first, then App.tsx redirects to OnboardingView if orgId is null
        // Let's check for the "Create Workspace" header
        await expect(page.getByText('Welcome to Agenda')).toBeVisible({ timeout: 10000 });
        await expect(page.getByPlaceholder('e.g. Acme Corp')).toBeVisible();

        // 3. Verify Isolation (Try to navigate to /team bypassing onboarding)
        await page.goto('http://localhost:5173/team');
        // Should be redirected back or show nothing because store.initialize won't fetch data without orgId
        // In our App.tsx, !organizationId renders <OnboardingView />, covering everything.
        await expect(page.getByText('Welcome to Agenda')).toBeVisible();

        // 4. Create Workspace
        await page.fill('input[placeholder="e.g. Acme Corp"]', 'Intruder Corp');
        await page.click('button:has-text("Create Workspace")');

        // 5. Verify Landing
        await expect(page.getByText('My Inbox')).toBeVisible(); // Should be successful now

        // 6. Verify Data State (Should be Empty)
        // There should be NO tasks from the 'diegomenendez1' main account
        const taskCount = await page.locator('.task-card').count();
        expect(taskCount).toBe(0);
    });

});
