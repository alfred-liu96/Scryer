/**
 * 路由类型枚举
 */
export enum RouteType {
  /** 公开路由 - 无限制访问 */
  PUBLIC = 'public',
  /** 认证路由 - 未登录可访问，已登录重定向 */
  AUTH = 'auth',
  /** 受保护路由 - 已登录可访问，未登录重定向 */
  PROTECTED = 'protected',
}

/**
 * 路由规则配置
 */
export interface RouteRule {
  /** 路由模式（支持通配符） */
  pattern: string;
  /** 路由类型 */
  type: RouteType;
}

/**
 * 路由匹配器接口
 */
export interface RouteMatcher {
  /**
   * 匹配路由类型
   * @param path - 请求路径（不含查询参数）
   * @returns 路由类型，未匹配返回 null
   */
  match(path: string): RouteType | null;
}

/**
 * 创建路由匹配器的配置选项
 */
export interface CreateRouteMatcherOptions {
  /** 自定义路由规则列表（可选，使用默认配置） */
  routes?: RouteRule[];
}
