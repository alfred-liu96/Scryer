/**
 * E2E 测试认证辅助函数
 *
 * 职责：
 * - 提供用户注册、登录、登出的辅助函数
 * - 封装 Playwright Page API 操作
 * - 提供认证状态等待和清除功能
 *
 * @depends
 * - @playwright/test (Page, Locator)
 * - @/types/auth (LoginRequest, RegisterRequest)
 */

import type { Page, Locator } from '@playwright/test';

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 认证相关选择器常量
 */
export const AUTH_SELECTORS = {
  // 导航栏认证按钮
  LOGIN_BUTTON: 'a[href="/login"]',
  REGISTER_BUTTON: 'a[href="/register"]',
  LOGOUT_BUTTON: 'button.header-auth-logout, button:has-text("登出"), button:has-text("退出"), [data-testid="logout-button"]',

  // 表单输入
  USERNAME_INPUT: 'input[name="username"], #username',
  EMAIL_INPUT: 'input[name="email"], #email, input[type="email"]',
  IDENTIFIER_INPUT: 'input[name="identifier"]',
  PASSWORD_INPUT: 'input[name="password"], #password, input[type="password"]',

  // 提交按钮
  SUBMIT_BUTTON: 'button[type="submit"], .btn-primary',

  // 认证状态指示器
  USER_INFO: '.header-auth, [data-testid="user-info"], .user-info',
  AUTH_INDICATOR: '[data-testid="auth-indicator"]',

  // 错误消息
  ERROR_MESSAGE: '.alert-error, .error-message, [data-testid="error"]',
} as const;

/**
 * 存储键常量（需与前端代码保持一致）
 */
export const STORAGE_KEYS = {
  TOKENS: 'auth_tokens',
  AUTH_STATE: 'auth-state',
} as const;

/**
 * 默认超时配置
 */
export const DEFAULT_TIMEOUTS = {
  /** 页面导航超时 */
  NAVIGATION: 30000,
  /** 操作超时 */
  ACTION: 10000,
  /** 等待状态超时 */
  WAIT_STATE: 5000,
  /** 状态轮询间隔 */
  POLL_INTERVAL: 200,
} as const;

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 用户注册凭据
 */
export interface UserCredentials {
  /** 用户名 */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 密码 */
  password: string;
}

/**
 * 登录凭据
 */
export interface LoginCredentials {
  /** 用户名或邮箱 */
  usernameOrEmail: string;
  /** 密码 */
  password: string;
}

/**
 * 注册用户选项
 */
export interface RegisterUserOptions {
  /** 注册后是否自动登录（默认 true） */
  autoLogin?: boolean;
  /** 注册后是否验证用户信息（默认 true） */
  verifyUserInfo?: boolean;
  /** 操作超时时间（毫秒，默认 10000） */
  timeout?: number;
}

/**
 * 登录用户选项
 */
export interface LoginUserOptions {
  /** 登录后是否验证认证状态（默认 true） */
  verifyAuth?: boolean;
  /** 操作超时时间（毫秒，默认 10000） */
  timeout?: number;
}

/**
 * 登出用户选项
 */
export interface LogoutUserOptions {
  /** 是否验证登出后的未认证状态（默认 true） */
  verifyUnauth?: boolean;
  /** 操作超时时间（毫秒，默认 10000） */
  timeout?: number;
}

/**
 * 等待认证状态选项
 */
export interface WaitForAuthStateOptions {
  /** 目标认证状态 */
  expectedStatus: 'authenticated' | 'unauthenticated';
  /** 等待超时时间（毫秒，默认 5000） */
  timeout?: number;
  /** 轮询间隔（毫秒，默认 200） */
  interval?: number;
}

/**
 * 清除认证选项
 */
export interface ClearAuthOptions {
  /** 是否清除 localStorage（默认 true） */
  clearLocalStorage?: boolean;
  /** 是否清除 cookies（默认 true） */
  clearCookies?: boolean;
  /** 是否清除 sessionStorage（默认 true） */
  clearSessionStorage?: boolean;
}

/**
 * 认证辅助函数错误类型
 */
export enum AuthHelperErrorType {
  /** 页面导航失败 */
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  /** 元素未找到 */
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  /** 操作超时 */
  TIMEOUT = 'TIMEOUT',
  /** 认证状态验证失败 */
  AUTH_STATE_MISMATCH = 'AUTH_STATE_MISMATCH',
  /** 表单提交失败 */
  FORM_SUBMIT_FAILED = 'FORM_SUBMIT_FAILED',
}

/**
 * 认证辅助函数错误类
 */
export class AuthHelperError extends Error {
  constructor(
    public readonly type: AuthHelperErrorType,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthHelperError';
  }
}

// ============================================================================
// 辅助函数实现
// ============================================================================

