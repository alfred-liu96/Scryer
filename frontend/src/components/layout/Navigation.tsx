/**
 * 导航菜单组件
 */

import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import type { NavItem, Orientation } from '@/types/layout';

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
  const handleClick = (item: NavItem) => {
    if (item.disabled) return;
    onItemClick?.(item);
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
    </nav>
  );
}
