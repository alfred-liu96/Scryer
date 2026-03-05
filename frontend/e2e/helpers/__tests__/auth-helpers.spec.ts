/**
 * auth-helpers.spec.ts
 *
 * E2E 测试辅助函数单元测试
 *
 * 测试目标：验证 auth-helpers.ts 中的所有辅助函数行为
 *
 * 测试原则：
 * - RED FIRST：这些测试在实现代码完成前运行应该是失败的
 * - 简单性：测试代码逻辑简单，断言清晰
 * - 独立性：每个测试用例独立运行，不依赖其他测试
 */

import { test, expect } from '@playwright/test';
import {
  registerUser,
  loginUser,
  logoutUser,
  clearAuth,
  waitForAuthState,
  getAuthState,
  type UserCredentials,
  type LoginCredentials,
} from '../auth-helpers';

// ============================================================================
// 测试数据常量
// ============================================================================

const VALID_CREDENTIALS: UserCredentials = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'TestPassword123!',
};

const VALID_LOGIN_CREDENTIALS: LoginCredentials = {
  usernameOrEmail: 'testuser',
  password: 'TestPassword123!',
};

// ============================================================================
// registerUser 测试
// ============================================================================

test.describe('registerUser', () => {
  test('应该成功注册用户并返回凭据', async ({ page }) => {
    const result = await registerUser(page, VALID_CREDENTIALS);

    expect(result).toEqual(VALID_CREDENTIALS);
  });

  test('注册后默认自动登录', async ({ page }) => {
    await registerUser(page, VALID_CREDENTIALS);

    const authState = await getAuthState(page);
    expect(authState).toBe('authenticated');
  });

  test('注册时 autoLogin=false 不自动登录', async ({ page }) => {
    await registerUser(page, VALID_CREDENTIALS, { autoLogin: false });

    const authState = await getAuthState(page);
    expect(authState).toBe('unauthenticated');
  });

  test('注册时 verifyUserInfo=false 跳过用户信息验证', async ({ page }) => {
    const result = await registerUser(page, VALID_CREDENTIALS, {
      verifyUserInfo: false,
    });

    expect(result).toEqual(VALID_CREDENTIALS);
  });

  test('注册后导航离开注册页面', async ({ page }) => {
    await registerUser(page, VALID_CREDENTIALS);

    expect(page.url()).not.toContain('/register');
  });

  test('注册时支持自定义超时时间', async ({ page }) => {
    await registerUser(page, VALID_CREDENTIALS, { timeout: 5000 });

    const authState = await getAuthState(page);
    expect(authState).toBe('authenticated');
  });
});

// ============================================================================
// loginUser 测试
// ============================================================================

test.describe('loginUser', () => {
  test('应该成功登录用户', async ({ page }) => {
    const result = await loginUser(page, VALID_LOGIN_CREDENTIALS);

    expect(result).toEqual(VALID_LOGIN_CREDENTIALS);
  });

  test('登录后默认验证认证状态', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS);

    const authState = await getAuthState(page);
    expect(authState).toBe('authenticated');
  });

  test('登录时 verifyAuth=false 跳过状态验证', async ({ page }) => {
    const result = await loginUser(page, VALID_LOGIN_CREDENTIALS, {
      verifyAuth: false,
    });

    expect(result).toEqual(VALID_LOGIN_CREDENTIALS);
  });

  test('登录时支持自定义超时时间', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS, { timeout: 5000 });

    const authState = await getAuthState(page);
    expect(authState).toBe('authenticated');
  });

  test('支持使用邮箱登录', async ({ page }) => {
    await loginUser(page, {
      usernameOrEmail: 'test@example.com',
      password: 'TestPassword123!',
    });

    const authState = await getAuthState(page);
    expect(authState).toBe('authenticated');
  });
});

// ============================================================================
// logoutUser 测试
// ============================================================================

test.describe('logoutUser', () => {
  test('应该成功登出用户', async ({ page }) => {
    // 先登录
    await loginUser(page, VALID_LOGIN_CREDENTIALS);

    // 登出
    await logoutUser(page);

    const authState = await getAuthState(page);
    expect(authState).toBe('unauthenticated');
  });

  test('登出后默认验证未认证状态', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS);
    await logoutUser(page, { verifyUnauth: true });

    const authState = await getAuthState(page);
    expect(authState).toBe('unauthenticated');
  });

  test('登出时 verifyUnauth=false 跳过状态验证', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS);
    await logoutUser(page, { verifyUnauth: false });

    // 不抛出错误即视为成功
    expect(true).toBe(true);
  });

  test('登出时支持自定义超时时间', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS);
    await logoutUser(page, { timeout: 5000 });

    const authState = await getAuthState(page);
    expect(authState).toBe('unauthenticated');
  });
});

// ============================================================================
// clearAuth 测试
// ============================================================================

