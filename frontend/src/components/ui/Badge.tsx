/**
 * Badge 数值徽章组件
 *
 * 功能:
 * - 支持不同颜色变体 (default, primary, success, warning, error)
 * - 支持不同尺寸 (sm, md, lg)
 * - 可选显示数量（带数值徽章）
 * - 支持圆点样式
 */

import { cn } from '@/lib/utils';
import { type ReactNode, HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** 徽章变体 */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  /** 徽章尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 数值 */
  count?: number;
  /** 最大值显示 (如: 999 显示为 99+) */
  max?: number;
  /** 圆点样式 */
  dot?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 子内容 */
  children?: ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'md',
  count,
  max = 99,
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  // 处理数值显示
  let displayCount: ReactNode = children;

  if (count !== undefined) {
    const safeCount = Math.max(0, count);
    displayCount = safeCount > max ? `${max}+` : safeCount;
  }

  // 基础样式
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full badge';

  // 变体样式映射
  const variantStyles: Record<string, string> = {
    default: 'badge-default bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    primary: 'badge-primary bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    success: 'badge-success bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    warning: 'badge-warning bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    error: 'badge-error bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };

  // 尺寸样式映射
  const sizeStyles: Record<string, string> = {
    sm: 'badge-sm px-2 py-0.5 text-xs min-w-[1.25rem]',
    md: 'badge-md px-2.5 py-0.5 text-sm min-w-[1.5rem]',
    lg: 'badge-lg px-3 py-1 text-base min-w-[1.75rem]',
  };

  // 圆点样式
  const dotStyles = dot
    ? 'badge-dot w-2 h-2 p-0 min-w-0'
    : sizeStyles[size];

  return (
    <span
      className={cn(
        baseStyles,
        variantStyles[variant],
        dotStyles,
        className
      )}
      {...props}
    >
      {dot ? null : displayCount}
    </span>
  );
}
