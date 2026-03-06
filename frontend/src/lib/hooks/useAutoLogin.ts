/**
 * 自动登录 Hook
 *
 * 文件: frontend/src/lib/hooks/useAutoLogin.ts
 *
 * 职责：
 * - 应用启动时自动验证本地存储的 Token
 * - 调用后端 API 验证 Token 有效性
 * - 更新 authStore 状态
 * - 提供 Token 过期检测与自动刷新
 *
 * 设计原则：
 * - SSR 安全：检查 typeof window !== 'undefined'
 * - 静默失败：Token 无效时不阻塞渲染，仅清除状态
 * - 单职责：不直接操作 SessionManager，仅验证 Token
 * - 防抖：使用 useRef 避免并发验证请求
 *
 * @depends
 * - @/lib/storage/token-storage (TokenStorage)
 * - @/lib/api/auth-client (AuthClient)
 * - @/store/auth/auth-store-types (AuthStore)
 * - react (useState, useEffect, useRef)
 */

import { useState, useEffect, useRef } from 'react';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { AuthStore } from '@/store/auth/auth-store-types';
import type { UserResponse } from '@/types/auth';
import { createTokenStorage } from '@/lib/storage/token-storage';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * AuthClient 接口（用于测试）
 */
interface AuthClientLike {
  validateToken?: (endpoint: string) => Promise<UserResponse>;
}

/**
 * 自动登录配置选项
 */
export interface AutoLoginOptions {
  /**
   * 是否启用自动登录
   * @defaultValue true
   */
  enabled?: boolean;

  /**
   * Token 验证 API 端点
   * @defaultValue '/api/v1/auth/me'
   */
  validateEndpoint?: string;

  /**
   * 验证失败时是否自动清除状态
   * @defaultValue true
   */
  clearOnInvalid?: boolean;

  /**
   * 自定义 TokenStorage 实例（用于测试）
   */
  tokenStorage?: TokenStorage;

  /**
   * 自定义 AuthClient 实例（用于测试）
   */
  authClient?: AuthClientLike;

  /**
   * 自定义 AuthStore 实例（用于测试）
   */
  authStore?: AuthStore;
}

/**
 * 自动登录结果
 */
export interface AutoLoginResult {
  /**
   * 是否正在验证 Token
   */
  isValidating: boolean;

  /**
   * Token 是否有效
   * - null: 尚未验证
   * - true: 验证成功
   * - false: 验证失败
   */
  isValid: boolean | null;

  /**
   * 验证过程中的错误
   */
  error: Error | null;

  /**
   * 手动触发重新验证
   */
  revalidate: () => Promise<void>;
}

// ============================================================================
// 默认值
// ============================================================================

/**
 * 默认验证端点
 */
const DEFAULT_VALIDATE_ENDPOINT = '/api/v1/auth/me';

// ============================================================================
// useAutoLogin Hook
// ============================================================================

/**
 * useAutoLogin Hook 签名
 *
 * @param options - 配置选项
 * @returns 自动登录状态与操作方法
 *
 * @example
 * ```tsx
 * function AppRoot() {
 *   const { isValidating, isValid } = useAutoLogin();
 *
 *   if (isValidating) {
 *     return <LoadingScreen />;
 *   }
 *
 *   return <MainApp />;
 * }
 * ```
 */
export function useAutoLogin(options?: AutoLoginOptions): AutoLoginResult {
  // 解构选项，设置默认值
  const {
    enabled = true,
    validateEndpoint = DEFAULT_VALIDATE_ENDPOINT,
    clearOnInvalid = true,
    tokenStorage: customTokenStorage,
    authClient: customAuthClient,
    authStore: customAuthStore,
  } = options ?? {};

  // 使用自定义实例或默认实例（延迟初始化）
  const tokenStorage = customTokenStorage ?? createTokenStorage();
  const authClient = customAuthClient;
  const authStore = customAuthStore ?? require('@/store/auth/auth-store').authStore;

  // 状态管理
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // 防抖：使用 useRef 避免并发验证请求
  const isValidatingRef = useRef<boolean>(false);

  /**
   * 验证 Token 函数
   */
  const validateToken = async (): Promise<void> => {
    // SSR 安全检查
    if (typeof window === 'undefined') {
      return;
    }

    // 防抖：如果正在验证，直接返回
    if (isValidatingRef.current) {
      return;
    }

    try {
      isValidatingRef.current = true;
      setIsValidating(true);
      setError(null);

      // 步骤 1: 从 TokenStorage 读取 Token
      const tokens = tokenStorage.getTokens();
      if (!tokens || !tokens.access_token) {
        // 没有 Token，设置验证失败
        setIsValid(false);
        return;
      }

      // 步骤 2: 调用后端 API 验证 Token
      // 使用 authClient.validateToken() 如果可用，否则使用 fetch()
      let userData: UserResponse;

      if (authClient && authClient.validateToken) {
        userData = await authClient.validateToken(validateEndpoint);
      } else {
        // 降级到直接使用 fetch()
        const response = await fetch(validateEndpoint, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // Token 无效
          if (response.status === 401) {
            setIsValid(false);
            if (clearOnInvalid) {
              authStore.clearAuth();
            }
            setError(new Error('Token is invalid or expired'));
            return;
          }

          // 其他错误
          throw new Error(`Validation failed: ${response.statusText}`);
        }

        userData = await response.json();
      }

      // 步骤 3: 更新 authStore 状态
      authStore.setAuthUser(
        userData,
        tokens.access_token,
        tokens.refresh_token ?? '',
        tokens.expires_in ?? 3600
      );

      setIsValid(true);
    } catch (err) {
      // 捕获错误
      const errorObj =
        err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      setIsValid(false);

      // 网络错误，不清除状态（可能是暂时的）
      console.error('Auto-login validation failed:', errorObj);
    } finally {
      isValidatingRef.current = false;
      setIsValidating(false);
    }
  };

  /**
   * 手动触发重新验证
   */
  const revalidate = async (): Promise<void> => {
    await validateToken();
  };

  // 组件挂载时执行自动登录
  useEffect(() => {
    if (!enabled) {
      // 未启用，跳过验证
      return;
    }

    // 执行验证
    validateToken();

    // 清理函数
    return () => {
      isValidatingRef.current = false;
    };
  }, [enabled]);

  return {
    isValidating,
    isValid,
    error,
    revalidate,
  };
}

// ============================================================================
// 导出
// ============================================================================
