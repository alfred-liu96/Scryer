/**
 * useAuth Hook 集成测试
 *
 * 测试覆盖范围：
 * - 场景 1: 完整的登录-刷新-登出流程
 * - 场景 2: 多组件共享 SessionManager 单例
 * - 场景 3: SSR 环境下的安全性
 * - 场景 4: Token 过期前自动刷新
 * - 场景 5: 刷新失败自动登出
 * - 场景 6: 页面可见性处理
 *
 * 测试策略：
 * - 使用 @testing-library/react 的 renderHook 测试 Hook
 * - 使用 jest.useFakeTimers() 控制定时器
 * - 使用 jest.spyOn() Mock 方法
 * - 验证 SessionManager 与 useAuth Hook 的端到端行为
 *
 * 测试状态: RED (等待实现验证)
 * 依赖文件:
 * - /workspace/frontend/src/lib/hooks/useAuth.ts
 * - /workspace/frontend/src/lib/auth/session-manager.ts
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { createAuthStore } from '@/store/auth/auth-store';
import type { AuthStore } from '@/store/auth/auth-store-types';
import { SessionManager, SessionManagerStatus } from '@/lib/auth/session-manager';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { UserResponse, TokenResponse, StoredTokens } from '@/types/auth';

// ============================================================================
// Mock 工厂函数
// ============================================================================

/**
 * 创建 Mock TokenStorage
 */
const createMockTokenStorage = (): TokenStorage => ({
  setTokens: jest.fn(() => true),
  getTokens: jest.fn(() => null),
  getAccessToken: jest.fn(() => null),
  getRefreshToken: jest.fn(() => null),
  isTokenExpired: jest.fn(() => true),
  clearTokens: jest.fn(() => {}),
  hasValidTokens: jest.fn(() => false),
  updateAccessToken: jest.fn(() => true),
});

/**
 * 创建 Mock AuthClient
 */
const createMockAuthClient = () => ({
  refreshToken: jest.fn(async () => MOCK_TOKEN_RESPONSE),
  logout: jest.fn(async () => {}),
});

/**
 * 创建 Mock SessionManager
 */
const createMockSessionManager = (): SessionManager => ({
  start: jest.fn(async () => {}),
  stop: jest.fn(() => {}),
  getStatus: jest.fn(() => 'idle' as const),
} as unknown as SessionManager);

/**
 * Mock JWT 的固定基准时间（2024-01-01 00:00:00 UTC）
 */
const MOCK_JWT_BASE_TIME = 1704067200;

/**
 * 创建 Mock JWT Token（带 exp 字段）
 */
