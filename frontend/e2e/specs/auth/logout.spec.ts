/**
 * 登出流程 E2E 测试
 *
 * 验收标准覆盖：
 * AC1: 用户可以主动登出
 * AC2: 登出后应清除所有认证状态
 * AC3: 登出后应重定向到首页并显示登录按钮
 *
 * @module e2e/specs/auth/logout
 */

import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/auth-pages';
import { registerUser, logoutUser, clearAuth, getAuthState, STORAGE_KEYS } from '../../helpers/auth-helpers';
import { generateUsername, generateEmail } from '../../fixtures/auth/test-data';

test.describe('登出流程', () => {
  // ========================================================================
  // 基础登出测试
  // ========================================================================

  test.describe('基础登出', () => {
    test('点击登出按钮应清除认证状态', async ({ page }) => {
      // Arrange - 注册并登录
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 验证已登录
      await expect(page).toHaveURL('/');
      const userInfoBefore = page.locator('[data-testid="user-info"], .header-auth, .user-info');
      await expect(userInfoBefore).toBeVisible();

      // Act - 点击登出按钮
      await logoutUser(page);

      // Assert - 用户信息应不可见
      const userInfoAfter = page.locator('[data-testid="user-info"], .header-auth, .user-info');
      await expect(userInfoAfter).not.toBeVisible();
    });

    test('登出后应显示登录按钮', async ({ page }) => {
      // Arrange - 注册并登录
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // Act - 点击登出按钮
      await logoutUser(page);

      // Assert - 应显示登录按钮
      const loginButton = page.locator('a[href="/login"]');
      await expect(loginButton).toBeVisible();
    });

    test('登出后应隐藏登出按钮', async ({ page }) => {
      // Arrange - 注册并登录
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 验证登出按钮可见
      const logoutButtonBefore = page.locator(
        'button.header-auth-logout, button:has-text("登出"), button:has-text("退出"), [data-testid="logout-button"]'
      );
      await expect(logoutButtonBefore).toBeVisible();

      // Act - 点击登出按钮
      await logoutUser(page);

      // Assert - 登出按钮应不可见
      await expect(logoutButtonBefore).not.toBeVisible();
    });
  });

  // ========================================================================
  // Token 清除测试
  // ========================================================================

  test.describe('Token 清除', () => {
    test('登出后应清除 localStorage 中的 access_token', async ({ page }) => {
      // Arrange - 注册并登录
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 验证 Token 存在
      const hasTokenBefore = await page.evaluate(() => {
        const tokens = localStorage.getItem('auth_tokens');
        return !!tokens;
      });
      expect(hasTokenBefore).toBe(true);

      // Act - 点击登出按钮
      await logoutUser(page);

      // Assert - Token 应被清除
      const hasTokenAfter = await page.evaluate(() => {
        const tokens = localStorage.getItem('auth_tokens');
        return !!tokens;
      });
      expect(hasTokenAfter).toBe(false);
    });

    test('登出后应清除 localStorage 中的 refresh_token', async ({ page }) => {
      // Arrange - 注册并登录
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 验证 refresh_token 存在
      const hasRefreshTokenBefore = await page.evaluate(() => {
        const tokens = localStorage.getItem('auth_tokens');
        if (!tokens) return false;
        try {
          const parsed = JSON.parse(tokens);
          return !!parsed.refresh_token;
        } catch {
          return false;
        }
      });
      expect(hasRefreshTokenBefore).toBe(true);

      // Act - 点击登出按钮
      await logoutUser(page);

      // Assert - refresh_token 应被清除
      const hasRefreshTokenAfter = await page.evaluate(() => {
        const tokens = localStorage.getItem('auth_tokens');
        return !!tokens;
      });
      expect(hasRefreshTokenAfter).toBe(false);
    });

    test('登出后 getAuthState 应返回 unauthenticated', async ({ page }) => {
      // Arrange - 注册并登录
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 验证已登录
      const authStateBefore = await getAuthState(page);
      expect(authStateBefore).toBe('authenticated');

      // Act - 点击登出按钮
      await logoutUser(page);

      // Assert - 认证状态应为未登录
      const authStateAfter = await getAuthState(page);
      expect(authStateAfter).toBe('unauthenticated');
    });
  });

  // ========================================================================
  // 登出后路由行为测试
  // ========================================================================

  test.describe('登出后路由行为', () => {
    test('登出后刷新页面应保持未登录状态', async ({ page }) => {
      // Arrange - 注册并登录，然后登出
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);
      await logoutUser(page);

      // Act - 刷新页面
      await page.reload();

      // Assert - 应显示登录按钮，不显示用户信息
      const loginButton = page.locator('a[href="/login"]');
      await expect(loginButton).toBeVisible();
      const userInfo = page.locator('[data-testid="user-info"], .header-auth, .user-info');
      await expect(userInfo).not.toBeVisible();
    });

    test('登出后访问首页应显示登录界面', async ({ page }) => {
      // Arrange - 注册并登录，然后登出
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);
      await logoutUser(page);

      // Act - 直接访问首页
      await page.goto('/');

      // Assert - 应重定向到登录页
      await expect(page).toHaveURL('/login');
    });
  });

  // ========================================================================
  // 多次登出测试
  // ========================================================================

  test.describe('多次登出', () => {
    test('多次登出不应报错', async ({ page }) => {
      // Arrange - 注册并登录
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // Act - 第一次登出
      await logoutUser(page);

      // Assert - 不应抛出错误
      const authStateAfterFirst = await getAuthState(page);
      expect(authStateAfterFirst).toBe('unauthenticated');

      // Act - 尝试第二次登出（可能会找不到按钮）
      // 这是边界情况，取决于前端实现
      const logoutButton = page.locator(
        'button.header-auth-logout, button:has-text("登出"), button:has-text("退出"), [data-testid="logout-button"]'
      );
      const isVisible = await logoutButton.isVisible().catch(() => false);

      if (!isVisible) {
        // 如果按钮不可见，这是预期行为
        expect(isVisible).toBe(false);
      } else {
        // 如果按钮仍可见，尝试点击
        await logoutUser(page);
        const authStateAfterSecond = await getAuthState(page);
        expect(authStateAfterSecond).toBe('unauthenticated');
      }
    });
  });

  // ========================================================================
  // 跨标签页登出测试
  // ========================================================================

  test.describe('跨标签页登出', () => {
    test('在一个标签页登出后，其他标签页也应登出', async ({ page, context }) => {
      // Arrange - 在第一个标签页注册并登录
      const testUser = {
        username: generateUsername(),
        email: generateEmail(),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 打开第二个标签页并导航到首页
      const secondPage = await context.newPage();
      await secondPage.goto('/');

      // 验证第二个标签页也显示用户信息
      const userInfoInSecond = secondPage.locator('[data-testid="user-info"], .header-auth, .user-info');
      await expect(userInfoInSecond).toBeVisible();

      // Act - 在第一个标签页登出
      await logoutUser(page);

      // Assert - 第二个标签页的用户信息应不可见
      // 注意：这可能需要刷新页面或等待状态同步
      await secondPage.reload();
      await expect(userInfoInSecond).not.toBeVisible();

      // 清理
      await secondPage.close();
    });
  });
});
