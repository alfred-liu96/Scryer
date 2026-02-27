/**
 * API 端点统一导出
 *
 * 职责：
 * - 统一管理所有 API 客户端实例
 * - 提供单一的 API 调用入口
 * - 简化组件层的导入逻辑
 *
 * @module frontend/src/lib/api/endpoints
 */

// ============================================================================
// 导入依赖
// ============================================================================

import { apiClient } from './client'
import { createTokenStorage } from '@/lib/storage/token-storage'
import { createAuthApi } from './auth-api'
import type { AuthApi } from './auth-api'

// ============================================================================
// Auth API
// ============================================================================

/**
 * 认证 API 单例
 *
 * 提供用户认证相关的 API 调用：
 * - login: 用户登录
 * - register: 用户注册
 * - refreshToken: 刷新访问令牌
 * - getCurrentUser: 获取当前用户信息
 *
 * @example
 * ```ts
 * import { authApi } from '@/lib/api/endpoints';
 *
 * // 登录
 * const result = await authApi.login('user@example.com', 'password');
 *
 * // 获取当前用户
 * const user = await authApi.getCurrentUser();
 * ```
 */
export const authApi: AuthApi = createAuthApi({
  httpClient: apiClient,
  tokenStorage: createTokenStorage(),
})

// ============================================================================
// 预留扩展槽（未来的 API）
// ============================================================================

// export const healthApi: HealthApi = createHealthApi({ httpClient: apiClient });
// export const usersApi: UsersApi = createUsersApi({ httpClient: apiClient });
// export const tasksApi: TasksApi = createTasksApi({ httpClient: apiClient });
