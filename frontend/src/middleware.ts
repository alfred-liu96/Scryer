import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRouteMatcher } from '@/lib/middleware/route-matcher';
import { RouteType } from '@/lib/middleware/route-matcher.types';

// ============================================================================
// 配置
// ============================================================================

/**
 * Cookie 名称（存储 access_token）
 */
const AUTH_COOKIE_NAME = 'access_token';

/**
 * 登录页面路径
 */
const LOGIN_PATH = '/login';

/**
 * 默认首页路径
 */
const HOME_PATH = '/';

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 从请求中提取认证状态
 *
 * @param request - Next.js 请求对象
 * @returns 是否已认证
 */
function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get(AUTH_COOKIE_NAME);
  return token != null && token.value !== '';
}

/**
 * 重定向到指定路径
 *
 * @param request - 原始请求
 * @param path - 目标路径
 * @returns NextResponse 重定向响应
 */
function redirectTo(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.redirect(url);
}

// ============================================================================
// Middleware 主逻辑
// ============================================================================

/**
 * Next.js 中间件
 *
 * 执行顺序：
 * 1. 匹配路由类型
 * 2. 检查认证状态
 * 3. 根据规则重定向或放行
 *
 * @param request - Next.js 请求对象
 * @returns NextResponse 响应对象
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // 创建路由匹配器（注意：每次调用创建新实例，避免缓存问题）
  const routeMatcher = createRouteMatcher();

  // 匹配路由类型
  const routeType = routeMatcher.match(pathname);

  // 未匹配到规则（理论上不应该发生，因为默认兜底规则），放行
  if (routeType === null) {
    return NextResponse.next();
  }

  // 检查认证状态
  const authenticated = isAuthenticated(request);

  // 路由保护逻辑
  switch (routeType) {
    case RouteType.PUBLIC:
      // 公开路由 - 直接放行
      return NextResponse.next();

    case RouteType.AUTH:
      // 认证路由 - 已登录重定向到首页，未登录放行
      if (authenticated) {
        return redirectTo(request, HOME_PATH);
      }
      return NextResponse.next();

    case RouteType.PROTECTED:
      // 受保护路由 - 未登录重定向到登录页，已登录放行
      if (!authenticated) {
        return redirectTo(request, LOGIN_PATH);
      }
      return NextResponse.next();

    default:
      // 兜底：放行
      return NextResponse.next();
  }
}

// ============================================================================
// Middleware 匹配配置
// ============================================================================

/**
 * Middleware 匹配配置
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
 */
export const config = {
  /**
   * 匹配所有路径（除了内置的 Next.js 路径）
   *
   * 注意：这里使用简单的排除规则，详细的分类在 middleware 函数内部处理
   */
  matcher: [
    /*
     * 匹配所有路径
     * 排除：
     * -/_next/* (Next.js 内部)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
