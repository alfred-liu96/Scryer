/**
 * API 通用类型定义
 */

// HTTP 方法
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// 通用 API 响应结构
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

// 分页参数
export interface PaginationParams extends Record<string, unknown> {
  page: number;
  page_size: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// API 错误响应
export interface ApiError {
  detail: string;
  status: number;
  error_code?: string;
}

// 健康检查响应 (对应后端 HealthCheckResponse)
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  database: {
    status: 'healthy' | 'unhealthy';
    message?: string;
  };
  redis: {
    status: 'healthy' | 'unhealthy';
    message?: string;
  };
}