/**
 * 注册新用户
 *
 * 逻辑流程：
 * 1. 导航到注册页面 (/register)
 * 2. 填写用户名、邮箱、密码
 * 3. 提交注册表单
 * 4. 可选：验证用户已登录
 * 5. 返回用户凭据（供后续测试使用）
 *
 * @param page - Playwright Page 实例
 * @param credentials - 用户注册凭据
 * @param options - 注册选项
 * @returns Promise<UserCredentials> 注册成功的用户凭据
 *
 * @example
 * ```ts
 * const credentials = await registerUser(page, {
 *   username: 'testuser',
 *   email: 'test@example.com',
 *   password: 'TestPassword123!',
 * }, { autoLogin: true });
 * ```
 */
export async function registerUser(
  page: Page,
  credentials: UserCredentials,
  options: RegisterUserOptions = {}
): Promise<UserCredentials> {
  const {
    autoLogin = true,
    verifyUserInfo = true,
    timeout = DEFAULT_TIMEOUTS.ACTION,
  } = options;

  try {
    // 1. 导航到注册页面
    await page.goto('/register', { timeout: DEFAULT_TIMEOUTS.NAVIGATION });

    // 2. 填写表单
    const usernameInput = page.locator(AUTH_SELECTORS.USERNAME_INPUT).first();
    const emailInput = page.locator(AUTH_SELECTORS.EMAIL_INPUT).first();
    const passwordInput = page.locator(AUTH_SELECTORS.PASSWORD_INPUT).first();

    await usernameInput.fill(credentials.username);
    await emailInput.fill(credentials.email);
    await passwordInput.fill(credentials.password);

    // 3. 提交表单
    const submitButton = page.locator(AUTH_SELECTORS.SUBMIT_BUTTON).first();
    await submitButton.click();

    // 4. 等待导航（注册成功后会跳转到首页）
    if (autoLogin) {
      await page.waitForURL('/', { timeout });
    }

    // 5. 验证用户信息显示（可选）
    if (verifyUserInfo && autoLogin) {
      const userInfo = page.locator(AUTH_SELECTORS.USER_INFO);
      await userInfo.waitFor({ state: 'visible', timeout });
    }

    return credentials;
  } catch (error) {
    throw new AuthHelperError(
      AuthHelperErrorType.FORM_SUBMIT_FAILED,
      `注册用户失败: ${error instanceof Error ? error.message : String(error)}`,
      { credentials }
    );
  }
}

/**
 * 登录用户
 *
 * 逻辑流程：
 * 1. 导航到登录页面 (/login)
 * 2. 填写用户名/邮箱和密码
 * 3. 提交登录表单
 * 4. 可选：验证用户已认证
 * 5. 返回登录凭据
 *
 * @param page - Playwright Page 实例
 * @param credentials - 登录凭据
 * @param options - 登录选项
 * @returns Promise<LoginCredentials> 登录成功的凭据
 *
 * @example
 * ```ts
 * await loginUser(page, {
 *   usernameOrEmail: 'testuser',
 *   password: 'TestPassword123!',
 * }, { verifyAuth: true });
 * ```
 */
export async function loginUser(
  page: Page,
  credentials: LoginCredentials,
  options: LoginUserOptions = {}
): Promise<LoginCredentials> {
  const {
    verifyAuth = true,
    timeout = DEFAULT_TIMEOUTS.ACTION,
  } = options;

  try {
    // 1. 导航到登录页面
    await page.goto('/login', { timeout: DEFAULT_TIMEOUTS.NAVIGATION });

    // 2. 填写表单
    // 登录表单使用 name="identifier" 的输入框
    const identifierInput = page.locator(
      AUTH_SELECTORS.IDENTIFIER_INPUT + ', ' + AUTH_SELECTORS.USERNAME_INPUT
    ).first();
    const passwordInput = page.locator(AUTH_SELECTORS.PASSWORD_INPUT).first();

    await identifierInput.fill(credentials.usernameOrEmail);
    await passwordInput.fill(credentials.password);

    // 3. 提交表单
    const submitButton = page.locator(AUTH_SELECTORS.SUBMIT_BUTTON).first();
    await submitButton.click();

    // 4. 等待导航（登录成功后会跳转到首页）
    await page.waitForURL('/', { timeout });

    // 5. 验证认证状态（可选）
    if (verifyAuth) {
      const userInfo = page.locator(AUTH_SELECTORS.USER_INFO);
      await userInfo.waitFor({ state: 'visible', timeout });
    }

    return credentials;
  } catch (error) {
    throw new AuthHelperError(
      AuthHelperErrorType.FORM_SUBMIT_FAILED,
      `登录用户失败: ${error instanceof Error ? error.message : String(error)}`,
      { credentials }
    );
  }
}

