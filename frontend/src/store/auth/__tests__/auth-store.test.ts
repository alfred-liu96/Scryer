/**
 * 认证 Store 单元测试
 *
 * 测试覆盖范围：
 * - 初始状态验证
 * - 用户认证流程（setAuthUser）
 * - Token 更新（updateAccessToken）
 * - 登出（clearAuth）
 * - 错误处理（setError, clearError）
 * - 状态序列化（toJSON, fromJSON）
 * - 状态重置（reset）
 * - 边界情况处理
 *
 * 目标覆盖率: >= 90%
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createAuthStore } from '../auth-store';
import type { AuthStore } from '../auth-store-types';
import type { TokenStorage } from '@/lib/storage/token-storage';
import {
  INITIAL_AUTH_STATE,
  MOCK_USER,
  MOCK_TOKEN_RESPONSE,
  MOCK_LONG_TOKEN_RESPONSE,
  MOCK_AUTH_ERROR,
  AUTHENTICATED_STATE,
  ERROR_STATE,
  SPECIAL_CHAR_USER,
  LONG_ACCESS_TOKEN,
  UNICODE_TOKEN,
} from './fixtures';
import { AuthErrorType } from '@/types/auth';

// Mock TokenStorage
const createMockTokenStorage = (): TokenStorage => ({
  setTokens: jest.fn(() => true),
  getTokens: jest.fn(() => null),
  getAccessToken: jest.fn(() => null),
  getRefreshToken: jest.fn(() => null),
  isTokenExpired: jest.fn(() => true),
  clearTokens: jest.fn(() => {}),
  hasValidTokens: jest.fn(() => false),
});

describe('Auth Store - Initial State', () => {
  let store: AuthStore;

  beforeEach(() => {
    store = createAuthStore({ persist: false });
  });

  it('should initialize with default state', () => {
    const state = store.getState();

    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.tokenExpiresAt).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isAuthenticating).toBe(false);
  });

  it('should have all actions defined', () => {
    const actions = store.getState();

    expect(typeof actions.setLoading).toBe('function');
    expect(typeof actions.setAuthUser).toBe('function');
    expect(typeof actions.updateAccessToken).toBe('function');
    expect(typeof actions.clearAuth).toBe('function');
    expect(typeof actions.setError).toBe('function');
    expect(typeof actions.clearError).toBe('function');
    expect(typeof actions.toJSON).toBe('function');
    expect(typeof actions.fromJSON).toBe('function');
    expect(typeof actions.reset).toBe('function');
  });
});

describe('Auth Store - Loading State', () => {
  let store: AuthStore;

  beforeEach(() => {
    store = createAuthStore({ persist: false });
  });

  describe('setLoading', () => {
    it('should set status to loading', () => {
      store.getState().setLoading();
      const state = store.getState();

      expect(state.status).toBe('loading');
      expect(state.isAuthenticating).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should clear existing error when setting loading', () => {
      store.getState().setError(MOCK_AUTH_ERROR);
      expect(store.getState().error).toEqual(MOCK_AUTH_ERROR);

      store.getState().setLoading();
      const state = store.getState();

      expect(state.status).toBe('loading');
      expect(state.error).toBeNull();
    });

    it('should handle multiple setLoading calls', () => {
      store.getState().setLoading();
      expect(store.getState().status).toBe('loading');

      store.getState().setLoading();
      expect(store.getState().status).toBe('loading');
    });
  });
});

describe('Auth Store - Authentication Flow', () => {
  let store: AuthStore;
  let mockTokenStorage: TokenStorage;

  beforeEach(() => {
    mockTokenStorage = createMockTokenStorage();
    store = createAuthStore({
      persist: false,
      tokenStorage: mockTokenStorage,
    });
  });

  describe('setAuthUser', () => {
    it('should set authenticated user with tokens', () => {
      const beforeTime = Date.now();

      store.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const afterTime = Date.now();
      const state = store.getState();

      expect(state.status).toBe('authenticated');
      expect(state.user).toEqual(MOCK_USER);
      expect(state.accessToken).toBe(MOCK_TOKEN_RESPONSE.access_token);
      expect(state.refreshToken).toBe(MOCK_TOKEN_RESPONSE.refresh_token);
      expect(state.isAuthenticating).toBe(false);
      expect(state.error).toBeNull();

      // 验证过期时间计算
      expect(state.tokenExpiresAt).toBeGreaterThanOrEqual(beforeTime + MOCK_TOKEN_RESPONSE.expires_in * 1000);
      expect(state.tokenExpiresAt).toBeLessThanOrEqual(afterTime + MOCK_TOKEN_RESPONSE.expires_in * 1000);

      // 验证 Token 存储同步
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith(MOCK_TOKEN_RESPONSE);
    });

    it('should clear previous error when setting auth user', () => {
      store.getState().setError(MOCK_AUTH_ERROR);
      expect(store.getState().error).toEqual(MOCK_AUTH_ERROR);

      store.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      expect(store.getState().error).toBeNull();
    });

    it('should handle multiple authentications', () => {
      store.getState().setAuthUser(
        MOCK_USER,
        'token1',
        'refresh1',
        3600
      );
      expect(store.getState().accessToken).toBe('token1');

      store.getState().setAuthUser(
        MOCK_USER,
        'token2',
        'refresh2',
        7200
      );
      const state = store.getState();

      expect(state.accessToken).toBe('token2');
      expect(state.refreshToken).toBe('refresh2');
    });

    it('should replace existing user data', () => {
      const oldUser = { ...MOCK_USER, id: 1, username: 'olduser' };
      const newUser = { ...MOCK_USER, id: 2, username: 'newuser' };

      store.getState().setAuthUser(oldUser, 'token1', 'refresh1', 3600);
      expect(store.getState().user?.username).toBe('olduser');

      store.getState().setAuthUser(newUser, 'token2', 'refresh2', 3600);
      expect(store.getState().user?.username).toBe('newuser');
    });
  });

  describe('updateAccessToken', () => {
    it('should update access token and expiration', () => {
      store.getState().setAuthUser(MOCK_USER, 'old_access', 'refresh', 3600);

      const beforeTime = Date.now();
      store.getState().updateAccessToken('new_access', 7200);
      const afterTime = Date.now();

      const state = store.getState();

      expect(state.accessToken).toBe('new_access');
      expect(state.refreshToken).toBe('refresh'); // 不变
      expect(state.user).toEqual(MOCK_USER); // 不变
      expect(state.status).toBe('authenticated'); // 不变
      expect(state.tokenExpiresAt).toBeGreaterThanOrEqual(beforeTime + 7200 * 1000);
      expect(state.tokenExpiresAt).toBeLessThanOrEqual(afterTime + 7200 * 1000);
    });

    it('should preserve other state fields', () => {
      store.getState().setAuthUser(MOCK_USER, 'old_access', 'refresh', 3600);

      store.getState().updateAccessToken('new_access', 7200);
      const state = store.getState();

      expect(state.status).toBe('authenticated');
      expect(state.isAuthenticating).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle update without prior authentication', () => {
      store.getState().updateAccessToken('new_access', 3600);
      const state = store.getState();

      expect(state.accessToken).toBe('new_access');
      expect(state.tokenExpiresAt).toBeGreaterThan(Date.now());
    });

    it('should handle multiple token updates', () => {
      store.getState().setAuthUser(MOCK_USER, 'token1', 'refresh1', 3600);

      store.getState().updateAccessToken('token2', 3600);
      expect(store.getState().accessToken).toBe('token2');

      store.getState().updateAccessToken('token3', 7200);
      expect(store.getState().accessToken).toBe('token3');
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth data', () => {
      store.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );
      expect(store.getState().status).toBe('authenticated');

      store.getState().clearAuth();
      const state = store.getState();

      expect(state.status).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.tokenExpiresAt).toBeNull();
      expect(state.isAuthenticating).toBe(false);
      expect(state.error).toBeNull();

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('should handle clear when already unauthenticated', () => {
      store.getState().clearAuth(); // 未认证状态调用
      const state = store.getState();

      expect(state.status).toBe('unauthenticated');
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('should clear error state', () => {
      store.getState().setError(MOCK_AUTH_ERROR);
      store.getState().setAuthUser(MOCK_USER, 'access', 'refresh', 3600);
      expect(store.getState().error).toBeNull(); // setAuthUser 清除错误

      store.getState().clearAuth();
      const state = store.getState();

      expect(state.error).toBeNull();
    });

    it('should clear loading state', () => {
      store.getState().setLoading();
      expect(store.getState().status).toBe('loading');

      store.getState().clearAuth();
      expect(store.getState().status).toBe('unauthenticated');
      expect(store.getState().isAuthenticating).toBe(false);
    });
  });
});

describe('Auth Store - Error Handling', () => {
  let store: AuthStore;

  beforeEach(() => {
    store = createAuthStore({ persist: false });
  });

  it('should set error and update status', () => {
    const error = {
      type: AuthErrorType.INVALID_CREDENTIALS,
      message: 'Invalid username or password',
    };

    store.getState().setError(error);
    const state = store.getState();

    expect(state.error).toEqual(error);
    expect(state.status).toBe('unauthenticated');
    expect(state.isAuthenticating).toBe(false);
  });

  it('should clear loading state when setting error', () => {
    store.getState().setLoading();
    expect(store.getState().isAuthenticating).toBe(true);

    store.getState().setError(MOCK_AUTH_ERROR);
    expect(store.getState().isAuthenticating).toBe(false);
  });

  it('should clear error', () => {
    store.getState().setError(MOCK_AUTH_ERROR);
    expect(store.getState().error).toEqual(MOCK_AUTH_ERROR);

    store.getState().clearError();
    expect(store.getState().error).toBeNull();
  });

  it('should handle error updates', () => {
    store.getState().setError({
      type: AuthErrorType.INVALID_CREDENTIALS,
      message: 'Error 1',
    });

    store.getState().setError({
      type: AuthErrorType.USER_INACTIVE,
      message: 'Error 2',
    });

    expect(store.getState().error?.message).toBe('Error 2');
    expect(store.getState().error?.type).toBe(AuthErrorType.USER_INACTIVE);
  });

  it('should handle clearing error when no error exists', () => {
    expect(store.getState().error).toBeNull();

    store.getState().clearError();
    expect(store.getState().error).toBeNull();
  });

  it('should handle error with details', () => {
    const errorWithDetails = {
      type: AuthErrorType.NETWORK_ERROR,
      message: 'Network error',
      details: { statusCode: 503 },
    };

    store.getState().setError(errorWithDetails);
    expect(store.getState().error).toEqual(errorWithDetails);
  });
});

describe('Auth Store - State Serialization', () => {
  let store: AuthStore;

  beforeEach(() => {
    store = createAuthStore({ persist: false });
  });

  describe('toJSON', () => {
    it('should serialize default state', () => {
      const json = store.getState().toJSON();

      expect(json).toEqual(INITIAL_AUTH_STATE);
    });

    it('should serialize authenticated state', () => {
      store.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const json = store.getState().toJSON();

      expect(json.status).toBe('authenticated');
      expect(json.user).toBeDefined();
      expect(json.accessToken).toBe(MOCK_TOKEN_RESPONSE.access_token);
      expect(json.refreshToken).toBe(MOCK_TOKEN_RESPONSE.refresh_token);
      expect(json.tokenExpiresAt).toBeDefined();
    });

    it('should serialize error state', () => {
      store.getState().setError(MOCK_AUTH_ERROR);

      const json = store.getState().toJSON();

      expect(json.error).toEqual(MOCK_AUTH_ERROR);
      expect(json.status).toBe('unauthenticated');
    });

    it('should serialize loading state', () => {
      store.getState().setLoading();

      const json = store.getState().toJSON();

      expect(json.status).toBe('loading');
      expect(json.isAuthenticating).toBe(true);
    });

    it('should return immutable object', () => {
      const json1 = store.getState().toJSON();
      const json2 = store.getState().toJSON();

      expect(json1).toEqual(json2);
      expect(json1).not.toBe(json2);
    });

    it('should create deep copy of user object', () => {
      store.getState().setAuthUser(
        MOCK_USER,
        'access',
        'refresh',
        3600
      );

      const json1 = store.getState().toJSON();
      const json2 = store.getState().toJSON();

      expect(json1.user).toEqual(json2.user);
      expect(json1.user).not.toBe(json2.user);
    });
  });

  describe('fromJSON', () => {
    it('should restore authenticated state', () => {
      const partialState = {
        status: 'authenticated' as const,
        user: MOCK_USER,
        accessToken: MOCK_TOKEN_RESPONSE.access_token,
        refreshToken: MOCK_TOKEN_RESPONSE.refresh_token,
      };

      store.getState().fromJSON(partialState);
      const state = store.getState();

      expect(state.status).toBe('authenticated');
      expect(state.user?.username).toBe(MOCK_USER.username);
      expect(state.accessToken).toBe(MOCK_TOKEN_RESPONSE.access_token);
    });

    it('should handle empty state object', () => {
      store.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      store.getState().fromJSON({});
      const state = store.getState();

      // 空对象不改变状态
      expect(state.status).toBe('authenticated');
      expect(state.user).toEqual(MOCK_USER);
    });

    it('should handle partial state update', () => {
      store.getState().setAuthUser(
        MOCK_USER,
        'access1',
        'refresh1',
        3600
      );

      store.getState().fromJSON({ accessToken: 'access2' });
      const state = store.getState();

      expect(state.accessToken).toBe('access2');
      expect(state.refreshToken).toBe('refresh1'); // 不变
      expect(state.user?.username).toBe(MOCK_USER.username); // 不变
    });

    it('should restore error state', () => {
      const partialState = {
        status: 'unauthenticated' as const,
        error: MOCK_AUTH_ERROR,
      };

      store.getState().fromJSON(partialState);
      const state = store.getState();

      expect(state.error).toEqual(MOCK_AUTH_ERROR);
      expect(state.status).toBe('unauthenticated');
    });

    it('should restore loading state', () => {
      const partialState = {
        status: 'loading' as const,
        isAuthenticating: true,
      };

      store.getState().fromJSON(partialState);
      const state = store.getState();

      expect(state.status).toBe('loading');
      expect(state.isAuthenticating).toBe(true);
    });

    it('should handle null user', () => {
      const partialState = {
        user: null,
      };

      store.getState().setAuthUser(
        MOCK_USER,
        'access',
        'refresh',
        3600
      );

      store.getState().fromJSON(partialState);
      expect(store.getState().user).toBeNull();
    });

    it('should handle null tokens', () => {
      const partialState = {
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
      };

      store.getState().setAuthUser(
        MOCK_USER,
        'access',
        'refresh',
        3600
      );

      store.getState().fromJSON(partialState);
      const state = store.getState();

      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.tokenExpiresAt).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      store.getState().setLoading();
      store.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      store.getState().reset();
      const state = store.getState();

      expect(state.status).toBe(INITIAL_AUTH_STATE.status);
      expect(state.user).toBe(INITIAL_AUTH_STATE.user);
      expect(state.accessToken).toBe(INITIAL_AUTH_STATE.accessToken);
      expect(state.refreshToken).toBe(INITIAL_AUTH_STATE.refreshToken);
      expect(state.tokenExpiresAt).toBe(INITIAL_AUTH_STATE.tokenExpiresAt);
      expect(state.error).toBe(INITIAL_AUTH_STATE.error);
      expect(state.isAuthenticating).toBe(INITIAL_AUTH_STATE.isAuthenticating);
    });

    it('should handle reset when already at initial state', () => {
      const beforeState = store.getState();

      store.getState().reset();
      const afterState = store.getState();

      expect(beforeState).toEqual(afterState);
    });

    it('should clear token storage on reset', () => {
      const mockTokenStorage = createMockTokenStorage();
      const storeWithMock = createAuthStore({
        persist: false,
        tokenStorage: mockTokenStorage,
      });

      storeWithMock.getState().setAuthUser(
        MOCK_USER,
        'access',
        'refresh',
        3600
      );

      storeWithMock.getState().reset();

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('should reset from error state', () => {
      store.getState().setError(MOCK_AUTH_ERROR);
      expect(store.getState().error).toEqual(MOCK_AUTH_ERROR);

      store.getState().reset();
      expect(store.getState().error).toBeNull();
    });

    it('should reset from loading state', () => {
      store.getState().setLoading();
      expect(store.getState().status).toBe('loading');

      store.getState().reset();
      expect(store.getState().status).toBe('unauthenticated');
      expect(store.getState().isAuthenticating).toBe(false);
    });
  });
});

describe('Auth Store - Edge Cases', () => {
  let store: AuthStore;

  beforeEach(() => {
    store = createAuthStore({ persist: false });
  });

  it('should handle rapid state changes', () => {
    for (let i = 0; i < 100; i++) {
      store.getState().setLoading();
      store.getState().clearError();
    }

    const state = store.getState();
    expect(state.status).toBe('loading');
    expect(state.isAuthenticating).toBe(true);
  });

  it('should handle special characters in user data', () => {
    store.getState().setAuthUser(
      SPECIAL_CHAR_USER,
      'access',
      'refresh',
      3600
    );

    expect(store.getState().user?.username).toContain('<script>');
  });

  it('should handle very long tokens', () => {
    store.getState().setAuthUser(
      MOCK_USER,
      LONG_ACCESS_TOKEN,
      'refresh',
      3600
    );

    expect(store.getState().accessToken).toBe(LONG_ACCESS_TOKEN);
    expect(store.getState().accessToken?.length).toBe(10000);
  });

  it('should handle unicode tokens', () => {
    store.getState().setAuthUser(
      MOCK_USER,
      UNICODE_TOKEN,
      'refresh',
      3600
    );

    expect(store.getState().accessToken).toBe(UNICODE_TOKEN);
  });

  it('should handle zero expiration time', () => {
    store.getState().setAuthUser(
      MOCK_USER,
      'access',
      'refresh',
      0
    );

    const expiresAt = store.getState().tokenExpiresAt;
    expect(expiresAt).toBeGreaterThanOrEqual(Date.now());
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('should handle negative expiration time (expired token)', () => {
    store.getState().setAuthUser(
      MOCK_USER,
      'access',
      'refresh',
      -1
    );

    const expiresAt = store.getState().tokenExpiresAt;
    expect(expiresAt).toBeLessThan(Date.now());
  });

  it('should handle very long expiration time', () => {
    const oneYearInSeconds = 365 * 24 * 60 * 60;

    store.getState().setAuthUser(
      MOCK_USER,
      'access',
      'refresh',
      oneYearInSeconds
    );

    const expiresAt = store.getState().tokenExpiresAt;
    expect(expiresAt).toBeGreaterThan(Date.now() + 364 * 24 * 60 * 60 * 1000);
  });

  it('should handle multiple rapid authentications', () => {
    for (let i = 0; i < 50; i++) {
      store.getState().setAuthUser(
        { ...MOCK_USER, id: i },
        `token_${i}`,
        `refresh_${i}`,
        3600
      );
    }

    expect(store.getState().user?.id).toBe(49);
    expect(store.getState().accessToken).toBe('token_49');
  });

  it('should handle switching between authenticated and error states', () => {
    store.getState().setAuthUser(MOCK_USER, 'token1', 'refresh1', 3600);
    expect(store.getState().status).toBe('authenticated');

    store.getState().setError(MOCK_AUTH_ERROR);
    expect(store.getState().status).toBe('unauthenticated');

    store.getState().setAuthUser(MOCK_USER, 'token2', 'refresh2', 3600);
    expect(store.getState().status).toBe('authenticated');
    expect(store.getState().error).toBeNull();
  });

  it('should handle setting loading while authenticated', () => {
    store.getState().setAuthUser(MOCK_USER, 'access', 'refresh', 3600);
    expect(store.getState().status).toBe('authenticated');

    store.getState().setLoading();
    expect(store.getState().status).toBe('loading');
    expect(store.getState().user).toEqual(MOCK_USER); // user 保留
  });

  it('should handle clearError after setError', () => {
    store.getState().setError(MOCK_AUTH_ERROR);
    expect(store.getState().error).toEqual(MOCK_AUTH_ERROR);

    store.getState().clearError();
    expect(store.getState().error).toBeNull();

    // 再次清除不应出错
    store.getState().clearError();
    expect(store.getState().error).toBeNull();
  });
});

describe('Auth Store - Integration Scenarios', () => {
  let store: AuthStore;
  let mockTokenStorage: TokenStorage;

  beforeEach(() => {
    mockTokenStorage = createMockTokenStorage();
    store = createAuthStore({
      persist: false,
      tokenStorage: mockTokenStorage,
    });
  });

  it('should simulate complete login flow', () => {
    // 1. 开始登录
    store.getState().setLoading();
    expect(store.getState().status).toBe('loading');

    // 2. 登录成功
    store.getState().setAuthUser(
      MOCK_USER,
      MOCK_TOKEN_RESPONSE.access_token,
      MOCK_TOKEN_RESPONSE.refresh_token,
      MOCK_TOKEN_RESPONSE.expires_in
    );

    const state = store.getState();
    expect(state.status).toBe('authenticated');
    expect(state.user).toEqual(MOCK_USER);
    expect(state.accessToken).toBe(MOCK_TOKEN_RESPONSE.access_token);
    expect(mockTokenStorage.setTokens).toHaveBeenCalledWith(MOCK_TOKEN_RESPONSE);
  });

  it('should simulate failed login flow', () => {
    // 1. 开始登录
    store.getState().setLoading();
    expect(store.getState().status).toBe('loading');

    // 2. 登录失败
    store.getState().setError(MOCK_AUTH_ERROR);

    const state = store.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.error).toEqual(MOCK_AUTH_ERROR);
    expect(state.isAuthenticating).toBe(false);
  });

  it('should simulate token refresh flow', () => {
    // 1. 用户已登录
    store.getState().setAuthUser(
      MOCK_USER,
      'old_access',
      'refresh',
      3600
    );

    // 2. Token 刷新
    const beforeUpdate = Date.now();
    store.getState().updateAccessToken('new_access', 7200);
    const afterUpdate = Date.now();

    const state = store.getState();
    expect(state.accessToken).toBe('new_access');
    expect(state.refreshToken).toBe('refresh'); // refresh token 不变
    expect(state.tokenExpiresAt).toBeGreaterThanOrEqual(beforeUpdate + 7200 * 1000);
    expect(state.tokenExpiresAt).toBeLessThanOrEqual(afterUpdate + 7200 * 1000);
  });

  it('should simulate logout flow', () => {
    // 1. 用户已登录
    store.getState().setAuthUser(
      MOCK_USER,
      MOCK_TOKEN_RESPONSE.access_token,
      MOCK_TOKEN_RESPONSE.refresh_token,
      MOCK_TOKEN_RESPONSE.expires_in
    );
    expect(store.getState().status).toBe('authenticated');

    // 2. 登出
    store.getState().clearAuth();

    const state = store.getState();
    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
  });

  it('should simulate login error recovery', () => {
    // 1. 登录失败
    store.getState().setError(MOCK_AUTH_ERROR);
    expect(store.getState().error).toEqual(MOCK_AUTH_ERROR);

    // 2. 重试登录成功
    store.getState().setAuthUser(
      MOCK_USER,
      MOCK_TOKEN_RESPONSE.access_token,
      MOCK_TOKEN_RESPONSE.refresh_token,
      MOCK_TOKEN_RESPONSE.expires_in
    );

    const state = store.getState();
    expect(state.status).toBe('authenticated');
    expect(state.error).toBeNull();
    expect(state.user).toEqual(MOCK_USER);
  });
});

describe('Auth Store - Token Storage Integration', () => {
  it('should use injected token storage', () => {
    const mockTokenStorage = createMockTokenStorage();
    const store = createAuthStore({
      persist: false,
      tokenStorage: mockTokenStorage,
    });

    store.getState().setAuthUser(
      MOCK_USER,
      MOCK_TOKEN_RESPONSE.access_token,
      MOCK_TOKEN_RESPONSE.refresh_token,
      MOCK_TOKEN_RESPONSE.expires_in
    );

    expect(mockTokenStorage.setTokens).toHaveBeenCalledTimes(1);
    expect(mockTokenStorage.setTokens).toHaveBeenCalledWith(MOCK_TOKEN_RESPONSE);
  });

  it('should clear tokens on clearAuth', () => {
    const mockTokenStorage = createMockTokenStorage();
    const store = createAuthStore({
      persist: false,
      tokenStorage: mockTokenStorage,
    });

    store.getState().setAuthUser(
      MOCK_USER,
      'access',
      'refresh',
      3600
    );
    store.getState().clearAuth();

    expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(1);
  });

  it('should clear tokens on reset', () => {
    const mockTokenStorage = createMockTokenStorage();
    const store = createAuthStore({
      persist: false,
      tokenStorage: mockTokenStorage,
    });

    store.getState().setAuthUser(
      MOCK_USER,
      'access',
      'refresh',
      3600
    );
    store.getState().reset();

    expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(1);
  });
});
