/**
 * 应用配置
 *
 * 提供应用运行时所需的配置参数
 * 从环境变量或默认值中读取
 */

/**
 * 公共配置（可在客户端访问）
 */
export const publicConfig = {
  /** 后端 API 基础 URL */
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',

  /** API 请求超时时间（毫秒） */
  apiTimeout: 30000,
} as const

/**
 * 服务器端配置（仅在服务器端访问）
 */
export const serverConfig = {
  /** 内部密钥 */
  secretKey: process.env.SECRET_KEY || '',
} as const
