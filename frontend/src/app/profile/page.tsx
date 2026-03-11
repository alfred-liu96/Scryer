/**
 * 用户资料页面
 *
 * 路由: /profile
 *
 * 功能:
 * - 使用 withAuthGuard HOC 保护路由
 * - 展示用户信息卡片
 * - 支持编辑模式切换
 * - 数据加载状态处理
 *
 * @module frontend/src/app/profile/page
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { withAuthGuard } from '@/lib/auth/guards';
import { authStore } from '@/store/auth/auth-store';
import { authApi } from '@/lib/api/endpoints';
import { UserInfoCard, ProfileForm } from '@/components/profile';
import { Spinner } from '@/components/ui';
import type { UserResponse } from '@/types/auth';

// ============================================================================
// 内部页面组件 (未保护)
// ============================================================================

/**
 * 用户资料页面内部组件
 */
function ProfilePageInternal(): JSX.Element {
  // ----------------------------------------------------------------------
  // 状态管理
  // ----------------------------------------------------------------------

  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // 数据加载
  // ----------------------------------------------------------------------

  /**
   * 加载用户信息
   */
  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 从 authStore 获取用户信息
      const state = authStore.getState();
      let currentUser = state.user;

      // 如果 store 中没有用户信息，调用 API 获取
      if (!currentUser) {
        currentUser = await authApi.getCurrentUser();
      }

      setUser(currentUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载用户信息失败';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // ----------------------------------------------------------------------
  // 事件处理
  // ----------------------------------------------------------------------

  /**
   * 更新成功处理
   */
  const handleUpdateSuccess = (updatedUser: UserResponse) => {
    // 更新本地状态
    setUser(updatedUser);
    // 退出编辑模式
    setIsEditing(false);
  };

  /**
   * 更新失败处理
   */
  const handleUpdateError = (err: Error) => {
    // 错误已在 ProfileForm 组件中处理并显示
    // 这里可以添加额外的错误追踪或日志
    console.error('更新资料失败:', err);
  };

  // ----------------------------------------------------------------------
  // 渲染
  // ----------------------------------------------------------------------

  // 加载状态
  if (isLoading) {
    return (
      <div className="profile-page-loading min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="profile-page-error min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={loadUser}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    );
  }

  // 无用户数据
  if (!user) {
    return (
      <div className="profile-page-empty min-h-screen flex items-center justify-center">
        <p className="text-gray-600">无法加载用户信息</p>
      </div>
    );
  }

  return (
    <div className="profile-page min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="profile-page-title text-2xl font-bold text-gray-900 mb-8">
          个人资料
        </h1>

        {isEditing ? (
          <ProfileForm
            user={user}
            onSuccess={handleUpdateSuccess}
            onError={handleUpdateError}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <UserInfoCard
            user={user}
            isEditing={false}
            onEditClick={() => setIsEditing(true)}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 导出 (使用 withAuthGuard 保护)
// ============================================================================

/**
 * 用户资料页面 (已保护)
 */
const ProfilePage = withAuthGuard(ProfilePageInternal, {
  redirectTo: '/login',
  showLoading: true,
});

export default ProfilePage;