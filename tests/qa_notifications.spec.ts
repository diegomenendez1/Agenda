import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
// Load env vars
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Key not found in environment variables');
}

// Create a separate client for the test runner (acting as "System" or "Other User")
const supabase = createClient(supabaseUrl, supabaseKey);

test.describe('QA: Notification System & Realtime', () => {
    let testUserId: string;

    test.beforeAll(async () => {
        // Authenticate in Node context to get the User ID for injection
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'tester@test.com',
            password: '123456'
        });

        if (error || !data.user) {
            console.error("Test Login Failed:", error);
            throw new Error('Could not login as tester@test.com to prepare tests. Check credentials.');
        }
        testUserId = data.user.id;
        console.log(`QA Test: Using User ID ${testUserId}`);
    });

    test.beforeEach(async ({ page }) => {
        // 1. Go to App
        await page.goto('/');

        // 2. Clear Session to ensure clean login
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();

        // 3. Login Flow (UI)
        await page.fill('input[type="email"]', 'tester@test.com');
        await page.fill('input[type="password"]', '123456');
        await page.click('button[type="submit"]');

        // 4. Wait for Inbox to ensure loaded
        await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible({ timeout: 15000 });

        // 5. Cleanup: Clear existing notifications to ensure clean state
        const bell = page.locator('button[title="Notifications"]');
        if (await bell.locator('span.bg-red-500').isVisible()) {
            await bell.click();
            const clearAll = page.locator('button[title="Delete all"]');
            if (await clearAll.isVisible()) {
                await clearAll.click();
            }
            await page.locator('body').click({ position: { x: 0, y: 0 } }); // Close panel
        }
    });

    test('RT-01: Realtime Injection (System sends notification)', async ({ page }) => {
        // Verify Bell is clean initially? Not guaranteed if prev tests ran.
        // Let's create a UNIQUE notification title
        const uniqueTitle = `Test-Notification-${Date.now()}`;

        // INJECT via Node Client
        const { error } = await supabase.from('notifications').insert({
            user_id: testUserId,
            type: 'system',
            title: uniqueTitle,
            message: 'This is a realtime test message injected from QA script.',
            read: false,
            created_at: new Date().toISOString()
        });
        if (error) console.error("Insert Error:", error);
        expect(error).toBeNull();

        // VERIFY in UI (Red Dot & Content)
        const bell = page.locator('button[title="Notifications"]');

        // The red dot should appear (check strictly for the visual indicator)
        await expect(bell.locator('span.bg-red-500')).toBeVisible({ timeout: 10000 });

        // Open Panel
        await bell.click();

        // Wait for panel
        await expect(page.locator('h3', { hasText: 'Notifications' })).toBeVisible();

        // Verify Content
        await expect(page.getByText(uniqueTitle)).toBeVisible();
        await expect(page.getByText('realtime test message')).toBeVisible();
    });

    test('RT-02: Persistence (Refresh verification)', async ({ page }) => {
        const uniqueTitle = `Persist-${Date.now()}`;

        // Inject
        await supabase.from('notifications').insert({
            user_id: testUserId,
            type: 'assignment',
            title: uniqueTitle,
            message: 'Testing persistence after reload.',
            read: false
        });

        // Wait for it to arrive
        const bell = page.locator('button[title="Notifications"]');
        await expect(bell.locator('span.bg-red-500')).toBeVisible();

        // RELOAD
        await page.reload();
        await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();

        // Verify it's STILL there
        await expect(bell.locator('span.bg-red-500')).toBeVisible();
        await bell.click();
        await expect(page.getByText(uniqueTitle)).toBeVisible();
    });

    test('NV-01: Navigation via Link', async ({ page }) => {
        const uniqueTitle = `Nav-Test-${Date.now()}`;
        // Link to a specific page, e.g., /projects
        const targetLink = '/projects';

        await supabase.from('notifications').insert({
            user_id: testUserId,
            type: 'mention',
            title: uniqueTitle,
            message: 'Click me to go to Projects.',
            link: targetLink,
            read: false
        });

        const bell = page.locator('button[title="Notifications"]');
        await expect(bell.locator('span.bg-red-500')).toBeVisible();
        await bell.click();

        // Click the Item
        const item = page.getByText(uniqueTitle);
        await expect(item).toBeVisible();
        await item.click();

        // Expect URL change
        await expect(page).toHaveURL(/.*projects/);

        // Expect Panel Closed
        await expect(page.locator('h3', { hasText: 'Notifications' })).not.toBeVisible();
    });

    test('BL-04: Rejection Urgency (Edge Case)', async ({ page }) => {
        const uniqueTitle = `REJECTED-${Date.now()}`;

        const { error } = await supabase.from('notifications').insert({
            user_id: testUserId,
            type: 'rejection',
            title: uniqueTitle,
            message: 'Your task was rejected.',
            read: false
        });
        expect(error).toBeNull();

        const bell = page.locator('button[title="Notifications"]');

        // RELOAD to verify Persistence / DB acceptance separate from Realtime flakiness
        await page.reload();
        await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();

        await expect(bell.locator('span.bg-red-500')).toBeVisible();
        await bell.click();

        // Find the item
        const item = page.locator('li', { hasText: uniqueTitle });
        await expect(item).toBeVisible();

        // Verify "pulse" or specific style class for rejection
        // Code: "bg-red-500/5 animate-pulse"
        await expect(item).toHaveClass(/animate-pulse/);
    });

    test.afterAll(async () => {
        // Cleanup? 
        // We could delete the notifications we created, but "Clear All" in UI is easier manually.
        // For automated, maybe:
        // await supabase.from('notifications').delete().eq('user_id', testUserId).ilike('title', 'Test-%');
    });
});
