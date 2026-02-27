/**
 * useMediaQuery Hook
 *
 * 功能:
 * - 监听媒体查询变化
 * - 支持自定义媒体查询
 * - 正确处理初始值
 * - 组件卸载时清理监听器
 * - SSR 兼容
 */

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    // SSR 兼容：在服务端返回 false
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    // SSR 兼容
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQueryList = window.matchMedia(query);

    // 设置初始值
    setMatches(mediaQueryList.matches);

    // 定义事件监听器
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 使用现代 API addEventListener
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
      return () => {
        mediaQueryList.removeEventListener('change', handleChange);
      };
    }
    // 降级到旧版 API
    else if (mediaQueryList.addListener) {
      mediaQueryList.addListener(handleChange);
      return () => {
        mediaQueryList.removeListener(handleChange);
      };
    }
  }, [query]);

  return matches;
}
