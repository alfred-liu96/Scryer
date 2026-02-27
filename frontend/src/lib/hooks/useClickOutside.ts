/**
 * useClickOutside Hook
 *
 * 功能:
 * - 检测元素外部点击
 * - 支持多个 ref
 * - 支持自定义事件类型
 * - 支持排除特定元素
 * - 组件卸载时清理监听器
 */

import { useEffect, RefObject } from 'react';

/** useClickOutside 选项 */
export interface UseClickOutsideOptions {
  /** 事件类型 */
  eventType?: 'click' | 'mousedown' | 'mouseup' | 'touchstart';
  /** 排除的 refs（这些元素的点击不会触发 handler） */
  excludeRefs?: RefObject<HTMLElement>[];
}

export function useClickOutside(
  ref: RefObject<HTMLElement> | RefObject<HTMLElement>[],
  handler: (event: Event) => void,
  options?: UseClickOutsideOptions | string
): void {
  // 兼容旧的字符串格式和新的对象格式
  const eventType = typeof options === 'string' ? options : options?.eventType ?? 'click';
  const excludeRefs = typeof options === 'string' ? undefined : options?.excludeRefs;

  useEffect(() => {
    const listener = (event: Event) => {
      // 归一化 refs 为数组
      const refs = Array.isArray(ref) ? ref : [ref];

      // 检查点击是否在任何 ref 内部
      const isClickInside = refs.some((r) => {
        const el = r.current;
        return el && el.contains(event.target as Node);
      });

      // 检查点击是否在排除的 refs 内部
      const isClickInExcluded = excludeRefs?.some((r) => {
        const el = r.current;
        return el && el.contains(event.target as Node);
      });

      // 只有点击在外部且不在排除区域内才触发
      if (!isClickInside && !isClickInExcluded) {
        handler(event);
      }
    };

    // 在捕获阶段监听
    document.addEventListener(eventType, listener, true);

    return () => {
      document.removeEventListener(eventType, listener, true);
    };
  }, [ref, handler, eventType, excludeRefs]);
}
