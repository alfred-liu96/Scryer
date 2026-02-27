/**
 * 基础 HTTP 客户端
 * 封装 fetch API，提供统一的请求处理和错误处理
 * 支持自动注入 Authorization Header
 * 支持 401 响应拦截与 Token 自动刷新 (Issue #111)
 */

import type { ApiError } from '@/types';
import { publicConfig } from '@/lib/config';
import type { TokenStorage } from '@/lib/storage/token-storage';
import { createTokenStorage } from '@/lib/storage/token-storage';
import type {
  AuthRequestInit,
  RefreshQueueItem,
  RefreshTokenRequest,
  TokenResponse,
  TokenRefreshOptions,
  RefreshFailureCallback,
} from './types';
import { RefreshState } from './types';

/**
 * Token 刷新器
 *
 * 职责：
 * - 管理 Token 刷新流程（401 响应后触发）
 * - 实现并发互斥控制（Promise 单例模式）
 * - 管理请求队列（刷新期间到达的请求）
 * - 处理刷新失败（清理状态并通知回调）
 *
 * 设计原则：
 * - 单例刷新：多个并发 401 请求只触发一次刷新
 * - 透明重试：刷新成功后自动重试原始请求
 * - 失败降级：刷新失败后拒绝所有排队请求
 */
class TokenRefresher {
  /**
   * 当前刷新 Promise（单例，用于互斥控制）
   */
  private refreshPromise: Promise<TokenResponse> | null;

  /**
   * 请求队列（存储等待刷新的请求）
   */
  private requestQueue: RefreshQueueItem[];

  /**
   * 刷新状态
   */
  private state: RefreshState;

  /**
   * 构造函数
   *
   * @param tokenStorage - Token 存储实例
   * @param defaultOptions - 默认刷新配置
   */
  constructor(
    private tokenStorage: TokenStorage | null,
    private defaultOptions: TokenRefreshOptions
  ) {
    this.refreshPromise = null;
    this.requestQueue = [];
    this.state = RefreshState.IDLE;
  }

  /**
   * 刷新访问令牌（公共接口）
   *
   * 逻辑流程：
   * 1. 检查是否已有刷新任务在进行（Promise 单例）
   * 2. 如果正在刷新，返回现有 Promise（复用）
   * 3. 如果空闲，发起刷新请求
   * 4. 刷新成功：
   *    - 保存新 Token 到 tokenStorage
   *    - 处理队列中的请求（重试）
   *    - 重置状态
   * 5. 刷新失败：
   *    - 拒绝所有排队请求
   *    - 清除 Token
   *    - 调用 onRefreshFailure 回调
   *    - 重置状态
   *
   * @param options - 刷新配置（可选，覆盖默认值）
   * @returns Promise<TokenResponse>
   *
   * @throws {Error} 当 refresh_token 不存在或刷新失败时抛出
   */
  public async refreshAccessToken(
    options?: Partial<TokenRefreshOptions>
  ): Promise<TokenResponse> {
    // 场景 1: 已有刷新任务在进行，复用现有 Promise（互斥锁）
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // 场景 2: 空闲状态，发起新的刷新任务
    const opts = { ...this.defaultOptions, ...options };

    // 设置状态为正在刷新
    this.state = RefreshState.REFRESHING;

    // 创建刷新 Promise（单例）
    this.refreshPromise = this.performRefresh(opts);

    try {
      // 等待刷新完成
      const tokens = await this.refreshPromise;

      // 刷新成功：保存新 Token
      this.tokenStorage?.setTokens(tokens);

      return tokens;
    } catch (error) {
      // 刷新失败：拒绝队列中的所有请求
      this.clearQueue(error as Error);

      throw error;
    } finally {
      // 重置状态（无论成功或失败）
      this.refreshPromise = null;
      this.state = RefreshState.IDLE;
    }
  }