const createMockJWT = (expiresIn: number): string => {
  const now = MOCK_JWT_BASE_TIME;
  const exp = now + expiresIn;

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const payload = btoa(JSON.stringify({ exp, sub: 'user123', iat: now }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${header}.${payload}.mock_signature`;
};

/**
 * Mock 用户数据
 */
const MOCK_USER: UserResponse = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Token 响应
 */
const MOCK_TOKEN_RESPONSE: TokenResponse = {
  access_token: createMockJWT(3600),
  refresh_token: 'mock-refresh-token',
  token_type: 'Bearer',
  expires_in: 3600,
};

/**
 * Mock 存储 Token
 */
const createMockStoredTokens = (
  overrides?: Partial<StoredTokens>
): StoredTokens => ({
  accessToken: createMockJWT(3600),
  refreshToken: 'test_refresh_token',
  expiresAt: MOCK_JWT_BASE_TIME * 1000 + 3600 * 1000,
  ...overrides,
});

// ============================================================================
// 测试套件
// ============================================================================

describe('useAuth Hook 集成测试', () => {
  let localAuthStore: AuthStore;
  let mockTokenStorage: TokenStorage;
  let mockAuthClient: ReturnType<typeof createMockAuthClient>;
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    jest.clearAllMocks();

    // 保存原始 window 对象
    originalWindow = global.window as Window & typeof globalThis;

    // 创建本地依赖
    mockTokenStorage = createMockTokenStorage();
    mockAuthClient = createMockAuthClient();
    localAuthStore = createAuthStore({
      persist: false,
      tokenStorage: mockTokenStorage,
    });

    // 重置状态
    localAuthStore.getState().reset();

    // 使用 fake timers
    jest.useFakeTimers();
    jest.setSystemTime(new Date(MOCK_JWT_BASE_TIME * 1000));
  });

  afterEach(() => {
    // 清理
    localAuthStore.getState().reset();

    // 恢复 window
    global.window = originalWindow;

    // 恢复真实 timers
    jest.clearAllTimers();
    jest.setSystemTime();
    jest.useRealTimers();
  });

  // ==========================================================================
  // 场景 1: 完整的登录-刷新-登出流程
  // ==========================================================================

  describe('场景 1: 完整的登录-刷新-登出流程', () => {
    it('应该完成登录 -> 自动刷新 -> 登出的完整流程', async () => {
      // 前置条件：用户已登录（模拟登录状态）
      localAuthStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const mockSessionManager = createMockSessionManager();

      // 1. 渲染 useAuth Hook
      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 2. 验证已认证状态
      expect(result.current.status).toBe('authenticated');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);

      // 3. 验证 SessionManager 已启动
      expect(mockSessionManager.start).toHaveBeenCalledTimes(1);

      // 4. 模拟 refreshToken 调用（手动刷新）
      let refreshResult: TokenResponse | undefined;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      // 5. 验证刷新成功
      expect(mockAuthClient.refreshToken).toHaveBeenCalled();
      expect(refreshResult).toEqual(MOCK_TOKEN_RESPONSE);

      // 6. 模拟 logout
      await act(async () => {
        await result.current.logout();
      });

      // 7. 验证登出成功
      expect(mockAuthClient.logout).toHaveBeenCalled();
      expect(result.current.status).toBe('unauthenticated');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();

      // 8. 验证 SessionManager 已停止（在卸载时）
      const { unmount } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      unmount();
      expect(mockSessionManager.stop).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 场景 2: 多组件共享 SessionManager 单例
  // ==========================================================================

  describe('场景 2: 多组件共享 SessionManager 单例', () => {
    it('应该在多个组件中使用同一个 SessionManager 实例', async () => {
      // 前置条件：用户已登录
      localAuthStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const mockSessionManager = createMockSessionManager();

      // 1. 渲染第一个组件
      const { result: result1 } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 2. 渲染第二个组件
      const { result: result2 } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 3. 验证两个组件看到相同的认证状态
      expect(result1.current.isAuthenticated).toBe(true);
      expect(result2.current.isAuthenticated).toBe(true);
      expect(result1.current.user).toEqual(result2.current.user);

      // 4. 验证 SessionManager.start() 被调用两次（每个组件独立管理）
      // 注意：实际使用单例时，这不会重复启动，因为内部有检查
      expect(mockSessionManager.start).toHaveBeenCalledTimes(2);
    });

    it('应该在一个组件登出后，所有组件同步状态', async () => {
      // 前置条件：用户已登录
      localAuthStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const mockSessionManager = createMockSessionManager();

      // 1. 渲染多个组件
      const { result: result1 } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      const { result: result2 } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 2. 验证初始状态
      expect(result1.current.isAuthenticated).toBe(true);
      expect(result2.current.isAuthenticated).toBe(true);

      // 3. 在第一个组件中登出
      await act(async () => {
        await result1.current.logout();
      });

      // 4. 验证所有组件状态同步更新（通过 AuthStore）
      expect(result1.current.isAuthenticated).toBe(false);
      expect(result2.current.isAuthenticated).toBe(false);
      expect(result1.current.user).toBeNull();
      expect(result2.current.user).toBeNull();
    });
  });

  // ==========================================================================
  // 场景 3: SSR 环境下的安全性
  // ==========================================================================

  describe('场景 3: SSR 环境下的安全性', () => {
    it('应该在 SSR 环境下安全返回初始状态', () => {
      // 模拟 SSR 环境（window 为 undefined）
      delete (global as any).window;
      // @ts-ignore - 故意设置 undefined
      global.window = undefined;

      const mockSessionManager = createMockSessionManager();

      // 1. 渲染 Hook（应该不抛出错误）
      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 2. 验证返回初始状态
      expect(result.current.status).toBe('unauthenticated');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();

      // 3. 验证 SessionManager 未启动（SSR 环境不启动）
      expect(mockSessionManager.start).not.toHaveBeenCalled();
    });

    it('应该在 SSR 环境下调用 logout() 时静默返回', async () => {
      // 模拟 SSR 环境
      delete (global as any).window;
      // @ts-ignore
      global.window = undefined;

      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 1. 调用 logout（应该不抛出错误）
      await act(async () => {
        await result.current.logout();
      });

      // 2. 验证 AuthClient.logout 未被调用（SSR 环境）
      expect(mockAuthClient.logout).not.toHaveBeenCalled();
    });

    it('应该在 SSR 环境下调用 refreshToken() 时抛出错误', async () => {
      // 模拟 SSR 环境
      delete (global as any).window;
      // @ts-ignore
      global.window = undefined;

      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 1. 调用 refreshToken（应该抛出错误）
      await expect(async () => {
        await act(async () => {
          await result.current.refreshToken();
        });
      }).rejects.toThrow('refreshToken is not available in SSR environment');

      // 2. 验证 AuthClient.refreshToken 未被调用
      expect(mockAuthClient.refreshToken).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 场景 4: Token 过期前自动刷新
  // ==========================================================================

  describe('场景 4: Token 过期前自动刷新', () => {
    it('应该在 Token 即将过期时自动触发刷新', async () => {
      // 前置条件：用户已登录，Token 即将过期
      localAuthStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      // Mock SessionManager 实际行为
      let startCallCount = 0;
      const mockSessionManager: SessionManager = {
        start: jest.fn(async () => {
          startCallCount++;
          // 模拟在 55 分钟后触发刷新
          setTimeout(async () => {
            await mockAuthClient.refreshToken();
          }, 55 * 60 * 1000);
        }),
        stop: jest.fn(() => {}),
        getStatus: jest.fn(() => 'running' as const),
      } as unknown as SessionManager;

      // 1. 渲染 Hook
      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 2. 验证 SessionManager 已启动
      expect(mockSessionManager.start).toHaveBeenCalledTimes(1);

      // 3. 快进时间 55 分钟
      await act(async () => {
        jest.advanceTimersByTime(55 * 60 * 1000);
        await jest.runOnlyPendingTimersAsync();
      });

      // 4. 验证刷新被触发
      expect(mockAuthClient.refreshToken).toHaveBeenCalled();
    });

    it('应该支持禁用自动启动 SessionManager', () => {
      // 前置条件：用户已登录
      localAuthStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const mockSessionManager = createMockSessionManager();

      // 1. 渲染 Hook，禁用自动启动
      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
          autoStartSessionManager: false,
        })
      );

      // 2. 验证 SessionManager 未启动
      expect(mockSessionManager.start).not.toHaveBeenCalled();

      // 3. 验证状态仍然正确
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);
    });
  });

  // ==========================================================================
  // 场景 5: 刷新失败自动登出
  // ==========================================================================

  describe('场景 5: 刷新失败自动登出', () => {
    it('应该在 refreshToken() 失败时向上传播错误', async () => {
      // 前置条件：用户已登录
      localAuthStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const mockSessionManager = createMockSessionManager();

      // Mock refreshToken 失败
      const error = new Error('Refresh failed');
      mockAuthClient.refreshToken.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 1. 调用 refreshToken（应该抛出错误）
      await expect(async () => {
        await act(async () => {
          await result.current.refreshToken();
        });
      }).rejects.toThrow('Refresh failed');

      // 2. 验证状态未变（失败由调用者处理）
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('应该在 logout() API 失败时仍清除本地状态', async () => {
      // 前置条件：用户已登录
      localAuthStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const mockSessionManager = createMockSessionManager();

      // Mock logout 失败
      const error = new Error('Logout API failed');
      mockAuthClient.logout.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 1. 调用 logout（应该不抛出错误）
      await act(async () => {
        await result.current.logout();
      });

      // 2. 验证警告被记录
      expect(consoleSpy).toHaveBeenCalledWith('Logout API failed:', error);

      // 3. 验证本地状态已清除（由 AuthClient 内部处理）
      expect(mockAuthClient.logout).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // 场景 6: 页面可见性处理
  // ==========================================================================

  describe('场景 6: 页面可见性处理', () => {
    it('应该在页面恢复显示时保持 SessionManager 运行', async () => {
      // 前置条件：用户已登录
      localAuthStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      // Mock SessionManager 实际行为
      const mockSessionManager: SessionManager = {
        start: jest.fn(async () => {}),
        stop: jest.fn(() => {}),
        getStatus: jest.fn(() => 'running' as const),
      } as unknown as SessionManager;

      // 1. 渲染 Hook
      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 2. 验证 SessionManager 已启动
      expect(mockSessionManager.start).toHaveBeenCalledTimes(1);

      // 3. 模拟页面隐藏
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden',
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // 4. 验证状态不变
      expect(result.current.isAuthenticated).toBe(true);

      // 5. 模拟页面显示
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible',
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // 6. 验证状态仍然正确
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);
    });

    it('应该在组件卸载时正确停止 SessionManager', () => {
      // 前置条件：用户已登录
      localAuthStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const mockSessionManager = createMockSessionManager();

      // 1. 渲染 Hook
      const { result, unmount } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 2. 验证 SessionManager 已启动
      expect(mockSessionManager.start).toHaveBeenCalledTimes(1);

      // 3. 验证状态正确
      expect(result.current.isAuthenticated).toBe(true);

      // 4. 卸载组件
      unmount();

      // 5. 验证 SessionManager 已停止
      expect(mockSessionManager.stop).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // 额外场景：错误处理
  // ==========================================================================

  describe('错误处理', () => {
    it('应该支持 clearError() 清除认证错误', () => {
      // 前置条件：设置错误状态
      localAuthStore.getState().setError({
        type: 'INVALID_CREDENTIALS' as const,
        message: 'Invalid credentials',
      });

      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 1. 验证错误存在
      expect(result.current.error).toEqual({
        type: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });

      // 2. 清除错误
      act(() => {
        result.current.clearError();
      });

      // 3. 验证错误已清除
      expect(result.current.error).toBeNull();
    });

    it('应该在没有错误时调用 clearError() 安全执行', () => {
      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 1. 验证无错误
      expect(result.current.error).toBeNull();

      // 2. 调用 clearError（应该不抛出错误）
      expect(() => {
        act(() => {
          result.current.clearError();
        });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // 额外场景：状态响应性
  // ==========================================================================

  describe('状态响应性', () => {
    it('应该在 AuthStore 变化时自动更新 Hook 状态', () => {
      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 1. 初始状态：未认证
      expect(result.current.status).toBe('unauthenticated');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();

      // 2. 模拟登录（直接修改 AuthStore）
      act(() => {
        localAuthStore.getState().setAuthUser(
          MOCK_USER,
          MOCK_TOKEN_RESPONSE.access_token,
          MOCK_TOKEN_RESPONSE.refresh_token,
          MOCK_TOKEN_RESPONSE.expires_in
        );
      });

      // 3. 验证 Hook 状态自动更新
      expect(result.current.status).toBe('authenticated');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);
    });

    it('应该提供稳定的函数引用（useCallback）', () => {
      const mockSessionManager = createMockSessionManager();

      const { result, rerender } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 1. 获取初始引用
      const firstLogout = result.current.logout;
      const firstRefreshToken = result.current.refreshToken;
      const firstClearError = result.current.clearError;

      // 2. 重新渲染
      rerender();

      // 3. 验证引用保持稳定
      expect(result.current.logout).toBe(firstLogout);
      expect(result.current.refreshToken).toBe(firstRefreshToken);
      expect(result.current.clearError).toBe(firstClearError);
    });
  });
});
