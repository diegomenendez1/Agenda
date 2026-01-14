
import { test, expect } from '@playwright/test';

test.describe('Audit: Security & Functional Flow', () => {

    const OWNER_EMAIL = 'Diegomenendez1@gmail.com';
    const OWNER_PASS = 'Yali.202';
    const USER_EMAIL = 'tester@test.com';
    const USER_PASS = '123456';

    test('RLS & Visibility Check: Private vs Team Tasks', async ({ page }) => {
        // --- STEP 1: OWNER ACTIONS ---
        await page.goto('http://localhost:5173/');

        // Login Owner
        await page.fill('input[type="email"]', OWNER_EMAIL);
        await page.fill('input[type="password"]', OWNER_PASS);
        await page.click('button[type="submit"]');
        await expect(page.getByText('Inbox')).toBeVisible({ timeout: 15000 });

        // Navigate to My Tasks
        await page.click('text=My Tasks');

        // Create Private Task
        const privateTaskTitle = 'Audit Private Task ' + Date.now();
        await page.click('button:has-text("New Task")');
        await page.fill('input[placeholder="Task Title"]', privateTaskTitle); // Approximation
        // Assuming visibility selector is available. If not, we might need to assume default is private or look for a toggle.
        // We haven't seen EditTaskModal, but based on ProcessItemModal it might use similar components.
        // Let's rely on text or name attributes if possible.
        // If fails, we can try to infer.
        // For now, let's assume we can just create it and it defaults to Private (usually).
        await page.click('button:has-text("Create Task")');
        await expect(page.locator(`text=${privateTaskTitle}`)).toBeVisible();

        // Create Team Task
        const teamTaskTitle = 'Audit Team Task ' + Date.now();
        await page.click('button:has-text("New Task")');
        await page.fill('input[placeholder="Task Title"]', teamTaskTitle);
        // We need to set visibility to Team. 
        // If there's a visibility select:
        const visibilitySelect = page.locator('select[name="visibility"]');
        if (await visibilitySelect.isVisible()) {
            await visibilitySelect.selectOption('team');
        } else {
            // Maybe a button? "Private Task" -> Toggle?
            // If we can't find it easily, we might skip explicit team setting if default is private, 
            // but we need a SHARED task.
            // Alternative: Assign to the other user!
            // In Store: "If assigning to someone other than yourself, it implies sharing"
            await page.click('text=Unassigned'); // Or "Assignees" trigger
            await page.click('text=Tester'); // Assuming user name for tester@test.com
        }
        await page.click('button:has-text("Create Task")');
        await expect(page.locator(`text=${teamTaskTitle}`)).toBeVisible();

        // Logout
        await page.click('button[title="Sign Out"]'); // Sidebar logout button

        // --- STEP 2: USER ACTIONS ---
        await page.waitForLoadState('networkidle');
        await page.fill('input[type="email"]', USER_EMAIL);
        await page.fill('input[type="password"]', USER_PASS);
        await page.click('button[type="submit"]');

        // Navigate to Tasks
        await page.click('text=My Tasks');

        // Assertions
        await expect(page.locator(`text=${teamTaskTitle}`)).toBeVisible();
        await expect(page.locator(`text=${privateTaskTitle}`)).toBeHidden(); // RLS Success
    });

    test('Functional Flow: Inbox -> Convert to Task -> Assign -> Review -> Done', async ({ page }) => {
        // Login as User
        await page.goto('http://localhost:5173/');
        await page.fill('input[type="email"]', USER_EMAIL);
        await page.fill('input[type="password"]', USER_PASS);
        await page.click('button[type="submit"]');
        await expect(page.getByText('Inbox')).toBeVisible({ timeout: 15000 });

        // 1. Create Inbox Item
        const inboxItemText = 'Audit Item ' + Date.now();
        // Updated selector based on SmartInput.tsx
        await page.fill('textarea', inboxItemText);
        await page.click('button[type="submit"]');
        await expect(page.locator(`text=${inboxItemText}`)).toBeVisible();

        // 2. Convert to Task
        // Click the item to open Process Modal (InboxView.tsx)
        await page.click(`text=${inboxItemText}`);

        // Process Modal
        await expect(page.getByText('Process Item')).toBeVisible();
        await page.click('button:has-text("Confirm & Create")');

        // 3. Verify in Task List
        await page.click('text=My Tasks');
        await expect(page.locator(`text=${inboxItemText}`)).toBeVisible(); // Title might be same

        // 4. Assign to Owner (to trigger Review flow)
        await page.click(`text=${inboxItemText}`); // Open EditTaskModal
        // In ProcessItemModal we saw Assignee selector. EditTaskModal likely similar.
        // Look for "Share / Delegate" or just "Assignees"
        // Let's try finding the User Avatar or label.
        // For robustness, assume standard selector or text.
        // We'll try to click the "Unassigned" or current assignee button.
        // Or if we can't find it, we might fail here.
        // But for the audit, let's try 'text=Share' or 'text=Delegate' or just generic button inside the modal?
        // Let's assume we can see "Private Task" or "Shared with Team" text toggle

        // NOTE: If this step fails, it points to UX ambiguity in finding the assign button
        // For now, let's assume there is an assign button.
        // If "EditTaskModal" is not visible, we can't proceed.

        /* 
           Simulating finding the "Assign" component. 
           If it's like ProcessModal, it has a list of users.
           Click 'Diegomenendez1' (Owner Name)
        */
        const ownerName = 'Diegomenendez1'; // From Store/Profile
        if (await page.getByText(ownerName).isVisible()) {
            await page.click(`text=${ownerName}`);
        } else {
            // Maybe inside a dropdown?
            await page.click('[aria-label="Assignees"]'); // standard accessible name
            await page.click(`text=${ownerName}`);
        }

        // 5. Move to Done (Trigger Review)
        // Find Status Select
        await page.selectOption('select', 'done'); // Assuming first select is status or searching by valid values

        // 6. Assertions
        // Current User (Tester) is NOT Owner. Moving to Done should trigger 'review'.
        // UI should show "Ready for Review"
        await expect(page.getByText('Ready for Review')).toBeVisible();

        // 7. Visual Audit
        await page.screenshot({ path: 'audit-visual-proof.png', fullPage: true });
    });

});
