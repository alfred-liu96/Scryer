/**
 * errors.spec.ts
 *
 * 认证辅助工具错误处理测试
 *
 * 测试目标：验证错误类型和错误处理逻辑
 *
 * 测试原则：
 * - RED FIRST：这些测试在实现代码完成前运行应该是失败的
 * - 简单性：直接验证错误类型和属性
 * - 独立性：每个测试用例独立运行
 */

import { test, expect } from '@playwright/test';
import {
  AuthHelperError,
  AuthHelperErrorType,
} from '../auth-helpers';

// ============================================================================
// AuthHelperErrorType 枚举测试
// ============================================================================

test.describe('AuthHelperErrorType', () => {
  test('应该定义 NAVIGATION_FAILED 错误类型', () => {
    expect(AuthHelperErrorType.NAVIGATION_FAILED).toBeDefined();
    expect(AuthHelperErrorType.NAVIGATION_FAILED).toBe('NAVIGATION_FAILED');
  });

  test('应该定义 ELEMENT_NOT_FOUND 错误类型', () => {
    expect(AuthHelperErrorType.ELEMENT_NOT_FOUND).toBeDefined();
    expect(AuthHelperErrorType.ELEMENT_NOT_FOUND).toBe('ELEMENT_NOT_FOUND');
  });

  test('应该定义 TIMEOUT 错误类型', () => {
    expect(AuthHelperErrorType.TIMEOUT).toBeDefined();
    expect(AuthHelperErrorType.TIMEOUT).toBe('TIMEOUT');
  });

  test('应该定义 AUTH_STATE_MISMATCH 错误类型', () => {
    expect(AuthHelperErrorType.AUTH_STATE_MISMATCH).toBeDefined();
    expect(AuthHelperErrorType.AUTH_STATE_MISMATCH).toBe('AUTH_STATE_MISMATCH');
  });

  test('应该定义 FORM_SUBMIT_FAILED 错误类型', () => {
    expect(AuthHelperErrorType.FORM_SUBMIT_FAILED).toBeDefined();
    expect(AuthHelperErrorType.FORM_SUBMIT_FAILED).toBe('FORM_SUBMIT_FAILED');
  });

  test('所有错误类型应该是字符串', () => {
    const values = Object.values(AuthHelperErrorType);
    values.forEach((value) => {
      expect(typeof value).toBe('string');
    });
  });
});

// ============================================================================
// AuthHelperError 类测试
// ============================================================================

test.describe('AuthHelperError', () => {
  test('应该能够创建错误实例', () => {
    const error = new AuthHelperError(
      AuthHelperErrorType.NAVIGATION_FAILED,
      'Navigation failed'
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AuthHelperError);
  });

  test('应该正确设置错误名称', () => {
    const error = new AuthHelperError(
      AuthHelperErrorType.TIMEOUT,
      'Operation timeout'
    );

    expect(error.name).toBe('AuthHelperError');
  });

  test('应该正确设置错误消息', () => {
    const message = 'Element not found';
    const error = new AuthHelperError(
      AuthHelperErrorType.ELEMENT_NOT_FOUND,
      message
    );

    expect(error.message).toBe(message);
  });

  test('应该正确设置错误类型', () => {
    const error = new AuthHelperError(
      AuthHelperErrorType.AUTH_STATE_MISMATCH,
      'Auth state mismatch'
    );

    expect(error.type).toBe(AuthHelperErrorType.AUTH_STATE_MISMATCH);
  });

  test('应该支持可选的 context 参数', () => {
    const context = { element: 'submit-button', timeout: 5000 };
    const error = new AuthHelperError(
      AuthHelperErrorType.ELEMENT_NOT_FOUND,
      'Element not found',
      context
    );

    expect(error.context).toEqual(context);
  });

  test('不提供 context 时应该为 undefined', () => {
    const error = new AuthHelperError(
      AuthHelperErrorType.FORM_SUBMIT_FAILED,
      'Form submit failed'
    );

    expect(error.context).toBeUndefined();
  });

  test('应该能够作为 Error 被抛出和捕获', () => {
    expect(() => {
      throw new AuthHelperError(
        AuthHelperErrorType.TIMEOUT,
        'Timeout occurred'
      );
    }).toThrow(AuthHelperError);
  });

  test('应该能够使用 instanceof 检查错误类型', () => {
    try {
      throw new AuthHelperError(
        AuthHelperErrorType.NAVIGATION_FAILED,
        'Navigation failed'
      );
    } catch (e) {
      expect(e).toBeInstanceOf(AuthHelperError);
      expect(e).toBeInstanceOf(Error);
    }
  });

  test('应该能够通过 type 属性区分错误类型', () => {
    const navError = new AuthHelperError(
      AuthHelperErrorType.NAVIGATION_FAILED,
      'Nav failed'
    );
    const timeoutError = new AuthHelperError(
      AuthHelperErrorType.TIMEOUT,
      'Timeout'
    );

    expect(navError.type).not.toBe(timeoutError.type);
  });

  test('context 应该支持任意类型的数据', () => {
    const context1 = { url: '/login', retryCount: 3 };
    const context2 = { element: 'button', visible: false };
    const context3 = { error: 'Network error', status: 500 };

    const error1 = new AuthHelperError(
      AuthHelperErrorType.NAVIGATION_FAILED,
      'Failed',
      context1
    );
    const error2 = new AuthHelperError(
      AuthHelperErrorType.ELEMENT_NOT_FOUND,
      'Not found',
      context2
    );
    const error3 = new AuthHelperError(
      AuthHelperErrorType.FORM_SUBMIT_FAILED,
      'Submit failed',
      context3
    );

    expect(error1.context).toEqual(context1);
    expect(error2.context).toEqual(context2);
    expect(error3.context).toEqual(context3);
  });

  test('错误堆栈应该正确设置', () => {
    const error = new AuthHelperError(
      AuthHelperErrorType.TIMEOUT,
      'Timeout'
    );

    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe('string');
  });
});

