/**
 * AuthApi 集成测试
 *
 * 测试覆盖范围：
 * - login() - 用户登录（支持用户名/邮箱）
 * - register() - 用户注册
 * - refreshToken() - 刷新访问令牌
 * - getCurrentUser() - 获取当前用户信息
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AuthApi } from '../auth-api';
import type { HttpClient } from '../client';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { TokenResponse, UserResponse, AuthResponse } from '@/types/auth';

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
  /** Mock HttpClient */
  mockHttpClient: jest.Mocked<HttpClient>;
  /** AuthApi 实例 */
  authApi: AuthApi;
}

// ============================================================================
// Mock 工厂函数
// ============================================================================

/**
 * 创建 Mock HttpClient
 *
 * 特点：
 * - 记录所有请求参数
 * - 支持配置响应
 * - 验证请求头和请求体
 */
const createMockHttpClient = (): jest.Mocked<HttpClient> => {
  return {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
};

/**
 * 创建 Mock TokenStorage
 *
 * 特点：
 * - 支持初始 Token 设置
 * - 记录 setTokens 和 clearTokens 调用
 * - 支持方法调用验证
 */
const createMockTokenStorage = (
  initialTokens?: TokenResponse | null
): TokenStorage & {
  getSetTokensCallCount: () => number;
  getClearTokensCallCount: () => number;
} => {
  let tokens = initialTokens ?? null;
  let setTokensCallCount = 0;
  let clearTokensCallCount = 0;

  return {
    setTokens: jest.fn((newTokens) => {
      tokens = newTokens;
      setTokensCallCount++;
      return true;
    }),
    getTokens: jest.fn(() => tokens),
    getAccessToken: jest.fn(() => tokens?.access_token ?? null),
    getRefreshToken: jest.fn(() => tokens?.refresh_token ?? null),
    isTokenExpired: jest.fn(() => {
      if (!tokens) return true;
      const expiresAt = Date.now() + (tokens.expires_in * 1000);
      return Date.now() > expiresAt;
    }),
    clearTokens: jest.fn(() => {
      tokens = null;
      clearTokensCallCount++;
    }),
    hasValidTokens: jest.fn(() => !!tokens),
    getSetTokensCallCount: () => setTokensCallCount,
    getClearTokensCallCount: () => clearTokensCallCount,
  };
};

/**
 * 创建测试用 Token 响应数据
 *
 * @param overrides - 覆盖默认值
 * @returns TokenResponse 对象
 */
const createTestTokenResponse = (
  overrides?: Partial<TokenResponse>
): TokenResponse => {
  return {
    access_token: 'test_access_token',
    refresh_token: 'test_refresh_token',
    token_type: 'Bearer',
    expires_in: 3600,
    ...overrides,
  };
};

/**
 * 创建测试用用户响应数据
 *
 * @param overrides - 覆盖默认值
 * @returns UserResponse 对象
 */
const createTestUserResponse = (
  overrides?: Partial<UserResponse>
): UserResponse => {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
};

/**
 * 创建测试用认证响应数据（包含用户信息和 Token）
 *
 * @param overrides - 覆盖默认值
 * @returns AuthResponse 对象
 */
const createTestAuthResponse = (
  overrides?: Partial<AuthResponse>
): AuthResponse => {
  const user = createTestUserResponse();
  const token = createTestTokenResponse();

  return {
    ...user,
    ...token,
    ...overrides,
  };
};

/**
 * 创建成功的 HTTP 响应 Mock
 *
 * @param data - 响应数据
 * @returns Mock Response 对象
 */
const createMockSuccessResponse = <T>(data: T): Response => {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  } as Response;
};

/**
 * 创建失败的 HTTP 响应 Mock
 *
 * @param status - HTTP 状态码
 * @param detail - 错误详情
 * @returns Mock Response 对象
 */
const createMockErrorResponse = (
  status: number,
  detail: string
): Response => {
  return {
    ok: false,
    status,
    json: async () => ({ detail }),
  } as Response;
};

/**
 * 创建网络错误
 *
 * @param message - 错误消息
 * @returns Error 对象
 */
const createNetworkError = (message: string = 'Network error'): Error => {
  return new Error(message);
};

