/**
 * HeaderAuth 组件
 *
 * 职责：
 * - 显示已认证用户的用户名
 * - 提供登出按钮
 * - 处理登出逻辑
 * - 根据认证状态决定是否渲染
 *
 * @depends
 * - @/lib/hooks/useAuth (useAuth Hook)
 * - @/types/auth (UserResponse, AuthStatus)
 */

import { useState } from 'react';
import type { JSX } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import type { UseAuthResult } from '@/lib/hooks/useAuth';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * HeaderAuth 组件 Props
 */
interface HeaderAuthProps {
  /**
   * 可选的 useAuth 返回值，用于测试或自定义状态
   * 如果不提供，组件内部会调用 useAuth()
   */
  authState?: UseAuthResult;
}

// ============================================================================
// 组件实现
// ============================================================================

/**
 * HeaderAuth 组件
 *
 * 功能：
 * - 已认证时显示用户名和登出按钮
 * - 未认证时不渲染任何内容
 * - 处理登出操作
 * - 支持通过 authState prop 注入状态（用于测试）
 *
 * @param props - HeaderAuthProps
 * @returns 用户信息区域 JSX 或 null
 */
export function HeaderAuth({ authState }: HeaderAuthProps): JSX.Element | null {
  // 使用提供的 authState 或调用 useAuth Hook
  // 只有在没有提供 authState 时才调用 useAuth（测试优化）
  const internalAuthState = useAuth();
  const { isAuthenticated, user, logout } = authState ?? internalAuthState;

  // 登出处理中状态（用于禁用按钮）
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 边界情况：user 为 null 时不渲染
  if (!user) {
    return null;
  }

  // 未认证时不渲染
  if (!isAuthenticated) {
    return null;
  }

  // 处理登出
  const handleLogout = async (): Promise<void> => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      // logout 内部已经处理了错误
      // 这里只做额外的错误处理（如 Toast 通知）
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // 获取显示的用户名（空字符串时使用默认值）
  const displayUsername = user.username?.trim() || '用户';

  return (
    <div className="header-auth flex items-center gap-3">
      <span className="header-auth-username text-sm font-medium text-gray-700">
        {displayUsername}
      </span>
      <button
        type="button"
        className="header-auth-logout btn btn-outline btn-sm"
        onClick={handleLogout}
        disabled={isLoggingOut}
        aria-label="登出"
      >
        登出
      </button>
    </div>
  );
}
