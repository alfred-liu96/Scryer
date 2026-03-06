/**
 * 路由保护 E2E 测试
 *
 * 验收标准覆盖：
 * AC1: 未登录用户访问受保护页面应重定向到登录页
 * AC2: 已登录用户访问认证页面应重定向到首页
 *
 * @module e2e/specs/auth/route-protection
 */

import { test, expect } from '@playwright/test';
import { RegisterPage, LoginPage } from '../../pages/auth-pages';
import { registerUser, clearAuth } from '../../helpers/auth-helpers';
import { generateUsername, generateEmail } from '../../fixtures/auth/test-data';

test.describe('路由保护', () => {
  // 每个测试前清除认证状态
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  // ========================================================================
  // 未登录重定向测试
  // ========================================================================

  test.describe('未登录重定向', () => {
    test('未登录访问首页应重定向到登录页', async ({ page }) => {
      // Act - 直接访问首页
      await page.goto('/');

      // Assert - 应重定向到登录页
      await expect(page).toHaveURL('/login');
    });

    test('未登录访问受保护路由应显示登录按钮', async ({ page }) => {
      // Act - 直接访问首页
      await page.goto('/');

      // Assert - 应显示登录按钮
      const loginButton = page.locator('a[href="/login"]');
      await expect(loginButton).toBeVisible();
    });

    test('未登录访问受保护路由不应显示用户信息', async ({ page }) => {
      // Act - 直接访问首页
      await page.goto('/');

      // Assert - 不应显示用户信息
      const userInfo = page.locator('[data-testid="user-info"], .header-auth, .user-info');
      await expect(userInfo).not.toBeVisible();
    });
  });

  // ========================================================================
  // 已登录重定向测试
  // ========================================================================

  test.describe('已登录重定向', () => {
    test.beforeEach(async ({ page }) => {
      // 注册并登录用户
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);
    });

    test('已登录访问登录页应重定向到首页', async ({ page }) => {
      // Act - 已登录用户访问登录页
      await page.goto('/login');

      // Assert - 应重定向到首页
      await expect(page).toHaveURL('/');
    });

    test('已登录访问注册页应重定向到首页', async ({ page }) => {
      // Act - 已登录用户访问注册页
      await page.goto('/register');

      // Assert - 应重定向到首页
      await expect(page).toHaveURL('/');
    });

    test('已登录访问首页应正常显示', async ({ page }) => {
      // Act - 已登录用户访问首页
      await page.goto('/');

      // Assert - 应显示在首页
      await expect(page).toHaveURL('/');
      const userInfo = page.locator('[data-testid="user-info"], .header-auth, .user-info');
      await expect(userInfo).toBeVisible();
    });

    test('已登录用户不应看到登录按钮', async ({ page }) => {
      // Act - 已登录用户访问首页
      await page.goto('/');

      // Assert - 不应显示登录按钮
      const loginButton = page.locator('a[href="/login"]');
      await expect(loginButton).not.toBeVisible();
    });

    test('已登录用户应看到登出按钮', async ({ page }) => {
      // Act - 已登录用户访问首页
      await page.goto('/');

      // Assert - 应显示登出按钮
      const logoutButton = page.locator(
        'button.header-auth-logout, button:has-text("登出"), button:has-text("退出"), [data-testid="logout-button"]'
      );
      await expect(logoutButton).toBeVisible();
    });
  });

  // ========================================================================
  // 登出后重定向测试
  // ========================================================================

  test.describe('登出后重定向', () => {
    test('登出后访问首页应重定向到登录页', async ({ page }) => {
      // Arrange - 注册并登录，然后登出
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);
      await clearAuth(page);

      // Act - 访问首页
      await page.goto('/');

      // Assert - 应重定向到登录页
      await expect(page).toHaveURL('/login');
    });

    test('登出后应显示登录按钮', async ({ page }) => {
      // Arrange - 注册并登录，然后登出
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);
      await clearAuth(page);

      // Act - 访问首页
      await page.goto('/');

      // Assert - 应显示登录按钮
      const loginButton = page.locator('a[href="/login"]');
      await expect(loginButton).toBeVisible();
    });
  });

  // ========================================================================
  // 路由过渡测试
  // ========================================================================

  test.describe('路由过渡', () => {
    test('从登录页到首页的过渡应正常', async ({ page }) => {
      // Arrange - 清除状态
      await clearAuth(page);
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Act - 登录
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      // 先注册用户
      await registerUser(page, testUser);
      await clearAuth(page);
      // 再登录
      await loginPage.goto();
      await loginPage.login(testUser.username, testUser.password);

      // Assert - 应成功过渡到首页
      await expect(page).toHaveURL('/');
      const userInfo = page.locator('[data-testid="user-info"], .header-auth, .user-info');
      await expect(userInfo).toBeVisible();
    });
  });
});
