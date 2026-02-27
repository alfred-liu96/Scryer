/**
 * useDebounce Hook 单元测试
 *
 * 测试契约:
 * - 延迟更新值
 * - 支持自定义延迟时间
 * - 支持立即执行选项
 * - 正确处理快速连续更新
 */

import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  jest.useFakeTimers();

  beforeEach(() => {
    jest.clearAllTimers();
  });

  describe('基础功能', () => {
    it('应该返回初始值', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));
      expect(result.current).toBe('initial');
    });

    it('应该在延迟后更新值', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      rerender({ value: 'updated', delay: 500 });

      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });

    it('应该使用默认延迟时间 500ms', () => {
      const { result, rerender } = renderHook((props) => useDebounce(props.value), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });
  });

  describe('快速连续更新', () => {
    it('应该只在最后一次更新后触发', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'value1', delay: 500 } }
      );

      rerender({ value: 'value2', delay: 500 });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      rerender({ value: 'value3', delay: 500 });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      rerender({ value: 'value4', delay: 500 });
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('value4');
    });

    it('应该重置计时器', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'value1', delay: 500 } }
      );

      rerender({ value: 'value2', delay: 500 });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      rerender({ value: 'value3', delay: 500 });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('value1');

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current).toBe('value3');
    });
  });

  describe('不同类型的值', () => {
    it('应该处理字符串类型', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'hello', delay: 500 } }
      );

      rerender({ value: 'world', delay: 500 });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('world');
    });

    it('应该处理数字类型', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 0, delay: 500 } }
      );

      rerender({ value: 42, delay: 500 });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe(42);
    });

    it('应该处理对象类型', () => {
      const obj1 = { name: 'Alice' };
      const obj2 = { name: 'Bob' };

      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: obj1, delay: 500 } }
      );

      rerender({ value: obj2, delay: 500 });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe(obj2);
    });

    it('应该处理数组类型', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [4, 5, 6];

      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: arr1, delay: 500 } }
      );

      rerender({ value: arr2, delay: 500 });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe(arr2);
    });

    it('应该处理 null 值', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'not null', delay: 500 } }
      );

      rerender({ value: null, delay: 500 });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe(null);
    });

    it('应该处理 undefined 值', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'defined', delay: 500 } }
      );

      rerender({ value: undefined, delay: 500 });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe(undefined);
    });
  });

  describe('组件卸载', () => {
    it('应该在组件卸载时清除定时器', () => {
      const { result, rerender, unmount } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'value1', delay: 500 } }
      );

      rerender({ value: 'value2', delay: 500 });

      unmount();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('value1');
    });
  });

  describe('边界情况', () => {
    it('应该处理零延迟', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'value1', delay: 0 } }
      );

      rerender({ value: 'value2', delay: 0 });

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current).toBe('value2');
    });

    it('应该处理非常长的延迟', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'value1', delay: 10000 } }
      );

      rerender({ value: 'value2', delay: 10000 });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current).toBe('value1');

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current).toBe('value2');
    });

    it('应该处理相同的值', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'same', delay: 500 } }
      );

      rerender({ value: 'same', delay: 500 });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('same');
    });
  });

  describe('实际应用场景', () => {
    it('应该适用于搜索输入场景', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: '', delay: 300 } }
      );

      rerender({ value: 'a', delay: 300 });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: 'ap', delay: 300 });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: 'app', delay: 300 });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: 'apple', delay: 300 });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('apple');
    });
  });
});
