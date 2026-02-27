/**
 * Toast 提示组件
 *
 * 功能:
 * - 支持不同类型 (info, success, warning, error)
 * - 支持自动关闭和手动关闭
 * - 支持位置配置
 * - 支持多个 Toast 同时显示
 * - 支持自定义时长
 */

import { cn } from '@/lib/utils';
import { type ReactNode, HTMLAttributes, useEffect, useRef, useState } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition = 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  /** Toast ID */
  id: string;
  /** 提示类型 */
  type?: ToastType;
  /** 标题 */
  title?: string;
  /** 消息内容 */
  message: string;
  /** 自动关闭时间 (ms), 0 表示不自动关闭 */
  duration?: number;
  /** 可关闭 */
  closable?: boolean;
  /** 位置 */
  position?: ToastPosition;
  /** 关闭回调 */
  onClose?: (id: string) => void;
  /** 是否正在关闭 */
  isClosing?: boolean;
  /** 自定义类名 */
  className?: string;
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

export function Toast({
  id,
  type = 'info',
  title,
  message,
  duration = 3000,
  closable = true,
  position = 'top',
  onClose,
  isClosing = false,
  className,
  ...props
}: ToastProps) {
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 处理关闭
  const handleClose = () => {
    onClose?.(id);
  };

  // 自动关闭逻辑
  useEffect(() => {
    if (duration > 0 && !isPaused && !isClosing) {
      timerRef.current = setTimeout(() => {
        handleClose();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, isPaused, isClosing, id, onClose]);

  // 变体样式映射
  const variantStyles: Record<string, string> = {
    info: 'toast-info bg-white border-l-4 border-blue-500 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    success: 'toast-success bg-white border-l-4 border-green-500 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    warning: 'toast-warning bg-white border-l-4 border-yellow-500 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    error: 'toast-error bg-white border-l-4 border-red-500 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  // 位置样式映射
  const positionStyles: Record<string, string> = {
    top: 'toast-top',
    bottom: 'toast-bottom',
    'top-left': 'toast-top-left',
    'top-right': 'toast-top-right',
    'bottom-left': 'toast-bottom-left',
    'bottom-right': 'toast-bottom-right',
  };

  // 图标颜色
  const iconColor: Record<string, string> = {
    info: 'text-blue-500',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
  };

  return (
    <div
      className={cn(
        'toast',
        variantStyles[type],
        positionStyles[position],
        'toast-enter shadow-lg rounded-md p-4 flex items-start gap-3 min-w-[300px] max-w-md',
        isClosing && 'toast-exit',
        className
      )}
      role="alert"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      {...props}
    >
      {/* 图标 */}
      <div className={cn('toast-icon flex-shrink-0 mt-0.5', iconColor[type])}>
        {icons[type]}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-semibold mb-1">{title}</div>
        )}
        <div className="text-sm break-words">
          {message}
        </div>
      </div>

      {/* 关闭按钮 */}
      {closable && (
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="关闭"
          type="button"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
