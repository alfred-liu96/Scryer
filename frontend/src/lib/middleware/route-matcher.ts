import type { RouteMatcher, CreateRouteMatcherOptions, RouteRule } from './route-matcher.types';
import { RouteType } from './route-matcher.types';

/**
 * 默认路由配置
 */
const DEFAULT_ROUTES: RouteRule[] = [
  // 公开路由
  { pattern: '/api/:path*', type: RouteType.PUBLIC },
  { pattern: '/_next/:path*', type: RouteType.PUBLIC },
  { pattern: '/static/:path*', type: RouteType.PUBLIC },
  { pattern: '/favicon.ico', type: RouteType.PUBLIC },

  // 认证路由
  { pattern: '/login', type: RouteType.AUTH },
  { pattern: '/register', type: RouteType.AUTH },

  // 受保护路由（默认兜底）
  { pattern: '/:path*', type: RouteType.PROTECTED },
];

/**
 * 路由匹配器实现
 *
 * 使用简单的通配符匹配：
 * - :param* 匹配任意路径段
 * - * 匹配任意字符
 */
export function createRouteMatcher(
  options: CreateRouteMatcherOptions = {}
): RouteMatcher {
  const routes = options.routes ?? DEFAULT_ROUTES;

  // 预编译正则表达式（优化性能）
  const compiledRules = routes.map(rule => ({
    type: rule.type,
    regex: patternToRegex(rule.pattern),
  }));

  return {
    match(path: string): RouteType | null {
      // 按配置顺序匹配，先匹配优先
      for (const rule of compiledRules) {
        if (rule.regex.test(path)) {
          return rule.type;
        }
      }
      return null;
    },
  };
}

/**
 * 路由模式转正则表达式
 *
 * 通配符语义：
 * - :path* 匹配零个或多个路径段（可选）
 * - * 匹配任意字符
 * - :param 匹配单个路径段（非空）
 *
 * @example
 * - '/api/:path*' -> /^\/api(\/.*)?$/  (匹配 /api 和 /api/xxx)
 * - '/login' -> /^\/login$/
 * - '/:path*' -> /^(\/.*)?$/  (匹配 / 和 /xxx)
 */
function patternToRegex(pattern: string): RegExp {
  // 第一步：替换通配符为临时占位符（在转义之前）
  let regexStr = pattern
    // 先处理 /:path*（路径开头，后面可选）
    .replace(/^\/:path\*$/g, '\0PATHSTAR_ROOT\0')
    // 再处理 /xxx/:path*（路径中间，后面可选）
    .replace(/\/:path\*/g, '\0PATHSTAR_MIDDLE\0')
    // 命名参数 :param（但不匹配已处理的 :path*）
    .replace(/:\w+/g, '\0PARAM\0')
    // 剩余的 * 通配符
    .replace(/\*/g, '\0STAR\0');

  // 第二步：转义正则特殊字符（排除占位符）
  regexStr = regexStr.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

  // 第三步：恢复占位符为正则表达式
  regexStr = regexStr
    .replace(/\0PATHSTAR_ROOT\0/g, '/.*')       // /:path* (根) -> /.*
    .replace(/\0PATHSTAR_MIDDLE\0/g, '(\/.*)?')  // /:path* (中间) -> (/.*)? (可选)
    .replace(/\0PARAM\0/g, '[^/]+')              // :param -> [^/]+
    .replace(/\0STAR\0/g, '.*');                // * -> .*

  return new RegExp(`^${regexStr}$`);
}

/**
 * 创建默认路由匹配器
 */
export function createDefaultRouteMatcher(): RouteMatcher {
  return createRouteMatcher();
}

// 导出类型，方便外部使用
export type { RouteMatcher, CreateRouteMatcherOptions, RouteRule };
export { RouteType };
