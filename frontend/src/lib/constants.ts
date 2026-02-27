/**
 * 应用常量定义
 */

/**
 * Token 存储键名
 */
export const TOKEN_STORAGE_KEY = 'auth_tokens'

/**
 * 本地存储键名
 */
export const STORAGE_KEYS = {
  TOKENS: 'auth_tokens',
  USER: 'user_data',
} as const

/**
 * API 端点路径
 */
export const API_ENDPOINTS = {
  /** 认证相关 */
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    ME: '/api/v1/auth/me',
    LOGOUT: '/api/v1/auth/logout',
  },
} as const

/**
 * HTTP 状态码
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const
