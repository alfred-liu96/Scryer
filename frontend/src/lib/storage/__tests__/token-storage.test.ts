/**
 * Token Storage 单元测试
 *
 * 测试覆盖范围：
 * - Token 保存与读取
 * - Token 过期检查
 * - Token 清除
 * - SSR 安全（服务端环境）
 * - 边界情况处理
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTokenStorage, TOKEN_STORAGE_KEY } from '../token-storage';
import type { TokenResponse } from '@/types/auth';
import type { StoredTokens } from '@/types/auth';

// TokenStorage 类型
type TokenStorage = ReturnType<typeof createTokenStorage>;

describe('TokenStorage', () => {
  let storage: TokenStorage;
  let mockLocalStorage: Storage;

  beforeEach(() => {
    // Mock localStorage
    const store = new Map<string, string>();

    mockLocalStorage = {
      length: 0,
      clear: jest.fn(() => store.clear()),
      getItem: jest.fn((key: string) => store.get(key) ?? null),
      setItem: jest.fn((key: string, value: string) => {
        store.set(key, value);
        mockLocalStorage.length = store.size;
      }),
      removeItem: jest.fn((key: string) => {
        store.delete(key);
        mockLocalStorage.length = store.size;
      }),
      key: jest.fn((index: number) => {
        const keys = Array.from(store.keys());
        return keys[index] ?? null;
      }),
    };

    // 替换全局 localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    storage = createTokenStorage();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setTokens', () => {
    it('should save tokens to localStorage', () => {
      const mockTokens: TokenResponse = {
        access_token: 'access123',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      const result = storage.setTokens(mockTokens);

      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        TOKEN_STORAGE_KEY,
        expect.stringContaining('access123')
      );
    });

    it('should calculate expiration timestamp correctly', () => {
      const beforeTime = Date.now();
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });
      const afterTime = Date.now();

      const saved = storage.getTokens();
      expect(saved?.expiresAt).toBeGreaterThanOrEqual(beforeTime + 3600 * 1000);
      expect(saved?.expiresAt).toBeLessThanOrEqual(afterTime + 3600 * 1000);
    });

    it('should return true on success', () => {
      const result = storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(result).toBe(true);
    });

    it('should handle token with zero expiration', () => {
      // expires_in: 0 表示立即过期，setTokens 应该返回成功
      // 但 getTokens 应该返回 null（因为已过期）
      const result = storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 0,
      });

      expect(result).toBe(true);

      const saved = storage.getTokens();
      // 立即过期的 token 不应该被取回
      expect(saved).toBeNull();
    });

    it('should handle very long expiration time', () => {
      const oneYearInSeconds = 365 * 24 * 60 * 60;
      const beforeTime = Date.now();

      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: oneYearInSeconds,
      });

      const saved = storage.getTokens();
      expect(saved?.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('getTokens', () => {
    it('should return null when no tokens exist', () => {
      const tokens = storage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should return stored tokens', () => {
      const storedData = JSON.stringify({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() + 3600000,
      });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(storedData);

      const tokens = storage.getTokens();

      expect(tokens).toEqual({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: expect.any(Number),
      });
    });

    it('should return null for expired tokens', () => {
      const expiredData = JSON.stringify({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() - 1000, // 1秒前过期
      });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(expiredData);

      const tokens = storage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should handle malformed JSON gracefully', () => {
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue('invalid json');

      const tokens = storage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should handle empty string', () => {
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue('');

      const tokens = storage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should return null for tokens exactly at expiration time', () => {
      const expiredData = JSON.stringify({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: Date.now(), // 当前时刻过期
      });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(expiredData);

      const tokens = storage.getTokens();

      // 边界情况：当前时刻应该视为已过期
      expect(tokens).toBeNull();
    });
  });

  describe('getAccessToken', () => {
    it('should return access token', () => {
      const mockTokens: TokenResponse = {
        access_token: 'access123',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: 3600,
      };
      storage.setTokens(mockTokens);

      const accessToken = storage.getAccessToken();

      expect(accessToken).toBe('access123');
    });

    it('should return null when no tokens', () => {
      const accessToken = storage.getAccessToken();
      expect(accessToken).toBeNull();
    });

    it('should return null for expired tokens', () => {
      storage.setTokens({
        access_token: 'access123',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: -1, // 已过期
      });

      const accessToken = storage.getAccessToken();
      expect(accessToken).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    it('should return refresh token', () => {
      const mockTokens: TokenResponse = {
        access_token: 'access123',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: 3600,
      };
      storage.setTokens(mockTokens);

      const refreshToken = storage.getRefreshToken();

      expect(refreshToken).toBe('refresh123');
    });

    it('should return null when no tokens', () => {
      const refreshToken = storage.getRefreshToken();
      expect(refreshToken).toBeNull();
    });

    it('should return null for expired tokens', () => {
      storage.setTokens({
        access_token: 'access123',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: -1,
      });

      const refreshToken = storage.getRefreshToken();
      expect(refreshToken).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired tokens', () => {
      const expiredData = JSON.stringify({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() - 1000,
      });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(expiredData);

      expect(storage.isTokenExpired()).toBe(true);
    });

    it('should return false for valid tokens', () => {
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(storage.isTokenExpired()).toBe(false);
    });

    it('should return true when no tokens', () => {
      expect(storage.isTokenExpired()).toBe(true);
    });

    it('should return true for tokens at exact expiration', () => {
      const expiredData = JSON.stringify({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: Date.now(),
      });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(expiredData);

      expect(storage.isTokenExpired()).toBe(true);
    });

    it('should return false for tokens expiring in future', () => {
      const futureData = JSON.stringify({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() + 1000,
      });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(futureData);

      expect(storage.isTokenExpired()).toBe(false);
    });
  });

  describe('clearTokens', () => {
    it('should remove tokens from localStorage', () => {
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      storage.clearTokens();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(TOKEN_STORAGE_KEY);
    });

    it('should handle clear when no tokens exist', () => {
      storage.clearTokens();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(TOKEN_STORAGE_KEY);
    });

    it('should clear tokens and subsequent getTokens returns null', () => {
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      storage.clearTokens();

      expect(storage.getTokens()).toBeNull();
    });
  });

  describe('hasValidTokens', () => {
    it('should return true for valid tokens', () => {
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(storage.hasValidTokens()).toBe(true);
    });

    it('should return false for expired tokens', () => {
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: -1, // 已过期
      });

      expect(storage.hasValidTokens()).toBe(false);
    });

    it('should return false when no tokens', () => {
      expect(storage.hasValidTokens()).toBe(false);
    });

    it('should return false after clearing tokens', () => {
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(storage.hasValidTokens()).toBe(true);

      storage.clearTokens();
      expect(storage.hasValidTokens()).toBe(false);
    });
  });

  describe('SSR Safety', () => {
    it('should handle missing localStorage gracefully', () => {
      // 模拟服务端环境
      const originalLocalStorage = window.localStorage;
      // @ts-ignore - 模拟服务端
      delete window.localStorage;

      const ssrStorage = createTokenStorage();
      const result = ssrStorage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      // 应该返回 false 或优雅失败，不抛出异常
      expect(result).toBe(false);

      // 恢复
      window.localStorage = originalLocalStorage;
    });

    it('should return null for getTokens when localStorage missing', () => {
      const originalLocalStorage = window.localStorage;
      // @ts-ignore - 模拟服务端
      delete window.localStorage;

      const ssrStorage = createTokenStorage();
      const tokens = ssrStorage.getTokens();

      expect(tokens).toBeNull();

      // 恢复
      window.localStorage = originalLocalStorage;
    });

    it('should return true for isTokenExpired when localStorage missing', () => {
      const originalLocalStorage = window.localStorage;
      // @ts-ignore - 模拟服务端
      delete window.localStorage;

      const ssrStorage = createTokenStorage();
      const isExpired = ssrStorage.isTokenExpired();

      expect(isExpired).toBe(true);

      // 恢复
      window.localStorage = originalLocalStorage;
    });

    it('should handle clearTokens without localStorage', () => {
      const originalLocalStorage = window.localStorage;
      // @ts-ignore - 模拟服务端
      delete window.localStorage;

      const ssrStorage = createTokenStorage();

      // 不应抛出异常
      expect(() => ssrStorage.clearTokens()).not.toThrow();

      // 恢复
      window.localStorage = originalLocalStorage;
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in tokens', () => {
      const specialTokens: TokenResponse = {
        access_token: 'access.token.with.dots+plus/slash',
        refresh_token: 'refresh!@#$%^&*()_+-=[]{}|;:\'",.<>/?`~',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      storage.setTokens(specialTokens);

      expect(storage.getAccessToken()).toBe(specialTokens.access_token);
      expect(storage.getRefreshToken()).toBe(specialTokens.refresh_token);
    });

    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000);

      storage.setTokens({
        access_token: longToken,
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(storage.getAccessToken()).toBe(longToken);
    });

    it('should handle unicode tokens', () => {
      const unicodeTokens: TokenResponse = {
        access_token: 'access你好世界🌍',
        refresh_token: 'refreshمرحباالعالم',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      storage.setTokens(unicodeTokens);

      expect(storage.getAccessToken()).toBe(unicodeTokens.access_token);
      expect(storage.getRefreshToken()).toBe(unicodeTokens.refresh_token);
    });

    it('should handle malformed stored data with missing fields', () => {
      const malformedData = JSON.stringify({
        accessToken: 'access123',
        // 缺少 refreshToken 和 expiresAt
      });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(malformedData);

      const tokens = storage.getTokens();

      // 应该返回 null 或处理得体
      expect(tokens).toBeNull();
    });

    it('should handle localStorage quota exceeded error', () => {
      (mockLocalStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const result = storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(result).toBe(false);
    });

    it('should handle multiple setTokens calls', () => {
      storage.setTokens({
        access_token: 'access1',
        refresh_token: 'refresh1',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      storage.setTokens({
        access_token: 'access2',
        refresh_token: 'refresh2',
        token_type: 'Bearer',
        expires_in: 7200,
      });

      expect(storage.getAccessToken()).toBe('access2');
      expect(storage.getRefreshToken()).toBe('refresh2');
    });
  });

  describe('Custom Storage Key', () => {
    it('should use custom storage key', () => {
      const customKey = 'custom_auth_tokens';
      const customStorage = createTokenStorage(customKey);

      customStorage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        customKey,
        expect.any(String)
      );
    });

    it('should isolate different storage instances', () => {
      const storage1 = createTokenStorage('tokens1');
      const storage2 = createTokenStorage('tokens2');

      storage1.setTokens({
        access_token: 'access1',
        refresh_token: 'refresh1',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      storage2.setTokens({
        access_token: 'access2',
        refresh_token: 'refresh2',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(storage1.getAccessToken()).toBe('access1');
      expect(storage2.getAccessToken()).toBe('access2');
    });
  });

  describe('updateAccessToken', () => {
    it('should update access token and preserve refresh token', () => {
      storage.setTokens({
        access_token: 'old_access',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      const result = storage.updateAccessToken('new_access', 7200);

      expect(result).toBe(true);
      expect(storage.getAccessToken()).toBe('new_access');
      expect(storage.getRefreshToken()).toBe('refresh123'); // 不变
      const tokens = storage.getTokens();
      expect(tokens?.expiresAt).toBeGreaterThan(Date.now() + 7000 * 1000);
    });

    it('should return false when no existing tokens', () => {
      const result = storage.updateAccessToken('new_access', 3600);
      expect(result).toBe(false);
    });

    it('should return false when localStorage unavailable', () => {
      const originalLocalStorage = window.localStorage;
      // @ts-ignore - 模拟服务端
      delete window.localStorage;

      const ssrStorage = createTokenStorage();
      const result = ssrStorage.updateAccessToken('new_access', 3600);

      expect(result).toBe(false);
      window.localStorage = originalLocalStorage;
    });

    it('should preserve refresh token across multiple updates', () => {
      storage.setTokens({
        access_token: 'access1',
        refresh_token: 'same_refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      storage.updateAccessToken('access2', 7200);
      expect(storage.getRefreshToken()).toBe('same_refresh');

      storage.updateAccessToken('access3', 10800);
      expect(storage.getRefreshToken()).toBe('same_refresh');
    });

    it('should update expiresAt timestamp correctly', () => {
      storage.setTokens({
        access_token: 'old_access',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      const beforeTime = Date.now();
      storage.updateAccessToken('new_access', 7200);
      const afterTime = Date.now();

      const tokens = storage.getTokens();
      expect(tokens?.expiresAt).toBeGreaterThanOrEqual(beforeTime + 7200 * 1000);
      expect(tokens?.expiresAt).toBeLessThanOrEqual(afterTime + 7200 * 1000);
    });

    it('should return false when localStorage write fails', () => {
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      // Mock setItem to throw error
      (mockLocalStorage.setItem as jest.Mock).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const result = storage.updateAccessToken('new_access', 3600);
      expect(result).toBe(false);
    });

    it('should handle zero expiration time', () => {
      storage.setTokens({
        access_token: 'old_access',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      const result = storage.updateAccessToken('new_access', 0);

      // 更新成功，但 token 立即过期
      expect(result).toBe(true);
      expect(storage.getAccessToken()).toBeNull(); // 立即过期
    });

    it('should handle very long expiration time', () => {
      storage.setTokens({
        access_token: 'old_access',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      const oneYearInSeconds = 365 * 24 * 60 * 60;
      const result = storage.updateAccessToken('new_access', oneYearInSeconds);

      expect(result).toBe(true);
      const tokens = storage.getTokens();
      expect(tokens?.expiresAt).toBeGreaterThan(Date.now() + 360 * 24 * 60 * 60 * 1000);
    });

    it('should work with custom storage key', () => {
      const customStorage = createTokenStorage('custom_tokens');

      customStorage.setTokens({
        access_token: 'old_access',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      const result = customStorage.updateAccessToken('new_access', 7200);

      expect(result).toBe(true);
      expect(customStorage.getAccessToken()).toBe('new_access');
      expect(customStorage.getRefreshToken()).toBe('refresh123');
    });
  });
});
