import { defineConfig, devices } from '@playwright/test';
import { cucumberReporter, defineBddConfig } from 'playwright-bdd';

// BDD_PORT lets parallel worktrees run BDD side by side (set inline: BDD_PORT=4199 npm run test:bdd).
const port = process.env['BDD_PORT'] ?? '4173';
const baseURL = `http://127.0.0.1:${port}`;

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
    baseURL,
    screenshot: 'only-on-failure',
    // Instant scrolls/animations: the app honors prefers-reduced-motion, so no step races a smooth scroll.
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npx ng serve --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    // Never reuse: a server on this port may belong to another worktree.
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
