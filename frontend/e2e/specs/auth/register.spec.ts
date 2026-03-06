/**
 * 注册流程 E2E 测试
 *
 * 测试范围：
 * 1. 表单验证（用户名、邮箱、密码规则）
 * 2. 成功注册流程
 * 3. 失败场景（重复用户名/邮箱）
 *
 * @see /workspace/frontend/e2e/helpers/auth-helpers.ts
 * @see /workspace/frontend/e2e/pages/auth-pages.ts
 */

import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/auth-pages';
import { registerUser, clearAuth } from '../../helpers/auth-helpers';
import {
  VALID_USER,
  VALID_MINIMAL,
  VALID_MAXIMUM,
  INVALID_SHORT_USERNAME,
  INVALID_LONG_USERNAME,
  INVALID_EMAIL_FORMAT,
  INVALID_SHORT_PASSWORD,
  INVALID_LONG_PASSWORD,
  DUPLICATE_USERNAME,
  DUPLICATE_EMAIL,
  generateUsername,
  generateEmail,
} from '../../fixtures/auth/test-data';

// ============================================================================
// 注册流程测试套件
// ============================================================================

test.describe('注册流程', () => {
  // 每个测试前清除认证状态
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  // ==========================================================================
  // 表单验证测试
  // ==========================================================================

  test.describe('表单验证', () => {
    test('应验证用户名最少 3 字符', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // 尝试注册用户名少于 3 字符的用户
      await registerPage.register(
        INVALID_SHORT_USERNAME.username,
        INVALID_SHORT_USERNAME.email,
        INVALID_SHORT_USERNAME.password
      );

      // 验证显示错误消息或仍在注册页面
      const hasError = await registerPage.hasError();
      const currentUrl = page.url();

      expect(
        hasError || currentUrl.includes('/register'),
        '应显示错误或停留在注册页面'
      ).toBeTruthy();
    });

    test('应验证用户名最多 50 字符', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // 尝试注册用户名超过 50 字符的用户
      await registerPage.register(
        INVALID_LONG_USERNAME.username,
        INVALID_LONG_USERNAME.email,
        INVALID_LONG_USERNAME.password
      );

      // 验证显示错误消息或仍在注册页面
      const hasError = await registerPage.hasError();
      const currentUrl = page.url();

      expect(
        hasError || currentUrl.includes('/register'),
        '应显示错误或停留在注册页面'
      ).toBeTruthy();
    });

    test('应验证邮箱格式', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // 尝试使用无效邮箱格式注册
      await registerPage.register(
        INVALID_EMAIL_FORMAT.username,
        INVALID_EMAIL_FORMAT.email,
        INVALID_EMAIL_FORMAT.password
      );

      // 验证显示错误消息或仍在注册页面
      const hasError = await registerPage.hasError();
      const currentUrl = page.url();

      expect(
        hasError || currentUrl.includes('/register'),
        '应显示错误或停留在注册页面'
      ).toBeTruthy();
    });

    test('应验证密码最少 8 字符', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // 尝试使用少于 8 字符的密码注册
      await registerPage.register(
        INVALID_SHORT_PASSWORD.username,
        INVALID_SHORT_PASSWORD.email,
        INVALID_SHORT_PASSWORD.password
      );

      // 验证显示错误消息或仍在注册页面
      const hasError = await registerPage.hasError();
      const currentUrl = page.url();

      expect(
        hasError || currentUrl.includes('/register'),
        '应显示错误或停留在注册页面'
      ).toBeTruthy();
    });
  });

  // ==========================================================================
  // 成功注册测试
  // ==========================================================================

  test.describe('成功注册', () => {
    test('应成功注册新用户并自动登录', async ({ page }) => {
      const uniqueUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };

      await registerUser(page, uniqueUser, { autoLogin: true });

      // 验证已跳转到首页
      await expect(page).toHaveURL('/');

      // 验证用户信息显示
      const userInfo = page.locator('[data-testid="user-info"], .user-info, .header-auth');
      await expect(userInfo).toBeVisible();
    });

    test('注册后应跳转到首页', async ({ page }) => {
      const uniqueUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };

      await registerUser(page, uniqueUser, { autoLogin: true });

      // 验证 URL 已跳转到首页
      await expect(page).toHaveURL('/');
    });

    test('注册后应显示用户信息', async ({ page }) => {
      const uniqueUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };

      await registerUser(page, uniqueUser, { autoLogin: true, verifyUserInfo: true });

      // 验证用户信息显示在页面上
      const userInfo = page.locator('[data-testid="user-info"], .user-info, .header-auth');
      await expect(userInfo).toBeVisible();

      // 验证用户名显示（可能在不同位置）
      const pageContent = await page.content();
      expect(pageContent).toContain(uniqueUser.username);
    });

    test('应接受最小长度的有效数据', async ({ page }) => {
      const uniqueUser = {
        username: 'abc', // 最少 3 字符
        email: `test_${Date.now()}@a.co`,
        password: '12345678', // 最少 8 字符
      };

      await registerUser(page, uniqueUser, { autoLogin: true });

      // 验证注册成功
      await expect(page).toHaveURL('/');
    });

    test('应接受最大长度的有效数据', async ({ page }) => {
      const uniqueUser = {
        username: 'a'.repeat(50), // 最多 50 字符
        email: `test_${Date.now()}@example.com`,
        password: 'a'.repeat(100), // 最多 100 字符
      };

      await registerUser(page, uniqueUser, { autoLogin: true });

      // 验证注册成功
      await expect(page).toHaveURL('/');
    });
  });

  // ==========================================================================
  // 失败场景测试
  // ==========================================================================

  test.describe('失败场景', () => {
    test('应拒绝重复的用户名', async ({ page }) => {
      // 首先注册一个用户
      const existingUser = {
        username: generateUsername('duplicate_test'),
        email: generateEmail('original'),
        password: 'TestPass123!',
      };

      await registerUser(page, existingUser, { autoLogin: true });

      // 清除认证状态
      await clearAuth(page);

      // 尝试使用相同用户名注册
      const duplicateUsernameUser = {
        username: existingUser.username, // 相同用户名
        email: generateEmail('duplicate'),
        password: 'TestPass123!',
      };

      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.register(
        duplicateUsernameUser.username,
        duplicateUsernameUser.email,
        duplicateUsernameUser.password
      );

      // 验证显示错误或仍在注册页面
      const hasError = await registerPage.hasError();
      const currentUrl = page.url();

      expect(
        hasError || currentUrl.includes('/register'),
        '应显示错误或停留在注册页面'
      ).toBeTruthy();

      // 验证没有跳转到首页（注册失败）
      await expect(page).not.toHaveURL('/');
    });

    test('应拒绝重复的邮箱', async ({ page }) => {
      // 首先注册一个用户
      const existingUser = {
        username: generateUsername('email_test'),
        email: `duplicate_${Date.now()}@example.com`,
        password: 'TestPass123!',
      };

      await registerUser(page, existingUser, { autoLogin: true });

      // 清除认证状态
      await clearAuth(page);

      // 尝试使用相同邮箱注册
      const duplicateEmailUser = {
        username: generateUsername('another'),
        email: existingUser.email, // 相同邮箱
        password: 'TestPass123!',
      };

      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.register(
        duplicateEmailUser.username,
        duplicateEmailUser.email,
        duplicateEmailUser.password
      );

      // 验证显示错误或仍在注册页面
      const hasError = await registerPage.hasError();
      const currentUrl = page.url();

      expect(
        hasError || currentUrl.includes('/register'),
        '应显示错误或停留在注册页面'
      ).toBeTruthy();

      // 验证没有跳转到首页（注册失败）
      await expect(page).not.toHaveURL('/');
    });
  });

  // ==========================================================================
  // UI 交互测试
  // ==========================================================================

  test.describe('UI 交互', () => {
    test('应能从注册页面跳转到登录页面', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.goToLogin();

      // 验证已跳转到登录页面
      await expect(page).toHaveURL(/\/login/);
    });

    test('注册页面应包含必要的表单元素', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      // 验证所有表单元素存在
      await expect(registerPage.usernameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.submitButton).toBeVisible();
      await expect(registerPage.loginLink).toBeVisible();
    });
  });
});
