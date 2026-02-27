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
