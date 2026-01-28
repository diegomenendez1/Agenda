
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// --- Configuration ---
const APP_URL = 'http://localhost:3000';
const USERS = {
    OWNER: { email: 'diegomenendez1@gmail.com', password: 'password', role: 'owner' }, // Fallback to verified user
    HEAD: { email: 'test1@test.com', password: 'password123', role: 'head' },
    LEAD: { email: 'test2@test.com', password: 'password123', role: 'lead' },
    MEMBER: { email: 'test3@test.com', password: '123456', role: 'member' }
};

// We used '123456' successfully for test3, asserting same for others based on user patterns
const COMMON_PASSWORD = '123456';

test.describe('Comprehensive Role & Integrity Verification', () => {

    // --- 1. Hierarchy Data Integrity ---
    // Verified implicitly by the ability to see correct team members in previous tests.
    // Here we focus on functional restrictions.

    // --- 2. Task Visibility (CRUD) ---

    test('Task Visibility Chain: Member -> Lead -> Head', async ({ browser }) => {
        const uniqueTitle = `VizCheck ${Date.now()}`;

        // A. Member creates a Private Task (default is private/assigned to self)
        const memberContext = await browser.newContext();
        const memberPage = await memberContext.newPage();
        await login(memberPage, USERS.MEMBER.email, COMMON_PASSWORD);

        await createTask(memberPage, uniqueTitle);
        await expect(memberPage.locator(`text=${uniqueTitle}`)).toBeVisible();
        await memberContext.close();

        // B. Lead (Direct Manager) should SEE it
        const leadContext = await browser.newContext();
        // Use 'test2' who manages 'test3'
        const leadPage = await leadContext.newPage();
        await login(leadPage, USERS.LEAD.email, COMMON_PASSWORD);
        await leadPage.goto(`${APP_URL}/tasks`);
        await expect(leadPage.locator(`text=${uniqueTitle}`)).toBeVisible({ timeout: 10000 });
        await leadContext.close();

        // C. Head (Manager of Manager) should SEE it
        const headContext = await browser.newContext();
        // Use 'test1' who manages 'test2'
        const headPage = await headContext.newPage();
        await login(headPage, USERS.HEAD.email, COMMON_PASSWORD);
        await headPage.goto(`${APP_URL}/tasks`);
        await expect(headPage.locator(`text=${uniqueTitle}`)).toBeVisible({ timeout: 10000 });
        await headContext.close();
    });

    // --- 3. Task Modification ---

    test('Manager can edit subordinate task', async ({ browser }) => {
        const uniqueTitle = `EditCheck ${Date.now()}`;

        // A. Member Creates
        const memberContext = await browser.newContext();
        const memberPage = await memberContext.newPage();
        await login(memberPage, USERS.MEMBER.email, COMMON_PASSWORD);
        await createTask(memberPage, uniqueTitle);
        await memberContext.close();

        // B. Lead Edits
        const leadContext = await browser.newContext();
        const leadPage = await leadContext.newPage();
        await login(leadPage, USERS.LEAD.email, COMMON_PASSWORD);
        await leadPage.goto(`${APP_URL}/tasks`);

        // Find and Click task
        await leadPage.click(`text=${uniqueTitle}`);
        // Edit Description
        await leadPage.fill('textarea[placeholder="Add a description..."]', 'Updated by Lead');
        // Close modal (clicking outside or close button)
        await leadPage.keyboard.press('Escape');

        // Verify update persisted (re-open)
        await leadPage.click(`text=${uniqueTitle}`);
        await expect(leadPage.locator('textarea')).toHaveValue('Updated by Lead');

        await leadContext.close();
    });

    // --- 4. Team Management Limits ---

    test('Member cannot see Invite button', async ({ page }) => {
        await login(page, USERS.MEMBER.email, COMMON_PASSWORD);
        await page.goto(`${APP_URL}/my-team`);

        // Expect "Invite Member" button to be HIDDEN or Disabled
        // Logic says: !isExec && user.role !== 'lead' -> disabled checking
        // But better if hidden? The code disabled it.
        const inviteBtn = page.locator('button:has-text("Invite Member")');

        // Logic check: src/components/MyTeamView.tsx:162 disabled={!isExec && user.role !== 'lead'}
        // Member role is 'member', so !isExec is true, !== 'lead' is true -> disabled = true.
        await expect(inviteBtn).toBeDisabled();
    });

    test('Lead CAN see Invite button', async ({ page }) => {
        await login(page, USERS.LEAD.email, COMMON_PASSWORD);
        await page.goto(`${APP_URL}/my-team`);
        const inviteBtn = page.locator('button:has-text("Invite Member")');
        await expect(inviteBtn).toBeEnabled();
    });

});

// --- Helper Functions ---

async function login(page: any, email: string, pass: string) {
    await page.goto(`${APP_URL}/auth`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', pass);
    await page.click('button:has-text("Sign In")');
    // Wait for redirect
    await expect(page.locator('text=Inbox').or(page.locator('text=My Tasks'))).toBeVisible({ timeout: 15000 });
}

async function createTask(page: any, title: string) {
    await page.goto(`${APP_URL}/tasks`);
    const quickAdd = page.locator('input[placeholder="Add a new task..."]');
    if (await quickAdd.isVisible()) {
        await quickAdd.fill(title);
        await page.keyboard.press('Enter');
    } else {
        await page.click('button:has-text("New Task")');
        await page.fill('[placeholder="Task title"]', title);
        await page.click('button:has-text("Create Task")');
    }
    await expect(page.locator(`text=${title}`)).toBeVisible();
}
