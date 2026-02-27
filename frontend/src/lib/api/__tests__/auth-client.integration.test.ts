/**
 * AuthClient 集成测试
 *
 * 测试覆盖范围：
 * - Token 刷新失败后自动调用 AuthClient.logout()
 * - 验证 TokenStorage 和 AuthStore 状态清除
 * - 验证并发请求的队列处理
 * - 验证网络错误场景
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HttpClient } from '../client';
import { AuthClient } from '../auth-client';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { AuthStore } from '@/store/auth/auth-store-types';
import type { StoredTokens } from '@/types/auth';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 集成测试 Mock 容器
 */
interface IntegrationTestMocks {
  /** Mock fetch API */
  mockFetch: jest.MockedFunction<typeof fetch>;
  /** Mock TokenStorage */
  mockTokenStorage: TokenStorage;
  /** Mock AuthStore */
  mockAuthStore: AuthStore;
  /** Mock HttpClient */
  client: HttpClient;
  /** Mock AuthClient */
  mockAuthClient: jest.Mocked<AuthClient>;
}

// ============================================================================
// Mock 工厂函数
// ============================================================================

/**
 * 创建集成测试用的 Mock TokenStorage
 *
 * 特点：
 * - 支持状态追踪（验证 clearTokens 调用）
 * - 支持初始 Token 设置
 * - 支持方法调用计数
 */
const createIntegrationMockTokenStorage = (
  initialTokens?: StoredTokens | null
): TokenStorage & { getClearTokensCallCount: () => number } => {
  let tokens = initialTokens ?? null;
  let clearTokensCallCount = 0;

  return {
    setTokens: jest.fn((newTokens) => {
      tokens = newTokens;
      return true;
    }),
    getTokens: jest.fn(() => tokens),
    getAccessToken: jest.fn(() => tokens?.accessToken ?? null),
    getRefreshToken: jest.fn(() => tokens?.refreshToken ?? null),
    isTokenExpired: jest.fn(() => {
      if (!tokens) return true;
      return Date.now() > (tokens.expiresAt ?? 0);
    }),
    clearTokens: jest.fn(() => {
      tokens = null;
      clearTokensCallCount++;
    }),
    hasValidTokens: jest.fn(() => !!tokens),
    getClearTokensCallCount: () => clearTokensCallCount,
  };
};

/**
 * 创建集成测试用的 Mock AuthStore
 *
 * 特点：
 * - 支持状态追踪（验证 clearAuth 调用）
 * - 支持方法调用计数
 */
const createIntegrationMockAuthStore = (): AuthStore & {
  getClearAuthCallCount: () => number;
} => {
  let clearAuthCallCount = 0;

  return {
    // State
    status: 'authenticated',
    user: { id: 1, username: 'test@example.com' },
    accessToken: 'test_access_token',
    refreshToken: 'test_refresh_token',
    tokenExpiresAt: Date.now() + 3600000,
    error: null,
    isAuthenticating: false,

    // Actions
    setLoading: jest.fn(),
    setAuthUser: jest.fn(),
    updateAccessToken: jest.fn(),
    clearAuth: jest.fn(() => {
      clearAuthCallCount++;
    }),
    setError: jest.fn(),
    clearError: jest.fn(),
    toJSON: jest.fn(() => ({})),
    fromJSON: jest.fn(),
    reset: jest.fn(),

    // 测试辅助方法
    getClearAuthCallCount: () => clearAuthCallCount,
  };
};

/**
 * 创建集成测试用的 Mock AuthClient
 *
 * 特点：
 * - 记录 logout 调用历史
 * - 支持验证调用参数
 * - logout() 方法内部会调用 tokenStorage.clearTokens() 和 authStore.clearAuth()
 */
const createIntegrationMockAuthClient = (
  tokenStorage?: TokenStorage,
  authStore?: AuthStore
): jest.Mocked<AuthClient> & {
  getLogoutCallHistory: () => Array<{ silent?: boolean; clearLocalState?: boolean }>;
} => {
  const logoutCallHistory: Array<{ silent?: boolean; clearLocalState?: boolean }> = [];

  const mockAuthClient = {
    refreshToken: jest.fn(),
    logout: jest.fn((options?: { silent?: boolean; clearLocalState?: boolean }) => {
      logoutCallHistory.push(options ?? {});

      // 模拟真实的 logout 行为：调用 tokenStorage.clearTokens() 和 authStore.clearAuth()
      if (tokenStorage) {
        tokenStorage.clearTokens();
      }
      if (authStore) {
        authStore.clearAuth();
      }
    }),
    getLogoutCallHistory: () => logoutCallHistory,
  } as unknown as jest.Mocked<AuthClient> & {
    getLogoutCallHistory: () => Array<{ silent?: boolean; clearLocalState?: boolean }>;
  };

  return mockAuthClient;
};

