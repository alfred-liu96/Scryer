/**
 * 用户信息展示卡片组件
 *
 * 功能:
 * - 展示用户基本信息 (用户名、邮箱、注册时间、ID、状态)
 * - 提供编辑按钮切换到编辑模式
 * - 支持加载状态和骨架屏
 *
 * @module frontend/src/components/profile/UserInfoCard
 */

import type { UserResponse } from '@/types/auth';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * UserInfoCard Props
 */
export interface UserInfoCardProps {
  /** 用户信息 */
  user: UserResponse;
  /** 是否处于编辑模式 */
  isEditing?: boolean;
  /** 编辑按钮点击回调 */
  onEditClick?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 格式化日期显示
 * @param dateString - ISO 日期字符串
 * @returns 格式化后的日期字符串
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * 获取用户名首字母（用于头像占位）
 * @param username - 用户名
 * @returns 首字母（大写）
 */
function getInitial(username: string): string {
  return username.charAt(0).toUpperCase();
}

// ============================================================================
// 组件实现
// ============================================================================

/**
 * 用户信息展示卡片
 *
 * @example
 * ```tsx
 * <UserInfoCard
 *   user={authStore.user}
 *   isEditing={false}
 *   onEditClick={() => setIsEditing(true)}
 * />
 * ```
 */
export function UserInfoCard({
  user,
  isEditing = false,
  onEditClick,
  className,
}: UserInfoCardProps): JSX.Element {
  return (
    <Card className={cn('user-info-card', className)}>
      <div className="user-info-card-content">
        {/* 用户头像占位 */}
        <div className="user-avatar-placeholder" aria-hidden="true">
          <span className="user-avatar-initial">{getInitial(user.username)}</span>
        </div>

        {/* 用户信息 */}
        <div className="user-info-details">
          <div className="user-info-field">
            <span className="user-info-label">用户 ID</span>
            <span className="user-info-value" data-testid="user-id">
              {user.id}
            </span>
          </div>

          <div className="user-info-field">
            <span className="user-info-label">用户名</span>
            <span className="user-info-value" data-testid="user-username">
              {user.username}
            </span>
          </div>

          <div className="user-info-field">
            <span className="user-info-label">邮箱</span>
            <span className="user-info-value" data-testid="user-email">
              {user.email}
            </span>
          </div>

          <div className="user-info-field">
            <span className="user-info-label">注册时间</span>
            <span className="user-info-value" data-testid="user-created-at">
              {formatDate(user.created_at)}
            </span>
          </div>

          <div className="user-info-field">
            <span className="user-info-label">状态</span>
            <span className="user-info-value" data-testid="user-status">
              {user.is_active ? '活跃' : '未激活'}
            </span>
          </div>
        </div>

        {/* 编辑按钮 */}
        {!isEditing && (
          <button
            type="button"
            className="user-info-edit-btn"
            onClick={onEditClick}
            aria-label="编辑资料"
          >
            编辑资料
          </button>
        )}
      </div>
    </Card>
  );
}