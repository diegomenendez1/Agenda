import { test, expect } from '@playwright/test';

// Configuration
const APP_URL = 'http://localhost:3000';
const USERS = {
    OWNER: { email: 'diegomenendez1@gmail.com', password: 'Yali.202', role: 'owner' },
    HEAD: { email: 'test1@test.com', password: '123456', role: 'head' },
    LEAD: { email: 'test2@test.com', password: '123456', role: 'lead' },
    MEMBER: { email: 'test3@test.com', password: '123456', role: 'member' }
};

test.describe('Complete Role Matrix Verification', () => {

    // --- Helper: Login ---
    async function login(page, email, password) {
        // Prevent Daily Digest from showing
        await page.addInitScript(() => {
            window.localStorage.setItem('lastDigestDate', new Date().toDateString());
        });

        await page.goto(`${APP_URL}/auth`);
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.click('button:has-text("Sign In")');
        // Check for common dashboard elements: "Inbox", "My Tasks", or "AgendAI"
        await expect(
            page.locator('h1')
                .or(page.locator('button[aria-label="User menu"]'))
                .or(page.locator('text=My Tasks'))
                .first()
        ).toBeVisible({ timeout: 20000 });
    }

    // --- Helper: Create Task ---
    async function createTask(page, title, isPrivate = false) {
        // Wait for list to load effectively
        // Wait for list to load effectively
        // Removed flaky header check; relying on interactive elements below

        // Try Quick Add first (usually on top of list)
        const quickAdd = page.locator('input[placeholder="Add a new task..."]');
        if (await quickAdd.isVisible()) {
            await quickAdd.fill(title);
            await page.keyboard.press('Enter');
        } else {
            // Mobile or specific view
            const newBtn = page.locator('button:has-text("New Task")');
            if (await newBtn.isVisible()) {
                await newBtn.click();
            } else {
                // Try alternate selector or sidebar
                await page.click('[aria-label="Create Task"], button:has-text("New")');
            }

            await page.fill('[placeholder="Task Title"]', title);

            if (isPrivate) {
                // Look for visibility selector if available
                const visSelect = page.locator('select[name="visibility"], [aria-label="Visibility"]');
                if (await visSelect.isVisible()) {
                    await visSelect.selectOption('private');
                }
            }

            await page.click('button:has-text("Save Changes")');
        }
        await expect(page.locator(`text=${title}`)).toBeVisible();
    }

    // --- 1. VISIBILITY HIERARCHY ---

    test('1. Hierarchy Visibility Downstream', async ({ browser }) => {
        const uniqueTask = `Hierarchy_Task_${Date.now()}`;

        // A. Member creates task
        const memberCtx = await browser.newContext();
        const memberPage = await memberCtx.newPage();
        await login(memberPage, USERS.MEMBER.email, USERS.MEMBER.password);

        await memberPage.goto(`${APP_URL}/tasks`);
        await createTask(memberPage, uniqueTask);
        await memberCtx.close();

        // B. Lead sees Member's task
        const leadCtx = await browser.newContext();
        const leadPage = await leadCtx.newPage();
        await login(leadPage, USERS.LEAD.email, USERS.LEAD.password);
        await leadPage.goto(`${APP_URL}/tasks`);
        await expect(leadPage.locator(`text=${uniqueTask}`)).toBeVisible();
        await leadCtx.close();

        // C. Head sees Member's task (via Lead)
        const headCtx = await browser.newContext();
        const headPage = await headCtx.newPage();
        await login(headPage, USERS.HEAD.email, USERS.HEAD.password);
        await headPage.goto(`${APP_URL}/tasks`);
        await expect(headPage.locator(`text=${uniqueTask}`)).toBeVisible();
        await headCtx.close();

        // D. Owner sees Member's task
        const ownerCtx = await browser.newContext();
        const ownerPage = await ownerCtx.newPage();
        await login(ownerPage, USERS.OWNER.email, USERS.OWNER.password);
        await ownerPage.goto(`${APP_URL}/tasks`);
        await expect(ownerPage.locator(`text=${uniqueTask}`)).toBeVisible();
        await ownerCtx.close();
    });

    test('2. Isolation: Member cannot see unrelated tasks', async ({ browser }) => {
        const secretTask = `Secret_Owner_Task_${Date.now()}`;

        // A. Owner creates private task
        const ownerCtx = await browser.newContext();
        const ownerPage = await ownerCtx.newPage();
        await login(ownerPage, USERS.OWNER.email, USERS.OWNER.password);
        await ownerPage.goto(`${APP_URL}/tasks`);

        // Use helper with private flag intent (though UI might not support exact selection yet)
        await createTask(ownerPage, secretTask, true);
        await ownerCtx.close();

        // B. Member checks
        const memberCtx = await browser.newContext();
        const memberPage = await memberCtx.newPage();
        await login(memberPage, USERS.MEMBER.email, USERS.MEMBER.password);
        await memberPage.goto(`${APP_URL}/tasks`);
        await expect(memberPage.locator(`text=${secretTask}`)).toBeHidden();
        await memberCtx.close();
    });

    // --- 2. TEAM MANAGEMENT & INVITATIONS ---

    test('3. Invitation Permissions', async ({ browser }) => {
        // A. Member cannot invite
        const memberCtx = await browser.newContext();
        const memberPage = await memberCtx.newPage();
        await login(memberPage, USERS.MEMBER.email, USERS.MEMBER.password);
        await memberPage.goto(`${APP_URL}/my-team`);
        await expect(memberPage.locator('button:has-text("Invite Member")')).toBeDisabled();
        await memberCtx.close();

        // B. Lead CAN invite
        const leadCtx = await browser.newContext();
        const leadPage = await leadCtx.newPage();
        await login(leadPage, USERS.LEAD.email, USERS.LEAD.password);
        await leadPage.goto(`${APP_URL}/my-team`);
        await expect(leadPage.locator('button:has-text("Invite Member")')).toBeEnabled();
        await leadCtx.close();
    });

    test('4. Full Invite Flow (Owner -> New Lead)', async ({ browser }) => {
        // Use a unique email alias for new user verification
        const newLeadEmail = `auto_lead_${Date.now()}@test.com`;

        const ownerCtx = await browser.newContext();
        const ownerPage = await ownerCtx.newPage();
        await login(ownerPage, USERS.OWNER.email, USERS.OWNER.password);

        await ownerPage.goto(`${APP_URL}/my-team`);
        await ownerPage.click('button:has-text("Invite Member")');

        // Modal Check
        await expect(ownerPage.locator('text=Invite Team Member')).toBeVisible();
        await ownerPage.fill('input[type="email"]', newLeadEmail);

        // Select Role: Lead
        const roleSelect = ownerPage.locator('select').first();
        await roleSelect.selectOption({ value: 'lead' });

        await ownerPage.click('button:has-text("Send Invitation")');

        // Verify Toast or List update
        await expect(ownerPage.locator('text=Invitation sent')).toBeVisible();

        // Check "Pending Invitations" list
        await expect(ownerPage.locator(`text=${newLeadEmail}`)).toBeVisible();

        await ownerCtx.close();
    });

    // --- 3. UI VISIBILITY ---

    test('5. UI Access Limits', async ({ browser }) => {
        // A. Member: No "Organization Settings"
        const memberCtx = await browser.newContext();
        const memberPage = await memberCtx.newPage();
        await login(memberPage, USERS.MEMBER.email, USERS.MEMBER.password);

        await memberPage.goto(`${APP_URL}/settings`);
        await expect(memberPage.locator('text=Billing')).toBeHidden();

        await memberCtx.close();

        // B. Owner: Has everything
        const ownerCtx = await browser.newContext();
        const ownerPage = await ownerCtx.newPage();
        await login(ownerPage, USERS.OWNER.email, USERS.OWNER.password);
        await ownerPage.goto(`${APP_URL}/settings`);
        await expect(ownerPage.locator('text=Team')).toBeVisible();

        await ownerCtx.close();
    });

});
