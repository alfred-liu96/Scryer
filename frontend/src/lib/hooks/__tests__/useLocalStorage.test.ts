/**
 * useLocalStorage Hook 单元测试
 *
 * 测试契约:
 * - 同步 localStorage 状态
 * - 支持自定义序列化/反序列化
 * - 支持默认值
 * - 正确处理更新和删除
 */

import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  const localStorageKey = 'test-key';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('基础功能', () => {
    it('应该返回初始值', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 'initial')
      );

      expect(result.current[0]).toBe('initial');
    });

    it('应该从 localStorage 读取已有值', () => {
      localStorage.setItem(localStorageKey, JSON.stringify('stored'));

      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 'default')
      );

      expect(result.current[0]).toBe('stored');
    });

    it('应该更新 localStorage 和 state', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 'initial')
      );

      act(() => {
        const setValue = result.current[1];
        setValue('updated');
      });

      expect(result.current[0]).toBe('updated');
      expect(localStorage.getItem(localStorageKey)).toBe(JSON.stringify('updated'));
    });

    it('应该支持函数式更新', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 0)
      );

      act(() => {
        const setValue = result.current[1];
        setValue((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(1);
    });
  });

  describe('不同类型的值', () => {
    it('应该处理字符串类型', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, '')
      );

      act(() => {
        const setValue = result.current[1];
        setValue('hello');
      });

      expect(result.current[0]).toBe('hello');
      expect(localStorage.getItem(localStorageKey)).toBe(JSON.stringify('hello'));
    });

    it('应该处理数字类型', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 0)
      );

      act(() => {
        const setValue = result.current[1];
        setValue(42);
      });

      expect(result.current[0]).toBe(42);
      expect(localStorage.getItem(localStorageKey)).toBe(JSON.stringify(42));
    });

    it('应该处理布尔类型', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, false)
      );

      act(() => {
        const setValue = result.current[1];
        setValue(true);
      });

      expect(result.current[0]).toBe(true);
      expect(localStorage.getItem(localStorageKey)).toBe(JSON.stringify(true));
    });

    it('应该处理对象类型', () => {
      const obj = { name: 'Alice', age: 30 };
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, null)
      );

      act(() => {
        const setValue = result.current[1];
        setValue(obj);
      });

      expect(result.current[0]).toEqual(obj);
      expect(localStorage.getItem(localStorageKey)).toBe(JSON.stringify(obj));
    });

    it('应该处理数组类型', () => {
      const arr = [1, 2, 3];
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, [])
      );

      act(() => {
        const setValue = result.current[1];
        setValue(arr);
      });

      expect(result.current[0]).toEqual(arr);
      expect(localStorage.getItem(localStorageKey)).toBe(JSON.stringify(arr));
    });

    it('应该处理 null 值', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 'default')
      );

      act(() => {
        const setValue = result.current[1];
        setValue(null);
      });

      expect(result.current[0]).toBe(null);
      expect(localStorage.getItem(localStorageKey)).toBe(JSON.stringify(null));
    });

    it('应该处理 undefined 值', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 'default')
      );

      act(() => {
        const setValue = result.current[1];
        setValue(undefined);
      });

      // undefined 会被存储为字符串 "undefined"（JSON.stringify 的行为）
      expect(result.current[0]).toBe(undefined);
      expect(localStorage.getItem(localStorageKey)).toBe('undefined');
    });
  });

  describe('删除功能', () => {
    it('应该提供删除方法', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 'initial')
      );

      act(() => {
        const removeValue = result.current[2];
        removeValue();
      });

      expect(result.current[0]).toBe('initial');
      expect(localStorage.getItem(localStorageKey)).toBeNull();
    });
  });

  describe('自定义序列化', () => {
    it('应该支持自定义序列化函数', () => {
      const serializer = (value: number) => value.toString();
      const deserializer = (value: string) => parseInt(value, 10);

      const { result } = renderHook(() =>
        useLocalStorage(
          localStorageKey,
          0,
          { serializer, deserializer }
        )
      );

      act(() => {
        const setValue = result.current[1];
        setValue(42);
      });

      expect(result.current[0]).toBe(42);
      expect(localStorage.getItem(localStorageKey)).toBe('42');
    });
  });

  describe('跨标签页同步', () => {
    it('应该响应 storage 事件', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 'initial')
      );

      act(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: localStorageKey,
          newValue: JSON.stringify('updated'),
          oldValue: JSON.stringify('initial'),
          storageArea: localStorage,
        }));
      });

      expect(result.current[0]).toBe('updated');
    });

    it('应该忽略不同 key 的 storage 事件', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 'initial')
      );

      act(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'other-key',
          newValue: JSON.stringify('updated'),
          oldValue: JSON.stringify('initial'),
          storageArea: localStorage,
        }));
      });

      expect(result.current[0]).toBe('initial');
    });
  });

  describe('边界情况', () => {
    it('应该处理无效的 localStorage 数据', () => {
      localStorage.setItem(localStorageKey, 'invalid json');

      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 'default')
      );

      expect(result.current[0]).toBe('default');
    });

    it('应该处理 localStorage 为空的情况', () => {
      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 'default')
      );

      expect(result.current[0]).toBe('default');
    });

    it('应该处理 localStorage 不可用的情况', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('localStorage not available');
      });

      const { result } = renderHook(() =>
        useLocalStorage(localStorageKey, 'default')
      );

      act(() => {
        const setValue = result.current[1];
        setValue('updated');
      });

      expect(result.current[0]).toBe('default');

      Storage.prototype.setItem = originalSetItem;
    });

    it('应该处理 sessionStorage（而非 localStorage）', () => {
      const sessionStorageKey = 'session-test-key';
      sessionStorage.clear();

      const { result } = renderHook(() =>
        useLocalStorage(sessionStorageKey, 'initial', { storage: sessionStorage })
      );

      act(() => {
        const setValue = result.current[1];
        setValue('session-value');
      });

      expect(result.current[0]).toBe('session-value');
      expect(sessionStorage.getItem(sessionStorageKey)).toBe(JSON.stringify('session-value'));
      expect(localStorage.getItem(sessionStorageKey)).toBeNull();

      sessionStorage.clear();
    });
  });

  describe('组件卸载', () => {
    it('应该在组件卸载时移除事件监听器', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useLocalStorage(localStorageKey, 'initial')
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('实际应用场景', () => {
    it('应该实现主题切换功能', () => {
      const { result } = renderHook(() =>
        useLocalStorage('theme', 'light')
      );

      expect(result.current[0]).toBe('light');

      act(() => {
        const setValue = result.current[1];
        setValue('dark');
      });

      expect(result.current[0]).toBe('dark');
    });

    it('应该实现用户偏好设置', () => {
      const preferences = { language: 'zh-CN', fontSize: 16 };
      const { result } = renderHook(() =>
        useLocalStorage('preferences', preferences)
      );

      expect(result.current[0]).toEqual(preferences);

      act(() => {
        const setValue = result.current[1];
        setValue({ ...preferences, language: 'en-US' });
      });

      expect(result.current[0]).toEqual({ language: 'en-US', fontSize: 16 });
    });

    it('应该实现待办事项列表', () => {
      const todos = [
        { id: 1, text: 'Task 1', completed: false },
      ];

      const { result } = renderHook(() =>
        useLocalStorage('todos', todos)
      );

      act(() => {
        const setValue = result.current[1];
        setValue([
          ...result.current[0],
          { id: 2, text: 'Task 2', completed: false },
        ]);
      });

      expect(result.current[0].length).toBe(2);
    });
  });
});