/**
 * 登出用户
 *
 * 逻辑流程：
 * 1. 查找并点击登出按钮
 * 2. 可选：验证用户已登出
 * 3. 清除本地认证状态
 *
 * @param page - Playwright Page 实例
 * @param options - 登出选项
 * @returns Promise<void>
 *
 * @example
 * ```ts
 * await logoutUser(page, { verifyUnauth: true });
 * ```
 */
export async function logoutUser(
  page: Page,
  options: LogoutUserOptions = {}
): Promise<void> {
  const {
    verifyUnauth = true,
    timeout = DEFAULT_TIMEOUTS.ACTION,
  } = options;

  try {
    // 1. 查找并点击登出按钮
    const logoutButton = page.locator(AUTH_SELECTORS.LOGOUT_BUTTON).first();

    // 等待登出按钮可见
    await logoutButton.waitFor({ state: 'visible', timeout });
    await logoutButton.click();

    // 2. 验证已登出（可选）
    if (verifyUnauth) {
      // 验证登出后显示登录按钮
      const loginButton = page.locator(AUTH_SELECTORS.LOGIN_BUTTON);
      await loginButton.waitFor({ state: 'visible', timeout });
    }
  } catch (error) {
    throw new AuthHelperError(
      AuthHelperErrorType.ELEMENT_NOT_FOUND,
      `登出用户失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 清除认证状态（强制清理）
 *
 * 逻辑流程：
 * 1. 清除 localStorage 中的 Token
 * 2. 清除 cookies 中的认证信息
 * 3. 清除 sessionStorage
 * 4. 刷新页面以确保状态同步
 *
 * @param page - Playwright Page 实例
 * @param options - 清除选项
 * @returns Promise<void>
 *
 * @example
 * ```ts
 * await clearAuth(page, { clearLocalStorage: true });
 * ```
 */
export async function clearAuth(
  page: Page,
  options: ClearAuthOptions = {}
): Promise<void> {
  const {
    clearLocalStorage = true,
    clearCookies = true,
    clearSessionStorage = true,
  } = options;

  try {
    // 清除 localStorage
    if (clearLocalStorage) {
      await page.evaluate(() => {
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth-state');
      });
    }

    // 清除 sessionStorage
    if (clearSessionStorage) {
      await page.evaluate(() => {
        sessionStorage.clear();
      });
    }

    // 清除 cookies
    if (clearCookies) {
      const context = page.context();
      await context.clearCookies();
    }
  } catch (error) {
    throw new AuthHelperError(
      AuthHelperErrorType.NAVIGATION_FAILED,
      `清除认证状态失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 等待认证状态变化
 *
 * 逻辑流程：
 * 1. 轮询检查 localStorage 中的 Token 状态
 * 2. 或检查页面上的认证状态指示器
 * 3. 达到目标状态或超时后返回
 *
 * @param page - Playwright Page 实例
 * @param options - 等待选项
 * @returns Promise<boolean> 是否达到目标状态
 *
 * @example
 * ```ts
 * const isAuth = await waitForAuthState(page, {
 *   expectedStatus: 'authenticated',
 *   timeout: 5000,
 * });
 * ```
 */
export async function waitForAuthState(
  page: Page,
  options: WaitForAuthStateOptions
): Promise<boolean> {
  const {
    expectedStatus,
    timeout = DEFAULT_TIMEOUTS.WAIT_STATE,
    interval = DEFAULT_TIMEOUTS.POLL_INTERVAL,
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const currentState = await getAuthState(page);

    if (currentState === expectedStatus) {
      return true;
    }

    // 等待指定间隔后重试
    await page.waitForTimeout(interval);
  }

  // 超时返回 false
  return false;
}

/**
 * 获取当前认证状态（从 localStorage）
 *
 * 逻辑流程：
 * 1. 读取 localStorage 中的 auth_tokens
 * 2. 解析并验证 Token 是否过期
 * 3. 返回认证状态
 *
 * @param page - Playwright Page 实例
 * @returns Promise<'authenticated' | 'unauthenticated'> 当前认证状态
 *
 * @example
 * ```ts
 * const status = await getAuthState(page);
 * ```
 */
export async function getAuthState(
  page: Page
): Promise<'authenticated' | 'unauthenticated'> {
  try {
    const hasTokens = await page.evaluate(() => {
      const tokens = localStorage.getItem('auth_tokens');
      if (!tokens) return false;

      try {
        const parsed = JSON.parse(tokens);
        // 检查是否有 access_token
        return !!parsed.access_token;
      } catch {
        return false;
      }
    });

    return hasTokens ? 'authenticated' : 'unauthenticated';
  } catch {
    return 'unauthenticated';
  }
}
