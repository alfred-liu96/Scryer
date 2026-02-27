/**
 * Token 安全存储工具
 *
 * 职责：
 * - 封装 localStorage 操作
 * - 提供类型安全的 Token 存取接口
 * - 处理 Token 过期检查
 * - 提供 SSR 安全（服务端渲染兼容）
 */

import type { StoredTokens, TokenResponse } from '@/types/auth';

/**
 * Token 存储键名
 */
export const TOKEN_STORAGE_KEY = 'auth_tokens';

/**
 * TokenStorage 接口
 */
export interface TokenStorage {
  /**
   * 保存 Token 到 localStorage
   * @param tokens - Token 响应对象
   * @returns 保存成功返回 true
   */
  setTokens(tokens: TokenResponse): boolean;

  /**
   * 从 localStorage 读取 Token
   * @returns Token 存储对象，不存在或过期返回 null
   */
  getTokens(): StoredTokens | null;

  /**
   * 获取访问令牌
   * @returns 访问令牌，不存在返回 null
   */
  getAccessToken(): string | null;

  /**
   * 获取刷新令牌
   * @returns 刷新令牌，不存在返回 null
   */
  getRefreshToken(): string | null;

  /**
   * 检查 Token 是否过期
   * @returns 过期返回 true
   */
  isTokenExpired(): boolean;

  /**
   * 清除 Token
   */
  clearTokens(): void;

  /**
   * 检查是否有有效的 Token
   * @returns 有效返回 true
   */
  hasValidTokens(): boolean;
}

/**
 * 创建 TokenStorage 实例
 * @param storageKey - localStorage 键名（默认 TOKEN_STORAGE_KEY）
 * @returns TokenStorage 实例
 */
export function createTokenStorage(
  storageKey: string = TOKEN_STORAGE_KEY
): TokenStorage {
  // 检查 localStorage 是否可用（SSR 兼容）
  const isLocalStorageAvailable = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  };

  const available = isLocalStorageAvailable();

  return {
    setTokens(tokens: TokenResponse): boolean {
      if (!available) return false;

      try {
        const expiresAt = Date.now() + tokens.expires_in * 1000;
        const storedTokens: StoredTokens = {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
        };
        localStorage.setItem(storageKey, JSON.stringify(storedTokens));
        return true;
      } catch {
        // localStorage 可能已满或其他错误
        return false;
      }
    },

    getTokens(): StoredTokens | null {
      if (!available) return null;

      try {
        const data = localStorage.getItem(storageKey);
        if (!data) return null;

        const tokens = JSON.parse(data) as StoredTokens;

        // 验证必需字段
        if (
          !tokens ||
          typeof tokens.accessToken !== 'string' ||
          typeof tokens.refreshToken !== 'string' ||
          typeof tokens.expiresAt !== 'number'
        ) {
          return null;
        }

        // 检查是否过期（使用 <= 表示当前时刻已过期）
        if (tokens.expiresAt <= Date.now()) {
          return null;
        }

        return tokens;
      } catch {
        return null;
      }
    },

    getAccessToken(): string | null {
      const tokens = this.getTokens();
      return tokens?.accessToken ?? null;
    },

    getRefreshToken(): string | null {
      const tokens = this.getTokens();
      return tokens?.refreshToken ?? null;
    },

    isTokenExpired(): boolean {
      if (!available) return true;

      try {
        const data = localStorage.getItem(storageKey);
        if (!data) return true;

        const tokens = JSON.parse(data) as StoredTokens;
        if (!tokens || typeof tokens.expiresAt !== 'number') {
          return true;
        }

        return tokens.expiresAt <= Date.now();
      } catch {
        return true;
      }
    },

    clearTokens(): void {
      if (!available) return;
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // 忽略清除错误
      }
    },

    hasValidTokens(): boolean {
      return this.getTokens() !== null;
    },
  };
}
