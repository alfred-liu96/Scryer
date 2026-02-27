/**
 * Modal 模态框组件
 *
 * 功能:
 * - 支持不同尺寸 (sm, md, lg, xl, full)
 * - 支持自定义头部、内容、底部
 * - 支持点击遮罩关闭
 * - 支持 ESC 键关闭
 * - 支持嵌套模态框
 * - 支持禁用滚动
 */

import { cn } from '@/lib/utils';
import { type ReactNode, HTMLAttributes, useEffect, useRef, useState } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题 */
  title?: string;
  /** 自定义头部 */
  header?: ReactNode;
  /** 自定义底部 */
  footer?: ReactNode;
  /** 尺寸 */
  size?: ModalSize;
  /** 可关闭（显示关闭按钮） */
  closable?: boolean;
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean;
  /** ESC 键是否关闭 */
  keyboard?: boolean;
  /** 打开后的回调 */
  afterOpen?: () => void;
  /** 关闭前的回调（返回 false 可阻止关闭） */
  beforeClose?: () => boolean | Promise<boolean>;
  /** 自动聚焦 */
  autoFocus?: boolean;
  /** 是否正在关闭动画 */
  isClosing?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 子内容 */
  children: ReactNode;
}

// 模态框堆栈管理
const modalStack: number[] = [];
let modalCounter = 0;

export function Modal({
  open,
  onClose,
  title,
  header,
  footer,
  size = 'md',
  closable = true,
  maskClosable = true,
  keyboard = true,
  afterOpen,
  beforeClose,
  autoFocus = true,
  isClosing = false,
  className,
  children,
  ...props
}: ModalProps) {
  const [modalId] = useState(() => ++modalCounter);
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理打开
  useEffect(() => {
    if (open) {
      modalStack.push(modalId);

      // 禁用背景滚动
      if (modalStack.length === 1) {
        document.body.style.overflow = 'hidden';
      }

      // 自动聚焦到第一个可聚焦元素或容器
      if (autoFocus) {
        setTimeout(() => {
          if (containerRef.current) {
            // 查找第一个可聚焦元素
            const focusableElements = containerRef.current.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstFocusable = focusableElements[0] as HTMLElement;
            if (firstFocusable) {
              firstFocusable.focus();
            } else {
              containerRef.current.focus();
            }
          }
        }, 0);
      }

      afterOpen?.();
    }

    return () => {
      const index = modalStack.indexOf(modalId);
      if (index > -1) {
        modalStack.splice(index, 1);
      }

      // 恢复背景滚动
      if (modalStack.length === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [open, modalId, autoFocus, afterOpen]);

  // 焦点陷阱
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  // 处理 ESC 键
  useEffect(() => {
    if (!open || !keyboard) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === modalId) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, keyboard, modalId]);

  // 处理关闭
  const handleClose = async () => {
    if (beforeClose) {
      const canClose = await beforeClose();
      if (!canClose) return;
    }
    onClose();
  };

  // 处理遮罩点击
  const handleMaskClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && maskClosable) {
      handleClose();
    }
  };

  // 计算 z-index
  const zIndex = 1000 + modalStack.indexOf(modalId);

  // 尺寸样式映射
  const sizeStyles: Record<string, string> = {
    sm: 'modal-sm max-w-sm',
    md: 'modal-md max-w-md',
    lg: 'modal-lg max-w-2xl',
    xl: 'modal-xl max-w-4xl',
    full: 'modal-full max-w-full h-full m-0 rounded-none',
  };

  // 如果不打开，返回 null
  if (!open) return null;

  return (
    <div
      className="modal fixed inset-0 z-50 flex"
      style={{ zIndex }}
    >
      {/* 遮罩层 */}
      <div
        className={cn(
          'modal-overlay absolute inset-0 bg-black/50 backdrop-blur-sm',
          'transition-opacity duration-300',
          isClosing ? 'opacity-0' : 'opacity-100'
        )}
        onClick={handleMaskClick}
      />

      {/* 模态框容器 */}
      <div
        ref={containerRef}
        className={cn(
          'modal-container relative',
          'm-auto flex flex-col',
          'bg-white dark:bg-gray-800',
          'rounded-lg shadow-xl',
          sizeStyles[size],
          'w-full',
          'transition-all duration-300',
          isClosing ? 'modal-exit scale-95 opacity-0' : 'modal-enter scale-100 opacity-100',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `modal-title-${modalId}` : undefined}
        tabIndex={-1}
        {...props}
      >
        {/* 头部 */}
        {(title || header || closable) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            {header ? (
              <>{header}</>
            ) : title ? (
              <h2
                id={`modal-title-${modalId}`}
                className="text-xl font-semibold text-gray-900 dark:text-gray-100"
              >
                {title}
              </h2>
            ) : null}

            {closable && (
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="关闭"
                type="button"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 内容 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>

        {/* 底部 */}
        {footer && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
