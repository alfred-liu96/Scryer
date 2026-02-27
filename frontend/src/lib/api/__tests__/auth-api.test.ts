/**
 * AuthApi 单元测试
 *
 * 测试覆盖范围：
 * - login() 成功场景（验证请求发送和 Token 保存）
 * - login() 失败场景（401 错误、网络错误）
 * - register() 成功场景（验证请求发送和 Token 保存）
 * - register() 失败场景（400 错误、网络错误）
 * - refreshToken() 成功场景（验证请求发送和 Token 更新）
 * - refreshToken() 失败场景（无 refresh_token、401 错误）
 * - getCurrentUser() 成功场景（验证请求发送）
 * - getCurrentUser() 失败场景（401 错误）
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/lib/api/auth-api.ts
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// 注意：当前 auth-api.ts 尚未实现，这个 import 会导致测试失败
// 这是预期的行为（TDD Red First 原则）
// 当 task-developer 实现了 auth-api.ts 后，测试将能够正确运行
import { AuthApi } from '../auth-api';
import type { HttpClient } from '../client';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { TokenResponse, UserResponse } from '@/types/auth';

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
 * 创建 Mock TokenResponse
 */
const createMockTokenResponse = (
  overrides?: Partial<TokenResponse>
): TokenResponse => ({
  access_token: 'test_access_token',
  refresh_token: 'test_refresh_token',
  token_type: 'Bearer',
  expires_in: 3600,
  ...overrides,
});

/**
 * 创建 Mock UserResponse
 */
const createMockUserResponse = (
  overrides?: Partial<UserResponse>
): UserResponse => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

/**
 * 创建登录响应（包含 User 和 Tokens）
 * 使用嵌套结构：{ user: {...}, tokens: {...} }
 */
const createLoginResponse = () => ({
  user: createMockUserResponse(),
  tokens: createMockTokenResponse(),
});

// ============================================================================
// 测试套件
// ============================================================================

