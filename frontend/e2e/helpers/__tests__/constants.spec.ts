/**
 * constants.spec.ts
 *
 * 认证辅助工具常量测试
 *
 * 测试目标：验证常量定义的正确性和完整性
 *
 * 测试原则：
 * - RED FIRST：这些测试在实现代码完成前运行应该是失败的
 * - 简单性：直接验证常量值
 * - 独立性：每个测试用例独立运行
 */

import { test, expect } from '@playwright/test';
import {
  AUTH_SELECTORS,
  STORAGE_KEYS,
  DEFAULT_TIMEOUTS,
} from '../auth-helpers';

// ============================================================================
// AUTH_SELECTORS 测试
// ============================================================================

test.describe('AUTH_SELECTORS', () => {
  test('应该定义登录按钮选择器', () => {
    expect(AUTH_SELECTORS.LOGIN_BUTTON).toBeDefined();
    expect(AUTH_SELECTORS.LOGIN_BUTTON).toContain('href="/login"');
  });

  test('应该定义注册按钮选择器', () => {
    expect(AUTH_SELECTORS.REGISTER_BUTTON).toBeDefined();
    expect(AUTH_SELECTORS.REGISTER_BUTTON).toContain('href="/register"');
  });

  test('应该定义登出按钮选择器', () => {
    expect(AUTH_SELECTORS.LOGOUT_BUTTON).toBeDefined();
    expect(AUTH_SELECTORS.LOGOUT_BUTTON).toMatch(/登出|退出|logout/);
  });

  test('应该定义用户名输入框选择器', () => {
    expect(AUTH_SELECTORS.USERNAME_INPUT).toBeDefined();
    expect(AUTH_SELECTORS.USERNAME_INPUT).toMatch(/username/);
  });

  test('应该定义邮箱输入框选择器', () => {
    expect(AUTH_SELECTORS.EMAIL_INPUT).toBeDefined();
    expect(AUTH_SELECTORS.EMAIL_INPUT).toMatch(/email/);
  });

  test('应该定义密码输入框选择器', () => {
    expect(AUTH_SELECTORS.PASSWORD_INPUT).toBeDefined();
    expect(AUTH_SELECTORS.PASSWORD_INPUT).toMatch(/password/);
  });

  test('应该定义提交按钮选择器', () => {
    expect(AUTH_SELECTORS.SUBMIT_BUTTON).toBeDefined();
    expect(AUTH_SELECTORS.SUBMIT_BUTTON).toMatch(/submit|btn-primary/);
  });

  test('应该定义用户信息选择器', () => {
    expect(AUTH_SELECTORS.USER_INFO).toBeDefined();
    expect(AUTH_SELECTORS.USER_INFO).toMatch(/user-info/);
  });

  test('应该定义错误消息选择器', () => {
    expect(AUTH_SELECTORS.ERROR_MESSAGE).toBeDefined();
    expect(AUTH_SELECTORS.ERROR_MESSAGE).toMatch(/error/);
  });

  test('选择器应该是只读的', () => {
    // 验证常量不可被修改
    const originalValue = AUTH_SELECTORS.LOGIN_BUTTON;
    expect(() => {
      (AUTH_SELECTORS as any).LOGIN_BUTTON = 'modified';
    }).not.toThrow();
    expect(AUTH_SELECTORS.LOGIN_BUTTON).toBe(originalValue);
  });
});

// ============================================================================
// STORAGE_KEYS 测试
// ============================================================================

test.describe('STORAGE_KEYS', () => {
  test('应该定义 TOKENS 存储键', () => {
    expect(STORAGE_KEYS.TOKENS).toBeDefined();
    expect(STORAGE_KEYS.TOKENS).toBe('auth_tokens');
  });

  test('应该定义 AUTH_STATE 存储键', () => {
    expect(STORAGE_KEYS.AUTH_STATE).toBeDefined();
    expect(STORAGE_KEYS.AUTH_STATE).toBe('auth-state');
  });

  test('存储键应该是字符串类型', () => {
    expect(typeof STORAGE_KEYS.TOKENS).toBe('string');
    expect(typeof STORAGE_KEYS.AUTH_STATE).toBe('string');
  });

  test('存储键应该是只读的', () => {
    const originalTokens = STORAGE_KEYS.TOKENS;
    expect(() => {
      (STORAGE_KEYS as any).TOKENS = 'modified';
    }).not.toThrow();
    expect(STORAGE_KEYS.TOKENS).toBe(originalTokens);
  });
});

// ============================================================================
// DEFAULT_TIMEOUTS 测试
// ============================================================================

test.describe('DEFAULT_TIMEOUTS', () => {
  test('应该定义 NAVIGATION 超时时间', () => {
    expect(DEFAULT_TIMEOUTS.NAVIGATION).toBeDefined();
    expect(DEFAULT_TIMEOUTS.NAVIGATION).toBe(30000);
  });

  test('应该定义 ACTION 超时时间', () => {
    expect(DEFAULT_TIMEOUTS.ACTION).toBeDefined();
    expect(DEFAULT_TIMEOUTS.ACTION).toBe(10000);
  });

  test('应该定义 WAIT_STATE 超时时间', () => {
    expect(DEFAULT_TIMEOUTS.WAIT_STATE).toBeDefined();
    expect(DEFAULT_TIMEOUTS.WAIT_STATE).toBe(5000);
  });

  test('应该定义 POLL_INTERVAL 轮询间隔', () => {
    expect(DEFAULT_TIMEOUTS.POLL_INTERVAL).toBeDefined();
    expect(DEFAULT_TIMEOUTS.POLL_INTERVAL).toBe(200);
  });

  test('超时时间应该是数字类型', () => {
    expect(typeof DEFAULT_TIMEOUTS.NAVIGATION).toBe('number');
    expect(typeof DEFAULT_TIMEOUTS.ACTION).toBe('number');
    expect(typeof DEFAULT_TIMEOUTS.WAIT_STATE).toBe('number');
    expect(typeof DEFAULT_TIMEOUTS.POLL_INTERVAL).toBe('number');
  });

  test('超时时间应该是正整数', () => {
    expect(DEFAULT_TIMEOUTS.NAVIGATION).toBeGreaterThan(0);
    expect(DEFAULT_TIMEOUTS.ACTION).toBeGreaterThan(0);
    expect(DEFAULT_TIMEOUTS.WAIT_STATE).toBeGreaterThan(0);
    expect(DEFAULT_TIMEOUTS.POLL_INTERVAL).toBeGreaterThan(0);
  });

  test('NAVIGATION 超时应该大于 ACTION 超时', () => {
    expect(DEFAULT_TIMEOUTS.NAVIGATION).toBeGreaterThan(DEFAULT_TIMEOUTS.ACTION);
  });

  test('POLL_INTERVAL 应该小于 WAIT_STATE', () => {
    expect(DEFAULT_TIMEOUTS.POLL_INTERVAL).toBeLessThan(DEFAULT_TIMEOUTS.WAIT_STATE);
  });

  test('超时时间应该是只读的', () => {
    const originalNavTimeout = DEFAULT_TIMEOUTS.NAVIGATION;
    expect(() => {
      (DEFAULT_TIMEOUTS as any).NAVIGATION = 999999;
    }).not.toThrow();
    expect(DEFAULT_TIMEOUTS.NAVIGATION).toBe(originalNavTimeout);
  });
});
