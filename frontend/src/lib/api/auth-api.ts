/**
 * Auth API 客户端
 *
 * 对应后端 API 端点：
 * - POST /api/v1/auth/login - 用户登录
 * - POST /api/v1/auth/register - 用户注册
 * - POST /api/v1/auth/refresh - 刷新 Token
 * - GET /api/v1/auth/me - 获取当前用户信息
 *
 * 职责：
 * - 封装认证相关的 HTTP 请求
 * - 自动保存 Token 到 TokenStorage
 * - 提供类型安全的 API 接口
 */

import type { HttpClient } from './client';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { TokenResponse, UserResponse } from '@/types/auth';

/**
 * 登录/注册响应（包含用户信息和 Token）
 */
export interface AuthResponse extends UserResponse, TokenResponse {}

/**
 * AuthApi 配置
 */
export interface AuthApiConfig {
  /** HTTP 客户端实例 */
  httpClient: HttpClient;
  /** Token 存储实例 */
  tokenStorage: TokenStorage;
}

/**
 * Auth API 客户端类
 */
export class AuthApi {
  private httpClient: HttpClient;
  private tokenStorage: TokenStorage;

  constructor(config: AuthApiConfig) {
    this.httpClient = config.httpClient;
    this.tokenStorage = config.tokenStorage;
  }

  /**
   * 用户登录
   *
   * 对应后端：POST /api/v1/auth/login
   *
   * @param usernameOrEmail - 用户名或邮箱
   * @param password - 密码
   * @returns 用户信息和 Token
   * @throws {Error} 登录失败时抛出异常
   */
  async login(usernameOrEmail: string, password: string): Promise<AuthResponse> {
    // 判断是用户名还是邮箱
    const isEmail = usernameOrEmail.includes('@');
    const payload = isEmail
      ? { email: usernameOrEmail, password }
      : { username: usernameOrEmail, password };

    // 发送登录请求（skipAuth: true 表示不需要 Token）
    const response = await this.httpClient.post<AuthResponse>(
      '/api/v1/auth/login',
      payload,
      { skipAuth: true }
    );

    // 保存 Token
    this.tokenStorage.setTokens({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      token_type: response.token_type,
      expires_in: response.expires_in,
    });

    return response;
  }

  /**
   * 用户注册
   *
   * 对应后端：POST /api/v1/auth/register
   *
   * @param username - 用户名
   * @param email - 邮箱地址
   * @param password - 密码
   * @returns 新创建的用户信息和 Token
   * @throws {Error} 注册失败时抛出异常（如用户名/邮箱已存在）
   */
  async register(
    username: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
    // 发送注册请求（skipAuth: true 表示不需要 Token）
    const response = await this.httpClient.post<AuthResponse>(
      '/api/v1/auth/register',
      { username, email, password },
      { skipAuth: true }
    );

    // 保存 Token
    this.tokenStorage.setTokens({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      token_type: response.token_type,
      expires_in: response.expires_in,
    });

    return response;
  }

  /**
   * 刷新访问令牌
   *
   * 对应后端：POST /api/v1/auth/refresh
   *
   * @returns 新的 Token
   * @throws {Error} 无 refresh_token 或刷新失败时抛出异常
   */
  async refreshToken(): Promise<TokenResponse> {
    // 获取现有的 refresh_token
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // 发送刷新请求（skipAuth: true 表示不需要 Token）
    const response = await this.httpClient.post<TokenResponse>(
      '/api/v1/auth/refresh',
      { refresh_token: refreshToken },
      { skipAuth: true }
    );

    // 保存新 Token
    this.tokenStorage.setTokens({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      token_type: response.token_type,
      expires_in: response.expires_in,
    });

    return response;
  }

  /**
   * 获取当前用户信息
   *
   * 对应后端：GET /api/v1/auth/me
   *
   * @returns 当前用户信息
   * @throws {Error} 未认证或请求失败时抛出异常
   */
  async getCurrentUser(): Promise<UserResponse> {
    // 发送请求（需要认证，HttpClient 会自动注入 Token）
    return this.httpClient.get<UserResponse>('/api/v1/auth/me');
  }
}

/**
 * 创建 AuthApi 实例的工厂函数
 *
 * @param config - AuthApi 配置
 * @returns AuthApi 实例
 */
export function createAuthApi(config: AuthApiConfig): AuthApi {
  return new AuthApi(config);
}

// ============================================================================
// 单例导出（供其他模块直接使用）
// ============================================================================

/**
 * 默认 AuthApi 实例
 *
 * 注意：此单例需要在应用初始化时手动配置
 * 建议使用 createAuthApi() 创建自定义实例
 */
export let authApi: AuthApi | null = null;

/**
 * 设置全局 AuthApi 实例
 *
 * @param api - AuthApi 实例
 */
export function setAuthApi(api: AuthApi): void {
  authApi = api;
}

/**
 * 获取全局 AuthApi 实例
 *
 * @returns AuthApi 实例，未配置时返回 null
 */
export function getAuthApi(): AuthApi | null {
  return authApi;
}
