import { defineConfig, devices } from '@playwright/test';
import { cucumberReporter, defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'tests/bdd/features/**/*.feature',
  outputDir: '.features-gen',
  steps: 'tests/bdd/steps/**/*.ts',
  missingSteps: 'fail-on-gen',
  arityCheck: true,
  quotes: 'single',
  language: 'en',
  verbose: false,
});

export default defineConfig({
  testDir,
  reporter: [
    cucumberReporter('html', {
      outputFile: 'reports/bdd-report/index.html',
      externalAttachments: true,
    }),
    ['html', { open: 'never', outputFolder: 'reports/playwright' }],
  ],
  outputDir: 'reports/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx ng serve --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
