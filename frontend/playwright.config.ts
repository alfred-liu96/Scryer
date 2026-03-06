import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // ---------------------------------------------------------------------------
  // 测试目录配置
  // ---------------------------------------------------------------------------
  testDir: './e2e',

  // 完整运行时每个测试的超时时间（毫秒）
  timeout: 30 * 1000,

  // 单个测试的期望超时时间
  expect: {
    timeout: 5 * 1000,
  },

  // 测试失败时的行为
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // ---------------------------------------------------------------------------
  // 报告配置
  // ---------------------------------------------------------------------------
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    process.env.CI ? ['github'] : null,
  ].filter(Boolean),

  // ---------------------------------------------------------------------------
  // 输出配置
  // ---------------------------------------------------------------------------
  use: {
    // 基础 URL（与 Next.js 开发服务器一致）
    baseURL: 'http://localhost:3000',

    // 追踪配置（失败时记录追踪）
    trace: 'retain-on-failure',

    // 截图配置
    screenshot: 'only-on-failure',

    // 视频录制配置
    video: 'retain-on-failure',

    // 测试操作超时
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
  },

  // ---------------------------------------------------------------------------
  // 项目（浏览器）配置
  // ---------------------------------------------------------------------------
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // ---------------------------------------------------------------------------
  // 开发服务器配置
  // ---------------------------------------------------------------------------
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
