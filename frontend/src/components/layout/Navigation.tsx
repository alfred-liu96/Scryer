/**
 * 导航菜单组件
 *
 * 变更说明 (Issue #151):
 * - 集成 useAuth Hook 获取认证状态
 * - 未认证时显示登录/注册按钮
 */

import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import type { NavItem, Orientation } from '@/types/layout';
import { useAuth } from '@/lib/hooks/useAuth';

interface NavigationProps {
  items: NavItem[];
  activeItemId?: string | null;
  onItemClick?: (item: NavItem) => void;
  orientation?: Orientation;
  className?: string;
  ariaLabel?: string;
}

export function Navigation({
  items,
  activeItemId = null,
  onItemClick,
  orientation = 'horizontal',
  className = '',
  ariaLabel = 'Main navigation',
}: NavigationProps) {
  // ========== 认证状态 ==========
  const { isAuthenticated } = useAuth();

  const handleClick = (item: NavItem) => {
    if (item.disabled) return;
    onItemClick?.(item);
  };

  // ========== 认证按钮渲染函数 ==========
  const renderAuthButtons = (): ReactNode => {
    if (isAuthenticated) {
      return null;
    }

    return (
      <>
        <a
          href="/login"
          className={clsx(
            'navigation-item',
            'btn-outline'
          )}
        >
          <span className="navigation-label">登录</span>
        </a>
        <a
          href="/register"
          className={clsx(
            'navigation-item',
            'btn-primary'
          )}
        >
          <span className="navigation-label">注册</span>
        </a>
      </>
    );
  };

  return (
    <nav
      className={clsx(
        'navigation',
        `navigation-${orientation}`,
        className
      )}
      aria-label={ariaLabel}
      role="navigation"
    >
      {/* 现有导航项 */}
      {items.map((item) => {
        const isActive = activeItemId === item.id;
        const isDisabled = item.disabled || false;

        return (
          <a
            key={item.id}
            href={item.href}
            className={clsx(
              'navigation-item',
              {
                'active': isActive,
                'disabled': isDisabled,
              }
            )}
            onClick={(e) => {
              e.preventDefault();
              handleClick(item);
            }}
            aria-disabled={isDisabled}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.icon && (
              <span className="navigation-icon">{item.icon}</span>
            )}
            <span className="navigation-label">{item.label}</span>
          </a>
        );
      })}

      {/* 认证按钮 */}
      {renderAuthButtons()}
    </nav>
  );
}