/**
 * 创建集成测试环境
 *
 * 职责：
 * - 初始化所有依赖的 Mock 实例
 * - 配置 HttpClient 和 AuthClient 的集成关系
 * - 设置初始 Token 状态
 *
 * @param initialTokens - 初始 Token 状态
 * @returns 集成测试 Mock 容器
 */
const createIntegrationTestEnvironment = (
  initialTokens?: StoredTokens | null
): IntegrationTestMocks => {
  // 获取 global.fetch（已在 beforeAll 中初始化）
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  mockFetch.mockClear();

  // 创建 Mock 实例
  const mockTokenStorage = createIntegrationMockTokenStorage(initialTokens);
  const mockAuthStore = createIntegrationMockAuthStore();
  const mockAuthClient = createIntegrationMockAuthClient(mockTokenStorage, mockAuthStore);

  // 创建 HttpClient 实例
  const client = new HttpClient('http://localhost:8000', 5000, mockTokenStorage);

  // 配置 onRefreshFailure 回调以调用 mockAuthClient.logout
  client.onRefreshFailure = (error: Error) => {
    mockAuthClient.logout({ silent: true, clearLocalState: true });
  };

  return {
    mockFetch,
    mockTokenStorage,
    mockAuthStore,
    client,
    mockAuthClient,
  };
};

// ============================================================================
// 集成测试套件
// ============================================================================

