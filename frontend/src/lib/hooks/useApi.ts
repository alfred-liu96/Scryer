/**
 * API 调用 Hook
 * 提供统一的 API 调用状态管理
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * API 调用 Hook
 * @param apiFunction - API 调用函数
 * @param deps - 依赖数组
 * @returns UseApiResult<T>
 */
export function useApi<T>(
  apiFunction: () => Promise<T>,
  deps: unknown[] = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFunction();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [apiFunction]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...deps]);

  return { data, isLoading, error, refetch: fetchData };
}
