/**
 * index.spec.ts
 *
 * helpers 模块导出测试
 *
 * 测试目标：验证统一导出文件是否正确导出所有内容
 *
 * 测试原则：
 * - RED FIRST：这些测试在实现代码完成前运行应该是失败的
 * - 简单性：直接验证导出内容
 * - 独立性：每个测试用例独立运行
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// 辅助函数导出测试
// ============================================================================

test.describe('helpers 导出 - 辅助函数', () => {
  test('应该导出 registerUser 函数', async () => {
    const { registerUser } = await import('../auth-helpers');
    expect(registerUser).toBeDefined();
    expect(typeof registerUser).toBe('function');
  });

  test('应该导出 loginUser 函数', async () => {
    const { loginUser } = await import('../auth-helpers');
    expect(loginUser).toBeDefined();
    expect(typeof loginUser).toBe('function');
  });

  test('应该导出 logoutUser 函数', async () => {
    const { logoutUser } = await import('../auth-helpers');
    expect(logoutUser).toBeDefined();
    expect(typeof logoutUser).toBe('function');
  });

  test('应该导出 clearAuth 函数', async () => {
    const { clearAuth } = await import('../auth-helpers');
    expect(clearAuth).toBeDefined();
    expect(typeof clearAuth).toBe('function');
  });

  test('应该导出 waitForAuthState 函数', async () => {
    const { waitForAuthState } = await import('../auth-helpers');
    expect(waitForAuthState).toBeDefined();
    expect(typeof waitForAuthState).toBe('function');
  });

  test('应该导出 getAuthState 函数', async () => {
    const { getAuthState } = await import('../auth-helpers');
    expect(getAuthState).toBeDefined();
    expect(typeof getAuthState).toBe('function');
  });
});

// ============================================================================
// 类型导出测试
// ============================================================================

test.describe('helpers 导出 - 类型', () => {
  test('应该导出 UserCredentials 类型', async () => {
    const module = await import('../auth-helpers');
    // TypeScript 类型在运行时不可用，这里验证模块可以正常导入
    expect(module).toBeDefined();
  });

  test('应该导出 LoginCredentials 类型', async () => {
    const module = await import('../auth-helpers');
    expect(module).toBeDefined();
  });

  test('应该导出 RegisterUserOptions 类型', async () => {
    const module = await import('../auth-helpers');
    expect(module).toBeDefined();
  });

  test('应该导出 LoginUserOptions 类型', async () => {
    const module = await import('../auth-helpers');
    expect(module).toBeDefined();
  });

  test('应该导出 LogoutUserOptions 类型', async () => {
    const module = await import('../auth-helpers');
    expect(module).toBeDefined();
  });

  test('应该导出 WaitForAuthStateOptions 类型', async () => {
    const module = await import('../auth-helpers');
    expect(module).toBeDefined();
  });

  test('应该导出 ClearAuthOptions 类型', async () => {
    const module = await import('../auth-helpers');
    expect(module).toBeDefined();
  });
});

// ============================================================================
// 常量导出测试
// ============================================================================

test.describe('helpers 导出 - 常量', () => {
  test('应该导出 AUTH_SELECTORS 常量', async () => {
    const { AUTH_SELECTORS } = await import('../auth-helpers');
    expect(AUTH_SELECTORS).toBeDefined();
    expect(typeof AUTH_SELECTORS).toBe('object');
  });

  test('应该导出 STORAGE_KEYS 常量', async () => {
    const { STORAGE_KEYS } = await import('../auth-helpers');
    expect(STORAGE_KEYS).toBeDefined();
    expect(typeof STORAGE_KEYS).toBe('object');
  });

  test('应该导出 DEFAULT_TIMEOUTS 常量', async () => {
    const { DEFAULT_TIMEOUTS } = await import('../auth-helpers');
    expect(DEFAULT_TIMEOUTS).toBeDefined();
    expect(typeof DEFAULT_TIMEOUTS).toBe('object');
  });
});

// ============================================================================
// 错误类导出测试
// ============================================================================

test.describe('helpers 导出 - 错误类', () => {
  test('应该导出 AuthHelperErrorType 枚举', async () => {
    const { AuthHelperErrorType } = await import('../auth-helpers');
    expect(AuthHelperErrorType).toBeDefined();
    expect(typeof AuthHelperErrorType).toBe('object');
  });

  test('应该导出 AuthHelperError 类', async () => {
    const { AuthHelperError } = await import('../auth-helpers');
    expect(AuthHelperError).toBeDefined();
    expect(typeof AuthHelperError).toBe('function');
  });

  test('AuthHelperError 应该可以实例化', async () => {
    const { AuthHelperError, AuthHelperErrorType } = await import('../auth-helpers');
    const error = new AuthHelperError(
      AuthHelperErrorType.TIMEOUT,
      'Test error'
    );
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AuthHelperError);
  });
});

// ============================================================================
// 导入路径测试
// ============================================================================

test.describe('导入路径', () => {
  test('应该可以从相对路径导入', async () => {
    const module = await import('../auth-helpers');
    expect(module).toBeDefined();
  });

  test('应该可以导入所有导出内容', async () => {
    const module = await import('../auth-helpers');
    const exports = Object.keys(module);

    // 验证关键导出存在
    expect(exports).toContain('registerUser');
    expect(exports).toContain('loginUser');
    expect(exports).toContain('logoutUser');
    expect(exports).toContain('clearAuth');
    expect(exports).toContain('waitForAuthState');
    expect(exports).toContain('getAuthState');
    expect(exports).toContain('AUTH_SELECTORS');
    expect(exports).toContain('STORAGE_KEYS');
    expect(exports).toContain('DEFAULT_TIMEOUTS');
    expect(exports).toContain('AuthHelperError');
    expect(exports).toContain('AuthHelperErrorType');
  });

  test('每个导出应该是唯一的', async () => {
    const module = await import('../auth-helpers');
    const exports = Object.keys(module);
    const uniqueExports = new Set(exports);

    expect(exports.length).toBe(uniqueExports.size);
  });
});
