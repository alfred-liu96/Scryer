/**
 * auth-pages.spec.ts
 *
 * 认证页面对象模型 (POM) 单元测试
 *
 * 测试目标：验证 auth-pages.ts 中的页面对象行为
 *
 * 测试原则：
 * - RED FIRST：这些测试在实现代码完成前运行应该是失败的
 * - 简单性：测试代码逻辑简单，断言清晰
 * - 独立性：每个测试用例独立运行
 */

import { test, expect } from '@playwright/test';
import {
  createRegisterPage,
  createLoginPage,
  RegisterPage,
  LoginPage,
} from '../auth-pages';

// ============================================================================
// 测试数据常量
// ============================================================================

const TEST_CREDENTIALS = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'TestPassword123!',
};

// ============================================================================
// RegisterPage 测试
// ============================================================================

test.describe('RegisterPage', () => {
  test('应该有正确的 URL 常量', async ({ page }) => {
    expect(RegisterPage.URL).toBe('/register');
  });

  test('应该能够导航到注册页面', async ({ page }) => {
    const registerPage = createRegisterPage(page);
    await registerPage.goto();

    expect(page.url()).toContain('/register');
  });

  test('应该能够定位所有页面元素', async ({ page }) => {
    const registerPage = createRegisterPage(page);
    await registerPage.goto();

    // 验证元素存在
    await expect(registerPage.usernameInput).toBeAttached();
    await expect(registerPage.emailInput).toBeAttached();
    await expect(registerPage.passwordInput).toBeAttached();
    await expect(registerPage.submitButton).toBeAttached();
    await expect(registerPage.loginLink).toBeAttached();
  });

  test('应该能够填写并提交注册表单', async ({ page }) => {
    const registerPage = createRegisterPage(page);
    await registerPage.goto();

    await registerPage.register(
      TEST_CREDENTIALS.username,
      TEST_CREDENTIALS.email,
      TEST_CREDENTIALS.password
    );

    // 验证表单提交后页面跳转
    expect(page.url()).not.toContain('/register');
  });

  test('register 方法应该按顺序填写字段', async ({ page }) => {
    const registerPage = createRegisterPage(page);
    await registerPage.goto();

    await registerPage.usernameInput.fill(TEST_CREDENTIALS.username);
    const usernameValue = await registerPage.usernameInput.inputValue();
    expect(usernameValue).toBe(TEST_CREDENTIALS.username);

    await registerPage.emailInput.fill(TEST_CREDENTIALS.email);
    const emailValue = await registerPage.emailInput.inputValue();
    expect(emailValue).toBe(TEST_CREDENTIALS.email);

    await registerPage.passwordInput.fill(TEST_CREDENTIALS.password);
    const passwordValue = await registerPage.passwordInput.inputValue();
    expect(passwordValue).toBe(TEST_CREDENTIALS.password);
  });

  test('应该能够跳转到登录页面', async ({ page }) => {
    const registerPage = createRegisterPage(page);
    await registerPage.goto();

    await registerPage.goToLogin();

    expect(page.url()).toContain('/login');
  });
});

// ============================================================================
// LoginPage 测试
// ============================================================================

