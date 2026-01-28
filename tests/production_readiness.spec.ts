import { test, expect } from '@playwright/test';

// Configuration
const APP_URL = 'http://localhost:3000';
const USERS = {
    OWNER: { email: 'diegomenendez1@gmail.com', password: 'Yali.202', role: 'owner' },
    HEAD: { email: 'test1@test.com', password: '123456', role: 'head' },
    LEAD: { email: 'test2@test.com', password: '123456', role: 'lead' },
    MEMBER: { email: 'test3@test.com', password: '123456', role: 'member' }
};

test.describe('🛡️ PRODUCTION READINESS PROTOCOL', () => {

    // --- SETUP: GLOBAL HELPERS ---

    async function login(page, email, password) {
        console.log(`Checking Login for: ${email}`);

        // Listen for console logs
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

        // Listen for Network Failures
        page.on('requestfailed', request => {
            console.log(`❌ FAILED REQUEST: ${request.url()} - ${request.failure()?.errorText}`);
        });

        // Prevent Daily Digest from blocking view
        await page.addInitScript(() => {
            window.localStorage.setItem('lastDigestDate', new Date().toDateString());
        });

        await page.goto(`${APP_URL}/auth`);

        // Start by checking if we are in "Register" mode
        const createAccountBtn = page.locator('button', { hasText: 'Create Account' });
        if (await createAccountBtn.isVisible()) {
            // Click the switch link
            await page.click('text=Already have an account?');
        }

        // Wait for Sign In form to be ready
        await expect(page.locator('button', { hasText: 'Sign In' })).toBeVisible();

        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.click('button:has-text("Sign In")');

        // Check for immediate error
        const errorToast = page.locator('.bg-red-500\\/10');
        if (await errorToast.isVisible({ timeout: 5000 })) {
            const errorText = await errorToast.innerText();
            console.error(`Login Failed with Error: ${errorText}`);
            throw new Error(`Login failed for ${email}: ${errorText}`);
        }

        // Verification of successful entry - Increased Timeout
        await expect(
            page.locator('h1').or(page.locator('text=Inbox')).or(page.locator('text=My Tasks')).first()
        ).toBeVisible({ timeout: 45000 });
        console.log(`✅ Login Success for: ${email}`);
    }

    test.describe.configure({ mode: 'serial' });

    // --- SECTION 1: CRITICAL PATHS (Owner) ---

    test('001 - Owner Critical Path: Login, Create Project, Create Task', async ({ page }) => {
        console.log("➡️ Starting Owner Critical Path...");
        await login(page, USERS.OWNER.email, USERS.OWNER.password);

        // 1. Create Project
        await page.goto(`${APP_URL}/projects`);
        const projectName = `Prod_Project_${Date.now()}`;

        // Handle Empty State vs List State
        const newProjectBtn = page.locator('button:has-text("New Project")').first();
        await newProjectBtn.click();

        await page.fill('input[placeholder*="Campaign"]', projectName);
        await page.click('button:has-text("Create")');

        await expect(page.locator(`h3:has-text("${projectName}")`)).toBeVisible();
        console.log("✅ Project Created");

        // 2. Create Task in Project
        await page.click(`h3:has-text("${projectName}")`);
        const taskName = `Critical_Task_${Date.now()}`;

        // Robust Task Creation
        const addTaskInput = page.getByPlaceholder('Add task').first();
        await addTaskInput.fill(taskName);
        await page.keyboard.press('Enter');

        await expect(page.locator(`text=${taskName}`)).toBeVisible();
        console.log("✅ Task Created");
    });

    // --- SECTION 2: HIERARCHY & RLS (The "Privacy Test") ---

    test('002 - Hierarchy Check: Downstream Visibility & Interconnectivity', async ({ browser }) => {
        console.log("➡️ Starting Hierarchy Visibility Check...");
        const uniqueTask = `Hierarchy_Check_${Date.now()}`;

        // A. Member (Bottom) creates a task
        const memberCtx = await browser.newContext();
        const memberPage = await memberCtx.newPage();
        await login(memberPage, USERS.MEMBER.email, USERS.MEMBER.password);

        await memberPage.goto(`${APP_URL}/tasks`);
        // Use Quick Add
        await memberPage.getByPlaceholder('Add a new task').or(memberPage.getByPlaceholder('Add task')).first().fill(uniqueTask);
        await memberPage.keyboard.press('Enter');
        await expect(memberPage.locator(`text=${uniqueTask}`)).toBeVisible();
        await memberCtx.close();

        // B. Owner (Top) must see it
        const ownerCtx = await browser.newContext();
        const ownerPage = await ownerCtx.newPage();
        await login(ownerPage, USERS.OWNER.email, USERS.OWNER.password);

        await ownerPage.goto(`${APP_URL}/tasks`);
        await expect(ownerPage.locator(`text=${uniqueTask}`)).toBeVisible({ timeout: 15000 });
        console.log("✅ Owner sees Member task - Interconnectivity Verified (Backend -> Frontend)");
        await ownerCtx.close();
    });

    test('003 - SECURITY AUDIT: Strict Isolation', async ({ browser }) => {
        console.log("➡️ Starting Security Isolation Audit...");
        const secretTask = `TOP_SECRET_${Date.now()}`;

        // A. Owner creates PRIVATE task
        const ownerCtx = await browser.newContext();
        const ownerPage = await ownerCtx.newPage();
        await login(ownerPage, USERS.OWNER.email, USERS.OWNER.password);
        await ownerPage.goto(`${APP_URL}/tasks`);

        // We create it, then standardly these are private unless shared/assigned
        await ownerPage.getByPlaceholder('Add a new task').or(ownerPage.getByPlaceholder('Add task')).first().fill(secretTask);
        await ownerPage.keyboard.press('Enter');
        await expect(ownerPage.locator(`text=${secretTask}`)).toBeVisible();
        await ownerCtx.close();

        // B. Member MUST NOT see it
        const memberCtx = await browser.newContext();
        const memberPage = await memberCtx.newPage();
        await login(memberPage, USERS.MEMBER.email, USERS.MEMBER.password);
        await memberPage.goto(`${APP_URL}/tasks`);

        await expect(memberPage.locator(`text=${secretTask}`)).toBeHidden();
        console.log("✅ Security Passed: Member cannot see Owner's private task");
        await memberCtx.close();
    });

    // --- SECTION 3: TEAM MANAGEMENT ---

    test('004 - Team Permissions: Invitation Guard', async ({ browser }) => {
        console.log("➡️ Checking Invitation Permissions...");

        // A. Member: Should see My Team but NO Invite button
        const memberCtx = await browser.newContext();
        const memberPage = await memberCtx.newPage();
        await login(memberPage, USERS.MEMBER.email, USERS.MEMBER.password);

        await memberPage.goto(`${APP_URL}/my-team`);
        // Check availability of "Team Members" header to ensure we loaded
        await expect(memberPage.locator('text=Team Members').or(memberPage.locator('text=My Team'))).toBeVisible();

        // The Invite button should be disabled or hidden
        const inviteBtn = memberPage.locator('button:has-text("Invite Member")');
        // It might be visible but disabled, or completely hidden.
        if (await inviteBtn.isVisible()) {
            await expect(inviteBtn).toBeDisabled();
        } else {
            await expect(inviteBtn).toBeHidden();
        }
        console.log("✅ Member cannot invite");
        await memberCtx.close();

        // B. Owner: Can Invite
        const ownerCtx = await browser.newContext();
        const ownerPage = await ownerCtx.newPage();
        await login(ownerPage, USERS.OWNER.email, USERS.OWNER.password);
        await ownerPage.goto(`${APP_URL}/my-team`);
        await expect(ownerPage.locator('button:has-text("Invite Member")')).toBeEnabled();
        console.log("✅ Owner can invite");
        await ownerCtx.close();
    });

    // --- SECTION 4: SANITY & UI ---

    test('005 - UI Sanity Check: No Blank Screens', async ({ page }) => {
        console.log("➡️ running UI Sanity Scan...");
        await login(page, USERS.OWNER.email, USERS.OWNER.password);

        const routes = [
            '/tasks',
            '/calendar',
            '/projects',
            '/my-team', // "My Team"
            '/analytics', // or /kpis
            '/notes'
        ];

        for (const route of routes) {
            console.log(`Checking route: ${route}`);
            await page.goto(`${APP_URL}${route}`);
            // Check for critical body content
            await expect(page.locator('body')).not.toBeEmpty();
            // Check against generic error toasts
            await expect(page.locator('text=Something went wrong')).toBeHidden();
            await expect(page.locator('text=Error loading')).toBeHidden();
        }
        console.log("✅ UI Sanity Scan Complete");
    });

});
