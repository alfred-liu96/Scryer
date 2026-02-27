/**
 * Tabs 标签页组件
 *
 * 功能:
 * - 支持受控和非受控模式
 * - 支持垂直和水平方向
 * - 支持禁用标签页
 * - 支持图标和徽章
 * - 支持可关闭标签页
 * - 支持标签栏位置
 */

import { cn } from '@/lib/utils';
import { type ReactNode, useState, KeyboardEvent } from 'react';

export type TabPosition = 'top' | 'bottom' | 'left' | 'right';
export type TabType = 'line' | 'card' | 'segmented';
export type TabSize = 'sm' | 'md' | 'lg';

export interface TabItem {
  /** 标签页唯一标识 */
  key: string;
  /** 标签页标题 */
  label: string;
  /** 标签页内容 */
  content?: ReactNode;
  /** 图标 */
  icon?: ReactNode;
  /** 徽章 */
  badge?: ReactNode | number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否可关闭 */
  closeable?: boolean;
  /** 自定义标签渲染 */
  renderLabel?: (item: TabItem) => ReactNode;
  /** 自定义内容渲染 */
  renderContent?: (item: TabItem) => ReactNode;
  /** 子菜单 */
  children?: TabItem[];
}

export interface TabsProps {
  /** 标签页数据 */
  items: TabItem[];
  /** 当前激活的标签页（受控） */
  activeKey?: string;
  /** 默认激活的标签页（非受控） */
  defaultActiveKey?: string;
  /** 标签栏位置 */
  tabPosition?: TabPosition;
  /** 标签页类型 */
  type?: TabType;
  /** 标签页尺寸 */
  size?: TabSize;
  /** 切换回调 */
  onChange?: (key: string) => void;
  /** 关闭回调 */
  onTabClose?: (key: string) => void;
  /** 标签栏额外内容 */
  tabBarExtraContent?: ReactNode | { left?: ReactNode; right?: ReactNode };
  /** 自定义类名 */
  className?: string;
}

