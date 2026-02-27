/**
 * 布局相关类型定义
 */

import type { ReactNode } from 'react';

/**
 * 导航项接口
 */
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  disabled?: boolean;
}

/**
 * 菜单项接口
 */
export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
}

/**
 * 布局变体类型
 */
export type LayoutVariant = 'default' | 'compact' | 'full-width';

/**
 * 侧边栏位置类型
 */
export type SidebarPosition = 'left' | 'right';

/**
 * 侧边栏断点类型
 */
export type SidebarBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

/**
 * 导航方向类型
 */
export type Orientation = 'horizontal' | 'vertical';

/**
 * 菜单位置类型
 */
export type MenuPosition = 'left' | 'right';

/**
 * 骨架屏变体类型
 */
export type SkeletonVariant = 'default' | 'list' | 'card' | 'text';

/**
 * 骨架屏动画类型
 */
export type SkeletonAnimation = 'shimmer' | 'pulse' | 'none';

/**
 * 骨架屏颜色类型
 */
export type SkeletonColor = 'gray' | 'blue' | 'slate';

/**
 * 骨架屏尺寸类型
 */
export type SkeletonSize = 'small' | 'medium' | 'large';

/**
 * 骨架屏动画速度类型
 */
export type AnimationSpeed = 'slow' | 'normal' | 'fast';
