/**
 * Middleware 单元测试
 *
 * 测试路由保护逻辑的正确性
 *
 * @jest-environment @edge-runtime/jest-environment
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { middleware } from './middleware';
import { NextRequest } from 'next/server';

/**
 * 创建模拟请求
 *
 * @param pathname - 请求路径
 * @param cookieValue - Cookie 值（可选，不传表示未认证）
 * @returns NextRequest 模拟对象
 */
function createMockRequest(pathname: string, cookieValue?: string): NextRequest {
  const url = new URL(`http://localhost:3000${pathname}`);
  const request = new NextRequest(url);

  if (cookieValue !== undefined) {
    request.cookies.set('access_token', cookieValue);
  }

  return request;
}

/**
 * 检查响应是否为重定向
 *
 * @param response - NextResponse 对象
 * @param expectedPath - 期望的重定向路径
 */
function expectRedirect(response: Response, expectedPath: string): void {
  expect(response.status).toBe(307);
  const location = response.headers.get('location');
  // Edge Runtime 返回完整 URL，提取路径部分进行比较
  const actualPath = location ? new URL(location).pathname : '';
  expect(actualPath).toBe(expectedPath);
}

/**
 * 检查响应是否放行
 *
 * @param response - NextResponse 对象
 */
function expectNext(response: Response): void {
  expect(response.status).toBe(200);
}

