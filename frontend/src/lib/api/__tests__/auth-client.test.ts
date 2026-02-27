/**
 * AuthClient 单元测试
 *
 * 测试覆盖范围：
 * - refreshToken() 成功场景
 * - refreshToken() 失败场景（无 Token、401、网络错误）
 * - logout() 正常场景
 * - logout() 静默登出场景
 * - TokenStorage 和 AuthStore 状态同步验证
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/lib/api/auth-client.ts
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// 注意：当前 auth-client.ts 尚未实现，这个 import 会导致测试失败
// 这是预期的行为（TDD Red First 原则）
// 当 task-developer 实现了 auth-client.ts 后，测试将能够正确运行
import { AuthClient } from '../auth-client';
import type { TokenResponse } from '@/types/auth';
import type { HttpClient } from '../client';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { AuthStore } from '@/store/auth/auth-store-types';

// ============================================================================
// Mock 工厂函数
// ============================================================================

/**
 * 创建 Mock HttpClient
 */
const createMockHttpClient = (): HttpClient => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
});

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
});

/**
 * 创建 Mock AuthStore
 */
const createMockAuthStore = (): AuthStore => ({
  // State
  status: 'unauthenticated',
  user: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  error: null,
  isAuthenticating: false,

  // Actions
  setLoading: jest.fn(),
  setAuthUser: jest.fn(),
  updateAccessToken: jest.fn(),
  clearAuth: jest.fn(),
  setError: jest.fn(),
  clearError: jest.fn(),
  toJSON: jest.fn(() => ({})),
  fromJSON: jest.fn(),
  reset: jest.fn(),
});

/**
 * 创建 Mock TokenResponse
 */
const createMockTokenResponse = (
  overrides?: Partial<TokenResponse>
): TokenResponse => ({
  access_token: 'new_access_token',
  refresh_token: 'new_refresh_token',
  token_type: 'Bearer',
  expires_in: 3600,
  ...overrides,
});

// ============================================================================
// 测试套件
// ============================================================================