test.describe('clearAuth', () => {
  test('应该清除所有认证状态', async ({ page }) => {
    // 先登录
    await loginUser(page, VALID_LOGIN_CREDENTIALS);

    // 清除认证
    await clearAuth(page);

    const authState = await getAuthState(page);
    expect(authState).toBe('unauthenticated');
  });

  test('清除认证时默认清除所有存储', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS);

    await clearAuth(page);

    // 验证 localStorage 被清除
    const tokens = await page.evaluate(() => {
      return localStorage.getItem('auth_tokens');
    });
    expect(tokens).toBeNull();
  });

  test('清除时 clearLocalStorage=false 保留 localStorage', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS);

    // 设置一些额外的 localStorage 数据
    await page.evaluate(() => {
      localStorage.setItem('other_key', 'other_value');
    });

    await clearAuth(page, { clearLocalStorage: false });

    // 其他数据应该保留
    const otherValue = await page.evaluate(() => {
      return localStorage.getItem('other_key');
    });
    expect(otherValue).toBe('other_value');
  });

  test('清除时 clearCookies=false 保留 cookies', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS);

    await clearAuth(page, { clearCookies: false });

    // Cookies 中的认证信息应该保留
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name.includes('auth'));
    expect(authCookie).toBeDefined();
  });

  test('清除时 clearSessionStorage=true 清除 sessionStorage', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS);

    await clearAuth(page, { clearSessionStorage: true });

    const sessionData = await page.evaluate(() => {
      return sessionStorage.length;
    });
    expect(sessionData).toBe(0);
  });
});

// ============================================================================
// waitForAuthState 测试
// ============================================================================

test.describe('waitForAuthState', () => {
  test('应该等待认证状态变为 authenticated', async ({ page }) => {
    // 后台登录（不等待）
    page.goto('/login').then(() => {
      page.locator('input[name="username"]').fill(VALID_LOGIN_CREDENTIALS.usernameOrEmail);
      page.locator('input[name="password"]').fill(VALID_LOGIN_CREDENTIALS.password);
      page.locator('button[type="submit"]').click();
    });

    const isAuth = await waitForAuthState(page, {
      expectedStatus: 'authenticated',
      timeout: 10000,
    });

    expect(isAuth).toBe(true);
  });

  test('应该等待认证状态变为 unauthenticated', async ({ page }) => {
    // 先登录
    await loginUser(page, VALID_LOGIN_CREDENTIALS);

    // 后台登出
    logoutUser(page);

    const isUnauth = await waitForAuthState(page, {
      expectedStatus: 'unauthenticated',
      timeout: 5000,
    });

    expect(isUnauth).toBe(true);
  });

  test('等待超时时返回 false', async ({ page }) => {
    // 不进行任何操作，状态不会改变
    const isAuth = await waitForAuthState(page, {
      expectedStatus: 'authenticated',
      timeout: 1000,
    });

    expect(isAuth).toBe(false);
  });

  test('支持自定义轮询间隔', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS);

    const isAuth = await waitForAuthState(page, {
      expectedStatus: 'authenticated',
      timeout: 5000,
      interval: 500,
    });

    expect(isAuth).toBe(true);
  });
});

// ============================================================================
// getAuthState 测试
// ============================================================================

test.describe('getAuthState', () => {
  test('未登录时返回 unauthenticated', async ({ page }) => {
    const state = await getAuthState(page);

    expect(state).toBe('unauthenticated');
  });

  test('登录后返回 authenticated', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS);

    const state = await getAuthState(page);

    expect(state).toBe('authenticated');
  });

  test('登出后返回 unauthenticated', async ({ page }) => {
    await loginUser(page, VALID_LOGIN_CREDENTIALS);
    await logoutUser(page);

    const state = await getAuthState(page);

    expect(state).toBe('unauthenticated');
  });
});

// ============================================================================
// 完整流程测试
// ============================================================================

test.describe('完整认证流程', () => {
  test('注册 -> 登出 -> 登录 -> 登出', async ({ page }) => {
    // 注册
    const credentials = await registerUser(page, VALID_CREDENTIALS);
    expect(credentials).toEqual(VALID_CREDENTIALS);

    // 登出
    await logoutUser(page);
    expect(await getAuthState(page)).toBe('unauthenticated');

    // 登录
    await loginUser(page, VALID_LOGIN_CREDENTIALS);
    expect(await getAuthState(page)).toBe('authenticated');

    // 登出
    await logoutUser(page);
    expect(await getAuthState(page)).toBe('unauthenticated');
  });

  test('清除认证后重新登录', async ({ page }) => {
    // 登录
    await loginUser(page, VALID_LOGIN_CREDENTIALS);
    expect(await getAuthState(page)).toBe('authenticated');

    // 强制清除
    await clearAuth(page);
    expect(await getAuthState(page)).toBe('unauthenticated');

    // 重新登录
    await loginUser(page, VALID_LOGIN_CREDENTIALS);
    expect(await getAuthState(page)).toBe('authenticated');
  });
});