  /**
   * 执行实际的刷新请求
   */
  private async performRefresh(
    options: TokenRefreshOptions
  ): Promise<TokenResponse> {
    // 1. 获取 refresh_token
    const refreshToken = this.tokenStorage?.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // 2. 构建请求体
    const requestBody: RefreshTokenRequest = {
      refresh_token: refreshToken,
    };

    // 3. 发起刷新请求（使用原生 fetch，避免递归拦截）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.refreshTimeout);

    try {
      const response = await fetch(`${options.refreshEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 4. 处理响应
      if (!response.ok) {
        const error: ApiError = await response.json() as ApiError;
        throw new Error(error.detail || `Token refresh failed: ${response.status}`);
      }

      return await response.json() as TokenResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 将请求加入队列
   *
   * @param item - 队列项（包含 resolve/reject 和原始请求信息）
   */
  public enqueueRequest(item: RefreshQueueItem): void {
    this.requestQueue.push(item);
  }

  /**
   * 处理队列中的所有请求（刷新成功后调用）
   *
   * 逻辑：遍历队列，重试每个原始请求
   * 注意：此方法需要访问 HttpClient 的 request 方法
   */
  public processQueue(requestRetryFn: (item: RefreshQueueItem) => Promise<void>): void {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    // 异步处理队列（不阻塞刷新流程）
    queue.forEach(async (item) => {
      try {
        await requestRetryFn(item);
        item.resolve(undefined); // 原始请求成功
      } catch (error) {
        item.reject(error); // 原始请求失败
      }
    });
  }

  /**
   * 清空队列并拒绝所有请求（刷新失败时调用）
   *
   * @param error - 拒绝原因
   */
  public clearQueue(error: Error): void {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    queue.forEach(({ reject }) => {
      reject(error);
    });
  }

  /**
   * 重置刷新状态
   */
  public reset(): void {
    this.refreshPromise = null;
    this.requestQueue = [];
    this.state = RefreshState.IDLE;
  }

  /**
   * 获取当前刷新状态
   */
  public getState(): RefreshState {
    return this.state;
  }

  /**
   * 检查是否正在刷新
   */
  public isRefreshing(): boolean {
    return this.state === RefreshState.REFRESHING;
  }
}

/**
 * HTTP 客户端类
 */
export class HttpClient {
  private baseURL: string;
  private timeout: number;
  private tokenStorage: TokenStorage | null;
  private tokenRefresher: TokenRefresher;

  /**
   * Token 刷新失败回调（公共，供外部注册）
   *
   * 默认行为：清除 Token 并抛出异常
   * 外部可以覆盖此行为，例如跳转到登录页
   */
  public onRefreshFailure: RefreshFailureCallback;

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

    // 初始化 Token 刷新器
    this.tokenRefresher = new TokenRefresher(this.tokenStorage, {
      refreshEndpoint: `${baseURL}/api/v1/auth/refresh`,
      refreshTimeout: 10000, // 10 秒
      maxRetries: 1,
    });

    // 默认失败回调
    this.onRefreshFailure = (error) => {
      console.error('Token refresh failed:', error);
      this.tokenStorage?.clearTokens();
      // 不再抛出异常，因为 afterResponse 已经会抛出
    };
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

      // 401 拦截逻辑 (Issue #111)
      if (response.status === 401) {
        // 如果 skipAuth 为 true，不触发刷新
        if (options.skipAuth) {
          const error: ApiError = await response.json() as ApiError;
          throw new Error(error.detail || 'Unauthorized');
        }
        return await this.afterResponse<T>(endpoint, processedOptions);
      }

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

  /**
   * 响应后钩子：401 拦截器 (Issue #111)
   *
   * 逻辑流程：
   * 1. 检查是否正在刷新，如果是，加入队列
   * 2. 如果没有正在刷新，触发 Token 刷新
   * 3. 刷新成功，重试原始请求并处理队列
   * 4. 刷新失败，调用失败回调
   *
   * @param endpoint - API 端点
   * @param options - 请求选项
   * @returns Promise<T>
   */
  private async afterResponse<T>(
    endpoint: string,
    options: AuthRequestInit
  ): Promise<T> {
    // 检查是否正在刷新
    if (this.tokenRefresher.isRefreshing()) {
      // 已经在刷新中，将当前请求加入队列
      return new Promise<T>((resolve, reject) => {
        this.tokenRefresher.enqueueRequest({
          resolve,
          reject,
          endpoint,
          options,
        });
      });
    }

    try {
      // 1. 触发 Token 刷新（自动处理并发互斥）
      await this.tokenRefresher.refreshAccessToken();

      // 2. 刷新成功，重试原始请求
      // 注意：我们需要移除 options 中现有的 Authorization header，
      // 这样 beforeRequest 才会重新获取新的 Token
      const { headers, ...restOptions } = options;
      const retryOptions: AuthRequestInit = restOptions;

      // 如果有其他自定义 headers，保留它们（但移除 Authorization）
      if (headers) {
        const newHeaders = new Headers();
        if (headers instanceof Headers) {
          headers.forEach((value, key) => {
            if (key.toLowerCase() !== 'authorization') {
              newHeaders.set(key, value);
            }
          });
        } else if (Array.isArray(headers)) {
          headers.forEach(([key, value]) => {
            if (key.toLowerCase() !== 'authorization') {
              newHeaders.set(key, value);
            }
          });
        } else {
          Object.entries(headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'authorization') {
              newHeaders.set(key, value);
            }
          });
        }
        retryOptions.headers = newHeaders;
      }

      // 3. 处理队列中的请求（如果有）
      this.tokenRefresher.processQueue(async (item) => {
        const { headers: itemHeaders, ...restItemOptions } = item.options;
        const itemRetryOptions: AuthRequestInit = restItemOptions;

        if (itemHeaders) {
          const newHeaders = new Headers();
          if (itemHeaders instanceof Headers) {
            itemHeaders.forEach((value, key) => {
              if (key.toLowerCase() !== 'authorization') {
                newHeaders.set(key, value);
              }
            });
          } else if (Array.isArray(itemHeaders)) {
            itemHeaders.forEach(([key, value]) => {
              if (key.toLowerCase() !== 'authorization') {
                newHeaders.set(key, value);
              }
            });
          } else {
            Object.entries(itemHeaders).forEach(([key, value]) => {
              if (key.toLowerCase() !== 'authorization') {
                newHeaders.set(key, value);
              }
            });
          }
          itemRetryOptions.headers = newHeaders;
        }

        return await this.request(item.endpoint, itemRetryOptions);
      });

      return await this.request<T>(endpoint, retryOptions);
    } catch (error) {
      // 4. 刷新失败，调用失败回调
      this.onRefreshFailure(error as Error);
      throw error;
    }
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

// ============================================================================
// 配置 onRefreshFailure 回调（集成 AuthClient）
// ============================================================================

/**
 * 动态导入 AuthClient 并配置回调
 *
 * 注意：使用 require() 避免循环依赖
 * AuthClient 依赖 HttpClient，HttpClient 需要 AuthClient 的 logout()
 */
const setupRefreshFailureCallback = () => {
  try {
    // 动态导入（运行时执行）
    const { authClient } = require('./auth-client');

    // 配置 onRefreshFailure 回调
    apiClient.onRefreshFailure = (error: Error) => {
      console.error('Token refresh failed:', error);

      // 调用 AuthClient 的统一登出逻辑
      // silent: true 表示不调用后端登出端点（仅清除本地状态）
      authClient.logout({ silent: true, clearLocalState: true });
    };
  } catch (error) {
    console.error('Failed to setup refresh failure callback:', error);
  }
};

// 初始化回调
setupRefreshFailureCallback();
