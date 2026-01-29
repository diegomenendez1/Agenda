
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        exclude: ['**/node_modules/**', '**/dist/**', '**/tests/**'], // Exclude Playwright tests directory
        include: ['src/**/*.{test,spec}.{ts,tsx}'], // Only include unit tests in src/
    },
});
