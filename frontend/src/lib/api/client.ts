/**
 * 基础 HTTP 客户端
 * 封装 fetch API，提供统一的请求处理和错误处理
 * 支持自动注入 Authorization Header
 */

import type { ApiError } from '@/types';
import { publicConfig } from '@/lib/config';
import type { TokenStorage } from '@/lib/storage/token-storage';
import { createTokenStorage } from '@/lib/storage/token-storage';
import type { AuthRequestInit } from './types';

/**
 * HTTP 客户端类
 */
export class HttpClient {
  private baseURL: string;
  private timeout: number;
  private tokenStorage: TokenStorage | null;

  /**
   * 创建 HttpClient 实例
   * @param baseURL - API 基础 URL
   * @param timeout - 请求超时时间（毫秒）
   * @param tokenStorage - Token 存储实例（可选，默认使用全局实例）
   */
  constructor(
    baseURL: string = publicConfig.apiUrl,
    timeout: number = publicConfig.apiTimeout,
    tokenStorage?: TokenStorage
  ) {
    this.baseURL = baseURL;
    this.timeout = timeout;

    // 依赖注入：使用传入的 tokenStorage 或创建默认实例
    this.tokenStorage = tokenStorage ?? createTokenStorage();
  }

  /**
   * 发起 HTTP 请求
   * @param endpoint - API 端点
   * @param options - 请求选项
   * @returns Promise<T>
   */
  async request<T>(
    endpoint: string,
    options: AuthRequestInit = {}
  ): Promise<T> {
    // 应用请求前钩子
    const processedOptions = this.beforeRequest(options);

    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...processedOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: ApiError = await response.json() as ApiError;
        throw new Error(error.detail || 'Request failed');
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * GET 请求
   * @param endpoint - API 端点
   * @param params - 查询参数
   * @param options - 请求选项
   * @returns Promise<T>
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    options?: AuthRequestInit
  ): Promise<T> {
    const url = params
      ? `${endpoint}?${new URLSearchParams(params as Record<string, string>)}`
      : endpoint;

    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   * @param endpoint - API 端点
   * @param data - 请求体数据
   * @param options - 请求选项
   * @returns Promise<T>
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: AuthRequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT 请求
   * @param endpoint - API 端点
   * @param data - 请求体数据
   * @param options - 请求选项
   * @returns Promise<T>
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: AuthRequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH 请求
   * @param endpoint - API 端点
   * @param data - 请求体数据
   * @param options - 请求选项
   * @returns Promise<T>
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: AuthRequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE 请求
   * @param endpoint - API 端点
   * @param options - 请求选项
   * @returns Promise<T>
   */
  async delete<T>(endpoint: string, options?: AuthRequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // ========== 私有方法（仅内部使用） ==========

  /**
   * 请求前钩子：注入 Authorization Header
   *
   * 逻辑流程：
   * 1. 检查是否跳过认证 (skipAuth: true)
   * 2. 检查是否已手动指定 Authorization Header
   * 3. 从 TokenStorage 获取 access_token
   * 4. 如果 Token 存在，注入 Authorization Header
   *
   * @param options - 原始请求选项
   * @returns 处理后的请求选项
   */
  private beforeRequest(options: AuthRequestInit): RequestInit {
    const { skipAuth = false, headers: existingHeaders, ...restOptions } = options;

    // 场景 1: 显式禁用认证
    if (skipAuth) {
      const normalizedHeaders = this.normalizeHeaders(existingHeaders);
      // 移除 Authorization header（如果存在）
      normalizedHeaders.delete('Authorization');
      return {
        ...restOptions,
        headers: normalizedHeaders,
      };
    }

    // 场景 2: 已手动指定 Authorization Header（不覆盖）
    const normalizedHeaders = this.normalizeHeaders(existingHeaders);
    if (this.hasHeader(existingHeaders, 'Authorization')) {
      return {
        ...restOptions,
        headers: normalizedHeaders,
      };
    }

    // 场景 3: 自动注入 Token（如果存在且非空）
    const token = this.tokenStorage?.getAccessToken();
    if (token) {  // 检查所有 falsy 值：null, undefined, ''
      normalizedHeaders.set('Authorization', this.buildAuthHeader(token));
    }

    return {
      ...restOptions,
      headers: normalizedHeaders,
    };
  }

  /**
   * 构建 Authorization Header
   * @param token - 访问令牌
   * @returns "Bearer {token}"
   */
  private buildAuthHeader(token: string): string {
    return `Bearer ${token}`;
  }

  /**
   * 合并请求头
   * @param existingHeaders - 现有 headers
   * @returns Headers 对象
   */
  private normalizeHeaders(
    existingHeaders: HeadersInit | Record<string, string> | undefined
  ): Headers {
    const headers = new Headers();

    // 添加默认 Content-Type
    if (!existingHeaders || !this.hasHeader(existingHeaders, 'Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // 合并现有 headers
    if (existingHeaders) {
      if (existingHeaders instanceof Headers) {
        existingHeaders.forEach((value, key) => {
          headers.set(key, value);
        });
      } else if (Array.isArray(existingHeaders)) {
        existingHeaders.forEach(([key, value]) => {
          headers.set(key, value);
        });
      } else {
        // Record<string, string>
        Object.entries(existingHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });
      }
    }

    return headers;
  }

  /**
   * 检查 headers 中是否包含指定 key
   */
  private hasHeader(
    headers: HeadersInit | Record<string, string> | undefined,
    key: string
  ): boolean {
    if (!headers) return false;

    if (headers instanceof Headers) {
      return headers.has(key);
    } else if (Array.isArray(headers)) {
      return headers.some(([k]) => k.toLowerCase() === key.toLowerCase());
    } else {
      return Object.keys(headers).some(
        k => k.toLowerCase() === key.toLowerCase()
      );
    }
  }
}

// 默认客户端实例
export const apiClient = new HttpClient();
