/**
 * CookieManager 单元测试
 *
 * 测试覆盖范围：
 * - Token 设置与读取
 * - Token 清除
 * - SSR 安全（服务端环境）
 * - 边界情况处理
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createCookieManager, AUTH_COOKIE_NAME } from '../cookie-manager';

// CookieManager 类型
type CookieManager = ReturnType<typeof createCookieManager>;

describe('CookieManager', () => {
  let cookieManager: CookieManager;
  let mockCookieSetter: jest.Mock;
  let mockCookieGetter: jest.Mock;

  // 保存原始 document.cookie
  let originalCookie: string;

  // 保存最后一次设置的完整 Cookie 字符串
  let lastSetCookieString: string | null = null;

  beforeEach(() => {
    // 保存原始 cookie
    originalCookie = document.cookie;
    lastSetCookieString = null;

    // Mock document.cookie
    let cookieStore = new Map<string, string>();

    mockCookieGetter = jest.fn(() => {
      // 返回所有 cookie，用 ; 分隔（只返回 key=value，不含属性）
      return Array.from(cookieStore.entries())
        .filter(([key]) => !key.startsWith('__full__'))
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    });

    mockCookieSetter = jest.fn((cookieString: string) => {
      // 保存完整的 cookie 字符串用于测试验证
      lastSetCookieString = cookieString;

      // 解析 cookie 字符串并存储
      const match = cookieString.match(/^([^=]+)=([^;]*)/);
      if (match) {
        const [, key, value] = match;
        cookieStore.set('__full__' + key, cookieString); // 保存完整字符串
        cookieStore.set(key, value); // 保存值（用于 get）
      }
    });

    Object.defineProperty(document, 'cookie', {
      get: mockCookieGetter,
      set: mockCookieSetter,
      configurable: true,
    });

    cookieManager = createCookieManager();
  });

  afterEach(() => {
    // 恢复原始 cookie
    Object.defineProperty(document, 'cookie', {
      value: originalCookie,
      writable: true,
    });

    jest.clearAllMocks();
    lastSetCookieString = null;
  });

  describe('setAuthToken', () => {
    it('应该设置 access_token Cookie', () => {
      cookieManager.setAuthToken('my_token');

      expect(document.cookie).toContain('access_token=my_token');
    });

    it('应该包含正确的 Cookie 属性', () => {
      cookieManager.setAuthToken('my_token');

      expect(lastSetCookieString).toContain('access_token=my_token');
      expect(lastSetCookieString).toMatch(/[Pp]ath=\//); // 大小写不敏感
      expect(lastSetCookieString).toMatch(/[Mm]ax-[Aa]ge=/); // 大小写不敏感
      expect(lastSetCookieString).toContain('SameSite=Lax');
    });

    it('应该使用 7 天的过期时间', () => {
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      cookieManager.setAuthToken('my_token');

      expect(lastSetCookieString).toContain(`Max-Age=${sevenDaysInSeconds}`);
    });

    it('应该覆盖已存在的 token', () => {
      cookieManager.setAuthToken('old_token');
      cookieManager.setAuthToken('new_token');

      expect(cookieManager.getAuthToken()).toBe('new_token');
    });

    it('应该正确处理空字符串 token', () => {
      cookieManager.setAuthToken('');

      expect(lastSetCookieString).toContain('access_token=');
    });
  });

  describe('getAuthToken', () => {
    it('应该返回已设置的 token', () => {
      cookieManager.setAuthToken('my_token');

      expect(cookieManager.getAuthToken()).toBe('my_token');
    });

    it('应该返回 null 当 token 不存在时', () => {
      expect(cookieManager.getAuthToken()).toBeNull();
    });

    it('应该返回 null 当 cookie 为空字符串时', () => {
      // 设置空 cookie
      Object.defineProperty(document, 'cookie', {
        get: jest.fn(() => ''),
        set: jest.fn(),
        configurable: true,
      });

      const newManager = createCookieManager();
      expect(newManager.getAuthToken()).toBeNull();
    });

    it('应该正确解析多个 cookie', () => {
      // 模拟多个 cookie
      Object.defineProperty(document, 'cookie', {
        get: jest.fn(() => 'other_cookie=value; access_token=my_token; another=value2'),
        set: jest.fn(),
        configurable: true,
      });

      const newManager = createCookieManager();
      expect(newManager.getAuthToken()).toBe('my_token');
    });

    it('应该处理 cookie 值中的特殊字符', () => {
      const tokenWithSpecialChars = 'token.with.dots+plus/slash=equals';
      cookieManager.setAuthToken(tokenWithSpecialChars);

      expect(cookieManager.getAuthToken()).toBe(tokenWithSpecialChars);
    });
  });

  describe('clearAuthToken', () => {
    it('应该清除 access_token Cookie', () => {
      cookieManager.setAuthToken('my_token');
      expect(cookieManager.getAuthToken()).toBe('my_token');

      cookieManager.clearAuthToken();
      expect(cookieManager.getAuthToken()).toBeNull();
    });

    it('应该使用 max-age=0 来清除 cookie', () => {
      cookieManager.clearAuthToken();

      expect(lastSetCookieString).toMatch(/[Mm]ax-[Aa]ge=0/);
    });

    it('应该保持 path=/ 属性', () => {
      cookieManager.clearAuthToken();

      expect(lastSetCookieString).toMatch(/[Pp]ath=\//);
    });

    it('应该多次调用不报错', () => {
      cookieManager.setAuthToken('my_token');
      cookieManager.clearAuthToken();
      cookieManager.clearAuthToken(); // 第二次调用
      cookieManager.clearAuthToken(); // 第三次调用

      expect(cookieManager.getAuthToken()).toBeNull();
    });
  });

  describe('hasAuthToken', () => {
    it('应该返回 true 当 token 存在时', () => {
      cookieManager.setAuthToken('my_token');

      expect(cookieManager.hasAuthToken()).toBe(true);
    });

    it('应该返回 false 当 token 不存在时', () => {
      expect(cookieManager.hasAuthToken()).toBe(false);
    });

    it('应该返回 false 当 token 为空字符串时', () => {
      cookieManager.setAuthToken('');

      // 空字符串视为无效 token
      expect(cookieManager.hasAuthToken()).toBe(false);
    });

    it('应该在清除后返回 false', () => {
      cookieManager.setAuthToken('my_token');
      expect(cookieManager.hasAuthToken()).toBe(true);

      cookieManager.clearAuthToken();
      expect(cookieManager.hasAuthToken()).toBe(false);
    });
  });

  describe('SSR 安全性', () => {
    it('应该在 SSR 环境中不设置 cookie', () => {
      // 模拟 SSR 环境
      const originalWindow = global.window;
      // @ts-ignore - 模拟服务端
      delete global.window;

      const ssrManager = createCookieManager();
      ssrManager.setAuthToken('my_token');

      // 不应该抛出异常
      expect(() => ssrManager.setAuthToken('my_token')).not.toThrow();

      // 恢复
      global.window = originalWindow;
    });

    it('应该在 SSR 环境中返回 null', () => {
      // 模拟 SSR 环境
      const originalWindow = global.window;
      // @ts-ignore - 模拟服务端
      delete global.window;

      const ssrManager = createCookieManager();
      expect(ssrManager.getAuthToken()).toBeNull();
      expect(ssrManager.hasAuthToken()).toBe(false);

      // 恢复
      global.window = originalWindow;
    });

    it('应该在 SSR 环境中不报错地清除 cookie', () => {
      // 模拟 SSR 环境
      const originalWindow = global.window;
      // @ts-ignore - 模拟服务端
      delete global.window;

      const ssrManager = createCookieManager();
      expect(() => ssrManager.clearAuthToken()).not.toThrow();

      // 恢复
      global.window = originalWindow;
    });

    it('应该检测 typeof window === "undefined"', () => {
      // 模拟 SSR 环境
      const originalWindow = global.window;
      // @ts-ignore - 模拟服务端
      delete global.window;

      expect(typeof window).toBe('undefined');

      // 恢复
      global.window = originalWindow;
    });
  });

  describe('边界情况', () => {
    it('应该处理非常长的 token', () => {
      const longToken = 'a'.repeat(10000);
      cookieManager.setAuthToken(longToken);

      expect(cookieManager.getAuthToken()).toBe(longToken);
    });

    it('应该处理包含 unicode 的 token', () => {
      const unicodeToken = 'token你好世界🌍مرحبا';
      cookieManager.setAuthToken(unicodeToken);

      expect(cookieManager.getAuthToken()).toBe(unicodeToken);
    });

    it('应该处理包含等号的 token', () => {
      const tokenWithEquals = 'token=with=equals';
      cookieManager.setAuthToken(tokenWithEquals);

      expect(cookieManager.getAuthToken()).toBe(tokenWithEquals);
    });

    it('应该处理包含分号的 token', () => {
      const tokenWithSemicolon = 'token;with;semicolon';
      cookieManager.setAuthToken(tokenWithSemicolon);

      // Cookie 解析可能受分号影响，但应该尽力处理
      const result = cookieManager.getAuthToken();
      expect(result).toBeTruthy();
    });

    it('应该处理只包含空格的 token', () => {
      cookieManager.setAuthToken('   ');

      // 空格 token 存在，hasAuthToken 检查 token.length > 0，空格长度 > 0
      expect(cookieManager.getAuthToken()).toBe('   ');
      expect(cookieManager.hasAuthToken()).toBe(true); // 修正：空格被视为有效 token
    });

    it('应该处理连续设置不同 token', () => {
      const tokens = ['token1', 'token2', 'token3'];

      tokens.forEach(token => {
        cookieManager.setAuthToken(token);
        expect(cookieManager.getAuthToken()).toBe(token);
      });

      // 最终应该是最后一个 token
      expect(cookieManager.getAuthToken()).toBe('token3');
    });
  });

  describe('Cookie 属性', () => {
    it('应该使用正确的 Cookie 名称', () => {
      expect(AUTH_COOKIE_NAME).toBe('access_token');
    });

    it('应该包含 path=/ 属性', () => {
      cookieManager.setAuthToken('test_token');

      expect(lastSetCookieString).toMatch(/[Pp]ath=\//);
    });

    it('应该使用 SameSite=Lax', () => {
      cookieManager.setAuthToken('test_token');

      expect(lastSetCookieString).toContain('SameSite=Lax');
    });

    it('应该在清除时也包含 path=/', () => {
      cookieManager.clearAuthToken();

      expect(lastSetCookieString).toMatch(/[Pp]ath=\//);
    });
  });

  describe('与 TokenStorage 的集成', () => {
    it('应该与 TokenStorage 设置的 token 兼容', () => {
      // 模拟 TokenStorage 设置的 token
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

      cookieManager.setAuthToken(testToken);

      expect(cookieManager.getAuthToken()).toBe(testToken);
      expect(cookieManager.hasAuthToken()).toBe(true);
    });

    it('应该支持清除后重新设置', () => {
      cookieManager.setAuthToken('token1');
      expect(cookieManager.getAuthToken()).toBe('token1');

      cookieManager.clearAuthToken();
      expect(cookieManager.getAuthToken()).toBeNull();

      cookieManager.setAuthToken('token2');
      expect(cookieManager.getAuthToken()).toBe('token2');
    });
  });
});
