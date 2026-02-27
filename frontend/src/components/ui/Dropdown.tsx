/**
 * Dropdown 下拉菜单组件
 *
 * 功能:
 * - 支持触发器自定义渲染
 * - 支持不同触发方式（点击、悬停）
 * - 支持菜单项分组
 * - 支持禁用菜单项
 * - 支持图标和快捷键显示
 * - 支持多级菜单
 */

import { cn } from '@/lib/utils';
import { type ReactNode, useState, useRef, useEffect, KeyboardEvent, cloneElement, ReactElement } from 'react';
import { useClickOutside } from '@/lib/hooks/useClickOutside';

export type DropdownPlacement = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
export type DropdownTrigger = 'click' | 'hover' | 'contextMenu';

export interface MenuItem {
  /** 菜单项唯一标识 */
  key: string;
  /** 菜单项标签 */
  label: string;
  /** 图标 */
  icon?: ReactNode;
  /** 快捷键 */
  shortcut?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 危险样式 */
  danger?: boolean;
  /** 自定义渲染 */
  renderItem?: (item: MenuItem) => ReactNode;
  /** 子菜单 */
  children?: MenuItem[];
  /** 类型 */
  type?: 'item' | 'divider' | 'group';
  /** 分组标签 */
  groupLabel?: string;
}

export interface DropdownProps {
  /** 菜单数据 */
  menu: MenuItem[];
  /** 是否打开（受控） */
  open?: boolean;
  /** 默认是否打开 */
  defaultOpen?: boolean;
  /** 触发方式 */
  trigger?: DropdownTrigger;
  /** 菜单位置 */
  placement?: DropdownPlacement;
  /** 选择回调 */
  onSelect?: (key: string, item: MenuItem) => void;
  /** 打开状态变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 点击外部是否关闭 */
  clickOutsideToClose?: boolean;
  /** 选择后是否关闭 */
  closeOnSelect?: boolean;
  /** 是否正在关闭动画 */
  isClosing?: boolean;
  /** 自定义菜单类名 */
  dropdownClassName?: string;
  /** 自定义菜单样式 */
  dropdownStyle?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
  /** 子内容（触发器） */
  children: ReactNode;
}

// 位置样式映射
const placementStyles: Record<string, string> = {
  topLeft: 'dropdown-top-left bottom-full mb-2',
  topRight: 'dropdown-top-right bottom-full mb-2 right-0',
  bottomLeft: 'dropdown-bottom-left top-full mt-2',
  bottomRight: 'dropdown-bottom-right top-full mt-2 right-0',
};

