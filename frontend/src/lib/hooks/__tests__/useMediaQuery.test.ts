/**
 * useMediaQuery Hook 单元测试
 *
 * 测试契约:
 * - 监听媒体查询变化
 * - 支持自定义媒体查询
 * - 正确处理初始值
 * - 组件卸载时清理监听器
 */

import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery', () => {
  const originalMatchMedia = window.matchMedia;
  const mediaQueryLists: { [key: string]: MediaQueryList } = {};

  beforeEach(() => {
    window.matchMedia = jest.fn((query: string) => {
      const mql = {
        media: query,
        matches: false,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
      mediaQueryLists[query] = mql as any;
      return mql as any;
    }) as any;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    jest.clearAllMocks();
  });

  describe('基础功能', () => {
    it('应该返回初始匹配状态', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '(min-width: 768px)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(min-width: 768px)')
      );

      expect(result.current).toBe(true);
    });

    it('应该返回 false 当不匹配时', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: false,
        media: '(min-width: 1200px)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(min-width: 1200px)')
      );

      expect(result.current).toBe(false);
    });
  });

  describe('媒体查询变化', () => {
    it('应该响应媒体查询变化', () => {
      let listener: ((event: MediaQueryListEvent) => void) | null = null;

      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: false,
        media: '(min-width: 768px)',
        addEventListener: jest.fn((event: string, callback: any) => {
          if (event === 'change') {
            listener = callback;
          }
        }),
        removeEventListener: jest.fn((event: string, callback: any) => {
          if (event === 'change' && callback === listener) {
            listener = null;
          }
        }),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(min-width: 768px)')
      );

      expect(result.current).toBe(false);

      act(() => {
        if (listener) {
          listener({ matches: true, media: '(min-width: 768px)' } as MediaQueryListEvent);
        }
      });

      expect(result.current).toBe(true);
    });

    it('应该多次响应变化', () => {
      let listener: ((event: MediaQueryListEvent) => void) | null = null;

      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: jest.fn((event: string, callback: any) => {
          if (event === 'change') {
            listener = callback;
          }
        }),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(prefers-color-scheme: dark)')
      );

      expect(result.current).toBe(false);

      act(() => {
        if (listener) {
          listener({ matches: true, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent);
        }
      });

      expect(result.current).toBe(true);

      act(() => {
        if (listener) {
          listener({ matches: false, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent);
        }
      });

      expect(result.current).toBe(false);
    });
  });

  describe('常见媒体查询', () => {
    it('应该检测暗色模式', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(prefers-color-scheme: dark)')
      );

      expect(result.current).toBe(true);
    });

    it('应该检测亮色模式', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: light)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(prefers-color-scheme: light)')
      );

      expect(result.current).toBe(false);
    });

    it('应该检测减少动画偏好', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(prefers-reduced-motion: reduce)')
      );

      expect(result.current).toBe(true);
    });

    it('应该检测最小宽度', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '(min-width: 1024px)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(min-width: 1024px)')
      );

      expect(result.current).toBe(true);
    });

    it('应该检测最大宽度', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '(max-width: 640px)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(max-width: 640px)')
      );

      expect(result.current).toBe(true);
    });

    it('应该检测方向（横屏）', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '(orientation: landscape)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(orientation: landscape)')
      );

      expect(result.current).toBe(true);
    });
  });

  describe('组件卸载', () => {
    it('应该在组件卸载时移除事件监听器', () => {
      const mql = {
        matches: false,
        media: '(min-width: 768px)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      (window.matchMedia as jest.Mock).mockReturnValue(mql);

      const { unmount } = renderHook(() =>
        useMediaQuery('(min-width: 768px)')
      );

      expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      unmount();

      expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('边界情况', () => {
    it('应该处理无效的媒体查询', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: false,
        media: 'invalid query',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('invalid query')
      );

      expect(result.current).toBe(false);
    });

    it('应该处理空字符串', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: false,
        media: '',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('')
      );

      expect(result.current).toBe(false);
    });

    it('应该处理复杂的媒体查询', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '(min-width: 768px) and (max-width: 1024px)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(min-width: 768px) and (max-width: 1024px)')
      );

      expect(result.current).toBe(true);
    });
  });

  describe('SSR 兼容性', () => {
    it('应该在 SSR 环境中返回 false', () => {
      const originalMatchMedia = window.matchMedia;
      delete (window as any).matchMedia;

      const { result } = renderHook(() =>
        useMediaQuery('(min-width: 768px)')
      );

      expect(result.current).toBe(false);

      window.matchMedia = originalMatchMedia;
    });
  });

  describe('实际应用场景', () => {
    it('应该实现响应式布局切换', () => {
      (window.matchMedia as jest.Mock).mockImplementation((query: string) => {
        return {
          matches: query === '(min-width: 768px)',
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
      });

      const { result } = renderHook(() => ({
        isDesktop: useMediaQuery('(min-width: 768px)'),
        isMobile: useMediaQuery('(max-width: 767px)'),
      }));

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
    });

    it('应该实现主题切换', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('(prefers-color-scheme: dark)')
      );

      const theme = result.current ? 'dark' : 'light';
      expect(theme).toBe('dark');
    });

    it('应该实现打印样式', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: 'print',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() =>
        useMediaQuery('print')
      );

      expect(result.current).toBe(true);
    });
  });
});
