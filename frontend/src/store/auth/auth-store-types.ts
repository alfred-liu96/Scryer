/**
 * 认证 Store 类型定义
 *
 * 遵循 ui-store.ts 的设计模式
 */

import type { UserResponse, AuthStatus, AuthError } from '@/types/auth';

/**
 * 认证状态接口
 */
export interface AuthState {
  /** 认证状态 */
  status: AuthStatus;
  /** 当前用户信息（已认证时存在） */
  user: UserResponse | null;
  /** 访问令牌 */
  accessToken: string | null;
  /** 刷新令牌 */
  refreshToken: string | null;
  /** Token 过期时间戳（毫秒） */
  tokenExpiresAt: number | null;
  /** 认证错误 */
  error: AuthError | null;
  /** 是否正在执行认证操作 */
  isAuthenticating: boolean;
}

/**
 * 认证操作接口
 */
export interface AuthActions {
  /**
   * 设置认证状态为加载中
   */
  setLoading: () => void;

  /**
   * 设置认证用户信息
   * @param user - 用户信息
   * @param accessToken - 访问令牌
   * @param refreshToken - 刷新令牌
   * @param expiresIn - 过期时间（秒）
   */
  setAuthUser: (
    user: UserResponse,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ) => void;

  /**
   * 更新访问令牌（刷新 Token 后使用）
   * @param accessToken - 新的访问令牌
   * @param expiresIn - 过期时间（秒）
   */
  updateAccessToken: (accessToken: string, expiresIn: number) => void;

  /**
   * 清除认证信息（登出）
   */
  clearAuth: () => void;

  /**
   * 设置认证错误
   * @param error - 错误对象
   */
  setError: (error: AuthError) => void;

  /**
   * 清除错误
   */
  clearError: () => void;

  /**
   * 序列化状态为 JSON（用于持久化）
   * @returns 部分状态的深拷贝
   */
  toJSON: () => Readonly<DeepPartial<AuthState>>;

  /**
   * 从 JSON 恢复状态（用于持久化恢复）
   * @param data - 部分状态数据
   */
  fromJSON: (data: Readonly<DeepPartial<AuthState>>) => void;

  /**
   * 重置为初始状态
   */
  reset: () => void;
}

/**
 * DeepPartial 类型
 * 从 ui-store.ts 复用
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

/**
 * 认证 Store 完整类型
 */
export type AuthStore = AuthState & AuthActions;

/**
 * 认证 Store API（Zustand Store）
 */
export interface AuthStoreApi {
  getState: () => AuthStore;
  setState: (partial: Partial<AuthStore>) => void;
  subscribe: (listener: () => void) => () => void;
  destroy: () => void;
}

/**
 * 创建认证 Store 的选项
 */
export interface CreateAuthStoreOptions {
  /** 启用持久化（默认 false） */
  persist?: boolean;
  /** 启用 DevTools（默认 false） */
  devtools?: boolean;
  /** Store 名称（用于 DevTools 和持久化 key） */
  name?: string;
  /** Token 存储实例（用于测试 Mock） */
  tokenStorage?: import('@/lib/storage').TokenStorage;
}
