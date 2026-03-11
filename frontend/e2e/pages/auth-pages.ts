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
// 用户资料页面
// ============================================================================

/**
 * 用户资料页面类
 */
export class ProfilePage {
  readonly page: Page;

  // 页面 URL
  static readonly URL = '/profile';

  // 页面容器选择器
  readonly pageContainer: Locator;
  readonly loadingContainer: Locator;
  readonly errorContainer: Locator;
  readonly emptyContainer: Locator;
  readonly pageTitle: Locator;

  // UserInfoCard 元素选择器
  readonly userInfoCard: Locator;
  readonly userId: Locator;
  readonly userUsername: Locator;
  readonly userEmail: Locator;
  readonly userCreatedAt: Locator;
  readonly userStatus: Locator;
  readonly editButton: Locator;

  // ProfileForm 元素选择器
  readonly profileForm: Locator;
  readonly formTitle: Locator;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // 页面容器
    this.pageContainer = page.locator('.profile-page');
    this.loadingContainer = page.locator('.profile-page-loading');
    this.errorContainer = page.locator('.profile-page-error');
    this.emptyContainer = page.locator('.profile-page-empty');
    this.pageTitle = page.locator('.profile-page-title');

    // UserInfoCard 元素
    this.userInfoCard = page.locator('.user-info-card');
    this.userId = page.locator('[data-testid="user-id"]');
    this.userUsername = page.locator('[data-testid="user-username"]');
    this.userEmail = page.locator('[data-testid="user-email"]');
    this.userCreatedAt = page.locator('[data-testid="user-created-at"]');
    this.userStatus = page.locator('[data-testid="user-status"]');
    this.editButton = page.locator('.user-info-edit-btn');

    // ProfileForm 元素
    this.profileForm = page.locator('.profile-form');
    this.formTitle = page.locator('.profile-form-title');
    this.usernameInput = page.locator('[data-testid="profile-username-input"]');
    this.emailInput = page.locator('[data-testid="profile-email-input"]');
    this.submitButton = page.locator('[data-testid="profile-submit-btn"]');
    this.cancelButton = page.locator('[data-testid="profile-cancel-btn"]');
    this.errorMessage = page.locator('.alert-error, .error-message, [data-testid="error"]');
  }

  /**
   * 导航到用户资料页面
   */
  async goto(): Promise<void> {
    await this.page.goto(ProfilePage.URL);
  }

  /**
   * 点击编辑按钮进入编辑模式
   */
  async clickEdit(): Promise<void> {
    await this.editButton.click();
  }

  /**
   * 点击取消按钮退出编辑模式
   */
  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * 填写用户名
   * @param username - 新用户名
   */
  async fillUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }

  /**
   * 填写邮箱
   * @param email - 新邮箱
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * 更新用户资料
   * @param username - 新用户名（可选）
   * @param email - 新邮箱（可选）
   */
  async updateProfile(username?: string, email?: string): Promise<void> {
    if (username !== undefined) {
      await this.fillUsername(username);
    }
    if (email !== undefined) {
      await this.fillEmail(email);
    }
    await this.submitButton.click();
  }

  /**
   * 获取用户名输入框的值
   */
  async getUsernameValue(): Promise<string> {
    return this.usernameInput.inputValue();
  }

  /**
   * 获取邮箱输入框的值
   */
  async getEmailValue(): Promise<string> {
    return this.emailInput.inputValue();
  }

  /**
   * 获取显示的用户名
   */
  async getDisplayUsername(): Promise<string | null> {
    return this.userUsername.textContent();
  }

  /**
   * 获取显示的邮箱
   */
  async getDisplayEmail(): Promise<string | null> {
    return this.userEmail.textContent();
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

  /**
   * 检查是否处于编辑模式
   */
  async isEditMode(): Promise<boolean> {
    return this.profileForm.isVisible().catch(() => false);
  }

  /**
   * 检查是否处于查看模式
   */
  async isViewMode(): Promise<boolean> {
    return this.userInfoCard.isVisible().catch(() => false);
  }

  /**
   * 等待页面加载完成
   */
  async waitForLoaded(): Promise<void> {
    await this.pageContainer.waitFor({ state: 'visible' });
    await this.userInfoCard.waitFor({ state: 'visible' });
  }

  /**
   * 检查提交按钮是否禁用
   */
  async isSubmitDisabled(): Promise<boolean> {
    return this.submitButton.isDisabled();
  }

  /**
   * 检查取消按钮是否禁用
   */
  async isCancelDisabled(): Promise<boolean> {
    return this.cancelButton.isDisabled();
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

/**
 * 创建用户资料页面对象
 *
 * @example
 * ```ts
 * const profilePage = createProfilePage(page);
 * await profilePage.goto();
 * await profilePage.clickEdit();
 * await profilePage.updateProfile('newusername', 'new@email.com');
 * ```
 */
export function createProfilePage(page: Page): ProfilePage {
  return new ProfilePage(page);
}