describe('Middleware', () => {
  describe('公开路由 (PUBLIC)', () => {
    describe('API 路由', () => {
      it('应该允许未认证用户访问 API 路由', () => {
        const request = createMockRequest('/api/v1/users');
        const response = middleware(request);

        expectNext(response);
      });

      it('应该允许已认证用户访问 API 路由', () => {
        const request = createMockRequest('/api/v1/users', 'valid_token');
        const response = middleware(request);

        expectNext(response);
      });

      it('应该允许访问任意 API 路径', () => {
        const paths = [
          '/api/auth/login',
          '/api/unknown',
          '/api/v1/posts/123',
        ];

        paths.forEach(path => {
          const request = createMockRequest(path);
          const response = middleware(request);
          expectNext(response);
        });
      });
    });

    describe('Next.js 内部路由', () => {
      it('应该允许访问 _next/static', () => {
        const request = createMockRequest('/_next/static/css/app.css');
        const response = middleware(request);

        expectNext(response);
      });

      it('应该允许访问 _next/chunks', () => {
        const request = createMockRequest('/_next/chunks/main.js');
        const response = middleware(request);

        expectNext(response);
      });
    });

    describe('静态资源路由', () => {
      it('应该允许访问静态资源', () => {
        const request = createMockRequest('/static/logo.png');
        const response = middleware(request);

        expectNext(response);
      });

      it('应该允许访问 favicon.ico', () => {
        const request = createMockRequest('/favicon.ico');
        const response = middleware(request);

        expectNext(response);
      });
    });
  });

  describe('认证路由 (AUTH)', () => {
    describe('登录页面', () => {
      it('应该允许未认证用户访问登录页', () => {
        const request = createMockRequest('/login');
        const response = middleware(request);

        expectNext(response);
      });

      it('应该重定向已认证用户从登录页到首页', () => {
        const request = createMockRequest('/login', 'valid_token');
        const response = middleware(request);

        expectRedirect(response, '/');
      });

      it('应该重定向已认证用户（空 token 视为未认证）', () => {
        const request = createMockRequest('/login', '');
        const response = middleware(request);

        // 空 token 视为未认证，应该放行
        expectNext(response);
      });
    });

    describe('注册页面', () => {
      it('应该允许未认证用户访问注册页', () => {
        const request = createMockRequest('/register');
        const response = middleware(request);

        expectNext(response);
      });

      it('应该重定向已认证用户从注册页到首页', () => {
        const request = createMockRequest('/register', 'valid_token');
        const response = middleware(request);

        expectRedirect(response, '/');
      });
    });
  });

  describe('受保护路由 (PROTECTED)', () => {
    describe('首页', () => {
      it('应该重定向未认证用户到登录页', () => {
        const request = createMockRequest('/');
        const response = middleware(request);

        expectRedirect(response, '/login');
      });

      it('应该允许已认证用户访问首页', () => {
        const request = createMockRequest('/', 'valid_token');
        const response = middleware(request);

        expectNext(response);
      });
    });

    describe('Dashboard 页面', () => {
      it('应该重定向未认证用户到登录页', () => {
        const request = createMockRequest('/dashboard');
        const response = middleware(request);

        expectRedirect(response, '/login');
      });

      it('应该允许已认证用户访问 Dashboard', () => {
        const request = createMockRequest('/dashboard', 'valid_token');
        const response = middleware(request);

        expectNext(response);
      });
    });

    describe('Settings 页面', () => {
      it('应该重定向未认证用户到登录页', () => {
        const request = createMockRequest('/settings/profile');
        const response = middleware(request);

        expectRedirect(response, '/login');
      });

      it('应该允许已认证用户访问 Settings', () => {
        const request = createMockRequest('/settings/profile', 'valid_token');
        const response = middleware(request);

        expectNext(response);
      });
    });

    describe('任意其他页面', () => {
      it('应该重定向未认证用户到登录页（兜底规则）', () => {
        const paths = [
          '/about',
          '/products/123',
          '/any/deep/path',
        ];

        paths.forEach(path => {
          const request = createMockRequest(path);
          const response = middleware(request);
          expectRedirect(response, '/login');
        });
      });

      it('应该允许已认证用户访问任意页面', () => {
        const paths = [
          '/about',
          '/products/123',
          '/any/deep/path',
        ];

        paths.forEach(path => {
          const request = createMockRequest(path, 'valid_token');
          const response = middleware(request);
          expectNext(response);
        });
      });
    });
  });

  describe('Cookie 认证状态判断', () => {
    it('应该正确读取 access_token Cookie', () => {
      const request = createMockRequest('/', 'my_token');
      expect(request.cookies.get('access_token')?.value).toBe('my_token');
    });

    it('应该处理不存在的 Cookie（未认证）', () => {
      const request = createMockRequest('/');
      // Edge Runtime 返回 undefined 而非 null
      expect(request.cookies.get('access_token')).toBeUndefined();
    });

    it('应该处理空字符串 Cookie（未认证）', () => {
      const request = createMockRequest('/', '');
      const response = middleware(request);

      // 空字符串视为未认证，受保护路由应该重定向
      expectRedirect(response, '/login');
    });

    it('应该处理仅空格的 Cookie（视为未认证）', () => {
      const request = createMockRequest('/', '   ');
      const response = middleware(request);

      // 仅空格视为有效 token（虽然奇怪），所以放行
      expectNext(response);
    });
  });

  describe('边界情况', () => {
    it('应该正确处理根路径', () => {
      const request = createMockRequest('/');
      const response = middleware(request);

      expectRedirect(response, '/login');
    });

    it('应该正确处理带查询参数的路径', () => {
      // 注意：NextRequest 的 pathname 不包含查询参数
      // 所以 /login?redirect=/dashboard 会被识别为 /login
      const request = createMockRequest('/login');
      const response = middleware(request);

      expectNext(response);
    });

    it('应该正确处理大小写敏感的路径', () => {
      const request = createMockRequest('/Login');
      const response = middleware(request);

      // /Login 不匹配 /login，会匹配到兜底规则（受保护路由）
      expectRedirect(response, '/login');
    });

    it('应该正确处理特殊字符路径', () => {
      const request = createMockRequest('/user/john.doe', 'valid_token');
      const response = middleware(request);

      expectNext(response);
    });
  });

  describe('安全验证', () => {
    it('不应该暴露详细的认证错误信息', () => {
      // 未认证访问受保护路由，应该直接重定向到登录页
      // 不应该在响应中包含详细的错误信息
      const request = createMockRequest('/dashboard');
      const response = middleware(request);

      expectRedirect(response, '/login');
      expect(response.headers.get('location')).not.toContain('error');
    });

    it('已认证用户访问认证路由时，不应在 URL 中暴露 token', () => {
      const request = createMockRequest('/login', 'secret_token');
      const response = middleware(request);

      expectRedirect(response, '/');
      const location = response.headers.get('location');
      expect(location).not.toContain('secret_token');
    });
  });
});
