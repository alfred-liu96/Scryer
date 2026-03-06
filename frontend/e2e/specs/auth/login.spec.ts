/**
 * 登录流程 E2E 测试
 *
 * 测试范围：
 * 1. 用户名登录
 * 2. 邮箱登录
 * 3. 错误处理（错误密码、不存在用户、空字段）
 *
 * @see /workspace/frontend/e2e/helpers/auth-helpers.ts
 * @see /workspace/frontend/e2e/pages/auth-pages.ts
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth-pages';
import { registerUser, loginUser, clearAuth } from '../../helpers/auth-helpers';
import {
  VALID_USER,
  INVALID_PASSWORD,
  NON_EXISTENT_USER,
  generateUsername,
  generateEmail,
} from '../../fixtures/auth/test-data';

// ============================================================================
// 登录流程测试套件
// ============================================================================

test.describe('登录流程', () => {
  // 每个测试前清除认证状态
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  // ==========================================================================
  // 用户名登录测试
  // ==========================================================================

  test.describe('用户名登录', () => {
    test('应支持用户名登录', async ({ page }) => {
      // 首先注册一个用户
      const testUser = {
        username: generateUsername('login_test'),
        email: generateEmail('login_test'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 清除认证状态，准备测试登录
      await clearAuth(page);

      // 使用用户名登录
      await loginUser(page, {
        usernameOrEmail: testUser.username,
        password: testUser.password,
      });

      // 验证已跳转到首页
      await expect(page).toHaveURL('/');

      // 验证用户信息显示
      const userInfo = page.locator('[data-testid="user-info"], .user-info, .header-auth');
      await expect(userInfo).toBeVisible();
    });

    test('用户名登录应区分大小写', async ({ page }) => {
      // 注册用户（小写）
      const testUser = {
        username: generateUsername('case_test').toLowerCase(),
        email: generateEmail('case_test'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });
      await clearAuth(page);

      // 使用大写用户名登录（应该失败）
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(
        testUser.username.toUpperCase(),
        testUser.password
      );

      // 验证显示错误或仍在登录页面
      const hasError = await loginPage.hasError();
      const currentUrl = page.url();

      expect(
        hasError || currentUrl.includes('/login'),
        '应显示错误或停留在登录页面'
      ).toBeTruthy();
    });
  });

  // ==========================================================================
  // 邮箱登录测试
  // ==========================================================================

  test.describe('邮箱登录', () => {
    test('应支持邮箱登录', async ({ page }) => {
      // 首先注册一个用户
      const testUser = {
        username: generateUsername('email_login'),
        email: generateEmail('email_login'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 清除认证状态，准备测试登录
      await clearAuth(page);

      // 使用邮箱登录
      await loginUser(page, {
        usernameOrEmail: testUser.email,
        password: testUser.password,
      });

      // 验证已跳转到首页
      await expect(page).toHaveURL('/');

      // 验证用户信息显示
      const userInfo = page.locator('[data-testid="user-info"], .user-info, .header-auth');
      await expect(userInfo).toBeVisible();
    });

    test('邮箱登录应不区分大小写', async ({ page }) => {
      // 注册用户
      const testUser = {
        username: generateUsername('email_case'),
        email: `test_${Date.now()}@EXAMPLE.COM`,
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });
      await clearAuth(page);

      // 使用小写邮箱登录（应该成功）
      await loginUser(page, {
        usernameOrEmail: testUser.email.toLowerCase(),
        password: testUser.password,
      });

      // 验证登录成功
      await expect(page).toHaveURL('/');
    });
  });

  // ==========================================================================
  // 错误处理测试
  // ==========================================================================

  test.describe('错误处理', () => {
    test('应显示用户名或密码错误提示', async ({ page }) => {
      // 首先注册一个用户
      const testUser = {
        username: generateUsername('wrong_pass'),
        email: generateEmail('wrong_pass'),
        password: 'CorrectPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });
      await clearAuth(page);

      // 使用错误密码登录
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(
        testUser.username,
        'WrongPassword123!'
      );

      // 验证显示错误或仍在登录页面
      const hasError = await loginPage.hasError();
      const currentUrl = page.url();

      expect(
        hasError || currentUrl.includes('/login'),
        '应显示错误或停留在登录页面'
      ).toBeTruthy();

      // 验证没有跳转到首页（登录失败）
      await expect(page).not.toHaveURL('/');
    });

    test('应显示用户不存在错误', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // 尝试登录不存在的用户
      await loginPage.login(
        'nonexistentuser_' + Date.now(),
        'SomePassword123!'
      );

      // 验证显示错误或仍在登录页面
      const hasError = await loginPage.hasError();
      const currentUrl = page.url();

      expect(
        hasError || currentUrl.includes('/login'),
        '应显示错误或停留在登录页面'
      ).toBeTruthy();

      // 验证没有跳转到首页（登录失败）
      await expect(page).not.toHaveURL('/');
    });

    test('应验证空用户名字段', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // 尝试使用空用户名登录
      await loginPage.login('', 'SomePassword123!');

      // 验证没有提交（表单验证或仍在登录页面）
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    });

    test('应验证空密码字段', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // 尝试使用空密码登录
      await loginPage.login('testuser', '');

      // 验证没有提交（表单验证或仍在登录页面）
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    });

    test('应验证所有字段为空', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // 尝试使用空字段登录
      await loginPage.login('', '');

      // 验证没有提交（表单验证或仍在登录页面）
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    });
  });

  // ==========================================================================
  // 登录后状态验证测试
  // ==========================================================================

  test.describe('登录后状态', () => {
    test('登录成功后应显示用户名', async ({ page }) => {
      const testUser = {
        username: generateUsername('display_name'),
        email: generateEmail('display_name'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });
      await clearAuth(page);

      // 登录
      await loginUser(page, {
        usernameOrEmail: testUser.username,
        password: testUser.password,
      });

      // 验证用户名显示在页面上
      const pageContent = await page.content();
      expect(pageContent).toContain(testUser.username);
    });

    test('登录成功后应存储 Token 到 localStorage', async ({ page }) => {
      const testUser = {
        username: generateUsername('token_test'),
        email: generateEmail('token_test'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });
      await clearAuth(page);

      // 登录
      await loginUser(page, {
        usernameOrEmail: testUser.username,
        password: testUser.password,
      });

      // 验证 Token 已存储到 localStorage
      const hasTokens = await page.evaluate(() => {
        const tokens = localStorage.getItem('auth_tokens');
        return !!tokens;
      });

      expect(hasTokens).toBeTruthy();
    });
  });

  // ==========================================================================
  // UI 交互测试
  // ==========================================================================

  test.describe('UI 交互', () => {
    test('应能从登录页面跳转到注册页面', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.goToRegister();

      // 验证已跳转到注册页面
      await expect(page).toHaveURL(/\/register/);
    });

    test('登录页面应包含必要的表单元素', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // 验证所有表单元素存在
      await expect(loginPage.identifierInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
      await expect(loginPage.registerLink).toBeVisible();
    });
  });
});
