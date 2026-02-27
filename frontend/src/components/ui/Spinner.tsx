/**
 * Spinner 加载指示器组件
 *
 * 功能:
 * - 支持不同尺寸 (xs, sm, md, lg, xl)
 * - 支持不同颜色变体
 * - 可配置加载文本
 * - 支持全屏覆盖模式
 */

import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** 尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 颜色变体 */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  /** 加载文本 */
  text?: string;
  /** 全屏模式 */
  fullscreen?: boolean;
  /** 自定义类名 */
  className?: string;
}

export function Spinner({
  size = 'md',
  color = 'primary',
  text,
  fullscreen = false,
  className,
  ...props
}: SpinnerProps) {
  // 尺寸样式映射
  const sizeStyles: Record<string, string> = {
    xs: 'spinner-xs w-4 h-4 border-2',
    sm: 'spinner-sm w-5 h-5 border-2',
    md: 'spinner-md w-6 h-6 border-3',
    lg: 'spinner-lg w-8 h-8 border-4',
    xl: 'spinner-xl w-12 h-12 border-4',
  };

  // 颜色样式映射
  const colorStyles: Record<string, string> = {
    primary: 'spinner-primary border-blue-500 border-t-transparent',
    secondary: 'spinner-secondary border-gray-500 border-t-transparent',
    success: 'spinner-success border-green-500 border-t-transparent',
    warning: 'spinner-warning border-yellow-500 border-t-transparent',
    error: 'spinner-error border-red-500 border-t-transparent',
  };

  // 全屏样式
  const fullscreenStyles = fullscreen
    ? 'spinner-fullscreen fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm'
    : 'inline-flex flex-col items-center justify-center gap-2';

  const containerStyle = fullscreen ? { position: 'fixed' as const } : undefined;

  // 动画
  const animationClass = 'animate-spin rounded-full';

  const spinnerElement = (
    <div
      className={cn(
        'spinner',
        sizeStyles[size],
        colorStyles[color],
        animationClass
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    />
  );

  if (fullscreen) {
    return (
      <div
        className={cn(fullscreenStyles, className)}
        style={containerStyle}
        {...props}
      >
        {spinnerElement}
        {text && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{text}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(fullscreenStyles, className)}
      {...props}
    >
      {spinnerElement}
      {text && <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>}
    </div>
  );
}
