/**
 * 用户资料编辑 E2E 测试
 *
 * 测试范围：
 * 1. 页面访问控制（需要登录）
 * 2. 用户信息展示
 * 3. 编辑模式切换
 * 4. 表单验证
 * 5. 更新成功/失败处理
 *
 * @see /workspace/frontend/e2e/pages/auth-pages.ts
 * @see /workspace/frontend/e2e/helpers/auth-helpers.ts
 */

import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../pages/auth-pages';
import { registerUser, loginUser, clearAuth } from '../../helpers/auth-helpers';
import { generateUsername, generateEmail } from '../../fixtures/auth/test-data';

// ============================================================================
// 用户资料页面测试套件
// ============================================================================

test.describe('用户资料页面', () => {
  // ==========================================================================
  // 页面访问控制测试
  // ==========================================================================

  test.describe('页面访问控制', () => {
    test.beforeEach(async ({ page }) => {
      await clearAuth(page);
    });

    test('未登录用户应被重定向到登录页', async ({ page }) => {
      const profilePage = new ProfilePage(page);
      await profilePage.goto();

      // 验证重定向到登录页
      await expect(page).toHaveURL(/\/login/);
    });

    test('已登录用户应能访问资料页面', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('profile_access'),
        email: generateEmail('profile_access'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();

      // 验证停留在资料页面
      await expect(page).toHaveURL('/profile');

      // 验证页面标题存在
      await expect(profilePage.pageTitle).toBeVisible();
    });
  });

  // ==========================================================================
  // 用户信息展示测试
  // ==========================================================================

  test.describe('用户信息展示', () => {
    test.beforeEach(async ({ page }) => {
      await clearAuth(page);
    });

    test('应正确显示用户信息', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('display'),
        email: generateEmail('display'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 验证用户信息显示
      const displayUsername = await profilePage.getDisplayUsername();
      const displayEmail = await profilePage.getDisplayEmail();

      expect(displayUsername).toBe(testUser.username);
      expect(displayEmail).toBe(testUser.email);
    });

    test('应显示编辑按钮', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('edit_btn'),
        email: generateEmail('edit_btn'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 验证编辑按钮可见
      await expect(profilePage.editButton).toBeVisible();
    });

    test('应显示用户状态', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('status'),
        email: generateEmail('status'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 验证用户状态显示
      const status = await profilePage.userStatus.textContent();
      expect(status).toBe('活跃');
    });
  });

  // ==========================================================================
  // 编辑模式切换测试
  // ==========================================================================

  test.describe('编辑模式切换', () => {
    test.beforeEach(async ({ page }) => {
      await clearAuth(page);
    });

    test('点击编辑按钮应切换到编辑模式', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('edit_mode'),
        email: generateEmail('edit_mode'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 点击编辑按钮
      await profilePage.clickEdit();

      // 验证进入编辑模式
      const isEdit = await profilePage.isEditMode();
      expect(isEdit).toBe(true);

      // 验证表单元素可见
      await expect(profilePage.usernameInput).toBeVisible();
      await expect(profilePage.emailInput).toBeVisible();
      await expect(profilePage.submitButton).toBeVisible();
      await expect(profilePage.cancelButton).toBeVisible();
    });

    test('表单应预填充当前用户信息', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('prefill'),
        email: generateEmail('prefill'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 进入编辑模式
      await profilePage.clickEdit();

      // 验证表单预填充
      const usernameValue = await profilePage.getUsernameValue();
      const emailValue = await profilePage.getEmailValue();

      expect(usernameValue).toBe(testUser.username);
      expect(emailValue).toBe(testUser.email);
    });

    test('点击取消按钮应退出编辑模式', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('cancel'),
        email: generateEmail('cancel'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 进入编辑模式
      await profilePage.clickEdit();
      await expect(profilePage.profileForm).toBeVisible();

      // 点击取消按钮
      await profilePage.clickCancel();

      // 验证退出编辑模式
      const isEdit = await profilePage.isEditMode();
      expect(isEdit).toBe(false);

      // 验证返回查看模式
      const isView = await profilePage.isViewMode();
      expect(isView).toBe(true);
    });

    test('取消编辑应恢复原始数据', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('restore'),
        email: generateEmail('restore'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 进入编辑模式并修改
      await profilePage.clickEdit();
      await profilePage.fillUsername('modified_username');
      await profilePage.fillEmail('modified@email.com');

      // 取消编辑
      await profilePage.clickCancel();

      // 验证显示原始数据
      const displayUsername = await profilePage.getDisplayUsername();
      const displayEmail = await profilePage.getDisplayEmail();

      expect(displayUsername).toBe(testUser.username);
      expect(displayEmail).toBe(testUser.email);
    });
  });

  // ==========================================================================
  // 表单验证测试
  // ==========================================================================

  test.describe('表单验证', () => {
    test.beforeEach(async ({ page }) => {
      await clearAuth(page);
    });

    test('空用户名应禁用提交按钮', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('empty_user'),
        email: generateEmail('empty_user'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面并进入编辑模式
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();
      await profilePage.clickEdit();

      // 清空用户名
      await profilePage.fillUsername('');

      // 触发失焦验证
      await profilePage.emailInput.focus();

      // 验证提交按钮被禁用
      const isDisabled = await profilePage.isSubmitDisabled();
      expect(isDisabled).toBe(true);
    });

    test('空邮箱应禁用提交按钮', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('empty_email'),
        email: generateEmail('empty_email'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面并进入编辑模式
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();
      await profilePage.clickEdit();

      // 清空邮箱
      await profilePage.fillEmail('');

      // 触发失焦验证
      await profilePage.usernameInput.focus();

      // 验证提交按钮被禁用
      const isDisabled = await profilePage.isSubmitDisabled();
      expect(isDisabled).toBe(true);
    });

    test('用户名过短应显示验证错误', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('short_user'),
        email: generateEmail('short_user'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面并进入编辑模式
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();
      await profilePage.clickEdit();

      // 输入过短用户名
      await profilePage.fillUsername('ab');

      // 触发失焦验证
      await profilePage.emailInput.focus();

      // 验证表单错误（通过检查提交按钮状态）
      const isDisabled = await profilePage.isSubmitDisabled();
      expect(isDisabled).toBe(true);
    });

    test('无效邮箱格式应显示验证错误', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('invalid_email'),
        email: generateEmail('invalid_email'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面并进入编辑模式
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();
      await profilePage.clickEdit();

      // 输入无效邮箱
      await profilePage.fillEmail('invalid-email');

      // 触发失焦验证
      await profilePage.usernameInput.focus();

      // 验证表单错误
      const isDisabled = await profilePage.isSubmitDisabled();
      expect(isDisabled).toBe(true);
    });

    test('无变更时应禁用提交按钮', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('no_change'),
        email: generateEmail('no_change'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面并进入编辑模式
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();
      await profilePage.clickEdit();

      // 不做任何修改
      // 验证提交按钮被禁用（因为没有变更）
      const isDisabled = await profilePage.isSubmitDisabled();
      expect(isDisabled).toBe(true);
    });
  });

  // ==========================================================================
  // 更新成功测试
  // ==========================================================================

  test.describe('更新成功', () => {
    test.beforeEach(async ({ page }) => {
      await clearAuth(page);
    });

    test('应成功更新用户名', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('update_user'),
        email: generateEmail('update_user'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 进入编辑模式并更新用户名
      const newUsername = generateUsername('new_user');
      await profilePage.clickEdit();
      await profilePage.fillUsername(newUsername);
      await profilePage.submitButton.click();

      // 等待返回查看模式
      await expect(profilePage.userInfoCard).toBeVisible();

      // 验证用户名已更新
      const displayUsername = await profilePage.getDisplayUsername();
      expect(displayUsername).toBe(newUsername);
    });

    test('应成功更新邮箱', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('update_email'),
        email: generateEmail('update_email'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 进入编辑模式并更新邮箱
      const newEmail = generateEmail('new_email');
      await profilePage.clickEdit();
      await profilePage.fillEmail(newEmail);
      await profilePage.submitButton.click();

      // 等待返回查看模式
      await expect(profilePage.userInfoCard).toBeVisible();

      // 验证邮箱已更新
      const displayEmail = await profilePage.getDisplayEmail();
      expect(displayEmail).toBe(newEmail);
    });

    test('应同时更新用户名和邮箱', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('update_both'),
        email: generateEmail('update_both'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 进入编辑模式并更新
      const newUsername = generateUsername('new_both');
      const newEmail = generateEmail('new_both');
      await profilePage.clickEdit();
      await profilePage.updateProfile(newUsername, newEmail);

      // 等待返回查看模式
      await expect(profilePage.userInfoCard).toBeVisible();

      // 验证更新成功
      const displayUsername = await profilePage.getDisplayUsername();
      const displayEmail = await profilePage.getDisplayEmail();

      expect(displayUsername).toBe(newUsername);
      expect(displayEmail).toBe(newEmail);
    });

    test('更新成功后应退出编辑模式', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('exit_edit'),
        email: generateEmail('exit_edit'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 进入编辑模式并更新
      const newUsername = generateUsername('updated');
      await profilePage.clickEdit();
      await profilePage.fillUsername(newUsername);
      await profilePage.submitButton.click();

      // 验证已退出编辑模式
      const isEdit = await profilePage.isEditMode();
      expect(isEdit).toBe(false);
    });
  });

  // ==========================================================================
  // 更新失败测试
  // ==========================================================================

  test.describe('更新失败处理', () => {
    test.beforeEach(async ({ page }) => {
      await clearAuth(page);
    });

    test('用户名冲突应显示错误提示', async ({ page }) => {
      // 创建两个用户
      const user1 = {
        username: generateUsername('conflict1'),
        email: generateEmail('conflict1'),
        password: 'TestPass123!',
      };
      const user2 = {
        username: generateUsername('conflict2'),
        email: generateEmail('conflict2'),
        password: 'TestPass123!',
      };

      // 注册第一个用户
      await registerUser(page, user1);
      await clearAuth(page);

      // 注册第二个用户
      await registerUser(page, user2);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 尝试使用第一个用户的用户名
      await profilePage.clickEdit();
      await profilePage.fillUsername(user1.username);
      await profilePage.submitButton.click();

      // 验证显示错误
      const hasError = await profilePage.hasError();
      expect(hasError).toBe(true);

      // 验证错误消息包含相关信息
      const errorMsg = await profilePage.getErrorMessage();
      expect(errorMsg).toContain('用户名');
    });

    test('邮箱冲突应显示错误提示', async ({ page }) => {
      // 创建两个用户
      const user1 = {
        username: generateUsername('email_conflict1'),
        email: generateEmail('email_conflict1'),
        password: 'TestPass123!',
      };
      const user2 = {
        username: generateUsername('email_conflict2'),
        email: generateEmail('email_conflict2'),
        password: 'TestPass123!',
      };

      // 注册第一个用户
      await registerUser(page, user1);
      await clearAuth(page);

      // 注册第二个用户
      await registerUser(page, user2);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 尝试使用第一个用户的邮箱
      await profilePage.clickEdit();
      await profilePage.fillEmail(user1.email);
      await profilePage.submitButton.click();

      // 验证显示错误
      const hasError = await profilePage.hasError();
      expect(hasError).toBe(true);

      // 验证错误消息包含相关信息
      const errorMsg = await profilePage.getErrorMessage();
      expect(errorMsg).toContain('邮箱');
    });

    test('更新失败后应保持在编辑模式', async ({ page }) => {
      // 创建两个用户
      const user1 = {
        username: generateUsername('stay_edit1'),
        email: generateEmail('stay_edit1'),
        password: 'TestPass123!',
      };
      const user2 = {
        username: generateUsername('stay_edit2'),
        email: generateEmail('stay_edit2'),
        password: 'TestPass123!',
      };

      // 注册第一个用户
      await registerUser(page, user1);
      await clearAuth(page);

      // 注册第二个用户
      await registerUser(page, user2);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 尝试使用冲突的用户名
      await profilePage.clickEdit();
      await profilePage.fillUsername(user1.username);
      await profilePage.submitButton.click();

      // 验证保持在编辑模式
      const isEdit = await profilePage.isEditMode();
      expect(isEdit).toBe(true);
    });
  });

  // ==========================================================================
  // 边界情况测试
  // ==========================================================================

  test.describe('边界情况', () => {
    test.beforeEach(async ({ page }) => {
      await clearAuth(page);
    });

    test('用户名最小长度 (3 字符) 应有效', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('min_len'),
        email: generateEmail('min_len'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 更新为最小长度用户名
      await profilePage.clickEdit();
      await profilePage.fillUsername('abc');
      await profilePage.submitButton.click();

      // 验证更新成功
      await expect(profilePage.userInfoCard).toBeVisible();
      const displayUsername = await profilePage.getDisplayUsername();
      expect(displayUsername).toBe('abc');
    });

    test('用户名最大长度 (50 字符) 应有效', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('max_len'),
        email: generateEmail('max_len'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 更新为最大长度用户名
      const maxUsername = 'a'.repeat(50);
      await profilePage.clickEdit();
      await profilePage.fillUsername(maxUsername);
      await profilePage.submitButton.click();

      // 验证更新成功
      await expect(profilePage.userInfoCard).toBeVisible();
      const displayUsername = await profilePage.getDisplayUsername();
      expect(displayUsername).toBe(maxUsername);
    });

    test('页面刷新后应保持登录状态并显示用户信息', async ({ page }) => {
      // 注册并登录
      const testUser = {
        username: generateUsername('refresh'),
        email: generateEmail('refresh'),
        password: 'TestPass123!',
      };
      await registerUser(page, testUser);

      // 访问资料页面
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await profilePage.waitForLoaded();

      // 刷新页面
      await page.reload();

      // 验证仍在资料页面
      await expect(page).toHaveURL('/profile');

      // 验证用户信息仍然显示
      await profilePage.waitForLoaded();
      const displayUsername = await profilePage.getDisplayUsername();
      expect(displayUsername).toBe(testUser.username);
    });
  });
});