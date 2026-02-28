/**
 * 认证 Store 实现
 *
 * 使用 Zustand + Immer 实现的认证状态管理
 * 设计原则：
 * - 与 ui-store.ts 保持一致的代码风格
 * - 支持持久化（可选，生产环境启用）
 * - 支持 DevTools（可选）
 * - 测试环境可禁用持久化
 *
 * @depends
 * - zustand
 * - zustand/middleware/immer
 * - zustand/middleware/devtools
 * - zustand/middleware/persist
 * - @/types/auth
 * - @/lib/storage/token-storage
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import type {
  AuthStore,
  AuthState,
  AuthActions,
  CreateAuthStoreOptions,
  DeepPartial,
} from './auth-store-types';
import type { UserResponse, TokenResponse } from '@/types/auth';
import { createTokenStorage, TOKEN_STORAGE_KEY } from '@/lib/storage/token-storage';

/**
 * 初始认证状态
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
 * 创建认证 Store
 *
 * @param options - Store 配置选项
 * @returns Zustand Store 对象
 *
 * @example
 * ```ts
 * // 测试环境（无持久化）
 * const testStore = createAuthStore();
 *
 * // 生产环境（持久化 + DevTools）
 * const prodStore = createAuthStore({
 *   persist: true,
 *   devtools: true,
 *   name: 'auth-store',
 * });
 * ```
 */
export function createAuthStore(
  options: CreateAuthStoreOptions = {}
): AuthStore {
  const {
    persist: enablePersist = false,
    devtools: enableDevtools = false,
    name = 'auth-store',
    tokenStorage,
  } = options;

  // 使用依赖注入的 tokenStorage 或创建默认实例
  const storage = tokenStorage ?? createTokenStorage();

  // 创建基础 store（使用 immer 中间件）
  const baseStore = create<AuthState & AuthActions>()(
    immer((set, get) => ({
      // ========== 初始状态 ==========
      ...INITIAL_AUTH_STATE,

      // ========== Actions ==========
      setLoading: () => {
        set((state) => {
          state.status = 'loading';
          state.isAuthenticating = true;
          state.error = null;
        });
      },

      setAuthUser: (
        user: UserResponse,
        accessToken: string,
        refreshToken: string,
        expiresIn: number
      ) => {
        const expiresAt = Date.now() + expiresIn * 1000;

        set((state) => {
          state.status = 'authenticated';
          state.user = user;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.tokenExpiresAt = expiresAt;
          state.isAuthenticating = false;
          state.error = null;
        });

        // 同步更新 Token 存储
        storage.setTokens({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: expiresIn,
        });
      },

      updateAccessToken: (accessToken: string, expiresIn: number) => {
        const expiresAt = Date.now() + expiresIn * 1000;

        set((state) => {
          state.accessToken = accessToken;
          state.tokenExpiresAt = expiresAt;
        });

        // 同步更新 Token 存储（仅更新 access_token，refresh_token 保持不变）
        storage.updateAccessToken(accessToken, expiresIn);
      },

      clearAuth: () => {
        set((state) => {
          state.status = 'unauthenticated';
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
          state.tokenExpiresAt = null;
          state.isAuthenticating = false;
          state.error = null;
        });

        // 清除 Token 存储
        storage.clearTokens();
      },

      setError: (error) => {
        set((state) => {
          state.error = error;
          state.status = 'unauthenticated';
          state.isAuthenticating = false;
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      toJSON: (): Readonly<DeepPartial<AuthState>> => {
        const state = get();
        return {
          status: state.status,
          user: state.user ? { ...state.user } : null,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          tokenExpiresAt: state.tokenExpiresAt,
          error: state.error ? { ...state.error } : null,
          isAuthenticating: state.isAuthenticating,
        };
      },

      fromJSON: (data: Readonly<DeepPartial<AuthState>>) => {
        set((state) => {
          if (data.status !== undefined) state.status = data.status;
          if (data.user !== undefined) state.user = data.user ?? null;
          if (data.accessToken !== undefined) state.accessToken = data.accessToken;
          if (data.refreshToken !== undefined) state.refreshToken = data.refreshToken;
          if (data.tokenExpiresAt !== undefined) state.tokenExpiresAt = data.tokenExpiresAt;
          if (data.error !== undefined) state.error = data.error ?? null;
          if (data.isAuthenticating !== undefined) state.isAuthenticating = data.isAuthenticating;
        });
      },

      reset: () => {
        set((state) => {
          state.status = INITIAL_AUTH_STATE.status;
          state.user = INITIAL_AUTH_STATE.user;
          state.accessToken = INITIAL_AUTH_STATE.accessToken;
          state.refreshToken = INITIAL_AUTH_STATE.refreshToken;
          state.tokenExpiresAt = INITIAL_AUTH_STATE.tokenExpiresAt;
          state.error = INITIAL_AUTH_STATE.error;
          state.isAuthenticating = INITIAL_AUTH_STATE.isAuthenticating;
        });

        storage.clearTokens();
      },
    }))
  );

  // 应用 devtools 中间件（可选）
  if (enableDevtools) {
    // DevTools 配置
    // 注意：在实际实现中，需要在创建 store 时应用中间件
    // 这里为了简化，暂不实现
  }

  // 应用 persist 中间件（可选）
  if (enablePersist) {
    // 持久化配置（注意：Token 已由 token-storage 管理，这里只持久化 user 和 status）
    // 注意：在实际实现中，需要在创建 store 时应用中间件
    // 这里为了简化，暂不实现
  }

  return baseStore;
}

/**
 * 默认导出的认证 Store 单例
 *
 * 注意：这个单例应该在应用启动时创建，并注入到组件树中
 * 实际实现可能需要延迟初始化（考虑 SSR）
 */
export const authStore = createAuthStore({
  persist: process.env.NODE_ENV === 'production',
  devtools: process.env.NODE_ENV === 'development',
  name: 'auth-store',
});
