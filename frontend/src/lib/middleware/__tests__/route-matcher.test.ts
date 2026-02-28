/**
 * RouteMatcher 单元测试
 *
 * 测试路由匹配逻辑的正确性
 */

import { describe, it, expect } from '@jest/globals';
import { createRouteMatcher, RouteType } from '../route-matcher';

describe('RouteMatcher', () => {
  describe('默认配置', () => {
    const matcher = createRouteMatcher();

    describe('公开路由', () => {
      it('应该匹配 API 路由', () => {
        expect(matcher.match('/api/v1/users')).toBe(RouteType.PUBLIC);
        expect(matcher.match('/api/auth/login')).toBe(RouteType.PUBLIC);
        expect(matcher.match('/api/unknown')).toBe(RouteType.PUBLIC);
      });

      it('应该匹配 Next.js 内部路由', () => {
        expect(matcher.match('/_next/static/css')).toBe(RouteType.PUBLIC);
        expect(matcher.match('/_next/static/chunks')).toBe(RouteType.PUBLIC);
      });

      it('应该匹配静态资源路由', () => {
        expect(matcher.match('/static/logo.png')).toBe(RouteType.PUBLIC);
        expect(matcher.match('/static/images/banner.jpg')).toBe(RouteType.PUBLIC);
      });

      it('应该匹配 favicon.ico', () => {
        expect(matcher.match('/favicon.ico')).toBe(RouteType.PUBLIC);
      });
    });

    describe('认证路由', () => {
      it('应该匹配登录页面', () => {
        expect(matcher.match('/login')).toBe(RouteType.AUTH);
      });

      it('应该匹配注册页面', () => {
        expect(matcher.match('/register')).toBe(RouteType.AUTH);
      });

      it('不应该匹配 /login 的子路径（精确匹配）', () => {
        // /login 是精确匹配，不应匹配 /login/something
        // 但由于兜底规则存在，会返回 PROTECTED
        expect(matcher.match('/login/callback')).not.toBe(RouteType.AUTH);
      });
    });

    describe('受保护路由', () => {
      it('应该匹配首页', () => {
        expect(matcher.match('/')).toBe(RouteType.PROTECTED);
      });

      it('应该匹配 dashboard 页面', () => {
        expect(matcher.match('/dashboard')).toBe(RouteType.PROTECTED);
      });

      it('应该匹配 settings 页面', () => {
        expect(matcher.match('/settings')).toBe(RouteType.PROTECTED);
        expect(matcher.match('/settings/profile')).toBe(RouteType.PROTECTED);
      });

      it('应该匹配任意其他路径（兜底规则）', () => {
        expect(matcher.match('/about')).toBe(RouteType.PROTECTED);
        expect(matcher.match('/products/123')).toBe(RouteType.PROTECTED);
      });
    });

    describe('匹配优先级', () => {
      it('应该按配置顺序优先匹配（先匹配优先）', () => {
        // /api/* 是公开路由，不应该匹配到受保护路由兜底规则
        expect(matcher.match('/api/unknown')).toBe(RouteType.PUBLIC);
        expect(matcher.match('/api/something/deep')).toBe(RouteType.PUBLIC);
      });

      it('静态路由优先于通配符', () => {
        // /login 是 AUTH，不应被通配符匹配
        expect(matcher.match('/login')).toBe(RouteType.AUTH);
      });
    });
  });

  describe('自定义配置', () => {
    it('应该支持自定义路由规则', () => {
      const customMatcher = createRouteMatcher({
        routes: [
          { pattern: '/admin/:path*', type: RouteType.PROTECTED },
          { pattern: '/:path*', type: RouteType.PUBLIC },
        ],
      });

      expect(customMatcher.match('/admin/users')).toBe(RouteType.PROTECTED);
      expect(customMatcher.match('/admin/settings')).toBe(RouteType.PROTECTED);
      expect(customMatcher.match('/about')).toBe(RouteType.PUBLIC);
      expect(customMatcher.match('/contact')).toBe(RouteType.PUBLIC);
    });

    it('应该支持多个受保护路由', () => {
      const customMatcher = createRouteMatcher({
        routes: [
          { pattern: '/api/:path*', type: RouteType.PUBLIC },
          { pattern: '/public/:path*', type: RouteType.PUBLIC },
          { pattern: '/login', type: RouteType.AUTH },
          { pattern: '/register', type: RouteType.AUTH },
          { pattern: '/admin/:path*', type: RouteType.PROTECTED },
          { pattern: '/dashboard/:path*', type: RouteType.PROTECTED },
          { pattern: '/:path*', type: RouteType.AUTH },
        ],
      });

      expect(customMatcher.match('/admin/users')).toBe(RouteType.PROTECTED);
      expect(customMatcher.match('/dashboard/stats')).toBe(RouteType.PROTECTED);
      expect(customMatcher.match('/other')).toBe(RouteType.AUTH);
    });

    it('空配置应返回 null（无兜底规则）', () => {
      const emptyMatcher = createRouteMatcher({
        routes: [],
      });

      expect(emptyMatcher.match('/any/path')).toBeNull();
    });
  });

  describe('通配符匹配', () => {
    it('应该正确匹配 :path* 通配符', () => {
      const matcher = createRouteMatcher({
        routes: [
          { pattern: '/api/:path*', type: RouteType.PUBLIC },
          { pattern: '/:path*', type: RouteType.PROTECTED },
        ],
      });

      expect(matcher.match('/api')).toBe(RouteType.PUBLIC);
      expect(matcher.match('/api/v1')).toBe(RouteType.PUBLIC);
      expect(matcher.match('/api/v1/users/123')).toBe(RouteType.PUBLIC);
    });

    it('应该支持命名参数匹配', () => {
      const matcher = createRouteMatcher({
        routes: [
          { pattern: '/users/:id', type: RouteType.PROTECTED },
          { pattern: '/posts/:slug', type: RouteType.PROTECTED },
        ],
      });

      expect(matcher.match('/users/123')).toBe(RouteType.PROTECTED);
      expect(matcher.match('/posts/hello-world')).toBe(RouteType.PROTECTED);
    });
  });

  describe('边界情况', () => {
    it('应该正确处理根路径', () => {
      const matcher = createRouteMatcher();
      expect(matcher.match('/')).toBe(RouteType.PROTECTED);
    });

    it('应该正确处理空字符串路径', () => {
      const matcher = createRouteMatcher({
        routes: [
          { pattern: '/:path*', type: RouteType.PUBLIC },
        ],
      });

      // 空字符串不匹配 /:path*
      expect(matcher.match('')).toBeNull();
    });

    it('应该正确处理带查询参数的路径（不包含查询参数）', () => {
      const matcher = createRouteMatcher();

      // match 方法接收的是不含查询参数的 pathname
      // 所以 /api/v1/users?foo=bar 应该被传入为 /api/v1/users
      expect(matcher.match('/api/v1/users')).toBe(RouteType.PUBLIC);
    });

    it('应该正确处理特殊字符路径', () => {
      const matcher = createRouteMatcher({
        routes: [
          { pattern: '/api/:path*', type: RouteType.PUBLIC },
          { pattern: '/:path*', type: RouteType.PROTECTED },
        ],
      });

      // 包含点号的路径
      expect(matcher.match('/api/v1/users.json')).toBe(RouteType.PUBLIC);
      expect(matcher.match('/file.txt')).toBe(RouteType.PROTECTED);
    });
  });
});
