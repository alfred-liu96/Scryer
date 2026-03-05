/**
 * 认证相关页面对象模型 (Page Object Model)
 *
 * 职责：
 * - 封装认证相关页面的选择器和操作
 * - 提供类型安全的页面元素访问
 *
 * @depends
 * - @playwright/test (Page, Locator)
 */

import type { Page, Locator } from '@playwright/test';

// ============================================================================
// 注册页面
// ============================================================================

/**
 * 注册页面类
 */
export class RegisterPage {
  readonly page: Page;

  // 页面 URL
  static readonly URL = '/register';

  // 页面元素选择器
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="username"], #username');
    this.emailInput = page.locator('input[name="email"], #email, input[type="email"]');
    this.passwordInput = page.locator('input[name="password"]:first-of-type, #password, input[type="password"]:first-of-type');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="confirm_password"]');
    this.submitButton = page.locator('button[type="submit"], .btn-primary');
    this.loginLink = page.locator('a[href="/login"], .login-link');
    this.errorMessage = page.locator('.alert-error, .error-message, [data-testid="error"]');
  }

  /**
   * 导航到注册页面
   */
  async goto(): Promise<void> {
    await this.page.goto(RegisterPage.URL);
  }

  /**
   * 填写并提交注册表单
   *
   * @param username - 用户名
   * @param email - 邮箱
   * @param password - 密码
   * @param confirmPassword - 确认密码（可选）
   */
  async register(
    username: string,
    email: string,
    password: string,
    confirmPassword?: string
  ): Promise<void> {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    // 如果存在确认密码字段，则填写
    if (confirmPassword !== undefined) {
      await this.confirmPasswordInput.fill(confirmPassword);
    }

    await this.submitButton.click();
  }

  /**
   * 跳转到登录页面
   */
  async goToLogin(): Promise<void> {
    await this.loginLink.click();
  }

  /**
   * 获取错误消息
   */
  async getErrorMessage(): Promise<string | null> {
    const isVisible = await this.errorMessage.isVisible().catch(() => false);
    if (!isVisible) return null;
    return this.errorMessage.textContent();
  }

  /**
   * 检查是否显示错误
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible().catch(() => false);
  }
}

// ============================================================================
// 登录页面
// ============================================================================

/**
 * 登录页面类
 */
export class LoginPage {
  readonly page: Page;

  // 页面 URL
  static readonly URL = '/login';

  // 页面元素选择器
  readonly identifierInput: Locator;
  readonly usernameOrEmailInput: Locator; // 别名，用于测试
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.identifierInput = page.locator(
      'input[name="identifier"], input[name="username"], input[name="email"], #username, #email'
    );
    this.usernameOrEmailInput = this.identifierInput; // 别名
    this.passwordInput = page.locator('input[name="password"], #password, input[type="password"]');
    this.submitButton = page.locator('button[type="submit"], .btn-primary');
    this.registerLink = page.locator('a[href="/register"], .register-link');
    this.errorMessage = page.locator('.alert-error, .error-message, [data-testid="error"]');
  }

  /**
   * 导航到登录页面
   */
  async goto(): Promise<void> {
    await this.page.goto(LoginPage.URL);
  }

  /**
   * 填写并提交登录表单
   *
   * @param usernameOrEmail - 用户名或邮箱
   * @param password - 密码
   */
  async login(usernameOrEmail: string, password: string): Promise<void> {
    await this.identifierInput.fill(usernameOrEmail);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * 跳转到注册页面
   */
  async goToRegister(): Promise<void> {
    await this.registerLink.click();
  }

  /**
   * 获取错误消息
   */
  async getErrorMessage(): Promise<string | null> {
    const isVisible = await this.errorMessage.isVisible().catch(() => false);
    if (!isVisible) return null;
    return this.errorMessage.textContent();
  }

  /**
   * 检查是否显示错误
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible().catch(() => false);
  }
}

// ============================================================================
// 导出工厂函数
// ============================================================================

/**
 * 创建认证页面对象
 *
 * @example
 * ```ts
 * const registerPage = createRegisterPage(page);
 * await registerPage.goto();
 * await registerPage.register('user', 'user@example.com', 'pass');
 * ```
 */
export function createRegisterPage(page: Page): RegisterPage {
  return new RegisterPage(page);
}

/**
 * 创建登录页面对象
 *
 * @example
 * ```ts
 * const loginPage = createLoginPage(page);
 * await loginPage.goto();
 * await loginPage.login('user', 'pass');
 * ```
 */
export function createLoginPage(page: Page): LoginPage {
  return new LoginPage(page);
}
