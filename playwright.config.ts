
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1, // Avoid parallelism issues on local DB
    timeout: 60000, // Increase global timeout to 60s
    reporter: [['line'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        viewport: { width: 1280, height: 720 },
        actionTimeout: 10000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run build && npx vite preview --port 3000',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 180 * 1000,
    },
});
