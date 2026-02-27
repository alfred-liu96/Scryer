/**
 * 移动端菜单组件
 */

'use client';

import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import type { MenuItem, MenuPosition } from '@/types/layout';

interface MobileMenuProps {
  items: MenuItem[];
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  onItemClick?: (item: MenuItem) => void;
  closeOnSelect?: boolean;
  position?: MenuPosition;
  animationDuration?: number;
  className?: string;
  toggleButton?: React.ReactNode;
  renderItem?: (item: MenuItem) => React.ReactNode;
  ariaLabel?: string;
}

export function MobileMenu({
  items,
  isOpen = false,
  onToggle,
  onItemClick,
  closeOnSelect = true,
  position = 'left',
  animationDuration = 300,
  className = '',
  toggleButton,
  renderItem,
  ariaLabel = 'Mobile menu',
}: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isInternalOpen, setIsInternalOpen] = useState(false);

  // 使用受控或非受控模式
  const effectiveIsOpen = isOpen !== undefined ? isOpen : isInternalOpen;

  const handleToggle = () => {
    const newState = !effectiveIsOpen;
    if (onToggle) {
      onToggle(newState);
    } else {
      setIsInternalOpen(newState);
    }
  };

  const handleItemClick = (item: MenuItem) => {
    onItemClick?.(item);
    if (closeOnSelect) {
      if (onToggle) {
        onToggle(false);
      } else {
        setIsInternalOpen(false);
      }
    }
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (effectiveIsOpen) {
          if (onToggle) {
            onToggle(false);
          } else {
            setIsInternalOpen(false);
          }
        }
      }
    };

    if (effectiveIsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [effectiveIsOpen, onToggle]);

  // 阻止页面滚动
  useEffect(() => {
    if (effectiveIsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [effectiveIsOpen]);

  return (
    <div className="mobile-menu-container" ref={menuRef}>
      {/* 切换按钮 */}
      {toggleButton || (
        <button
          type="button"
          className={clsx('mobile-menu-toggle')}
          onClick={handleToggle}
          aria-expanded={effectiveIsOpen}
          aria-label={effectiveIsOpen ? 'Close menu' : 'Open menu'}
        >
          {effectiveIsOpen ? (
            <XMarkIcon className="w-6 h-6" data-testid="close-icon" />
          ) : (
            <Bars3Icon className="w-6 h-6" data-testid="hamburger-icon" />
          )}
        </button>
      )}

      {/* 菜单面板 */}
      {effectiveIsOpen && (
        <nav
          className={clsx(
            'mobile-menu',
            'open',
            'animate-in',
            `position-${position}`,
            className
          )}
          aria-label={ariaLabel}
          role="navigation"
          tabIndex={-1}
          style={{
            transitionDuration: `${animationDuration}ms`,
          }}
        >
          {items.map((item) => {
            if (renderItem) {
              return (
                <div key={item.id}>
                  {renderItem(item)}
                </div>
              );
            }

            return (
              <a
                key={item.id}
                href={item.href}
                className="mobile-menu-item"
                onClick={(e) => {
                  e.preventDefault();
                  handleItemClick(item);
                }}
              >
                {item.icon && (
                  <span className="mobile-menu-icon">{item.icon}</span>
                )}
                <span className="mobile-menu-label">{item.label}</span>
              </a>
            );
          })}
        </nav>
      )}
    </div>
  );
}
