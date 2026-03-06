/**
 * 路由守卫 HOC 与工具函数
 *
 * 文件: frontend/src/lib/auth/guards.ts
 *
 * 职责：
 * - 提供高阶组件（HOC）保护需要认证的路由
 * - 检查用户认证状态，未认证时重定向到登录页
 * - 支持自定义加载组件和重定向路径
 *
 * 设计原则：
 * - 客户端优先：使用 next/router 的 useRouter()
 * - SSR 安全：添加 'use client' 指令
 * - 状态同步：通过 authStore.getState() 获取最新状态
 * - 性能优化：使用 useMemo 缓存包裹后的组件
 *
 * @depends
 * - @/store/auth/auth-store (AuthStore)
 * - next/router (useRouter)
 * - react (React, useEffect, useMemo)
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import type { AuthStore } from '@/store/auth/auth-store-types';
import { authStore } from '@/store/auth/auth-store';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 路由守卫配置选项
 */
export interface AuthGuardOptions {
  /**
   * 是否在验证时显示加载状态
   * @defaultValue true
   */
  showLoading?: boolean;

  /**
   * 自定义加载组件
   * 未提供时使用默认加载器
   */
  loadingComponent?: React.ComponentType;

  /**
   * 未认证时的重定向路径
   * @defaultValue '/login'
   */
  redirectTo?: string;

  /**
   * 自定义认证检查逻辑
   * 未提供时使用 authStore.getState().status
   */
  isAuthenticatedCheck?: () => boolean;

  /**
   * 自定义 AuthStore 实例（用于测试）
   */
  authStore?: AuthStore;
}

// ============================================================================
// 默认加载组件
// ============================================================================

/**
 * 默认加载组件
 */
const DefaultLoadingComponent: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: '#666',
      }}
    >
      Loading...
    </div>
  );
};

// ============================================================================
// withAuthGuard HOC
// ============================================================================

/**
 * withAuthGuard HOC 签名
 *
 * @template P - 被包裹组件的 Props 类型
 * @param component - 要保护的组件
 * @param options - 守卫配置选项
 * @returns 带有认证检查的组件
 *
 * @example
 * ```tsx
 * const ProtectedPage = withAuthGuard(MyComponent, {
 *   redirectTo: '/login',
 *   showLoading: true,
 * });
 * ```
 */
export function withAuthGuard<P extends object>(
  component: React.ComponentType<P>,
  options?: AuthGuardOptions
): React.ComponentType<P> {
  // 解构选项，设置默认值
  const {
    showLoading = true,
    loadingComponent: CustomLoadingComponent,
    redirectTo = '/login',
    isAuthenticatedCheck,
    authStore: customAuthStore,
  } = options ?? {};

  // 返回新的组件
  const GuardedComponent: React.ComponentType<P> = (props) => {
    const router = useRouter();
    const LoadingComponent = CustomLoadingComponent ?? DefaultLoadingComponent;

    // 使用自定义 authStore 或默认 authStore
    const store = customAuthStore ?? authStore;

    // 检查认证状态
    const checkAuthenticated = (): boolean => {
      // 使用自定义检查逻辑或默认逻辑
      if (isAuthenticatedCheck) {
        return isAuthenticatedCheck();
      }

      // 默认逻辑：检查 authStore 状态
      const state = store.getState();
      return state.status === 'authenticated';
    };

    // 处理认证状态变化
    useEffect(() => {
      const isAuthenticated = checkAuthenticated();

      if (!isAuthenticated) {
        // 未认证，重定向到登录页
        router.push(redirectTo);
      }
    }, [router]);

    // 渲染逻辑
    const isAuthenticated = checkAuthenticated();

    if (!isAuthenticated) {
      // 未认证，显示加载组件或重定向中
      if (showLoading) {
        return <LoadingComponent />;
      }
      return null;
    }

    // 已认证，渲染被包裹的组件
    return React.createElement(component, props);
  };

  // 设置显示名称（便于调试）
  const componentName =
    (component as any).displayName ?? component.name ?? 'Component';
  GuardedComponent.displayName = `withAuthGuard(${componentName})`;

  return GuardedComponent;
}

// ============================================================================
// 导出
// ============================================================================
