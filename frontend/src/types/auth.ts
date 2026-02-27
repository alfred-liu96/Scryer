/**
 * 认证相关类型定义
 *
 * 对应后端 schemas/auth.py 和 services/auth.py
 *
 * 注意：这是测试所需的类型定义，完整的实现由 task-developer 完成
 */

/**
 * Token 响应模型
 * 对应后端 TokenResponse
 */
export interface TokenResponse {
  /** JWT 访问令牌 */
  access_token: string;
  /** JWT 刷新令牌 */
  refresh_token: string;
  /** Token 类型（固定为 "Bearer"） */
  token_type: 'Bearer';
  /** 访问令牌过期时间（秒） */
  expires_in: number;
}

/**
 * 用户信息响应模型
 * 对应后端 UserResponse
 */
export interface UserResponse {
  /** 用户 ID */
  id: number;
  /** 用户名 */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 账户激活状态 */
  is_active: boolean;
  /** 创建时间（ISO 8601） */
  created_at: string;
}

/**
 * 登录请求模型
 * 对应后端 LoginRequest
 */
export interface LoginRequest {
  /** 用户名（与 email 二选一） */
  username?: string;
  /** 邮箱地址（与 username 二选一） */
  email?: string;
  /** 密码 */
  password: string;
}

/**
 * 注册请求模型
 * 对应后端 RegisterRequest
 */
export interface RegisterRequest {
  /** 用户名（3-50 字符） */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 密码（最少 8 字符） */
  password: string;
}

/**
 * 认证状态
 */
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

/**
 * Token 存储模型
 */
export interface StoredTokens {
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
}

/**
 * 认证错误类型
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_INACTIVE = 'USER_INACTIVE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 认证错误
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: unknown;
}