// Trigger 组件
export function DropdownTrigger({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Dropdown({
  menu,
  open: controlledOpen,
  defaultOpen = false,
  trigger = 'click',
  placement = 'bottomLeft',
  onSelect,
  onOpenChange,
  clickOutsideToClose = true,
  closeOnSelect = true,
  isClosing = false,
  dropdownClassName,
  dropdownStyle,
  className,
  children,
}: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [nestedOpenKey, setNestedOpenKey] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout>();

  // 确定当前打开状态
  const open = controlledOpen ?? internalOpen;

  // 处理打开状态变化
  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
    if (!newOpen) {
      setNestedOpenKey(null);
      setFocusedIndex(-1);
    }
  };

  // 点击外部关闭
  useClickOutside(containerRef, () => {
    if (clickOutsideToClose && open) {
      setOpen(false);
    }
  });

  // 处理触发器点击
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (trigger === 'click') {
      setOpen(!open);
    }
  };

  // 处理触发器悬停
  const handleTriggerMouseEnter = () => {
    if (trigger === 'hover') {
      hoverTimerRef.current = setTimeout(() => {
        setOpen(true);
      }, 100);
    }
  };

  const handleTriggerMouseLeave = () => {
    if (trigger === 'hover') {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      // 检查是否移到了菜单上
      setTimeout(() => {
        if (!menuRef.current?.matches(':hover')) {
          setOpen(false);
        }
      }, 100);
    }
  };

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (trigger === 'contextMenu') {
      setOpen(true);
    }
  };

  // 处理菜单项选择
  const handleSelect = (item: MenuItem) => {
    if (item.disabled) return;
    onSelect?.(item.key, item);
    if (closeOnSelect) {
      setOpen(false);
    }
  };

  // 处理键盘导航
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    const flatItems = flattenMenuItems(menu);
    const enabledItems = flatItems.filter((item) => !item.disabled);

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => {
          const nextIndex = (prev + 1) % enabledItems.length;
          return nextIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => {
          const nextIndex = (prev - 1 + enabledItems.length) % enabledItems.length;
          return nextIndex;
        });
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && enabledItems[focusedIndex]) {
          handleSelect(enabledItems[focusedIndex]);
        }
        break;
    }
  };

  // 扁平化菜单项（用于键盘导航）
  const flattenMenuItems = (items: MenuItem[]): MenuItem[] => {
    const result: MenuItem[] = [];
    items.forEach((item) => {
      if (item.type !== 'divider') {
        result.push(item);
        if (item.children) {
          result.push(...flattenMenuItems(item.children));
        }
      }
    });
    return result;
  };

  // 渲染菜单项
  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.type === 'divider') {
      return <div key={`divider-${index}`} className="menu-item-divider my-1 border-t border-gray-200 dark:border-gray-700" />;
    }

    if (item.type === 'group') {
      return (
        <div key={`group-${index}`} className="menu-group">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            {item.label}
          </div>
          {item.children?.map((child, childIndex) => renderMenuItem(child, childIndex))}
        </div>
      );
    }

    const hasChildren = item.children && item.children.length > 0;
    const isNestedOpen = nestedOpenKey === item.key;

    // 自定义渲染
    if (item.renderItem) {
      return (
        <div
          key={item.key}
          role="menuitem"
          className="px-4 py-2"
          onClick={() => !hasChildren && handleSelect(item)}
        >
          {item.renderItem(item)}
        </div>
      );
    }

    return (
      <div
        key={item.key}
        className="relative"
        onMouseEnter={() => {
          if (hasChildren) {
            setNestedOpenKey(item.key);
          }
        }}
        onMouseLeave={() => {
          if (hasChildren) {
            setNestedOpenKey(null);
          }
        }}
      >
        <div
          role="menuitem"
          tabIndex={-1}
          className={cn(
            'menu-item flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            item.disabled && 'menu-item-disabled opacity-50 cursor-not-allowed hover:bg-transparent',
            item.danger && 'menu-item-danger text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
            'outline-none focus:bg-gray-100 dark:focus:bg-gray-800'
          )}
          onClick={() => !hasChildren && handleSelect(item)}
        >
          {item.icon && <span className="menu-item-icon flex-shrink-0">{item.icon}</span>}
          <span className="menu-item-label flex-1">{item.label}</span>
          {item.shortcut && <span className="menu-item-shortcut text-xs text-gray-400">{item.shortcut}</span>}
          {hasChildren && (
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        {/* 嵌套菜单 */}
        {hasChildren && isNestedOpen && (
          <div className="absolute left-full top-0 ml-1 z-50">
            <div
              className={cn(
                'dropdown dropdown-enter',
                'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
                'py-1 min-w-[180px]',
                placementStyles['right' in placement ? placement : 'bottomLeft']
              )}
              role="menu"
            >
              {item.children?.map((child, childIndex) => renderMenuItem(child, childIndex))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染触发器
  const renderTrigger = () => {
    const child = Array.isArray(children) ? children[0] : children;
    if (!child || typeof child === 'string' || typeof child === 'number') {
      return <span ref={triggerRef as any}>{children}</span>;
    }

    const element = child as ReactElement;

    return cloneElement(element, {
      ref: triggerRef,
      onClick: (e: React.MouseEvent) => {
        handleTriggerClick(e);
        if (element.props.onClick) {
          element.props.onClick(e);
        }
      },
      onMouseEnter: handleTriggerMouseEnter,
      onMouseLeave: handleTriggerMouseLeave,
      onContextMenu: handleContextMenu,
      onKeyDown: handleKeyDown,
    });
  };

  // 过滤有效菜单项
  const validMenuItems = menu.filter((item) => item.type !== 'divider' || menu.length > 1);

  return (
    <div
      ref={containerRef}
      className={cn('dropdown relative inline-block', className)}
    >
      {renderTrigger()}

      {open && (
        <div
          ref={menuRef}
          className={cn(
            'dropdown absolute z-50',
            'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
            'py-1 min-w-[180px]',
            placementStyles[placement],
            !isClosing && 'dropdown-enter',
            isClosing && 'dropdown-exit',
            dropdownClassName
          )}
          style={dropdownStyle}
          role="menu"
          onMouseEnter={() => trigger === 'hover' && setOpen(true)}
          onMouseLeave={() => trigger === 'hover' && setOpen(false)}
        >
          {validMenuItems.length === 0 ? (
            <div className="px-4 py-2 text-gray-400 text-sm">暂无数据</div>
          ) : (
            validMenuItems.map((item, index) => renderMenuItem(item, index))
          )}
        </div>
      )}
    </div>
  );
}

Dropdown.Trigger = DropdownTrigger;
