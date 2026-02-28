/**
 * useAuth Hook 单元测试
 *
 * 测试契约:
 * - 返回正确的认证状态
 * - SSR 环境下安全返回初始状态
 * - logout() 方法正确调用
 * - refreshToken() 方法正确调用
 * - Hook 卸载时正确停止 SessionManager
 * - SessionManager 仅启动一次
 * - 认证状态变化时正确更新
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { createAuthStore } from '@/store/auth/auth-store';
import type { AuthStore } from '@/store/auth/auth-store-types';
import type { SessionManager } from '@/lib/auth/session-manager';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { UserResponse, TokenResponse, AuthError } from '@/types/auth';

// ============================================================================
// Mock 数据
// ============================================================================

const MOCK_USER: UserResponse = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

const MOCK_TOKEN_RESPONSE: TokenResponse = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'Bearer',
  expires_in: 3600,
};

const MOCK_AUTH_ERROR: AuthError = {
  type: 'INVALID_CREDENTIALS' as const,
  message: 'Invalid credentials',
};

// ============================================================================
// Mock 工厂函数
// ============================================================================

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

const createMockAuthClient = () => ({
  refreshToken: jest.fn(async () => MOCK_TOKEN_RESPONSE),
  logout: jest.fn(async () => {}),
});

const createMockSessionManager = (): SessionManager => ({
  start: jest.fn(async () => {}),
  stop: jest.fn(() => {}),
  getStatus: jest.fn(() => 'idle' as const),
} as unknown as SessionManager);

// ============================================================================
// 测试套件
// ============================================================================

describe('useAuth Hook', () => {
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
  });

  afterEach(() => {
    // 清理
    localAuthStore.getState().reset();

    // 恢复 window
    global.window = originalWindow;
  });

  // ============================================================================
  // 基础功能测试
  // ============================================================================

  describe('基础功能', () => {
    it('应该返回初始未认证状态', () => {
      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      expect(result.current.status).toBe('unauthenticated');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('应该返回已认证状态', () => {
      localAuthStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      expect(result.current.status).toBe('authenticated');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('应该返回认证中的状态', () => {
      localAuthStore.getState().setLoading();

      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      expect(result.current.status).toBe('loading');
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isAuthenticating).toBe(true);
    });

    it('应该返回认证错误状态', () => {
      localAuthStore.getState().setError(MOCK_AUTH_ERROR);

      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      expect(result.current.status).toBe('unauthenticated');
      expect(result.current.error).toEqual(MOCK_AUTH_ERROR);
    });

    it('isAuthenticated 应该基于 status 计算', () => {
      const mockSessionManager = createMockSessionManager();

      // 未认证状态
      const { result: result1 } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );
      expect(result1.current.isAuthenticated).toBe(false);

      // 已认证状态
      localAuthStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const { result: result2 } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );
      expect(result2.current.isAuthenticated).toBe(true);
    });
  });

  // ============================================================================
  // logout() 方法测试
  // ============================================================================

  describe('logout() 方法', () => {
    it('应该调用 AuthClient.logout()', async () => {
      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthClient.logout).toHaveBeenCalled();
    });

    it('应该支持带选项的 logout', async () => {
      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      await act(async () => {
        await result.current.logout({ silent: true });
      });

      expect(mockAuthClient.logout).toHaveBeenCalledWith({ silent: true });
    });

    it('logout 失败时应记录警告但不抛出错误', async () => {
      const error = new Error('Network error');
      mockAuthClient.logout.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      // 调用 logout 应该不抛出错误
      await act(async () => {
        await result.current.logout();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Logout API failed:', error);

      consoleSpy.mockRestore();
    });

    it('多次调用 logout 应该安全执行', async () => {
      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      await act(async () => {
        await result.current.logout();
        await result.current.logout();
      });

      expect(mockAuthClient.logout).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // refreshToken() 方法测试
  // ============================================================================

  describe('refreshToken() 方法', () => {
    it('应该调用 AuthClient.refreshToken() 并返回新 Token', async () => {
      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      let tokenResponse: TokenResponse | undefined;

      await act(async () => {
        tokenResponse = await result.current.refreshToken();
      });

      expect(mockAuthClient.refreshToken).toHaveBeenCalled();
      expect(tokenResponse).toEqual(MOCK_TOKEN_RESPONSE);
    });

    it('refreshToken 失败时应该抛出错误', async () => {
      const error = new Error('Refresh failed');
      mockAuthClient.refreshToken.mockRejectedValue(error);

      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      await expect(async () => {
        await act(async () => {
          await result.current.refreshToken();
        });
      }).rejects.toThrow('Refresh failed');
    });
  });

  // ============================================================================
  // clearError() 方法测试
  // ============================================================================

  describe('clearError() 方法', () => {
    it('应该清除认证错误', () => {
      localAuthStore.getState().setError(MOCK_AUTH_ERROR);

      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      expect(result.current.error).toEqual(MOCK_AUTH_ERROR);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('clearError 无错误时调用应该安全', () => {
      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      expect(() => {
        act(() => {
          result.current.clearError();
        });
      }).not.toThrow();
    });
  });

  // ============================================================================
  // SessionManager 集成测试
  // ============================================================================

  describe('SessionManager 集成', () => {
    it('应该在组件挂载时启动 SessionManager', () => {
      const mockSessionManager = createMockSessionManager();

      const { unmount } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      expect(mockSessionManager.start).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('应该在组件卸载时停止 SessionManager', () => {
      const mockSessionManager = createMockSessionManager();

      const { unmount } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      unmount();

      expect(mockSessionManager.stop).toHaveBeenCalledTimes(1);
    });

    it('应该支持禁用自动启动 SessionManager', () => {
      const mockSessionManager = createMockSessionManager();

      renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
          autoStartSessionManager: false,
        })
      );

      expect(mockSessionManager.start).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 状态同步测试
  // ============================================================================

  describe('状态同步', () => {
    it('认证状态变化时应该更新', () => {
      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      expect(result.current.status).toBe('unauthenticated');
      expect(result.current.isAuthenticated).toBe(false);

      act(() => {
        localAuthStore.getState().setAuthUser(
          MOCK_USER,
          MOCK_TOKEN_RESPONSE.access_token,
          MOCK_TOKEN_RESPONSE.refresh_token,
          MOCK_TOKEN_RESPONSE.expires_in
        );
      });

      expect(result.current.status).toBe('authenticated');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);
    });

    it('用户信息变化时应该更新', () => {
      const mockSessionManager = createMockSessionManager();

      const newUser: UserResponse = {
        ...MOCK_USER,
        username: 'newuser',
        email: 'new@example.com',
      };

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      act(() => {
        localAuthStore.getState().setAuthUser(
          newUser,
          MOCK_TOKEN_RESPONSE.access_token,
          MOCK_TOKEN_RESPONSE.refresh_token,
          MOCK_TOKEN_RESPONSE.expires_in
        );
      });

      expect(result.current.user?.username).toBe('newuser');
      expect(result.current.user?.email).toBe('new@example.com');
    });

    it('错误状态变化时应该更新', () => {
      const mockSessionManager = createMockSessionManager();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      expect(result.current.error).toBeNull();

      act(() => {
        localAuthStore.getState().setError(MOCK_AUTH_ERROR);
      });

      expect(result.current.error).toEqual(MOCK_AUTH_ERROR);

      act(() => {
        localAuthStore.getState().clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('边界情况', () => {
    it('多次渲染应该返回稳定的引用', () => {
      const mockSessionManager = createMockSessionManager();

      const { result, rerender } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      const firstLogout = result.current.logout;
      const firstClearError = result.current.clearError;

      rerender();

      // 由于 useCallback 的依赖，引用应该保持稳定
      expect(result.current.logout).toBe(firstLogout);
      expect(result.current.clearError).toBe(firstClearError);
    });

    it('Hook 卸载后再挂载应该正常工作', () => {
      const mockSessionManager = createMockSessionManager();

      const { unmount } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      unmount();

      const { result } = renderHook(() =>
        useAuth({
          sessionManager: mockSessionManager,
          authClient: mockAuthClient as any,
          authStore: localAuthStore as any,
        })
      );

      expect(result.current.status).toBe('unauthenticated');
    });
  });
});
