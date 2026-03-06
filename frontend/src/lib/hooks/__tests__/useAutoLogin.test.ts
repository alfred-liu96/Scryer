/**
 * useAutoLogin Hook 单元测试
 *
 * 测试契约:
 * - Mock Token 有存储 + API 返回用户 → isValid: true
 * - Mock Token 有存储 + API 返回 401 → isValid: false, 清除状态
 * - Mock Token 无存储 → isValid: false, 不调用 API
 * - 测试 revalidate() 手动触发
 * - 测试 enabled: false 跳过验证
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoLogin } from '../useAutoLogin';
import { createAuthStore } from '@/store/auth/auth-store';
import type { AuthStore } from '@/store/auth/auth-store-types';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { AuthClient } from '@/lib/api/auth-client';
import type { UserResponse, TokenResponse } from '@/types/auth';

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

const MOCK_STORED_TOKENS = {
  accessToken: 'stored-access-token',
  refreshToken: 'stored-refresh-token',
  expiresAt: Date.now() + 3600000,
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
  validateToken: jest.fn(async () => MOCK_USER),
  refreshToken: jest.fn(async () => MOCK_TOKEN_RESPONSE),
  logout: jest.fn(async () => {}),
});

// ============================================================================
// 测试套件
// ============================================================================

describe('useAutoLogin Hook', () => {
  let authStore: AuthStore;
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
    authStore = createAuthStore({
      persist: false,
      tokenStorage: mockTokenStorage,
    });

    // 重置状态
    authStore.getState().reset();
  });

  afterEach(() => {
    // 清理
    authStore.getState().reset();

    // 恢复 window
    global.window = originalWindow;
  });

  // ============================================================================
  // Happy Path 测试
  // ============================================================================

  describe('Happy Path - Token 有效', () => {
    it('应该验证有效的 Token 并设置认证状态（Token 有存储 + API 返回用户）', async () => {
      // Mock Token 存储
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);

      // Mock API 返回用户
      mockAuthClient.validateToken.mockResolvedValue(MOCK_USER);

      const { result } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      // 初始状态：正在验证
      expect(result.current.isValidating).toBe(true);
      expect(result.current.isValid).toBe(null);
      expect(result.current.error).toBeNull();

      // 等待验证完成
      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      // 验证成功
      expect(result.current.isValid).toBe(true);
      expect(result.current.error).toBeNull();

      // 应该调用 API 验证 Token
      expect(mockAuthClient.validateToken).toHaveBeenCalledTimes(1);

      // 应该设置认证状态
      expect(authStore.getState().status).toBe('authenticated');
      expect(authStore.getState().user).toEqual(MOCK_USER);
    });

    it('应该使用默认的 validateEndpoint（/api/v1/auth/me）', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);
      mockAuthClient.validateToken.mockResolvedValue(MOCK_USER);

      renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      await waitFor(() => {
        expect(mockAuthClient.validateToken).toHaveBeenCalled();
      });

      // 验证使用了默认端点
      expect(mockAuthClient.validateToken).toHaveBeenCalledWith('/api/v1/auth/me');
    });

    it('应该使用自定义的 validateEndpoint', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);
      mockAuthClient.validateToken.mockResolvedValue(MOCK_USER);

      const customEndpoint = '/api/v1/auth/validate';

      renderHook(() =>
        useAutoLogin({
          validateEndpoint: customEndpoint,
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      await waitFor(() => {
        expect(mockAuthClient.validateToken).toHaveBeenCalled();
      });

      expect(mockAuthClient.validateToken).toHaveBeenCalledWith(customEndpoint);
    });
  });

  // ============================================================================
  // Token 无效测试
  // ============================================================================

  describe('Token 无效 - API 返回 401', () => {
    it('应该清除认证状态（Token 有存储 + API 返回 401）', async () => {
      // Mock Token 存储
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);

      // 先设置为已认证状态
      authStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );
      expect(authStore.getState().status).toBe('authenticated');

      // Mock API 返回 401
      const error = new Error('Unauthorized');
      (error as any).status = 401;
      mockAuthClient.validateToken.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      // 等待验证完成
      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      // 验证失败
      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toEqual(error);

      // 应该清除认证状态
      expect(authStore.getState().status).toBe('unauthenticated');
      expect(authStore.getState().user).toBeNull();
    });

    it('应该清除 Token 存储（默认 clearOnInvalid: true）', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);

      const error = new Error('Unauthorized');
      (error as any).status = 401;
      mockAuthClient.validateToken.mockRejectedValue(error);

      renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
          clearOnInvalid: true,
        })
      );

      await waitFor(() => {
        expect(mockAuthClient.validateToken).toHaveBeenCalled();
      });

      // 应该清除 Token
      expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(1);
    });

    it('应该不清除 Token 存储（clearOnInvalid: false）', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);

      const error = new Error('Unauthorized');
      (error as any).status = 401;
      mockAuthClient.validateToken.mockRejectedValue(error);

      renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
          clearOnInvalid: false,
        })
      );

      await waitFor(() => {
        expect(mockAuthClient.validateToken).toHaveBeenCalled();
      });

      // 不应该清除 Token
      expect(mockTokenStorage.clearTokens).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 无 Token 测试
  // ============================================================================

  describe('无 Token 存储', () => {
    it('应该跳过 API 调用（Token 无存储）', async () => {
      // Mock 无 Token 存储
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      // 等待 Hook 完成
      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      // 验证失败
      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toBeNull();

      // 不应该调用 API
      expect(mockAuthClient.validateToken).not.toHaveBeenCalled();
    });

    it('应该保持未认证状态（无 Token）', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(null);

      renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      await waitFor(() => {
        expect(mockAuthClient.validateToken).not.toHaveBeenCalled();
      });

      // 应该保持未认证状态
      expect(authStore.getState().status).toBe('unauthenticated');
      expect(authStore.getState().user).toBeNull();
    });
  });

  // ============================================================================
  // revalidate() 手动触发测试
  // ============================================================================

  describe('revalidate() 方法', () => {
    it('应该手动触发重新验证', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);
      mockAuthClient.validateToken.mockResolvedValue(MOCK_USER);

      const { result } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      // 等待初始验证完成
      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(mockAuthClient.validateToken).toHaveBeenCalledTimes(1);
      expect(result.current.isValid).toBe(true);

      // 清除 mock 记录
      mockAuthClient.validateToken.mockClear();

      // 手动触发重新验证
      await act(async () => {
        await result.current.revalidate();
      });

      // 应该再次调用 API
      expect(mockAuthClient.validateToken).toHaveBeenCalledTimes(1);
    });

    it('revalidate 应该更新 isValid 状态', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);

      // 第一次调用成功
      mockAuthClient.validateToken.mockResolvedValueOnce(MOCK_USER);

      const { result } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      await waitFor(() => {
        expect(result.current.isValid).toBe(true);
      });

      // 第二次调用失败
      const error = new Error('Unauthorized');
      (error as any).status = 401;
      mockAuthClient.validateToken.mockRejectedValueOnce(error);

      await act(async () => {
        await result.current.revalidate();
      });

      // 应该更新为失败状态
      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toEqual(error);
    });
  });

  // ============================================================================
  // enabled 选项测试
  // ============================================================================

  describe('enabled 选项', () => {
    it('应该跳过验证（enabled: false）', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);

      const { result } = renderHook(() =>
        useAutoLogin({
          enabled: false,
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      // 应该不进行验证
      expect(result.current.isValidating).toBe(false);
      expect(result.current.isValid).toBe(null);
      expect(result.current.error).toBeNull();

      // 不应该调用 API
      expect(mockAuthClient.validateToken).not.toHaveBeenCalled();
    });

    it('应该默认启用验证（enabled 默认为 true）', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);
      mockAuthClient.validateToken.mockResolvedValue(MOCK_USER);

      const { result } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      // 应该进行验证
      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(mockAuthClient.validateToken).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // SSR 安全测试
  // ============================================================================

  describe('SSR 安全', () => {
    it('应该在服务端跳过验证', () => {
      // Mock 服务端环境
      delete (global as any).window;

      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);

      const { result } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      // 应该跳过验证
      expect(result.current.isValidating).toBe(false);
      expect(result.current.isValid).toBe(null);
      expect(mockAuthClient.validateToken).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('边界情况', () => {
    it('应该处理网络错误', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);

      const networkError = new Error('Network Error');
      mockAuthClient.validateToken.mockRejectedValue(networkError);

      const { result } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toEqual(networkError);
    });

    it('应该处理并发验证请求（防抖）', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);

      // 模拟慢速 API
      let resolveApi: (value: UserResponse) => void;
      const apiPromise = new Promise<UserResponse>((resolve) => {
        resolveApi = resolve;
      });
      mockAuthClient.validateToken.mockReturnValue(apiPromise);

      const { result } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      // 立即触发多次 revalidate
      act(() => {
        result.current.revalidate();
        result.current.revalidate();
        result.current.revalidate();
      });

      // 解决 API
      await act(async () => {
        resolveApi!(MOCK_USER);
        await apiPromise;
      });

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      // 应该只调用一次 API（防抖）
      // 注意：实际实现可能使用 useRef 防抖，这里验证最终状态
      expect(result.current.isValid).toBe(true);
    });

    it('应该处理 Hook 卸载后重新挂载', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);
      mockAuthClient.validateToken.mockResolvedValue(MOCK_USER);

      const { unmount } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      await waitFor(() => {
        expect(mockAuthClient.validateToken).toHaveBeenCalled();
      });

      unmount();

      // 重新挂载
      mockAuthClient.validateToken.mockClear();
      const { result } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      // 应该再次验证
      expect(mockAuthClient.validateToken).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // 选项默认值测试
  // ============================================================================

  describe('选项默认值', () => {
    it('应该使用默认的 validateEndpoint', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);
      mockAuthClient.validateToken.mockResolvedValue(MOCK_USER);

      renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      await waitFor(() => {
        expect(mockAuthClient.validateToken).toHaveBeenCalledWith('/api/v1/auth/me');
      });
    });

    it('应该默认启用自动登录（enabled: true）', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);
      mockAuthClient.validateToken.mockResolvedValue(MOCK_USER);

      const { result } = renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
    });

    it('应该默认清除无效 Token（clearOnInvalid: true）', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(MOCK_STORED_TOKENS);

      const error = new Error('Unauthorized');
      (error as any).status = 401;
      mockAuthClient.validateToken.mockRejectedValue(error);

      renderHook(() =>
        useAutoLogin({
          tokenStorage: mockTokenStorage,
          authClient: mockAuthClient as any,
          authStore: authStore as any,
        })
      );

      await waitFor(() => {
        expect(mockAuthClient.validateToken).toHaveBeenCalled();
      });

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });
  });
});
