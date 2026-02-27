/**
 * Auth Store 测试数据 Fixtures
 *
 * 提供测试所需的 mock 数据和初始状态
 */

import type { AuthState } from '../auth-store-types';
import type { UserResponse, TokenResponse, AuthError } from '@/types/auth';
import { AuthErrorType } from '@/types/auth';

/**
 * 初始认证状态（符合 INITIAL_AUTH_STATE 定义）
 */
export const INITIAL_AUTH_STATE: AuthState = {
  status: 'unauthenticated',
  user: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  error: null,
  isAuthenticating: false,
};

/**
 * Mock 用户信息
 */
export const MOCK_USER: UserResponse = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock 用户信息（多个用户）
 */
export const MOCK_USERS: UserResponse[] = [
  {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    username: 'admin',
    email: 'admin@example.com',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    username: 'inactive_user',
    email: 'inactive@example.com',
    is_active: false,
    created_at: '2024-01-03T00:00:00Z',
  },
];

/**
 * Mock Token 响应
 */
export const MOCK_TOKEN_RESPONSE: TokenResponse = {
  access_token: 'mock_access_token_123456',
  refresh_token: 'mock_refresh_token_789012',
  token_type: 'Bearer',
  expires_in: 3600, // 1小时
};

/**
 * Mock 长期 Token 响应（用于测试不同过期时间）
 */
export const MOCK_LONG_TOKEN_RESPONSE: TokenResponse = {
  access_token: 'mock_access_token_long',
  refresh_token: 'mock_refresh_token_long',
  token_type: 'Bearer',
  expires_in: 7200, // 2小时
};

/**
 * Mock 短期 Token 响应
 */
export const MOCK_SHORT_TOKEN_RESPONSE: TokenResponse = {
  access_token: 'mock_access_token_short',
  refresh_token: 'mock_refresh_token_short',
  token_type: 'Bearer',
  expires_in: 300, // 5分钟
};

/**
 * Mock 已过期的 Token 响应
 */
export const MOCK_EXPIRED_TOKEN_RESPONSE: TokenResponse = {
  access_token: 'expired_access_token',
  refresh_token: 'expired_refresh_token',
  token_type: 'Bearer',
  expires_in: -1, // 已过期
};

/**
 * Mock 认证错误
 */
export const MOCK_AUTH_ERROR: AuthError = {
  type: AuthErrorType.INVALID_CREDENTIALS,
  message: 'Invalid username or password',
};

/**
 * Mock 用户未激活错误
 */
export const MOCK_USER_INACTIVE_ERROR: AuthError = {
  type: AuthErrorType.USER_INACTIVE,
  message: 'User account is inactive',
};

/**
 * Mock 网络错误
 */
export const MOCK_NETWORK_ERROR: AuthError = {
  type: AuthErrorType.NETWORK_ERROR,
  message: 'Network connection failed',
  details: {
    statusCode: 503,
    url: '/api/v1/auth/login',
  },
};

/**
 * Mock 未知错误
 */
export const MOCK_UNKNOWN_ERROR: AuthError = {
  type: AuthErrorType.UNKNOWN_ERROR,
  message: 'An unknown error occurred',
};

/**
 * Mock 认证状态（已认证）
 */
export const AUTHENTICATED_STATE: AuthState = {
  status: 'authenticated',
  user: MOCK_USER,
  accessToken: MOCK_TOKEN_RESPONSE.access_token,
  refreshToken: MOCK_TOKEN_RESPONSE.refresh_token,
  tokenExpiresAt: Date.now() + MOCK_TOKEN_RESPONSE.expires_in * 1000,
  error: null,
  isAuthenticating: false,
};

/**
 * Mock 加载状态
 */
export const LOADING_STATE: AuthState = {
  status: 'loading',
  user: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  error: null,
  isAuthenticating: true,
};

/**
 * Mock 错误状态
 */
export const ERROR_STATE: AuthState = {
  status: 'unauthenticated',
  user: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  error: MOCK_AUTH_ERROR,
  isAuthenticating: false,
};

/**
 * 特殊字符用户（用于测试 XSS 等场景）
 */
export const SPECIAL_CHAR_USER: UserResponse = {
  id: 999,
  username: 'user<script>alert("XSS")</script>',
  email: 'test+tag@example.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

/**
 * 长用户名用户（边界测试）
 */
export const LONG_USERNAME_USER: UserResponse = {
  id: 998,
  username: 'a'.repeat(50), // 最大长度
  email: 'long@example.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

/**
 * 超长 Token（边界测试）
 */
export const LONG_ACCESS_TOKEN = 'a'.repeat(10000);
export const LONG_REFRESH_TOKEN = 'b'.repeat(10000);

/**
 * Unicode Token（国际化测试）
 */
export const UNICODE_TOKEN = 'token你好世界🌍مرحباالعالم';
