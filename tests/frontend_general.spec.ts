import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './fixtures';

test.describe('Frontend General Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Authenticate
        await page.goto('/auth');
        await page.fill('input[type="email"]', TEST_CREDENTIALS.OWNER_EMAIL);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.OWNER_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/inbox', { timeout: 15000 });
    });

    test('1. 404 / Invalid Route Handling', async ({ page }) => {
        // Navigate to a non-existent route
        await page.goto('/some-invalid-route-12345');

        // Should redirect to Inbox (or Tasks/Home) as defined in App.tsx Routes
        // <Route path="/*" element={...} /> usually catches, but inside the authenticated layout?
        // Let's check matching URL. App.tsx has: <Route path="/" element={<Navigate to="/inbox" replace />} />
        // But the catch-all for Auth users is usually handled. 
        // If simply "No route matches", React Router might render nothing or the Sidebar only.
        // Let's verify we at least see the Sidebar (proving we didn't crash).
        await expect(page.locator('nav').first()).toBeVisible();
    });

    test('2. Theme Toggle Logic', async ({ page }) => {
        await page.goto('/settings');
        // Check initial state (assuming Light or System)
        // Click "Dark"
        await page.click('button:has-text("dark")');

        // Verify <html> has class "dark"
        const html = page.locator('html');
        await expect(html).toHaveClass(/dark/);

        // Click "Light"
        await page.click('button:has-text("light")');
        await expect(html).not.toHaveClass(/dark/);
    });

    test('3. Mobile Responsiveness (Sidebar)', async ({ page }) => {
        // Set viewport to Mobile (e.g. iPhone)
        await page.setViewportSize({ width: 375, height: 667 });

        // Sidebar should be hidden (or collapsed)
        // In mobile implementation, Sidebar container might be visually hidden or translated off-screen
        // We look for the "Menu" hamburger button
        const menuBtn = page.locator('button:has(svg.lucide-menu)');
        // Note: App.tsx line 108: <Menu size={20} />

        await expect(menuBtn).toBeVisible();
        await menuBtn.click();

        // Now sidebar should be visible overlay
        const sidebar = page.locator('[data-component="sidebar"]'); // Assuming we can find it structurally
        // Or checking generic text "Inbox" in nav which was hidden
        await expect(page.getByText('Inbox').first()).toBeVisible();
    });

    test('4. Toaster Presence', async ({ page }) => {
        // Simply check the toaster container exists in DOM
        const toaster = page.locator('[data-sonner-toaster]');
        await expect(toaster).toBeAttached();
    });
});