describe('AuthClient - Integration with HttpClient', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeAll(() => {
    // 初始化 global.fetch Mock
    mockFetch = global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  beforeEach(() => {
    // 清理所有 Mock 状态（包括 mockImplementation 和 mockResolvedValue）
    mockFetch.mockReset();
  });

  describe('场景 1：刷新失败后调用登出逻辑', () => {
    it('应在刷新失败后调用 authClient.logout({ silent: true })', async () => {
      // ===== Given =====
      const { mockFetch, client, mockAuthClient, mockTokenStorage, mockAuthStore } =
        createIntegrationTestEnvironment({
          accessToken: 'expired_access_token',
          refreshToken: 'invalid_refresh_token',
          expiresAt: Date.now() - 1000, // 已过期
        });

      // 配置 Fetch 响应序列
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid refresh token' }),
      } as Response);

      // ===== When =====
      // 发起请求 → 触发 401 → 触发刷新 → 刷新失败 → 触发 onRefreshFailure
      await expect(client.get('/api/data')).rejects.toThrow();

      // ===== Then =====
      // 1. 验证 authClient.logout 被调用
      expect(mockAuthClient.logout).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.logout).toHaveBeenCalledWith({
        silent: true,
        clearLocalState: true,
      });

      // 2. 验证 tokenStorage.clearTokens 被调用
      expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(1);

      // 3. 验证 authStore.clearAuth 被调用
      expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1);
    });
  });

  describe('场景 2：并发请求刷新失败', () => {
    it('应在刷新失败后拒绝所有排队的请求，且只调用一次 logout', async () => {
      // ===== Given =====
      const { mockFetch, client, mockAuthClient } = createIntegrationTestEnvironment();

      // ===== When =====
      // 配置 Fetch 响应
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid refresh token' }),
      } as Response);

      // 并发发起 3 个请求
      const promises = [
        client.get('/api/data1'),
        client.get('/api/data2'),
        client.get('/api/data3'),
      ];

      // ===== Then =====
      // 所有请求都应该失败
      await expect(Promise.all(promises)).rejects.toThrow();

      // 验证 logout 只被调用一次（互斥锁保证）
      expect(mockAuthClient.logout).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.logout).toHaveBeenCalledWith({
        silent: true,
        clearLocalState: true,
      });
    });
  });

  describe('场景 3：状态清除验证', () => {
    it('应在刷新失败后清除 Token 并阻止后续请求注入 Authorization', async () => {
      // ===== Given =====
      const { mockFetch, client, mockAuthClient, mockTokenStorage } =
        createIntegrationTestEnvironment({
          accessToken: 'test_access_token',
          refreshToken: 'test_refresh_token',
          expiresAt: Date.now() + 3600000,
        });

      // ===== When =====
      // 第一个请求触发刷新失败
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid refresh token' }),
      } as Response);

      await expect(client.get('/api/data1')).rejects.toThrow();

      // 第二个请求应该无法注入 Token（已清除）
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'success' }),
      } as Response);

      // 清除 Token 后，getAccessToken 返回 null
      mockTokenStorage.getAccessToken.mockReturnValue(null);

      await client.get('/api/data2');

      // ===== Then =====
      // 验证 clearTokens 被调用
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();

      // 验证第二个请求没有 Authorization header
      const lastCallArgs = mockFetch.mock.calls[0];
      const headers = lastCallArgs[1]?.headers as Headers;
      expect(headers?.get('Authorization')).toBeNull();
    });
  });

  describe('场景 4：网络错误处理', () => {
    it('应在刷新网络错误后调用登出逻辑', async () => {
      // ===== Given =====
      const { mockFetch, client, mockAuthClient } = createIntegrationTestEnvironment({
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresAt: Date.now() + 3600000,
      });

      // ===== When =====
      // 原始请求返回 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 刷新请求网络错误
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.get('/api/data')).rejects.toThrow();

      // ===== Then =====
      expect(mockAuthClient.logout).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.logout).toHaveBeenCalledWith({
        silent: true,
        clearLocalState: true,
      });
    });
  });

  describe('边界场景：刷新端点超时', () => {
    it('应在刷新超时后调用登出逻辑', async () => {
      // ===== Given =====
      const { mockFetch, client, mockAuthClient } = createIntegrationTestEnvironment();

      // ===== When =====
      // 原始请求返回 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 刷新请求超时（AbortError）
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(client.get('/api/data')).rejects.toThrow();

      // ===== Then =====
      expect(mockAuthClient.logout).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.logout).toHaveBeenCalledWith({
        silent: true,
        clearLocalState: true,
      });
    });
  });

  describe('边界场景：无 Refresh Token', () => {
    it('应在无 refresh token 时调用登出逻辑', async () => {
      // ===== Given =====
      const { mockFetch, client, mockAuthClient, mockTokenStorage } =
        createIntegrationTestEnvironment({
          accessToken: 'expired_access_token',
          refreshToken: null, // 无 refresh token
          expiresAt: Date.now() - 1000,
        });

      // 配置 getRefreshToken 返回 null（覆盖默认实现）
      mockTokenStorage.getRefreshToken.mockImplementation(() => null);

      // ===== When =====
      // 原始请求返回 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      const error = await client.get('/api/data').catch(e => e);
      expect(error).toBeTruthy();

      // ===== Then =====
      expect(mockAuthClient.logout).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.logout).toHaveBeenCalledWith({
        silent: true,
        clearLocalState: true,
      });
    });
  });

  describe('边界场景：刷新端点返回 500 错误', () => {
    it('应在刷新端点返回 500 时调用登出逻辑', async () => {
      // ===== Given =====
      const { mockFetch, client, mockAuthClient } = createIntegrationTestEnvironment();

      // ===== When =====
      // 原始请求返回 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 刷新请求返回 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal Server Error' }),
      } as Response);

      await expect(client.get('/api/data')).rejects.toThrow();

      // ===== Then =====
      expect(mockAuthClient.logout).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.logout).toHaveBeenCalledWith({
        silent: true,
        clearLocalState: true,
      });
    });
  });

  describe('验证场景：onRefreshFailure 回调配置', () => {
    it('应正确配置 onRefreshFailure 回调以调用 authClient.logout', async () => {
      // ===== Given =====
      const { client, mockAuthClient } = createIntegrationTestEnvironment();

      // ===== When =====
      // 手动触发回调
      const testError = new Error('Test refresh failure');
      client.onRefreshFailure(testError);

      // ===== Then =====
      expect(mockAuthClient.logout).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.logout).toHaveBeenCalledWith({
        silent: true,
        clearLocalState: true,
      });
    });
  });
});
