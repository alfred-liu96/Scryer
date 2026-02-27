/**
 * Alert 提示消息组件
 *
 * 功能:
 * - 支持不同类型 (info, success, warning, error)
 * - 支持可关闭功能
 * - 支持标题和内容
 * - 支持图标显示
 * - 支持自动关闭（可选，悬停暂停）
 */

import { cn } from '@/lib/utils';
import { type ReactNode, HTMLAttributes, useEffect, useRef, useState } from 'react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  /** 提示类型 */
  type?: 'info' | 'success' | 'warning' | 'error';
  /** 标题 */
  title?: string;
  /** 可关闭 */
  closable?: boolean;
  /** 显示图标 */
  showIcon?: boolean;
  /** 自动关闭时间 (ms) */
  autoClose?: number;
  /** 关闭回调 */
  onClose?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 子内容 */
  children: ReactNode;
}

// 图标组件
const icons: Record<string, ReactNode> = {
  info: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
};

export function Alert({
  type = 'info',
  title,
  closable = false,
  showIcon = true,
  autoClose = 0,
  onClose,
  className,
  children,
  ...props
}: AlertProps) {
  const [visible, setVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 处理关闭
  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  // 自动关闭逻辑
  useEffect(() => {
    if (autoClose > 0 && visible && !isPaused) {
      timerRef.current = setTimeout(() => {
        handleClose();
      }, autoClose);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [autoClose, visible, isPaused]);

  // 如果不可见，返回 null
  if (!visible) {
    return null;
  }

  // 变体样式映射
  const variantStyles: Record<string, string> = {
    info: 'alert-info bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    success: 'alert-success bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    warning: 'alert-warning bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
    error: 'alert-error bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
  };

  // 图标颜色
  const iconColor: Record<string, string> = {
    info: 'text-blue-500',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
  };

  // aria-live 值
  const ariaLive = type === 'error' ? 'assertive' : 'polite';

  return (
    <div
      className={cn(
        'alert',
        variantStyles[type],
        'border rounded-lg p-4',
        'flex items-start gap-3',
        className
      )}
      role="alert"
      aria-live={ariaLive}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      {...props}
    >
      {/* 图标 */}
      {showIcon && (
        <div className={cn('alert-icon flex-shrink-0 mt-0.5', iconColor[type])}>
          {icons[type]}
        </div>
      )}

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-semibold mb-1">{title}</div>
        )}
        <div className="text-sm">
          {children}
        </div>
      </div>

      {/* 关闭按钮 */}
      {closable && (
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="关闭"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
