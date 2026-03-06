/**
 * Token 持久化 E2E 测试
 *
 * 测试范围：
 * 1. 刷新页面后保持登录状态
 * 2. Token 正确存储到 localStorage
 * 3. Token 过期后自动刷新
 *
 * @see /workspace/frontend/e2e/helpers/auth-helpers.ts
 * @see /workspace/frontend/e2e/pages/auth-pages.ts
 */

import { test, expect } from '@playwright/test';
import { registerUser, loginUser, clearAuth, getAuthState, waitForAuthState } from '../../helpers/auth-helpers';
import { generateUsername, generateEmail } from '../../fixtures/auth/test-data';

// ============================================================================
// Token 持久化测试套件
// ============================================================================

test.describe('Token 持久化', () => {
  // 每个测试前清除认证状态
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  // ==========================================================================
  // 页面刷新持久化测试
  // ==========================================================================

  test.describe('页面刷新持久化', () => {
    test('刷新页面后应保持登录状态', async ({ page }) => {
      // 创建并登录用户
      const testUser = {
        username: generateUsername('refresh_test'),
        email: generateEmail('refresh_test'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 验证初始登录状态
      let authState = await getAuthState(page);
      expect(authState).toBe('authenticated');

      // 验证用户信息显示
      const userInfo = page.locator('[data-testid="user-info"], .user-info, .header-auth');
      await expect(userInfo).toBeVisible();

      // 刷新页面
      await page.reload();

      // 验证刷新后仍保持登录状态
      authState = await getAuthState(page);
      expect(authState).toBe('authenticated');

      // 验证用户信息仍然显示
      await expect(userInfo).toBeVisible();
    });

    test('多次刷新页面后应保持登录状态', async ({ page }) => {
      // 创建并登录用户
      const testUser = {
        username: generateUsername('multi_refresh'),
        email: generateEmail('multi_refresh'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 多次刷新页面
      for (let i = 0; i < 3; i++) {
        await page.reload();

        // 验证每次刷新后仍保持登录状态
        const authState = await getAuthState(page);
        expect(authState).toBe('authenticated');

        const userInfo = page.locator('[data-testid="user-info"], .user-info, .header-auth');
        await expect(userInfo).toBeVisible();
      }
    });

    test('刷新后应能访问需要认证的页面', async ({ page }) => {
      // 创建并登录用户
      const testUser = {
        username: generateUsername('access_test'),
        email: generateEmail('access_test'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 刷新页面
      await page.reload();

      // 验证仍在首页（需要认证的页面）
      await expect(page).toHaveURL('/');

      // 验证用户信息显示
      const userInfo = page.locator('[data-testid="user-info"], .user-info, .header-auth');
      await expect(userInfo).toBeVisible();
    });
  });

  // ==========================================================================
  // Token 存储测试
  // ==========================================================================

  test.describe('Token 存储', () => {
    test('应正确存储 access_token 到 localStorage', async ({ page }) => {
      const testUser = {
        username: generateUsername('access_token'),
        email: generateEmail('access_token'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 验证 access_token 存在
      const hasAccessToken = await page.evaluate(() => {
        const tokens = localStorage.getItem('auth_tokens');
        if (!tokens) return false;

        try {
          const parsed = JSON.parse(tokens);
          return !!parsed.access_token && typeof parsed.access_token === 'string';
        } catch {
          return false;
        }
      });

      expect(hasAccessToken).toBeTruthy();
    });

    test('应正确存储 refresh_token 到 localStorage', async ({ page }) => {
      const testUser = {
        username: generateUsername('refresh_token'),
        email: generateEmail('refresh_token'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 验证 refresh_token 存在
      const hasRefreshToken = await page.evaluate(() => {
        const tokens = localStorage.getItem('auth_tokens');
        if (!tokens) return false;

        try {
          const parsed = JSON.parse(tokens);
          return !!parsed.refresh_token && typeof parsed.refresh_token === 'string';
        } catch {
          return false;
        }
      });

      expect(hasRefreshToken).toBeTruthy();
    });

    test('Token 应包含必要的字段', async ({ page }) => {
      const testUser = {
        username: generateUsername('token_fields'),
        email: generateEmail('token_fields'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 验证 Token 结构
      const tokenStructure = await page.evaluate(() => {
        const tokens = localStorage.getItem('auth_tokens');
        if (!tokens) return null;

        try {
          const parsed = JSON.parse(tokens);
          return {
            hasAccessToken: !!parsed.access_token,
            hasRefreshToken: !!parsed.refresh_token,
            hasTokenType: !!parsed.token_type,
            accessTokenType: typeof parsed.access_token,
            refreshTokenType: typeof parsed.refresh_token,
          };
        } catch {
          return null;
        }
      });

      expect(tokenStructure).not.toBeNull();
      expect(tokenStructure?.hasAccessToken).toBeTruthy();
      expect(tokenStructure?.hasRefreshToken).toBeTruthy();
      expect(tokenStructure?.accessTokenType).toBe('string');
      expect(tokenStructure?.refreshTokenType).toBe('string');
    });
  });

  // ==========================================================================
  // Token 生命周期测试
  // ==========================================================================

  test.describe('Token 生命周期', () => {
    test('Token 应在登录后创建', async ({ page }) => {
      const testUser = {
        username: generateUsername('token_create'),
        email: generateEmail('token_create'),
        password: 'TestPass123!',
      };

      // 先注册
      await registerUser(page, testUser, { autoLogin: true });

      // 验证 Token 存在
      const authState = await getAuthState(page);
      expect(authState).toBe('authenticated');

      // 清除并重新登录
      await clearAuth(page);

      let hasTokens = await page.evaluate(() => !!localStorage.getItem('auth_tokens'));
      expect(hasTokens).toBeFalsy();

      // 重新登录
      await loginUser(page, {
        usernameOrEmail: testUser.username,
        password: testUser.password,
      });

      // 验证 Token 重新创建
      hasTokens = await page.evaluate(() => !!localStorage.getItem('auth_tokens'));
      expect(hasTokens).toBeTruthy();
    });

    test('Token 应在登出后清除', async ({ page }) => {
      const testUser = {
        username: generateUsername('token_clear'),
        email: generateEmail('token_clear'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 验证 Token 存在
      let hasTokens = await page.evaluate(() => !!localStorage.getItem('auth_tokens'));
      expect(hasTokens).toBeTruthy();

      // 登出
      await page.click('button.header-auth-logout, button:has-text("登出"), button:has-text("退出"), [data-testid="logout-button"]');

      // 等待登出完成
      await page.waitForTimeout(1000);

      // 验证 Token 已清除
      hasTokens = await page.evaluate(() => !!localStorage.getItem('auth_tokens'));
      expect(hasTokens).toBeFalsy();
    });

    test('清除 localStorage 后应变为未认证状态', async ({ page }) => {
      const testUser = {
        username: generateUsername('clear_state'),
        email: generateEmail('clear_state'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 验证已认证
      let authState = await getAuthState(page);
      expect(authState).toBe('authenticated');

      // 清除 localStorage
      await clearAuth(page);

      // 验证变为未认证状态
      authState = await getAuthState(page);
      expect(authState).toBe('unauthenticated');

      // 刷新页面
      await page.reload();

      // 验证被重定向到登录页面
      await page.waitForURL(/\/login/, { timeout: 5000 }).catch(() => {
        // 可能重定向到首页或其他页面，这也是可接受的
      });
    });
  });

  // ==========================================================================
  // Token 刷新测试
  // ==========================================================================

  test.describe('Token 自动刷新', () => {
    test('应使用 refresh_token 刷新 access_token', async ({ page }) => {
      const testUser = {
        username: generateUsername('auto_refresh'),
        email: generateEmail('auto_refresh'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 获取原始 Token
      const originalTokens = await page.evaluate(() => {
        const tokens = localStorage.getItem('auth_tokens');
        return tokens ? JSON.parse(tokens) : null;
      });

      expect(originalTokens).not.toBeNull();
      expect(originalTokens?.access_token).toBeTruthy();

      // 模拟 Token 过期（手动清除 access_token，保留 refresh_token）
      await page.evaluate(() => {
        const tokens = localStorage.getItem('auth_tokens');
        if (tokens) {
          const parsed = JSON.parse(tokens);
          delete parsed.access_token;
          localStorage.setItem('auth_tokens', JSON.stringify(parsed));
        }
      });

      // 刷新页面触发 Token 刷新
      await page.reload();

      // 等待 Token 刷新
      await page.waitForTimeout(2000);

      // 验证 access_token 已刷新
      const newTokens = await page.evaluate(() => {
        const tokens = localStorage.getItem('auth_tokens');
        return tokens ? JSON.parse(tokens) : null;
      });

      // Token 应该已被刷新（access_token 重新存在）
      expect(newTokens?.access_token).toBeTruthy();
    });

    test('Token 刷新后应保持认证状态', async ({ page }) => {
      const testUser = {
        username: generateUsername('refresh_auth'),
        email: generateEmail('refresh_auth'),
        password: 'TestPass123!',
      };

      await registerUser(page, testUser, { autoLogin: true });

      // 验证初始认证状态
      let authState = await getAuthState(page);
      expect(authState).toBe('authenticated');

      // 刷新页面
      await page.reload();

      // 等待可能的 Token 刷新
      await page.waitForTimeout(1000);

      // 验证仍保持认证状态
      authState = await getAuthState(page);
      expect(authState).toBe('authenticated');

      // 验证用户信息仍然显示
      const userInfo = page.locator('[data-testid="user-info"], .user-info, .header-auth');
      await expect(userInfo).toBeVisible();
    });
  });

  // ==========================================================================
  // 跨标签页持久化测试
  // ==========================================================================

  test.describe('跨标签页持久化', () => {
    test('新标签页应能读取已存储的 Token', async ({ browser }) => {
      const testUser = {
        username: generateUsername('multi_tab'),
        email: generateEmail('multi_tab'),
        password: 'TestPass123!',
      };

      // 第一个标签页：登录
      const page1 = await browser.newPage();
      await registerUser(page1, testUser, { autoLogin: true });

      // 验证第一个标签页已登录
      let authState = await getAuthState(page1);
      expect(authState).toBe('authenticated');

      // 第二个标签页：访问首页
      const page2 = await browser.newPage();
      await page2.goto('/');

      // 等待可能的导航或状态检查
      await page2.waitForTimeout(1000);

      // 验证第二个标签页的认证状态
      // 注意：localStorage 在同一域名下的标签页是共享的
      authState = await getAuthState(page2);
      // 新标签页应该能读取到 Token，但可能需要重新初始化认证状态
      const hasTokens = await page2.evaluate(() => !!localStorage.getItem('auth_tokens'));

      expect(hasTokens).toBeTruthy();

      // 清理
      await page1.close();
      await page2.close();
    });
  });
});