export function Tabs({
  items,
  activeKey: controlledActiveKey,
  defaultActiveKey,
  tabPosition = 'top',
  type = 'line',
  size = 'md',
  onChange,
  onTabClose,
  tabBarExtraContent,
  className,
}: TabsProps) {
  // 内部状态（非受控模式）
  const [internalActiveKey, setInternalActiveKey] = useState(
    defaultActiveKey || (items.length > 0 ? items[0].key : '')
  );

  // 确定当前激活的标签页
  const activeKey = controlledActiveKey ?? internalActiveKey;

  // 找到当前激活的标签页
  const activeTab = items.find((item) => item.key === activeKey) || items[0];

  // 处理标签页点击
  const handleTabClick = (key: string) => {
    const tab = items.find((item) => item.key === key);
    if (tab?.disabled) return;

    if (controlledActiveKey === undefined) {
      setInternalActiveKey(key);
    }
    onChange?.(key);
  };

  // 处理标签页关闭
  const handleTabClose = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    onTabClose?.(key);
  };

  // 处理键盘导航
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let newIndex = index;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      newIndex = (index + 1) % items.length;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      newIndex = (index - 1 + items.length) % items.length;
      e.preventDefault();
    } else if (e.key === 'Home') {
      newIndex = 0;
      e.preventDefault();
    } else if (e.key === 'End') {
      newIndex = items.length - 1;
      e.preventDefault();
    }

    if (newIndex !== index) {
      const newTab = items[newIndex];
      if (!newTab.disabled) {
        handleTabClick(newTab.key);
        // 聚焦到新标签页
        (e.target as HTMLElement).parentElement?.children[newIndex]?.querySelector('button')?.focus();
      }
    }
  };

  // 位置样式映射
  const positionStyles: Record<string, string> = {
    top: 'tabs-top flex-col',
    bottom: 'tabs-bottom flex-col-reverse',
    left: 'tabs-left flex-row',
    right: 'tabs-right flex-row-reverse',
  };

  // 类型样式映射
  const typeStyles: Record<string, string> = {
    line: 'tabs-line border-b border-gray-200 dark:border-gray-700',
    card: 'tabs-card bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
    segmented: 'tabs-segmented bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
  };

  // 尺寸样式映射
  const sizeStyles: Record<string, string> = {
    sm: 'tabs-sm text-sm',
    md: 'tabs-md text-base',
    lg: 'tabs-lg text-lg',
  };

  // 渲染徽章
  const renderBadge = (badge: ReactNode | number) => {
    if (typeof badge === 'number') {
      return (
        <span className="ml-2 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center text-xs bg-red-500 text-white rounded-full">
          {badge > 99 ? '99+' : badge}
        </span>
      );
    }
    return <span className="ml-2">{badge}</span>;
  };

  // 渲染标签页按钮
  const renderTabButton = (item: TabItem, index: number) => {
    const isActive = item.key === activeKey;
    const isVertical = tabPosition === 'left' || tabPosition === 'right';

    const baseStyles = 'tab relative flex items-center gap-2 px-4 py-2 transition-colors';
    const activeStyles: Record<string, string> = {
      line: isVertical
        ? 'border-l-2 border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400',
      card: isActive
        ? 'bg-white dark:bg-gray-700 shadow-sm'
        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
      segmented: isActive
        ? 'bg-white dark:bg-gray-700 shadow-sm'
        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
    };

    return (
      <button
        key={item.key}
        role="tab"
        type="button"
        aria-selected={isActive}
        aria-controls={`panel-${item.key}`}
        id={`tab-${item.key}`}
        tabIndex={isActive ? 0 : -1}
        disabled={item.disabled}
        className={cn(
          baseStyles,
          activeStyles[type],
          item.disabled && 'tab-disabled opacity-50 cursor-not-allowed',
          !isActive && !item.disabled && 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
          sizeStyles[size]
        )}
        onClick={() => handleTabClick(item.key)}
        onKeyDown={(e) => handleKeyDown(e, index)}
      >
        {item.renderLabel ? (
          item.renderLabel(item)
        ) : (
          <>
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge && renderBadge(item.badge)}
            {item.closeable && (
              <span
                className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={(e) => handleTabClose(e, item.key)}
                role="button"
                aria-label={`关闭 ${item.label}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  // 渲染标签栏
  const renderTabBar = () => {
    const isVertical = tabPosition === 'left' || tabPosition === 'right';

    return (
      <div className="flex items-center">
        <div
          role="tablist"
          className={cn(
            'tabs flex',
            positionStyles[tabPosition],
            typeStyles[type],
            isVertical ? 'flex-col gap-2' : 'flex-row gap-1',
            'w-full'
          )}
        >
          {items.map((item, index) => renderTabButton(item, index))}
        </div>

        {tabBarExtraContent && (
          <div className="ml-auto">
            {typeof tabBarExtraContent === 'object' && 'left' in tabBarExtraContent ? (
              <>
                {tabBarExtraContent.left}
                {tabBarExtraContent.right}
              </>
            ) : (
              tabBarExtraContent
            )}
          </div>
        )}
      </div>
    );
  };

  // 渲染内容面板
  const renderPanel = () => {
    if (!activeTab) return null;

    const content = activeTab.renderContent
      ? activeTab.renderContent(activeTab)
      : activeTab.content;

    return (
      <div
        key={activeTab.key}
        id={`panel-${activeTab.key}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab.key}`}
        className={cn(
          'tab-panel tab-panel-enter flex-1 p-4',
          'transition-opacity duration-200'
        )}
      >
        {content}
      </div>
    );
  };

  return (
    <div className={cn('tabs flex w-full', positionStyles[tabPosition], className)}>
      {tabPosition === 'top' || tabPosition === 'left' ? (
        <>
          {renderTabBar()}
          {renderPanel()}
        </>
      ) : (
        <>
          {renderPanel()}
          {renderTabBar()}
        </>
      )}
    </div>
  );
}
