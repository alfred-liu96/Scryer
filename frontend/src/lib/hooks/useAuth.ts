/**
 * useAuth Hook - React 层认证状态管理
 *
 * 职责：
 * - 订阅 authStore 状态变化
 * - 提供便捷的认证操作方法
 * - 集成 SessionManager 实现自动刷新
 * - 保证 SSR 安全性
 *
 * @depends
 * - zustand (useStore hook)
 * - @/store/auth/auth-store (authStore)
 * - @/lib/auth/session-manager (SessionManager)
 * - @/lib/api/auth-client (AuthClient)
 * - @/lib/storage/token-storage (TokenStorage)
 */

import { useCallback, useEffect } from 'react';
import { useStore } from 'zustand';
import { authStore } from '@/store/auth/auth-store';
import type { AuthStore } from '@/store/auth/auth-store-types';
import { createSessionManager } from '@/lib/auth/session-manager';
import type { SessionManager } from '@/lib/auth/session-manager';
import { authClient } from '@/lib/api/auth-client';
import type { AuthClient, LogoutOptions } from '@/lib/api/auth-client';
import { createTokenStorage } from '@/lib/storage/token-storage';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { AuthStatus, UserResponse, AuthError, TokenResponse } from '@/types/auth';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * useAuth Hook 返回值类型
 */
export interface UseAuthResult {
  // ========== 状态查询 ==========
  /** 认证状态（'authenticated' | 'unauthenticated' | 'loading'） */
  status: AuthStatus;
  /** 当前用户信息（已认证时存在） */
  user: UserResponse | null;
  /** 是否已认证（便捷属性） */
  isAuthenticated: boolean;
  /** 是否正在认证 */
  isAuthenticating: boolean;
  /** 认证错误（如果存在） */
  error: AuthError | null;

  // ========== 操作方法 ==========
  /** 刷新访问令牌（调用 AuthClient） */
  refreshToken: () => Promise<TokenResponse>;
  /** 登出（清除认证状态） */
  logout: (options?: LogoutOptions) => Promise<void>;
  /** 清除认证错误 */
  clearError: () => void;
}

/**
 * useAuth Hook 配置选项
 */
export interface UseAuthOptions {
  /** 是否自动启动 SessionManager（默认 true） */
  autoStartSessionManager?: boolean;
  /** SessionManager 实例（可选，用于测试） */
  sessionManager?: SessionManager;
  /** AuthClient 实例（可选，用于测试） */
  authClient?: typeof authClient;
  /** AuthStore 实例（可选，用于测试） */
  authStore?: typeof authStore;
}

// ============================================================================
// SessionManager 单例管理
// ============================================================================

/**
 * 全局 SessionManager 实例（延迟初始化）
 *
 * 设计原则：
 * - 单例模式：确保整个应用只有一个 SessionManager 实例
 * - 延迟初始化：仅在首次调用时创建
 * - SSR 安全：服务端环境返回 null
 */
let sessionManagerInstance: SessionManager | null = null;

/**
 * 获取 SessionManager 单例
 *
 * @returns SessionManager 实例，SSR 环境返回 null
 */
function getSessionManager(): SessionManager | null {
  // 如果已存在实例，直接返回
  if (sessionManagerInstance) {
    return sessionManagerInstance;
  }

  // SSR 环境不创建 SessionManager
  if (typeof window === 'undefined') {
    return null;
  }

  // 创建新实例
  sessionManagerInstance = createSessionManager({
    tokenStorage: createTokenStorage(),
    authClient: authClient,
    authStore: authStore as AuthStore,
  });

  return sessionManagerInstance;
}

// ============================================================================
// useAuth Hook 实现
// ============================================================================

/**
 * useAuth Hook - React 层认证状态管理
 *
 * 功能：
 * - 订阅 authStore 状态变化，自动同步到组件
 * - 提供便捷的认证操作方法（logout、refreshToken、clearError）
 * - 集成 SessionManager 实现自动 Token 刷新
 * - 保证 SSR 安全性
 *
 * @param options - 配置选项（可选）
 * @returns UseAuthResult 认证状态与操作方法
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, user, logout } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <LoginButton />;
 *   }
 *
 *   return (
 *     <div>
 *       Welcome, {user.username}!
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth(options?: UseAuthOptions): UseAuthResult {
  const {
    autoStartSessionManager = true,
    sessionManager: customSessionManager,
    authClient: customAuthClient = authClient,
    authStore: customAuthStore = authStore,
  } = options || {};

  // 使用 Zustand 的 useStore hook 订阅 authStore
  // 这会自动在状态变化时触发组件重新渲染
  const status = useStore(customAuthStore, (state) => state.status);
  const user = useStore(customAuthStore, (state) => state.user);
  const error = useStore(customAuthStore, (state) => state.error);
  const isAuthenticating = useStore(customAuthStore, (state) => state.isAuthenticating);

  // 计算便捷属性
  const isAuthenticated = status === 'authenticated';

  // 获取 SessionManager 实例（使用自定义实例或单例）
  const sessionManager = customSessionManager ?? getSessionManager();

  // ============================================================================
  // SessionManager 生命周期管理
  // ============================================================================

  useEffect(() => {
    // 仅在浏览器环境且启用自动启动时管理 SessionManager
    if (typeof window === 'undefined') {
      return;
    }

    if (!autoStartSessionManager || !sessionManager) {
      return;
    }

    // 启动 SessionManager（开始自动刷新）
    sessionManager.start();

    // 清理函数：组件卸载时停止 SessionManager
    return () => {
      sessionManager.stop();
    };
  }, [sessionManager, autoStartSessionManager]);

  // ============================================================================
  // 操作方法
  // ============================================================================

  /**
   * 刷新访问令牌
   *
   * 直接调用 AuthClient.refreshToken()
   * 错误会向上传播，由调用者决定如何处理
   */
  const refreshToken = useCallback(async (): Promise<TokenResponse> => {
    // SSR 环境抛出错误
    if (typeof window === 'undefined') {
      throw new Error('refreshToken is not available in SSR environment');
    }

    return await customAuthClient.refreshToken();
  }, [customAuthClient]);

  /**
   * 登出（清除认证状态）
   *
   * 调用 AuthClient.logout()
   * 即使 API 失败，本地状态也会被清除
   */
  const logout = useCallback(async (options?: LogoutOptions): Promise<void> => {
    // SSR 环境静默返回
    if (typeof window === 'undefined') {
      return;
    }

    try {
      await customAuthClient.logout(options);
    } catch (err) {
      // logout API 失败不影响本地状态清除
      // AuthClient 内部已经处理了状态清除
      console.warn('Logout API failed:', err);
    }
  }, [customAuthClient]);

  /**
   * 清除认证错误
   *
   * 直接调用 authStore.clearError()
   */
  const clearError = useCallback((): void => {
    // Zustand store 的方法通过 getState() 访问
    customAuthStore.getState().clearError();
  }, [customAuthStore]);

  // ============================================================================
  // 返回值
  // ============================================================================

  return {
    // 状态查询
    status,
    user,
    isAuthenticated,
    isAuthenticating,
    error,

    // 操作方法
    refreshToken,
    logout,
    clearError,
  };
}
