/**
 * useToast Hook
 *
 * 功能:
 * - 显示不同类型的 toast
 * - 支持自定义配置
 * - 支持同时显示多个 toast
 * - 支持手动关闭
 * - 支持 Promise loading 状态
 * - 支持自动关闭（定时器管理）
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ToastType, ToastPosition } from '@/components/ui/Toast';

export interface ToastOptions {
  /** Toast ID (可选，用于更新已有 toast) */
  id?: string;
  /** 提示类型 */
  type?: ToastType;
  /** 标题 */
  title?: string;
  /** 消息内容 */
  message?: string;
  /** 自动关闭时间 (ms), 0 表示不自动关闭 */
  duration?: number;
  /** 位置 */
  position?: ToastPosition;
  /** 可关闭 */
  closable?: boolean;
  /** 自定义 aria-label */
  ariaLabel?: string;
}

export interface ToastItem extends ToastOptions {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  position: ToastPosition;
  closable: boolean;
}

let toastCount = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 清理定时器
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  // 生成唯一 ID
  const generateId = useCallback(() => {
    return `toast-${++toastCount}`;
  }, []);

  // 设置自动关闭定时器
  const setAutoDismiss = useCallback((id: string, duration: number) => {
    // 清除已有定时器
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 如果 duration > 0，设置新的定时器
    if (duration > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, duration);

      timersRef.current.set(id, timer);
    }
  }, []);

  // 添加 toast
  const addToast = useCallback((options: ToastOptions): string => {
    const id = options.id || generateId();
    const duration = options.duration ?? 3000;

    setToasts((prev) => {
      // 如果是更新已有的 toast
      const existingIndex = prev.findIndex((t) => t.id === id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...options,
          id,
          message: options.message || updated[existingIndex].message,
          duration,
        };
        return updated;
      }

      // 添加新 toast
      const newToast: ToastItem = {
        id,
        type: options.type || 'info',
        message: options.message || '',
        title: options.title,
        duration,
        position: options.position || 'top',
        closable: options.closable ?? true,
        ariaLabel: options.ariaLabel,
      };
      return [...prev, newToast];
    });

    // 设置自动关闭
    setAutoDismiss(id, duration);

    return id;
  }, [generateId, setAutoDismiss]);

  // 移除 toast
  const dismiss = useCallback((id: string) => {
    // 清除定时器
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 移除所有 toast
  const dismissAll = useCallback(() => {
    // 清除所有定时器
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();

    setToasts([]);
  }, []);

  // 通用 toast 方法
  const toast = useCallback((options: ToastOptions | string) => {
    if (typeof options === 'string') {
      return addToast({ message: options });
    }
    return addToast(options);
  }, [addToast]);

  // 快捷方法
  const success = useCallback((message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => {
    return addToast({ ...options, message, type: 'success' });
  }, [addToast]);

  const error = useCallback((message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => {
    return addToast({ ...options, message, type: 'error' });
  }, [addToast]);

  const warning = useCallback((message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => {
    return addToast({ ...options, message, type: 'warning' });
  }, [addToast]);

  const info = useCallback((message: string, options?: Omit<ToastOptions, 'type' | 'message'>) => {
    return addToast({ ...options, message, type: 'info' });
  }, [addToast]);

  // Promise 处理
  const promise = useCallback(<T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    const loadingId = addToast({
      message: options.loading,
      type: 'info',
      duration: 0,
    });

    promise
      .then((data) => {
        const message = typeof options.success === 'function'
          ? options.success(data)
          : options.success;

        // 更新为成功状态
        setToasts((prev) =>
          prev.map((t) =>
            t.id === loadingId
              ? { ...t, message, type: 'success', duration: 3000 }
              : t
          )
        );

        // 设置自动关闭
        setAutoDismiss(loadingId, 3000);
      })
      .catch((err) => {
        const message = typeof options.error === 'function'
          ? options.error(err)
          : options.error;

        // 更新为错误状态
        setToasts((prev) =>
          prev.map((t) =>
            t.id === loadingId
              ? { ...t, message, type: 'error', duration: 3000 }
              : t
          )
        );

        // 设置自动关闭
        setAutoDismiss(loadingId, 3000);
      });

    return loadingId;
  }, [addToast, setAutoDismiss]);

  return {
    toasts,
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
    promise,
  };
}