/**
 * 创建集成测试环境
 *
 * 职责：
 * - 初始化所有依赖的 Mock 实例
 * - 配置 AuthApi 与 HttpClient 的集成关系
 * - 设置初始 Token 状态
 *
 * @param initialTokens - 初始 Token 状态
 * @returns 集成测试 Mock 容器
 */
const createIntegrationTestEnvironment = (
  initialTokens?: TokenResponse | null
): IntegrationTestMocks => {
  // 获取 global.fetch（已在 beforeAll 中初始化）
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  mockFetch.mockClear();

  // 创建 Mock 实例
  const mockTokenStorage = createMockTokenStorage(initialTokens);
  const mockHttpClient = createMockHttpClient();

  // 创建 AuthApi 实例
  const authApi = new AuthApi({
    httpClient: mockHttpClient,
    tokenStorage: mockTokenStorage,
  });

  return {
    mockFetch,
    mockTokenStorage,
    mockHttpClient,
    authApi,
  };
};

// ============================================================================
// 集成测试套件
// ============================================================================

describe('AuthApi - Integration Tests', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeAll(() => {
    // 初始化 global.fetch Mock
    mockFetch = global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  beforeEach(() => {
    // 清理所有 Mock 状态
    mockFetch.mockReset();
  });

  // ==========================================================================
  // login() 测试套件（6个测试用例：3成功 + 3失败）
  // ==========================================================================

  describe('login()', () => {
    describe('成功场景', () => {
      it('应使用用户名成功登录', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment();

        const authResponse = createTestAuthResponse({
          username: 'testuser',
        });

        mockHttpClient.post.mockResolvedValue(authResponse);

        // ===== When =====
        const result = await authApi.login('testuser', 'password123');

        // ===== Then =====
        // 1. 验证 HttpClient.post 被正确调用
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          '/api/v1/auth/login',
          { username: 'testuser', password: 'password123' },
          { skipAuth: true }
        );

        // 2. 验证返回值
        expect(result).toEqual(authResponse);

        // 3. 验证 Token 被保存
        expect(mockTokenStorage.setTokens).toHaveBeenCalledTimes(1);
        expect(mockTokenStorage.setTokens).toHaveBeenCalledWith({
          access_token: authResponse.access_token,
          refresh_token: authResponse.refresh_token,
          token_type: authResponse.token_type,
          expires_in: authResponse.expires_in,
        });
      });

      it('应使用邮箱成功登录', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment();

        const authResponse = createTestAuthResponse({
          email: 'test@example.com',
        });

        mockHttpClient.post.mockResolvedValue(authResponse);

        // ===== When =====
        const result = await authApi.login('test@example.com', 'password123');

        // ===== Then =====
        // 1. 验证 HttpClient.post 被正确调用（使用 email 字段）
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          '/api/v1/auth/login',
          { email: 'test@example.com', password: 'password123' },
          { skipAuth: true }
        );

        // 2. 验证返回值
        expect(result).toEqual(authResponse);

        // 3. 验证 Token 被保存
        expect(mockTokenStorage.setTokens).toHaveBeenCalledTimes(1);
      });

      it('应正确处理包含 @ 的用户名（视为邮箱）', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient } = createIntegrationTestEnvironment();

        const authResponse = createTestAuthResponse();
        mockHttpClient.post.mockResolvedValue(authResponse);

        // ===== When =====
        await authApi.login('user@domain', 'password123');

        // ===== Then =====
        // 验证使用 email 字段（因为包含 @）
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          '/api/v1/auth/login',
          { email: 'user@domain', password: 'password123' },
          { skipAuth: true }
        );
      });
    });

    describe('失败场景', () => {
      it('应在密码错误时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment();

        const errorResponse = createMockErrorResponse(401, 'Incorrect password');
        mockHttpClient.post.mockRejectedValue(new Error('Incorrect password'));

        // ===== When =====
        await expect(authApi.login('testuser', 'wrongpassword')).rejects.toThrow(
          'Incorrect password'
        );

        // ===== Then =====
        // 验证 Token 未被保存
        expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      });

      it('应在用户不存在时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment();

        mockHttpClient.post.mockRejectedValue(
          new Error('User not found')
        );

        // ===== When =====
        await expect(authApi.login('nonexistent', 'password123')).rejects.toThrow(
          'User not found'
        );

        // ===== Then =====
        // 验证 Token 未被保存
        expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      });

      it('应在网络错误时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment();

        const networkError = createNetworkError('Network connection failed');
        mockHttpClient.post.mockRejectedValue(networkError);

        // ===== When =====
        await expect(authApi.login('testuser', 'password123')).rejects.toThrow(
          'Network connection failed'
        );

        // ===== Then =====
        // 验证 Token 未被保存
        expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // register() 测试套件（6个测试用例：2成功 + 4失败）
  // ==========================================================================

  describe('register()', () => {
    describe('成功场景', () => {
      it('应成功注册新用户并保存 Token', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment();

        const authResponse = createTestAuthResponse({
          username: 'newuser',
          email: 'newuser@example.com',
        });

        mockHttpClient.post.mockResolvedValue(authResponse);

        // ===== When =====
        const result = await authApi.register(
          'newuser',
          'newuser@example.com',
          'password123'
        );

        // ===== Then =====
        // 1. 验证 HttpClient.post 被正确调用
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          '/api/v1/auth/register',
          {
            username: 'newuser',
            email: 'newuser@example.com',
            password: 'password123',
          },
          { skipAuth: true }
        );

        // 2. 验证返回值
        expect(result).toEqual(authResponse);

        // 3. 验证 Token 被保存
        expect(mockTokenStorage.setTokens).toHaveBeenCalledTimes(1);
        expect(mockTokenStorage.setTokens).toHaveBeenCalledWith({
          access_token: authResponse.access_token,
          refresh_token: authResponse.refresh_token,
          token_type: authResponse.token_type,
          expires_in: authResponse.expires_in,
        });
      });

      it('应正确处理包含特殊字符的邮箱地址', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient } = createIntegrationTestEnvironment();

        const authResponse = createTestAuthResponse({
          email: 'user+tag@example.com',
        });
        mockHttpClient.post.mockResolvedValue(authResponse);

        // ===== When =====
        const result = await authApi.register(
          'testuser',
          'user+tag@example.com',
          'password123'
        );

        // ===== Then =====
        // 验证请求体包含正确的邮箱
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          '/api/v1/auth/register',
          {
            username: 'testuser',
            email: 'user+tag@example.com',
            password: 'password123',
          },
          { skipAuth: true }
        );

        expect(result.email).toBe('user+tag@example.com');
      });
    });

    describe('失败场景', () => {
      it('应在用户名已存在时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment();

        mockHttpClient.post.mockRejectedValue(
          new Error('Username already exists')
        );

        // ===== When =====
        await expect(
          authApi.register('existinguser', 'test@example.com', 'password123')
        ).rejects.toThrow('Username already exists');

        // ===== Then =====
        // 验证 Token 未被保存
        expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      });

      it('应在邮箱已存在时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment();

        mockHttpClient.post.mockRejectedValue(
          new Error('Email already registered')
        );

        // ===== When =====
        await expect(
          authApi.register('newuser', 'existing@example.com', 'password123')
        ).rejects.toThrow('Email already registered');

        // ===== Then =====
        // 验证 Token 未被保存
        expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      });

      it('应在密码不符合要求时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment();

        mockHttpClient.post.mockRejectedValue(
          new Error('Password too short')
        );

        // ===== When =====
        await expect(
          authApi.register('newuser', 'test@example.com', '123')
        ).rejects.toThrow('Password too short');

        // ===== Then =====
        // 验证 Token 未被保存
        expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      });

      it('应在网络错误时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment();

        const networkError = createNetworkError('Connection timeout');
        mockHttpClient.post.mockRejectedValue(networkError);

        // ===== When =====
        await expect(
          authApi.register('newuser', 'test@example.com', 'password123')
        ).rejects.toThrow('Connection timeout');

        // ===== Then =====
        // 验证 Token 未被保存
        expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // refreshToken() 测试套件（6个测试用例：2成功 + 4失败）
  // ==========================================================================

  describe('refreshToken()', () => {
    describe('成功场景', () => {
      it('应成功刷新 Token 并保存新 Token', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment({
            access_token: 'old_access_token',
            refresh_token: 'old_refresh_token',
            token_type: 'Bearer',
            expires_in: 3600,
          });

        const newTokenResponse = createTestTokenResponse({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
        });

        mockHttpClient.post.mockResolvedValue(newTokenResponse);

        // ===== When =====
        const result = await authApi.refreshToken();

        // ===== Then =====
        // 1. 验证 HttpClient.post 被正确调用
        expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          '/api/v1/auth/refresh',
          { refresh_token: 'old_refresh_token' },
          { skipAuth: true }
        );

        // 2. 验证返回值
        expect(result).toEqual(newTokenResponse);

        // 3. 验证新 Token 被保存
        expect(mockTokenStorage.setTokens).toHaveBeenCalledTimes(1);
        expect(mockTokenStorage.setTokens).toHaveBeenCalledWith({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          token_type: 'Bearer',
          expires_in: 3600,
        });
      });

      it('应在多次刷新后正确更新 Token', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment({
            access_token: 'access_token_v1',
            refresh_token: 'refresh_token_v1',
            token_type: 'Bearer',
            expires_in: 3600,
          });

        // 第一次刷新
        const tokenResponse2 = createTestTokenResponse({
          access_token: 'access_token_v2',
          refresh_token: 'refresh_token_v2',
        });
        mockHttpClient.post.mockResolvedValue(tokenResponse2);

        // ===== When =====
        await authApi.refreshToken();

        // 第二次刷新
        const tokenResponse3 = createTestTokenResponse({
          access_token: 'access_token_v3',
          refresh_token: 'refresh_token_v3',
        });
        mockHttpClient.post.mockResolvedValue(tokenResponse3);

        // 更新 mockTokenStorage 返回的 refresh_token
        mockTokenStorage.getRefreshToken.mockReturnValue('refresh_token_v2');

        await authApi.refreshToken();

        // ===== Then =====
        // 验证 setTokens 被调用两次
        expect(mockTokenStorage.setTokens).toHaveBeenCalledTimes(2);

        // 验证第二次调用使用了正确的 refresh_token
        const secondCall = mockHttpClient.post.mock.calls[1];
        expect(secondCall[1]).toEqual({
          refresh_token: 'refresh_token_v2',
        });
      });
    });

    describe('失败场景', () => {
      it('应在无 refresh_token 时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockTokenStorage, mockHttpClient } =
          createIntegrationTestEnvironment(null); // 无初始 Token

        mockTokenStorage.getRefreshToken.mockReturnValue(null);

        // ===== When =====
        await expect(authApi.refreshToken()).rejects.toThrow(
          'No refresh token available'
        );

        // ===== Then =====
        // 验证未发起 HTTP 请求
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it('应在 refresh_token 无效时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient, mockTokenStorage } =
          createIntegrationTestEnvironment({
            access_token: 'old_access_token',
            refresh_token: 'invalid_refresh_token',
            token_type: 'Bearer',
            expires_in: 3600,
          });

        mockHttpClient.post.mockRejectedValue(
          new Error('Invalid refresh token')
        );

        // ===== When =====
        await expect(authApi.refreshToken()).rejects.toThrow(
          'Invalid refresh token'
        );

        // ===== Then =====
        // 验证 Token 未被更新（setTokens 在成功后才调用）
        // 注意：实际实现中 setTokens 会在 post 成功后调用
        // 所以这里应该不会被调用
        const setTokensCalls = mockTokenStorage.getSetTokensCallCount();
        expect(setTokensCalls).toBe(0);
      });

      it('应在 refresh_token 过期时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient } = createIntegrationTestEnvironment({
          access_token: 'old_access_token',
          refresh_token: 'expired_refresh_token',
          token_type: 'Bearer',
          expires_in: 3600,
        });

        mockHttpClient.post.mockRejectedValue(
          new Error('Refresh token expired')
        );

        // ===== When =====
        await expect(authApi.refreshToken()).rejects.toThrow(
          'Refresh token expired'
        );
      });

      it('应在网络错误时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient } = createIntegrationTestEnvironment({
          access_token: 'old_access_token',
          refresh_token: 'valid_refresh_token',
          token_type: 'Bearer',
          expires_in: 3600,
        });

        const networkError = createNetworkError('Network timeout');
        mockHttpClient.post.mockRejectedValue(networkError);

        // ===== When =====
        await expect(authApi.refreshToken()).rejects.toThrow('Network timeout');
      });
    });
  });

  // ==========================================================================
  // getCurrentUser() 测试套件（4个测试用例：1成功 + 3失败）
  // ==========================================================================

  describe('getCurrentUser()', () => {
    describe('成功场景', () => {
      it('应成功获取当前用户信息', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient } = createIntegrationTestEnvironment();

        const userResponse = createTestUserResponse({
          id: 123,
          username: 'currentuser',
          email: 'current@example.com',
        });

        mockHttpClient.get.mockResolvedValue(userResponse);

        // ===== When =====
        const result = await authApi.getCurrentUser();

        // ===== Then =====
        // 1. 验证 HttpClient.get 被正确调用
        expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
        expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/auth/me');

        // 2. 验证返回值
        expect(result).toEqual(userResponse);
        expect(result.id).toBe(123);
        expect(result.username).toBe('currentuser');
        expect(result.email).toBe('current@example.com');
      });
    });

    describe('失败场景', () => {
      it('应在未认证时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient } = createIntegrationTestEnvironment();

        const errorResponse = createMockErrorResponse(401, 'Unauthorized');
        mockHttpClient.get.mockRejectedValue(new Error('Unauthorized'));

        // ===== When =====
        await expect(authApi.getCurrentUser()).rejects.toThrow('Unauthorized');
      });

      it('应在 Token 过期时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient } = createIntegrationTestEnvironment();

        mockHttpClient.get.mockRejectedValue(
          new Error('Token expired')
        );

        // ===== When =====
        await expect(authApi.getCurrentUser()).rejects.toThrow('Token expired');
      });

      it('应在网络错误时抛出异常', async () => {
        // ===== Given =====
        const { authApi, mockHttpClient } = createIntegrationTestEnvironment();

        const networkError = createNetworkError('Network connection failed');
        mockHttpClient.get.mockRejectedValue(networkError);

        // ===== When =====
        await expect(authApi.getCurrentUser()).rejects.toThrow(
          'Network connection failed'
        );
      });
    });
  });

  // ==========================================================================
  // 集成场景测试
  // ==========================================================================

  describe('集成场景', () => {
    it('应完成完整的登录 → 获取用户 → 刷新 Token 流程', async () => {
      // ===== Given =====
      const { authApi, mockHttpClient, mockTokenStorage } =
        createIntegrationTestEnvironment();

      const authResponse = createTestAuthResponse();
      const userResponse = createTestUserResponse();
      const newTokenResponse = createTestTokenResponse({
        access_token: 'refreshed_access_token',
        refresh_token: 'refreshed_refresh_token',
      });

      // ===== When =====
      // 1. 登录
      mockHttpClient.post.mockResolvedValueOnce(authResponse);
      const loginResult = await authApi.login('testuser', 'password123');

      // 2. 获取当前用户
      mockHttpClient.get.mockResolvedValueOnce(userResponse);
      const userResult = await authApi.getCurrentUser();

      // 3. 刷新 Token
      mockHttpClient.post.mockResolvedValueOnce(newTokenResponse);
      const refreshResult = await authApi.refreshToken();

      // ===== Then =====
      // 验证登录
      expect(loginResult).toEqual(authResponse);
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith({
        access_token: authResponse.access_token,
        refresh_token: authResponse.refresh_token,
        token_type: authResponse.token_type,
        expires_in: authResponse.expires_in,
      });

      // 验证获取用户
      expect(userResult).toEqual(userResponse);

      // 验证刷新 Token
      expect(refreshResult).toEqual(newTokenResponse);
      expect(mockTokenStorage.setTokens).toHaveBeenLastCalledWith({
        access_token: 'refreshed_access_token',
        refresh_token: 'refreshed_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      // 验证 setTokens 总共被调用 2 次（登录 + 刷新）
      expect(mockTokenStorage.getSetTokensCallCount()).toBe(2);
    });
  });
});
