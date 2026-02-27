/**
 * useLocalStorage Hook
 *
 * 功能:
 * - 同步 localStorage 状态
 * - 支持自定义序列化/反序列化
 * - 支持默认值
 * - 支持跨标签页同步
 * - 正确处理更新和删除
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseLocalStorageOptions<T> {
  /** 自定义序列化函数 */
  serializer?: (value: T) => string;
  /** 自定义反序列化函数 */
  deserializer?: (value: string) => T;
  /** 存储对象（默认 localStorage） */
  storage?: Storage;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    storage = localStorage,
  } = options || {};

  // 获取初始值
  const readValue = useCallback((): T => {
    try {
      const item = storage.getItem(key);
      return item ? deserializer(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key, deserializer, storage]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // 设置值
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      // 先尝试存储，如果失败则不更新状态
      storage.setItem(key, serializer(valueToStore));
      setStoredValue(valueToStore);
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, serializer, storage, storedValue]);

  // 删除值
  const removeValue = useCallback(() => {
    try {
      storage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, storage, initialValue]);

  // 监听跨标签页变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.storageArea === storage) {
        try {
          const newValue = e.newValue ? deserializer(e.newValue) : initialValue;
          setStoredValue(newValue);
        } catch (error) {
          console.warn(`Error parsing storage value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue, deserializer, storage]);

  return [storedValue, setValue, removeValue];
}
