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

/**
 * 登录响应模型
 * 对应后端：POST /api/v1/auth/login 响应
 */
export interface LoginResponse {
  /** 用户信息对象 */
  user: UserResponse;
  /** Token 对象 */
  tokens: TokenResponse;
}

/**
 * 注册响应模型
 * 对应后端：POST /api/v1/auth/register 响应
 * 结构与 LoginResponse 完全一致
 */
export type RegisterResponse = LoginResponse;

/**
 * Token 刷新请求模型
 */
export interface RefreshTokenRequest {
  /** 刷新 Token 字符串 */
  refresh_token: string;
}

/**
 * Token 刷新响应模型
 * 与 TokenResponse 结构完全一致
 */
export type RefreshTokenResponse = TokenResponse;

// ============================================================================
// 用户资料更新相关类型 (新增)
// ============================================================================

/**
 * 用户资料更新请求模型
 * 对应后端 UserUpdateRequest schema
 */
export interface UserUpdateRequest {
  /** 用户名 (可选, 3-50 字符) */
  username?: string;
  /** 邮箱地址 (可选) */
  email?: string;
}

/**
 * 用户资料更新响应模型
 * 对应后端 UserResponse schema (与 getCurrentUser 返回类型一致)
 */
export type UserUpdateResponse = UserResponse;

/**
 * 用户资料表单数据
 * 用于 ProfileForm 组件内部状态管理
 */
export interface ProfileFormData {
  /** 用户名 */
  username: string;
  /** 邮箱地址 */
  email: string;
}

/**
 * 用户资料表单错误
 */
export interface ProfileFormErrors {
  /** 用户名错误 */
  username?: string;
  /** 邮箱错误 */
  email?: string;
}

/**
 * API 错误响应类型 (扩展现有定义)
 */
export interface ApiErrorResponse {
  /** 错误详情 */
  detail: string;
  /** 冲突字段 (用于 409 错误) */
  field?: 'username' | 'email';
}

/**
 * 用户资料更新错误类型枚举
 */
export enum ProfileUpdateErrorType {
  /** 用户名已存在 */
  USERNAME_EXISTS = 'USERNAME_EXISTS',
  /** 邮箱已存在 */
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 验证错误 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 未认证 */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** 未知错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