test.describe('LoginPage', () => {
  test('应该有正确的 URL 常量', async ({ page }) => {
    expect(LoginPage.URL).toBe('/login');
  });

  test('应该能够导航到登录页面', async ({ page }) => {
    const loginPage = createLoginPage(page);
    await loginPage.goto();

    expect(page.url()).toContain('/login');
  });

  test('应该能够定位所有页面元素', async ({ page }) => {
    const loginPage = createLoginPage(page);
    await loginPage.goto();

    // 验证元素存在
    await expect(loginPage.usernameOrEmailInput).toBeAttached();
    await expect(loginPage.passwordInput).toBeAttached();
    await expect(loginPage.submitButton).toBeAttached();
    await expect(loginPage.registerLink).toBeAttached();
  });

  test('应该能够填写并提交登录表单', async ({ page }) => {
    const loginPage = createLoginPage(page);
    await loginPage.goto();

    await loginPage.login(
      TEST_CREDENTIALS.username,
      TEST_CREDENTIALS.password
    );

    // 验证表单提交后页面跳转
    expect(page.url()).not.toContain('/login');
  });

  test('login 方法应该正确填写用户名和密码', async ({ page }) => {
    const loginPage = createLoginPage(page);
    await loginPage.goto();

    await loginPage.usernameOrEmailInput.fill(TEST_CREDENTIALS.username);
    const usernameValue = await loginPage.usernameOrEmailInput.inputValue();
    expect(usernameValue).toBe(TEST_CREDENTIALS.username);

    await loginPage.passwordInput.fill(TEST_CREDENTIALS.password);
    const passwordValue = await loginPage.passwordInput.inputValue();
    expect(passwordValue).toBe(TEST_CREDENTIALS.password);
  });

  test('应该支持使用邮箱登录', async ({ page }) => {
    const loginPage = createLoginPage(page);
    await loginPage.goto();

    await loginPage.usernameOrEmailInput.fill(TEST_CREDENTIALS.email);
    const emailValue = await loginPage.usernameOrEmailInput.inputValue();
    expect(emailValue).toBe(TEST_CREDENTIALS.email);
  });

  test('应该能够跳转到注册页面', async ({ page }) => {
    const loginPage = createLoginPage(page);
    await loginPage.goto();

    await loginPage.goToRegister();

    expect(page.url()).toContain('/register');
  });
});

// ============================================================================
// 工厂函数测试
// ============================================================================

test.describe('工厂函数', () => {
  test('createRegisterPage 应该返回 RegisterPage 实例', async ({ page }) => {
    const registerPage = createRegisterPage(page);

    expect(registerPage).toBeInstanceOf(RegisterPage);
    expect(registerPage.page).toBe(page);
  });

  test('createLoginPage 应该返回 LoginPage 实例', async ({ page }) => {
    const loginPage = createLoginPage(page);

    expect(loginPage).toBeInstanceOf(LoginPage);
    expect(loginPage.page).toBe(page);
  });
});

// ============================================================================
// 页面交互完整流程测试
// ============================================================================

test.describe('页面交互完整流程', () => {
  test('从注册页面跳转到登录页面', async ({ page }) => {
    const registerPage = createRegisterPage(page);
    await registerPage.goto();

    // 验证在注册页面
    expect(page.url()).toContain('/register');

    // 跳转到登录
    await registerPage.goToLogin();

    // 验证在登录页面
    expect(page.url()).toContain('/login');

    const loginPage = createLoginPage(page);
    await expect(loginPage.usernameOrEmailInput).toBeAttached();
  });

  test('从登录页面跳转到注册页面', async ({ page }) => {
    const loginPage = createLoginPage(page);
    await loginPage.goto();

    // 验证在登录页面
    expect(page.url()).toContain('/login');

    // 跳转到注册
    await loginPage.goToRegister();

    // 验证在注册页面
    expect(page.url()).toContain('/register');

    const registerPage = createRegisterPage(page);
    await expect(registerPage.usernameInput).toBeAttached();
  });

  test('使用 POM 完成注册流程', async ({ page }) => {
    const registerPage = createRegisterPage(page);
    await registerPage.goto();

    await registerPage.register(
      TEST_CREDENTIALS.username,
      TEST_CREDENTIALS.email,
      TEST_CREDENTIALS.password
    );

    // 验证注册成功
    expect(page.url()).not.toContain('/register');
  });

  test('使用 POM 完成登录流程', async ({ page }) => {
    const loginPage = createLoginPage(page);
    await loginPage.goto();

    await loginPage.login(
      TEST_CREDENTIALS.username,
      TEST_CREDENTIALS.password
    );

    // 验证登录成功
    expect(page.url()).not.toContain('/login');
  });
});
