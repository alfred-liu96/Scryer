/**
 * Auth API 客户端 - 架构存根
 *
 * 文件: frontend/src/lib/api/auth-client.ts
 *
 * 职责：
 * - 封装 Token 刷新逻辑（调用 /api/v1/auth/refresh）
 * - 封装登出逻辑（清除 Token 和状态）
 * - 提供统一的认证操作接口
 *
 * 设计原则：
 * - 依赖注入：所有依赖通过构造函数注入
 * - 复用现有组件：HttpClient、TokenStorage、AuthStore
 * - 简洁直观：方法命名清晰，参数最小化
 *
 * @depends
 * - @/lib/api/client (HttpClient)
 * - @/lib/storage/token-storage (TokenStorage)
 * - @/store/auth/auth-store-types (AuthStore)
 * - @/types/auth (TokenResponse)
 */

import type { TokenResponse } from '@/types/auth';
import type { HttpClient } from './client';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { AuthStore } from '@/store/auth/auth-store-types';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * AuthClient 配置选项
 */
export interface AuthClientOptions {
  /** HTTP 客户端实例 */
  httpClient: HttpClient;
  /** Token 存储实例 */
  tokenStorage: TokenStorage;
  /** 认证 Store 实例 */
  authStore: AuthStore;
}

/**
 * 登出选项
 */
export interface LogoutOptions {
  /** 是否静默登出（不触发后端调用，默认 false） */
  silent?: boolean;
  /** 是否清除所有本地状态（默认 true） */
  clearLocalState?: boolean;
}

/**
 * Token 刷新选项
 */
export interface RefreshTokenOptions {
  /** 是否强制刷新（忽略 Token 过期状态，默认 false） */
  force?: boolean;
}

// ============================================================================
// AuthClient 类
// ============================================================================

/**
 * 认证 API 客户端
 *
 * @example
 * ```ts
 * // 使用默认单例
 * import { authClient } from '@/lib/api/auth-client';
 * await authClient.refreshToken();
 *
 * // 创建自定义实例（测试场景）
 * import { createAuthClient } from '@/lib/api/auth-client';
 * const client = createAuthClient({
 *   httpClient: mockHttpClient,
 *   tokenStorage: mockTokenStorage,
 *   authStore: mockAuthStore,
 * });
 * ```
 */
export class AuthClient {
  /**
   * HTTP 客户端实例（用于发起 API 请求）
   */
  private readonly httpClient: HttpClient;

  /**
   * Token 存储实例（用于读取/清除 Token）
   */
  private readonly tokenStorage: TokenStorage;

  /**
   * 认证 Store 实例（用于清除认证状态）
   */
  private readonly authStore: AuthStore;

  /**
   * 构造函数
   *
   * @param options - 客户端配置选项
   *
   * @example
   * ```ts
   * const authClient = new AuthClient({
   *   httpClient: apiClient,
   *   tokenStorage: createTokenStorage(),
   *   authStore: authStore,
   * });
   * ```
   */
  constructor(options: AuthClientOptions) {
    this.httpClient = options.httpClient;
    this.tokenStorage = options.tokenStorage;
    this.authStore = options.authStore;
  }

  /**
   * 刷新访问令牌
   *
   * 逻辑流程：
   * 1. 检查 refresh_token 是否存在
   * 2. 调用 POST /api/v1/auth/refresh
   * 3. 保存新的 Token 到 TokenStorage
   * 4. 更新 AuthStore 中的 accessToken
   *
   * 注意：此方法直接调用 API，不依赖 HttpClient 的 401 拦截
   *       （避免循环依赖）
   *
   * @param options - 刷新选项
   * @returns Promise<TokenResponse> 新的 Token 响应
   *
   * @throws {Error} 当 refresh_token 不存在或刷新失败时抛出
   *
   * @example
   * ```ts
   * try {
   *   const tokens = await authClient.refreshToken();
   *   console.log('Token refreshed:', tokens.access_token);
   * } catch (error) {
   *   console.error('Refresh failed:', error);
   *   // 自动登出
   *   await authClient.logout();
   * }
   * ```
   */
  async refreshToken(options?: RefreshTokenOptions): Promise<TokenResponse> {
    // 步骤 1: 获取 refresh_token
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // 步骤 2: 构建请求体
    const requestBody = {
      refresh_token: refreshToken,
    };

    // 步骤 3: 调用刷新端点（注意 skipAuth: true）
    const response = await this.httpClient.post<TokenResponse>(
      '/api/v1/auth/refresh',
      requestBody,
      { skipAuth: true }
    );

    // 步骤 4: 保存新 Token
    this.tokenStorage.setTokens(response);

    // 步骤 5: 更新 AuthStore
    this.authStore.updateAccessToken(
      response.access_token,
      response.expires_in
    );

    return response;
  }

  /**
   * 登出（清除认证状态）
   *
   * 逻辑流程：
   * 1. 如果非静默登出，调用后端登出端点（TODO: 后续实现）
   * 2. 清除 TokenStorage 中的 Token
   * 3. 清除 AuthStore 中的认证状态
   *
   * @param options - 登出选项
   * @returns Promise<void>
   *
   * @example
   * ```ts
   * // 用户主动登出（调用后端）
   * await authClient.logout({ silent: false });
   *
   * // 静默登出（不调用后端，仅清除本地状态）
   * await authClient.logout({ silent: true });
   * ```
   */
  async logout(options?: LogoutOptions): Promise<void> {
    const { silent = false, clearLocalState = true } = options || {};

    // TODO: 后续实现后端登出
    // if (!silent) {
    //   await this.httpClient.post('/api/v1/auth/logout');
    // }

    if (clearLocalState) {
      this.tokenStorage.clearTokens();
      this.authStore.clearAuth();
    }
  }
}

// ============================================================================
// 工厂函数与单例导出
// ============================================================================

/**
 * 创建 AuthClient 实例的工厂函数
 *
 * @param options - 客户端配置（可选，默认使用全局实例）
 * @returns AuthClient 实例
 *
 * @example
 * ```ts
 * // 使用默认配置
 * const defaultClient = createAuthClient();
 *
 * // 使用自定义配置（测试场景）
 * const testClient = createAuthClient({
 *   httpClient: mockHttpClient,
 *   tokenStorage: mockTokenStorage,
 *   authStore: mockAuthStore,
 * });
 * ```
 */
export function createAuthClient(
  options?: Partial<AuthClientOptions>
): AuthClient {
  // 动态导入（避免循环依赖）
  const { apiClient } = require('./client');
  const { authStore } = require('@/store/auth/auth-store');
  const { createTokenStorage } = require('@/lib/storage/token-storage');

  const finalOptions: AuthClientOptions = {
    httpClient: options?.httpClient ?? apiClient,
    tokenStorage: options?.tokenStorage ?? createTokenStorage(),
    authStore: options?.authStore ?? authStore,
  };

  return new AuthClient(finalOptions);
}

/**
 * 默认 AuthClient 单例
 *
 * 使用全局 apiClient 和 authStore 实例
 *
 * @example
 * ```ts
 * import { authClient } from '@/lib/api/auth-client';
 *
 * // 刷新 Token
 * await authClient.refreshToken();
 *
 * // 登出
 * await authClient.logout();
 * ```
 */
export const authClient: AuthClient = createAuthClient();