describe('AuthClient', () => {
  let mockHttpClient: HttpClient;
  let mockTokenStorage: TokenStorage;
  let mockAuthStore: AuthStore;
  let authClient: AuthClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpClient = createMockHttpClient();
    mockTokenStorage = createMockTokenStorage();
    mockAuthStore = createMockAuthStore();

    authClient = new AuthClient({
      httpClient: mockHttpClient,
      tokenStorage: mockTokenStorage,
      authStore: mockAuthStore,
    });
  });

  // ==========================================================================
  // refreshToken() - 成功场景
  // ==========================================================================

  describe('refreshToken()', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const mockRefreshToken = 'valid_refresh_token';
      const mockResponse = createMockTokenResponse();

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        mockRefreshToken
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authClient.refreshToken();

      // Assert
      // 1. 验证调用了 refresh_token 获取
      expect(mockTokenStorage.getRefreshToken).toHaveBeenCalledTimes(1);

      // 2. 验证 HTTP 请求参数
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/refresh',
        { refresh_token: mockRefreshToken },
        { skipAuth: true }
      );

      // 3. 验证保存新 Token
      expect(mockTokenStorage.setTokens).toHaveBeenCalledTimes(1);
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith(mockResponse);

      // 4. 验证更新 AuthStore
      expect(mockAuthStore.updateAccessToken).toHaveBeenCalledTimes(1);
      expect(mockAuthStore.updateAccessToken).toHaveBeenCalledWith(
        mockResponse.access_token,
        mockResponse.expires_in
      );

      // 5. 验证返回值
      expect(result).toEqual(mockResponse);
    });

    it('should handle force option (currently ignored)', async () => {
      // Arrange
      const mockResponse = createMockTokenResponse();
      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await authClient.refreshToken({ force: true });

      // Assert
      // force 选项当前不影响行为，但应该正确传递
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/refresh',
        { refresh_token: 'refresh_token' },
        { skipAuth: true }
      );
    });

    it('should save token before updating store (order verification)', async () => {
      // Arrange
      const mockResponse = createMockTokenResponse();
      const callOrder: string[] = [];

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );

      (mockTokenStorage.setTokens as jest.Mock).mockImplementation(() => {
        callOrder.push('setTokens');
        return true;
      });

      (mockAuthStore.updateAccessToken as jest.Mock).mockImplementation(() => {
        callOrder.push('updateAccessToken');
      });

      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await authClient.refreshToken();

      // Assert
      expect(callOrder).toEqual(['setTokens', 'updateAccessToken']);
    });
  });

  // ==========================================================================
  // refreshToken() - 失败场景
  // ==========================================================================

  describe('refreshToken() - Error Scenarios', () => {
    it('should throw error when refresh token not exists', async () => {
      // Arrange
      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(null);

      // Act & Assert
      await expect(authClient.refreshToken()).rejects.toThrow(
        'No refresh token available'
      );

      // 验证没有发起 HTTP 请求
      expect(mockHttpClient.post).not.toHaveBeenCalled();

      // 验证没有修改状态
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      expect(mockAuthStore.updateAccessToken).not.toHaveBeenCalled();
    });

    it('should handle 401 error from backend', async () => {
      // Arrange
      const mockError = new Error('Unauthorized');
      (mockError as any).status = 401;

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'invalid_refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(authClient.refreshToken()).rejects.toThrow('Unauthorized');

      // 验证发起了请求
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // 验证没有保存无效 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      expect(mockAuthStore.updateAccessToken).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      // Arrange
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockRejectedValue(networkError);

      // Act & Assert
      await expect(authClient.refreshToken()).rejects.toThrow('Network error');

      // 验证发起了请求
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // 验证没有修改状态
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      expect(mockAuthStore.updateAccessToken).not.toHaveBeenCalled();
    });

    it('should handle 500 server error', async () => {
      // Arrange
      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockRejectedValue(serverError);

      // Act & Assert
      await expect(authClient.refreshToken()).rejects.toThrow(
        'Internal Server Error'
      );

      // 验证没有修改状态
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      expect(mockAuthStore.updateAccessToken).not.toHaveBeenCalled();
    });

    it('should handle malformed response', async () => {
      // Arrange
      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue({
        invalid_field: 'invalid_response',
      });

      // Act
      const result = await authClient.refreshToken();

      // Assert
      // 应该返回响应（类型安全由 TypeScript 保证）
      expect(result).toBeDefined();
      expect(mockTokenStorage.setTokens).toHaveBeenCalled();
      expect(mockAuthStore.updateAccessToken).toHaveBeenCalledWith(
        undefined,
        undefined
      );
    });

    it('should handle timeout error', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(authClient.refreshToken()).rejects.toThrow(
        'Request timeout'
      );

      // 验证没有修改状态
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      expect(mockAuthStore.updateAccessToken).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // logout() - 正常场景
  // ==========================================================================

  describe('logout()', () => {
    it('should clear tokens and auth state with default options', async () => {
      // Act
      await authClient.logout();

      // Assert
      expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(1);
      expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1);
    });

    it('should respect silent=true option', async () => {
      // Act
      await authClient.logout({ silent: true });

      // Assert
      // 静默登出不调用后端（当前实现中后端登出为 TODO）
      expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(1);
      expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1);
    });

    it('should respect silent=false option', async () => {
      // Act
      await authClient.logout({ silent: false });

      // Assert
      // 非静默登出会调用后端（当前实现中为 TODO，所以不会有额外调用）
      expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(1);
      expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1);
    });

    it('should handle clearLocalState=false option', async () => {
      // Act
      await authClient.logout({ clearLocalState: false });

      // Assert
      expect(mockTokenStorage.clearTokens).not.toHaveBeenCalled();
      expect(mockAuthStore.clearAuth).not.toHaveBeenCalled();
    });

    it('should handle both options: silent and clearLocalState', async () => {
      // Act
      await authClient.logout({ silent: true, clearLocalState: true });

      // Assert
      expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(1);
      expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1);
    });

    it('should clear tokens before clearing auth state (order verification)', async () => {
      // Arrange
      const callOrder: string[] = [];

      (mockTokenStorage.clearTokens as jest.Mock).mockImplementation(() => {
        callOrder.push('clearTokens');
      });

      (mockAuthStore.clearAuth as jest.Mock).mockImplementation(() => {
        callOrder.push('clearAuth');
      });

      // Act
      await authClient.logout();

      // Assert
      expect(callOrder).toEqual(['clearTokens', 'clearAuth']);
    });

    it('should handle multiple logout calls', async () => {
      // Act
      await authClient.logout();
      await authClient.logout();
      await authClient.logout();

      // Assert
      expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(3);
      expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // logout() - 失败场景（当前实现不会抛出异常）
  // ==========================================================================

  describe('logout() - Error Scenarios', () => {
    it('should handle tokenStorage.clearTokens throwing error', async () => {
      // Arrange
      (mockTokenStorage.clearTokens as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Act & Assert
      // 当前实现中，clearTokens 抛出异常会中断 logout
      await expect(authClient.logout()).rejects.toThrow('Storage error');

      // AuthStore.clearAuth 应该不会被调用
      expect(mockAuthStore.clearAuth).not.toHaveBeenCalled();
    });

    it('should handle authStore.clearAuth throwing error', async () => {
      // Arrange
      (mockAuthStore.clearAuth as jest.Mock).mockImplementation(() => {
        throw new Error('Store error');
      });

      // Act & Assert
      await expect(authClient.logout()).rejects.toThrow('Store error');

      // TokenStorage.clearTokens 应该已经被调用
      expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(1);
    });

    it('should handle both clearTokens and clearAuth throwing errors', async () => {
      // Arrange
      (mockTokenStorage.clearTokens as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });
      (mockAuthStore.clearAuth as jest.Mock).mockImplementation(() => {
        throw new Error('Store error');
      });

      // Act & Assert
      // 第一个异常会被抛出
      await expect(authClient.logout()).rejects.toThrow('Storage error');
    });
  });

  // ==========================================================================
  // 状态同步验证
  // ==========================================================================

  describe('State Synchronization', () => {
    it('should synchronize TokenStorage and AuthStore on successful refresh', async () => {
      // Arrange
      const mockResponse = createMockTokenResponse({
        access_token: 'synced_access_token',
        refresh_token: 'synced_refresh_token',
        expires_in: 7200,
      });

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'old_refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await authClient.refreshToken();

      // Assert
      // TokenStorage 应该保存完整的 TokenResponse
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith(mockResponse);

      // AuthStore 应该只更新 access_token 和 expires_in
      expect(mockAuthStore.updateAccessToken).toHaveBeenCalledWith(
        'synced_access_token',
        7200
      );
    });

    it('should maintain consistency after multiple refresh cycles', async () => {
      // Arrange
      const refreshCycle1 = createMockTokenResponse({
        access_token: 'token_1',
        expires_in: 3600,
      });
      const refreshCycle2 = createMockTokenResponse({
        access_token: 'token_2',
        expires_in: 7200,
      });

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock)
        .mockResolvedValueOnce(refreshCycle1)
        .mockResolvedValueOnce(refreshCycle2);

      // Act
      await authClient.refreshToken();
      await authClient.refreshToken();

      // Assert
      expect(mockTokenStorage.setTokens).toHaveBeenCalledTimes(2);
      expect(mockAuthStore.updateAccessToken).toHaveBeenCalledTimes(2);

      expect(mockTokenStorage.setTokens).toHaveBeenNthCalledWith(
        1,
        refreshCycle1
      );
      expect(mockTokenStorage.setTokens).toHaveBeenNthCalledWith(
        2,
        refreshCycle2
      );

      expect(mockAuthStore.updateAccessToken).toHaveBeenNthCalledWith(
        1,
        'token_1',
        3600
      );
      expect(mockAuthStore.updateAccessToken).toHaveBeenNthCalledWith(
        2,
        'token_2',
        7200
      );
    });

    it('should clear both TokenStorage and AuthStore on logout', async () => {
      // Arrange
      // 先设置一些状态（模拟已登录）
      (mockAuthStore as any).accessToken = 'existing_token';
      (mockAuthStore as any).status = 'authenticated';

      // Act
      await authClient.logout();

      // Assert
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 边界情况
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty refresh token', async () => {
      // Arrange
      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue('');

      // Act & Assert
      await expect(authClient.refreshToken()).rejects.toThrow(
        'No refresh token available'
      );
    });

    it('should handle undefined refresh token', async () => {
      // Arrange
      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        undefined
      );

      // Act & Assert
      await expect(authClient.refreshToken()).rejects.toThrow(
        'No refresh token available'
      );
    });

    it('should handle zero expiration time in response', async () => {
      // Arrange
      const mockResponse = createMockTokenResponse({ expires_in: 0 });

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await authClient.refreshToken();

      // Assert
      expect(mockAuthStore.updateAccessToken).toHaveBeenCalledWith(
        mockResponse.access_token,
        0
      );
    });

    it('should handle very long expiration time', async () => {
      // Arrange
      const oneYearInSeconds = 365 * 24 * 60 * 60;
      const mockResponse = createMockTokenResponse({
        expires_in: oneYearInSeconds,
      });

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await authClient.refreshToken();

      // Assert
      expect(mockAuthStore.updateAccessToken).toHaveBeenCalledWith(
        mockResponse.access_token,
        oneYearInSeconds
      );
    });

    it('should handle special characters in tokens', async () => {
      // Arrange
      const specialToken = 'token.with.dots+plus/slash=equals';
      const mockResponse = createMockTokenResponse({
        access_token: specialToken,
      });

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await authClient.refreshToken();

      // Assert
      expect(mockAuthStore.updateAccessToken).toHaveBeenCalledWith(
        specialToken,
        mockResponse.expires_in
      );
    });

    it('should handle very long tokens', async () => {
      // Arrange
      const longToken = 'a'.repeat(10000);
      const mockResponse = createMockTokenResponse({
        access_token: longToken,
      });

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await authClient.refreshToken();

      // Assert
      expect(mockAuthStore.updateAccessToken).toHaveBeenCalledWith(
        longToken,
        mockResponse.expires_in
      );
    });

    it('should handle concurrent logout calls', async () => {
      // Act
      const [result1, result2, result3] = await Promise.all([
        authClient.logout(),
        authClient.logout(),
        authClient.logout(),
      ]);

      // Assert
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
      expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(3);
      expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(3);
    });

    it('should handle logout with no prior state', async () => {
      // Arrange
      (mockAuthStore as any).status = 'unauthenticated';
      (mockAuthStore as any).accessToken = null;

      // Act
      await authClient.logout();

      // Assert
      // 即使没有认证状态，也应该调用清除方法
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 集成场景
  // ==========================================================================

  describe('Integration Scenarios', () => {
    it('should simulate complete token refresh and logout cycle', async () => {
      // Step 1: Token Refresh
      const mockResponse = createMockTokenResponse();
      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      await authClient.refreshToken();

      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith(mockResponse);
      expect(mockAuthStore.updateAccessToken).toHaveBeenCalledWith(
        mockResponse.access_token,
        mockResponse.expires_in
      );

      // Step 2: Logout
      jest.clearAllMocks();
      await authClient.logout();

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
    });

    it('should handle refresh failure followed by logout', async () => {
      // Step 1: Refresh fails
      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'invalid_token'
      );
      (mockHttpClient.post as jest.Mock).mockRejectedValue(
        new Error('Unauthorized')
      );

      await expect(authClient.refreshToken()).rejects.toThrow('Unauthorized');

      // Step 2: Logout (clean up)
      jest.clearAllMocks();
      await authClient.logout();

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
    });

    it('should handle multiple refresh attempts on failure', async () => {
      // Arrange
      const mockError = new Error('Network error');
      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      // 第一次失败
      await expect(authClient.refreshToken()).rejects.toThrow('Network error');

      // 第二次失败
      await expect(authClient.refreshToken()).rejects.toThrow('Network error');

      // 第三次失败
      await expect(authClient.refreshToken()).rejects.toThrow('Network error');

      // 验证没有修改状态
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
      expect(mockAuthStore.updateAccessToken).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 构造函数验证
  // ==========================================================================

  describe('Constructor', () => {
    it('should store injected dependencies', () => {
      // Assert
      expect(authClient).toBeInstanceOf(AuthClient);
    });

    it('should work with custom dependencies', () => {
      // Arrange
      const customHttpClient = createMockHttpClient();
      const customTokenStorage = createMockTokenStorage();
      const customAuthStore = createMockAuthStore();

      // Act
      const customClient = new AuthClient({
        httpClient: customHttpClient,
        tokenStorage: customTokenStorage,
        authStore: customAuthStore,
      });

      // Assert
      expect(customClient).toBeInstanceOf(AuthClient);
    });
  });

  // ==========================================================================
  // 参数验证
  // ==========================================================================

  describe('Parameter Validation', () => {
    it('should handle empty options object in refreshToken', async () => {
      // Arrange
      const mockResponse = createMockTokenResponse();
      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await authClient.refreshToken({});

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/refresh',
        { refresh_token: 'refresh_token' },
        { skipAuth: true }
      );
    });

    it('should handle undefined options in refreshToken', async () => {
      // Arrange
      const mockResponse = createMockTokenResponse();
      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'refresh_token'
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await authClient.refreshToken(undefined);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/refresh',
        { refresh_token: 'refresh_token' },
        { skipAuth: true }
      );
    });

    it('should handle empty options object in logout', async () => {
      // Act
      await authClient.logout({});

      // Assert
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
    });

    it('should handle undefined options in logout', async () => {
      // Act
      await authClient.logout(undefined);

      // Assert
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
    });
  });
});
