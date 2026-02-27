/**
 * API 类型定义
 */

import type { RequestInit } from 'node-fetch';

/**
 * 扩展的请求选项
 * 添加认证相关控制字段
 */
export interface AuthRequestInit extends Omit<RequestInit, 'headers'> {
  /**
   * 跳过 Token 注入（用于公共端点）
   * @default false
   */
  skipAuth?: boolean;

  /**
   * 自定义 headers（支持 Record 类型）
   */
  headers?: HeadersInit | Record<string, string>;
}

/**
 * Token 刷新状态枚举
 */
export enum RefreshState {
  /** 空闲状态 */
  IDLE = 'idle',
  /** 正在刷新 */
  REFRESHING = 'refreshing',
  /** 刷新失败 */
  FAILED = 'failed',
}

/**
 * 请求队列项
 * 用于存储等待 Token 刷新的请求信息
 */
export interface RefreshQueueItem {
  /** 原始请求的 resolve 函数 */
  resolve: (value: unknown) => void;
  /** 原始请求的 reject 函数 */
  reject: (reason?: unknown) => void;
  /** 原始请求的 endpoint */
  endpoint: string;
  /** 原始请求的 options */
  options: AuthRequestInit;
}

/**
 * Token 刷新请求体
 * 对应后端 RefreshRequest schema
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Token 刷新响应体
 * 对应后端 TokenResponse schema
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

/**
 * Token 刷新配置选项
 */
export interface TokenRefreshOptions {
  /** 刷新端点路径 */
  refreshEndpoint: string;
  /** 刷新超时时间（毫秒） */
  refreshTimeout: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 当前重试次数（内部使用） */
  retryCount?: number;
}

/**
 * Token 刷新失败回调函数类型
 *
 * @param error - 刷新失败的错误信息
 * @returns void
 *
 * @example
 * ```ts
 * const client = new HttpClient();
 * client.onRefreshFailure = (error) => {
 *   console.error('Token refresh failed:', error);
 *   // 触发登出逻辑
 *   authStore.clearAuth();
 *   // 跳转到登录页
 *   router.push('/login');
 * };
 * ```
 */
export type RefreshFailureCallback = (error: Error) => void;
