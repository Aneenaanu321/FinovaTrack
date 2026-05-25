import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../backend',
      url: 'http://127.0.0.1:5000/api/health',
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        PORT: '5000',
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finovatrack_e2e',
        JWT_SECRET: process.env.JWT_SECRET || 'e2e-test-jwt-secret-min-32-characters-long',
        FRONTEND_URL: 'http://127.0.0.1:4173',
        ALLOW_REGISTRATION: 'true',
      },
    },
    {
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