describe('AuthApi', () => {
  let mockHttpClient: HttpClient;
  let mockTokenStorage: TokenStorage;
  let authApi: AuthApi;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpClient = createMockHttpClient();
    mockTokenStorage = createMockTokenStorage();

    authApi = new AuthApi({
      httpClient: mockHttpClient,
      tokenStorage: mockTokenStorage,
    });
  });

  // ==========================================================================
  // login() - 成功场景
  // ==========================================================================

  describe('login()', () => {
    it('should login successfully and save tokens', async () => {
      // Arrange
      const username = 'testuser';
      const password = 'password123';
      const mockResponse = createLoginResponse();

      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.login(username, password);

      // Assert
      // 1. 验证 HTTP 请求参数
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { username, password },
        { skipAuth: true }
      );

      // 2. 验证保存 Token
      expect(mockTokenStorage.setTokens).toHaveBeenCalledTimes(1);
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith({
        access_token: mockResponse.tokens.access_token,
        refresh_token: mockResponse.tokens.refresh_token,
        token_type: mockResponse.tokens.token_type,
        expires_in: mockResponse.tokens.expires_in,
      });

      // 3. 验证返回值
      expect(result).toEqual(mockResponse);
    });

    it('should support email login', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const mockResponse = createLoginResponse();

      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.login(email, password);

      // Assert
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { email, password },
        { skipAuth: true }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  // ==========================================================================
  // login() - 失败场景
  // ==========================================================================

  describe('login() - Error Scenarios', () => {
    it('should handle 401 unauthorized error', async () => {
      // Arrange
      const mockError = new Error('Invalid credentials');
      (mockError as any).status = 401;

      (mockHttpClient.post as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(authApi.login('testuser', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials'
      );

      // 验证没有保存 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      // Arrange
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';

      (mockHttpClient.post as jest.Mock).mockRejectedValue(networkError);

      // Act & Assert
      await expect(authApi.login('testuser', 'password')).rejects.toThrow(
        'Network error'
      );

      // 验证没有保存 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });

    it('should handle 500 server error', async () => {
      // Arrange
      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;

      (mockHttpClient.post as jest.Mock).mockRejectedValue(serverError);

      // Act & Assert
      await expect(authApi.login('testuser', 'password')).rejects.toThrow(
        'Internal Server Error'
      );

      // 验证没有保存 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // register() - 成功场景
  // ==========================================================================

  describe('register()', () => {
    it('should register successfully and save tokens', async () => {
      // Arrange
      const username = 'newuser';
      const email = 'new@example.com';
      const password = 'password123';
      const mockResponse = createLoginResponse();

      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.register(username, email, password);

      // Assert
      // 1. 验证 HTTP 请求参数
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/register',
        { username, email, password },
        { skipAuth: true }
      );

      // 2. 验证保存 Token
      expect(mockTokenStorage.setTokens).toHaveBeenCalledTimes(1);
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith({
        access_token: mockResponse.tokens.access_token,
        refresh_token: mockResponse.tokens.refresh_token,
        token_type: mockResponse.tokens.token_type,
        expires_in: mockResponse.tokens.expires_in,
      });

      // 3. 验证返回值
      expect(result).toEqual(mockResponse);
    });
  });

  // ==========================================================================
  // register() - 失败场景
  // ==========================================================================

  describe('register() - Error Scenarios', () => {
    it('should handle 400 bad request (username already exists)', async () => {
      // Arrange
      const mockError = new Error('Username already exists');
      (mockError as any).status = 400;

      (mockHttpClient.post as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        authApi.register('existinguser', 'test@example.com', 'password123')
      ).rejects.toThrow('Username already exists');

      // 验证没有保存 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });

    it('should handle 400 bad request (email already exists)', async () => {
      // Arrange
      const mockError = new Error('Email already exists');
      (mockError as any).status = 400;

      (mockHttpClient.post as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        authApi.register('newuser', 'existing@example.com', 'password123')
      ).rejects.toThrow('Email already exists');

      // 验证没有保存 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      // Arrange
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';

      (mockHttpClient.post as jest.Mock).mockRejectedValue(networkError);

      // Act & Assert
      await expect(
        authApi.register('newuser', 'new@example.com', 'password123')
      ).rejects.toThrow('Network error');

      // 验证没有保存 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });

    it('should handle 500 server error', async () => {
      // Arrange
      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;

      (mockHttpClient.post as jest.Mock).mockRejectedValue(serverError);

      // Act & Assert
      await expect(
        authApi.register('newuser', 'new@example.com', 'password123')
      ).rejects.toThrow('Internal Server Error');

      // 验证没有保存 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // refreshToken() - 成功场景
  // ==========================================================================

  describe('refreshToken()', () => {
    it('should refresh token successfully and update tokens', async () => {
      // Arrange
      const oldRefreshToken = 'old_refresh_token';
      const mockResponse = createMockTokenResponse({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
      });

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        oldRefreshToken
      );
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.refreshToken();

      // Assert
      // 1. 验证获取旧 refresh_token
      expect(mockTokenStorage.getRefreshToken).toHaveBeenCalledTimes(1);

      // 2. 验证 HTTP 请求参数
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/refresh',
        { refresh_token: oldRefreshToken },
        { skipAuth: true }
      );

      // 3. 验证保存新 Token
      expect(mockTokenStorage.setTokens).toHaveBeenCalledTimes(1);
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith({
        access_token: mockResponse.access_token,
        refresh_token: mockResponse.refresh_token,
        token_type: mockResponse.token_type,
        expires_in: mockResponse.expires_in,
      });

      // 4. 验证返回值
      expect(result).toEqual(mockResponse);
    });
  });

  // ==========================================================================
  // refreshToken() - 失败场景
  // ==========================================================================

  describe('refreshToken() - Error Scenarios', () => {
    it('should throw error when no refresh token available', async () => {
      // Arrange
      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(null);

      // Act & Assert
      await expect(authApi.refreshToken()).rejects.toThrow(
        'No refresh token available'
      );

      // 验证没有发起 HTTP 请求
      expect(mockHttpClient.post).not.toHaveBeenCalled();

      // 验证没有保存 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });

    it('should handle 401 unauthorized error (expired refresh token)', async () => {
      // Arrange
      const mockError = new Error('Invalid refresh token');
      (mockError as any).status = 401;

      (mockTokenStorage.getRefreshToken as jest.Mock).mockReturnValue(
        'expired_token'
      );
      (mockHttpClient.post as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(authApi.refreshToken()).rejects.toThrow(
        'Invalid refresh token'
      );

      // 验证发起了请求
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // 验证没有保存无效 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
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
      await expect(authApi.refreshToken()).rejects.toThrow('Network error');

      // 验证发起了请求
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // 验证没有保存 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
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
      await expect(authApi.refreshToken()).rejects.toThrow(
        'Internal Server Error'
      );

      // 验证没有保存 Token
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getCurrentUser() - 成功场景
  // ==========================================================================

  describe('getCurrentUser()', () => {
    it('should get current user successfully', async () => {
      // Arrange
      const mockResponse = createMockUserResponse();

      (mockHttpClient.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.getCurrentUser();

      // Assert
      // 1. 验证 HTTP 请求参数
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/auth/me');

      // 2. 验证返回值
      expect(result).toEqual(mockResponse);
    });
  });

  // ==========================================================================
  // getCurrentUser() - 失败场景
  // ==========================================================================

  describe('getCurrentUser() - Error Scenarios', () => {
    it('should handle 401 unauthorized error (not authenticated)', async () => {
      // Arrange
      const mockError = new Error('Not authenticated');
      (mockError as any).status = 401;

      (mockHttpClient.get as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(authApi.getCurrentUser()).rejects.toThrow(
        'Not authenticated'
      );
    });

    it('should handle network error', async () => {
      // Arrange
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';

      (mockHttpClient.get as jest.Mock).mockRejectedValue(networkError);

      // Act & Assert
      await expect(authApi.getCurrentUser()).rejects.toThrow('Network error');
    });

    it('should handle 500 server error', async () => {
      // Arrange
      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;

      (mockHttpClient.get as jest.Mock).mockRejectedValue(serverError);

      // Act & Assert
      await expect(authApi.getCurrentUser()).rejects.toThrow(
        'Internal Server Error'
      );
    });
  });
});