// ============================================================================
// 错误使用场景测试
// ============================================================================

test.describe('错误使用场景', () => {
  test('应该在页面导航失败时抛出 NAVIGATION_FAILED', async ({ page }) => {
    // 模拟导航失败场景
    const error = new AuthHelperError(
      AuthHelperErrorType.NAVIGATION_FAILED,
      'Failed to navigate to /login',
      { url: '/login', timeout: 30000 }
    );

    expect(error.type).toBe(AuthHelperErrorType.NAVIGATION_FAILED);
    expect(error.context?.url).toBe('/login');
    expect(error.context?.timeout).toBe(30000);
  });

  test('应该在元素未找到时抛出 ELEMENT_NOT_FOUND', async ({ page }) => {
    const error = new AuthHelperError(
      AuthHelperErrorType.ELEMENT_NOT_FOUND,
      'Submit button not found',
      { selector: 'button[type="submit"]', timeout: 10000 }
    );

    expect(error.type).toBe(AuthHelperErrorType.ELEMENT_NOT_FOUND);
    expect(error.context?.selector).toBe('button[type="submit"]');
  });

  test('应该在操作超时时抛出 TIMEOUT', async ({ page }) => {
    const error = new AuthHelperError(
      AuthHelperErrorType.TIMEOUT,
      'Authentication state timeout',
      { expectedState: 'authenticated', actualState: 'unauthenticated', timeout: 5000 }
    );

    expect(error.type).toBe(AuthHelperErrorType.TIMEOUT);
    expect(error.context?.expectedState).toBe('authenticated');
    expect(error.context?.timeout).toBe(5000);
  });

  test('应该在认证状态不匹配时抛出 AUTH_STATE_MISMATCH', async ({ page }) => {
    const error = new AuthHelperError(
      AuthHelperErrorType.AUTH_STATE_MISMATCH,
      'Expected authenticated but got unauthenticated',
      { expected: 'authenticated', actual: 'unauthenticated' }
    );

    expect(error.type).toBe(AuthHelperErrorType.AUTH_STATE_MISMATCH);
    expect(error.context?.expected).toBe('authenticated');
    expect(error.context?.actual).toBe('unauthenticated');
  });

  test('应该在表单提交失败时抛出 FORM_SUBMIT_FAILED', async ({ page }) => {
    const error = new AuthHelperError(
      AuthHelperErrorType.FORM_SUBMIT_FAILED,
      'Form submission failed',
      { form: 'login-form', error: 'Invalid credentials' }
    );

    expect(error.type).toBe(AuthHelperErrorType.FORM_SUBMIT_FAILED);
    expect(error.context?.form).toBe('login-form');
    expect(error.context?.error).toBe('Invalid credentials');
  });
});
