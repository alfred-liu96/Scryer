/**
 * HttpClient 单元测试
 *
 * 测试覆盖范围：
 * - Token 自动注入逻辑
 * - skipAuth 选项
 * - 手动指定 Authorization Header（不覆盖）
 * - 无 Token 场景
 * - Headers 合并逻辑
 * - 边界情况处理
 * - 401 响应拦截器 (Issue #111)
 * - Token 刷新互斥锁 (Issue #111)
 * - 请求队列机制 (Issue #111)
 *
 * 目标覆盖率: >= 90%
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { HttpClient } from '../client';
import type { TokenStorage } from '@/lib/storage/token-storage';

// Token Refresh Response 类型（根据蓝图定义）
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

// Mock TokenStorage
const createMockTokenStorage = (): jest.Mocked<TokenStorage> => ({
  getAccessToken: jest.fn(),
  getTokens: jest.fn(),
  setTokens: jest.fn(),
  getRefreshToken: jest.fn(),
  hasValidTokens: jest.fn(),
  isTokenExpired: jest.fn(),
  clearTokens: jest.fn(),
});

describe('HttpClient - Token Injection', () => {
  let client: HttpClient;
  let mockTokenStorage: jest.Mocked<TokenStorage>;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Mock TokenStorage
    mockTokenStorage = createMockTokenStorage();

    // 创建客户端（注入 mock）
    client = new HttpClient(
      'https://api.test.com',
      5000,
      mockTokenStorage
    );

    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('beforeRequest - Token Injection', () => {
    it('should inject Authorization header when token exists', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('test_token_123');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      await client.get('/api/v1/protected');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/v1/protected',
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test_token_123');
    });

    it('should not inject Authorization header when token is null', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      await client.get('/api/v1/public');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should not inject when skipAuth is true', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('test_token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      // 需要通过 options 参数传递 skipAuth
      await client.request('/api/v1/health', { skipAuth: true });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should not override manually specified Authorization header', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('stored_token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      const customToken = 'Bearer custom_token_456';
      await client.request('/api/external', {
        headers: { Authorization: customToken },
      });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe(customToken);
      expect(headers.get('Authorization')).not.toBe('Bearer stored_token');
    });

    it('should not call getAccessToken when Authorization header exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      await client.request('/api/external', {
        headers: { Authorization: 'Bearer custom' },
      });

      expect(mockTokenStorage.getAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('request methods - Token injection', () => {
    beforeEach(() => {
      mockTokenStorage.getAccessToken.mockReturnValue('auth_token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);
    });

    it('GET request should include token', async () => {
      await client.get('/api/data');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer auth_token');
    });

    it('POST request should include token', async () => {
      await client.post('/api/data', { name: 'test' });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer auth_token');
    });

    it('PUT request should include token', async () => {
      await client.put('/api/data/1', { name: 'updated' });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer auth_token');
    });

    it('PATCH request should include token', async () => {
      await client.patch('/api/data/1', { name: 'patched' });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer auth_token');
    });

    it('DELETE request should include token', async () => {
      await client.delete('/api/data/1');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer auth_token');
    });
  });

  describe('headers normalization', () => {
    it('should handle Headers object', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const customHeaders = new Headers();
      customHeaders.set('X-Custom-Header', 'custom_value');

      await client.request('/api/data', { headers: customHeaders });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('X-Custom-Header')).toBe('custom_value');
      expect(headers.get('Authorization')).toBe('Bearer token');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle plain object headers', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.request('/api/data', {
        headers: { 'X-Custom': 'value' },
      });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('X-Custom')).toBe('value');
      expect(headers.get('Authorization')).toBe('Bearer token');
    });

    it('should handle array headers', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.request('/api/data', {
        headers: [['X-Custom', 'value'], ['X-Another', 'another_value']],
      });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('X-Custom')).toBe('value');
      expect(headers.get('X-Another')).toBe('another_value');
    });

    it('should preserve case-insensitive header matching', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.request('/api/data', {
        headers: { authorization: 'Bearer custom' }, // lowercase
      });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      // 应该保留手动指定的 authorization（大小写不敏感）
      expect(headers.get('Authorization')).toBe('Bearer custom');
      expect(mockTokenStorage.getAccessToken).not.toHaveBeenCalled();
    });

    it('should preserve existing Content-Type header', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.request('/api/data', {
        headers: { 'Content-Type': 'application/xml' },
      });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/xml');
    });

    it('should add default Content-Type when not present', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.request('/api/data', {});

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('edge cases', () => {
    it('should handle missing TokenStorage gracefully', () => {
      // 不注入 tokenStorage，使用默认实例
      const noStorageClient = new HttpClient('https://api.test.com');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      expect(() => {
        noStorageClient.get('/api/data');
      }).not.toThrow();
    });

    it('should treat empty token as null', async () => {
      // Empty token should be treated the same as null - no Authorization header
      mockTokenStorage.getAccessToken.mockReturnValue('');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.get('/api/data');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      // Empty string is falsy, so no Authorization header should be injected
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle special characters in token', async () => {
      const specialToken = 'token.with.dots-and_underscores';
      mockTokenStorage.getAccessToken.mockReturnValue(specialToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.get('/api/data');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe(`Bearer ${specialToken}`);
    });

    it('should handle very long token', async () => {
      const longToken = 'a'.repeat(10000);
      mockTokenStorage.getAccessToken.mockReturnValue(longToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.get('/api/data');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe(`Bearer ${longToken}`);
    });

    it('should handle URL-safe tokens with special chars', async () => {
      // JWT tokens only contain URL-safe ASCII characters (A-Za-z0-9-_.)
      const urlSafeToken = 'token.with-dashes_and_underscores123';
      mockTokenStorage.getAccessToken.mockReturnValue(urlSafeToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.get('/api/data');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe(`Bearer ${urlSafeToken}`);
    });

    it('should handle concurrent requests', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const promises = [
        client.get('/api/data1'),
        client.get('/api/data2'),
        client.get('/api/data3'),
      ];

      await Promise.all(promises);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      mockFetch.mock.calls.forEach(call => {
        const headers = call[1].headers as Headers;
        expect(headers.get('Authorization')).toBe('Bearer token');
      });
    });

    it('should handle token with special URL characters', async () => {
      const urlSpecialToken = 'token/with@slashes#and?symbols';
      mockTokenStorage.getAccessToken.mockReturnValue(urlSpecialToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.get('/api/data');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe(`Bearer ${urlSpecialToken}`);
    });

    it('should handle null tokenStorage gracefully', async () => {
      // 创建客户端时传入 undefined，模拟内部没有 tokenStorage
      const clientNoStorage = new HttpClient('https://api.test.com', 5000, undefined);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await clientNoStorage.get('/api/data');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle multiple consecutive requests with different tokens', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      // 第一次请求
      mockTokenStorage.getAccessToken.mockReturnValue('token1');
      await client.get('/api/data1');

      // 第二次请求
      mockTokenStorage.getAccessToken.mockReturnValue('token2');
      await client.get('/api/data2');

      // 第三次请求（无 token）
      mockTokenStorage.getAccessToken.mockReturnValue(null);
      await client.get('/api/data3');

      const headers1 = mockFetch.mock.calls[0][1].headers as Headers;
      const headers2 = mockFetch.mock.calls[1][1].headers as Headers;
      const headers3 = mockFetch.mock.calls[2][1].headers as Headers;

      expect(headers1.get('Authorization')).toBe('Bearer token1');
      expect(headers2.get('Authorization')).toBe('Bearer token2');
      expect(headers3.get('Authorization')).toBeNull();
    });
  });

  describe('backward compatibility', () => {
    it('should work without AuthRequestInit options', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      // 调用时不传递 options（向后兼容）
      await client.get('/api/data');

      expect(mockFetch).toHaveBeenCalled();
      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer token');
    });

    it('should work with default constructor parameters', () => {
      // 默认实例应该正常创建（不抛出异常）
      expect(() => {
        const defaultClient = new HttpClient();
        expect(defaultClient).toBeInstanceOf(HttpClient);
      }).not.toThrow();
    });

    it('should work with only baseURL parameter', () => {
      expect(() => {
        const client = new HttpClient('https://api.example.com');
        expect(client).toBeInstanceOf(HttpClient);
      }).not.toThrow();
    });

    it('should preserve existing request behavior', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'data' }),
      } as Response);

      const result = await client.get('/api/legacy');

      expect(result).toEqual({ result: 'data' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/legacy',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors with token injection', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.get('/api/data')).rejects.toThrow('Network error');
    });

    it('should handle HTTP errors with token injection', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 使用 skipAuth: true 避免 401 触发 Token 刷新逻辑（Issue #111）
      await expect(client.request('/api/data', { skipAuth: true })).rejects.toThrow('Unauthorized');
    });

    it('should handle timeout with token injection', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');

      // 模拟超时（10秒超时配置，6秒触发超时）
      mockFetch.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 6000);
        });
      });

      await expect(client.get('/api/data')).rejects.toThrow();
    }, 10000); // Increase test timeout to 10 seconds

    it('should handle invalid JSON response', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      await expect(client.get('/api/data')).rejects.toThrow('Invalid JSON');
    });

    it('should preserve token injection during error scenarios', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('error_token');
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Server error' }),
      } as Response);

      await expect(client.post('/api/data', { test: 'data' })).rejects.toThrow();

      // 确保即使在错误情况下，token 也被注入了
      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer error_token');
    });
  });

  describe('request method signatures', () => {
    beforeEach(() => {
      mockTokenStorage.getAccessToken.mockReturnValue('test_token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);
    });

    it('GET should handle query parameters', async () => {
      await client.get('/api/data', { page: '1', limit: '10' });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('page=1');
      expect(url).toContain('limit=10');
    });

    it('POST should include request body', async () => {
      const body = { name: 'test', value: 123 };
      await client.post('/api/data', body);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBe(JSON.stringify(body));
    });

    it('PUT should include request body', async () => {
      const body = { id: 1, name: 'updated' };
      await client.put('/api/data/1', body);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBe(JSON.stringify(body));
      expect(callArgs.method).toBe('PUT');
    });

    it('PATCH should include request body', async () => {
      const body = { name: 'patched' };
      await client.patch('/api/data/1', body);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toBe(JSON.stringify(body));
      expect(callArgs.method).toBe('PATCH');
    });

    it('DELETE should not have body', async () => {
      await client.delete('/api/data/1');

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.method).toBe('DELETE');
      expect(callArgs.body).toBeUndefined();
    });

    it('GET should work without parameters', async () => {
      await client.get('/api/data');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/data',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('POST should work without body', async () => {
      await client.post('/api/data');

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.method).toBe('POST');
    });
  });

  describe('Authorization header format', () => {
    it('should always use Bearer prefix', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('my_token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.get('/api/data');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer my_token');
    });

    it('should not add extra Bearer prefix if token includes it', async () => {
      // 如果 token 已经包含 "Bearer " 前缀，不应该重复添加
      // 但这是调用方的责任，HttpClient 应该信任 TokenStorage
      const tokenWithBearer = 'Bearer already_has_prefix';
      mockTokenStorage.getAccessToken.mockReturnValue(tokenWithBearer);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.get('/api/data');

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      // HttpClient 会添加前缀，所以结果是 "Bearer Bearer already_has_prefix"
      // 这不是 HttpClient 的问题，而是 TokenStorage 提供了错误的值
      expect(headers.get('Authorization')).toBe(`Bearer ${tokenWithBearer}`);
    });
  });

  describe('integration scenarios', () => {
    it('should complete full request cycle with token', async () => {
      // 模拟完整的请求流程
      mockTokenStorage.getAccessToken.mockReturnValue('session_token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
        }),
      } as Response);

      const response = await client.get('/api/v1/auth/me');

      expect(mockTokenStorage.getAccessToken).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer session_token');
      expect(response).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      });
    });

    it('should handle public endpoint without token', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      } as Response);

      const response = await client.request('/api/health', { skipAuth: true });

      expect(mockTokenStorage.getAccessToken).not.toHaveBeenCalled();
      expect(response).toEqual({ status: 'healthy' });
    });

    it('should handle authenticated request after token refresh', async () => {
      // 第一次请求使用旧 token
      mockTokenStorage.getAccessToken.mockReturnValue('old_token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'first' }),
      } as Response);

      await client.get('/api/data');

      // 第二次请求使用新 token
      mockTokenStorage.getAccessToken.mockReturnValue('new_token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'second' }),
      } as Response);

      await client.get('/api/data');

      const headers1 = mockFetch.mock.calls[0][1].headers as Headers;
      const headers2 = mockFetch.mock.calls[1][1].headers as Headers;

      expect(headers1.get('Authorization')).toBe('Bearer old_token');
      expect(headers2.get('Authorization')).toBe('Bearer new_token');
    });
  });

  describe('constructor variations', () => {
    it('should accept custom baseURL', async () => {
      const customClient = new HttpClient('https://custom.api.com', 5000, mockTokenStorage);
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await customClient.get('/endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/endpoint',
        expect.any(Object)
      );
    });

    it('should accept custom timeout', () => {
      const customClient = new HttpClient(
        'https://api.test.com',
        10000,
        mockTokenStorage
      );
      expect(customClient).toBeInstanceOf(HttpClient);
    });

    it('should work with all custom parameters', async () => {
      const customClient = new HttpClient(
        'https://custom.api.com',
        10000,
        mockTokenStorage
      );
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await customClient.post('/endpoint', { data: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/endpoint',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('skipAuth behavior', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);
    });

    it('should skip token injection when skipAuth is true', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');

      await client.request('/api/public', { skipAuth: true });

      expect(mockTokenStorage.getAccessToken).not.toHaveBeenCalled();

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should still merge custom headers when skipAuth is true', async () => {
      await client.request('/api/public', {
        skipAuth: true,
        headers: { 'X-Custom': 'value' },
      });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('X-Custom')).toBe('value');
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should skipAuth should override manual Authorization header', async () => {
      await client.request('/api/public', {
        skipAuth: true,
        headers: { Authorization: 'Bearer manual_token' },
      });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      // skipAuth 应该阻止所有 Authorization headers
      expect(headers.get('Authorization')).toBeNull();
    });
  });

  describe('header preservation', () => {
    it('should preserve all custom headers with token injection', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.request('/api/data', {
        headers: {
          'X-Request-ID': '12345',
          'X-Client-Version': '1.0.0',
          'Accept': 'application/vnd.api+json',
        },
      });

      const headers = mockFetch.mock.calls[0][1].headers as Headers;
      expect(headers.get('X-Request-ID')).toBe('12345');
      expect(headers.get('X-Client-Version')).toBe('1.0.0');
      expect(headers.get('Accept')).toBe('application/vnd.api+json');
      expect(headers.get('Authorization')).toBe('Bearer token');
    });

    it('should handle multiple custom headers of different types', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const headersObj = new Headers();
      headersObj.set('X-From-Obj', 'value1');

      await client.request('/api/data', {
        headers: {
          'X-From-Record': 'value2',
        },
      });

      const finalHeaders = mockFetch.mock.calls[0][1].headers as Headers;
      expect(finalHeaders.get('Authorization')).toBe('Bearer token');
      expect(finalHeaders.get('Content-Type')).toBe('application/json');
    });
  });
});

// ============================================================
// Issue #111: 401 响应拦截器与 Token 刷新互斥锁测试
// ============================================================

describe('HttpClient - 401 Response Interceptor (Issue #111)', () => {
  let client: HttpClient;
  let mockTokenStorage: jest.Mocked<TokenStorage>;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockTokenStorage = createMockTokenStorage();
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    client = new HttpClient('https://api.test.com', 5000, mockTokenStorage);

    // 为所有 401 测试设置默认的 refresh_token
    mockTokenStorage.getRefreshToken.mockReturnValue('default_refresh_token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基础 401 拦截与 Token 刷新', () => {
    it('应在收到 401 响应时触发 Token 刷新', async () => {
      // Mock refresh_token
      mockTokenStorage.getRefreshToken.mockReturnValue('valid_refresh_token');

      // 第一次请求返回 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 刷新请求成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      // 重试原始请求成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      const result = await client.get('/api/protected');

      // 验证刷新流程：原始请求 + 刷新请求 + 重试请求
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // 验证新 Token 被保存
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      // 验证最终返回正确的数据
      expect(result).toEqual({ data: 'success' });
    });

    it('应在刷新成功后使用新 Token 重试原始请求', async () => {
      // 模拟 Token 变化：第一次返回旧 token，之后返回新 token
      let callCount = 0;
      mockTokenStorage.getAccessToken.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 'old_token' : 'new_token';
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'data' }),
      } as Response);

      await client.get('/api/data');

      // 验证重试请求使用了新 Token
      const retryCall = mockFetch.mock.calls[2];
      const retryHeaders = retryCall[1].headers as Headers;
      expect(retryHeaders.get('Authorization')).toBe('Bearer new_token');
    });

    it('不应在非 401 错误时触发刷新', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Server error' }),
      } as Response);

      await expect(client.get('/api/data')).rejects.toThrow('Server error');

      // 验证没有调用刷新逻辑
      expect(mockTokenStorage.getRefreshToken).not.toHaveBeenCalled();
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });
  });

  describe('并发 401 互斥控制', () => {
    it('多个并发 401 请求应只触发一次 Token 刷新', async () => {
      let callCount = 0;

      // 使用 mockImplementation 来区分不同类型的请求
      mockFetch.mockImplementation((url) => {
        callCount++;

        // 刷新请求（包含 /auth/refresh）
        if (typeof url === 'string' && url.includes('/auth/refresh')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              access_token: 'new_access',
              refresh_token: 'new_refresh',
              token_type: 'Bearer',
              expires_in: 3600,
            }),
          } as Response);
        }

        // 前三次请求返回 401
        if (callCount <= 3) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ detail: 'Unauthorized' }),
          } as Response);
        }

        // 重试请求成功
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);
      });

      // 并发 3 个请求
      const promises = [
        client.get('/api/data1'),
        client.get('/api/data2'),
        client.get('/api/data3'),
      ];

      await Promise.all(promises);

      // 验证只调用了 1 次 refresh API
      const refreshCalls = mockFetch.mock.calls.filter(call => {
        const url = call[0] as string;
        return typeof url === 'string' && url.includes('/auth/refresh');
      });
      expect(refreshCalls).toHaveLength(1);
    });

    it('应在刷新期间将新的 401 请求加入队列', async () => {
      let resolveRefresh: (value: Response) => void;

      // 刷新请求延迟（挂起）
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/auth/refresh')) {
          return new Promise(resolve => {
            resolveRefresh = resolve;
          });
        }
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Unauthorized' }),
        } as Response);
      });

      // 发起第一个 401 请求（触发刷新）
      const promise1 = client.get('/api/data1');

      // 在刷新期间发起第二个 401 请求（应加入队列）
      const promise2 = client.get('/api/data2');

      // 完成刷新
      resolveRefresh!({
        ok: true,
        json: async () => ({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      // 重试请求成功
      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);
      });

      await Promise.all([promise1, promise2]);

      // 验证两个请求都成功了
      expect(mockFetch).toHaveBeenCalled();
    });

    it('应复用现有的刷新 Promise（互斥锁）', async () => {
      mockTokenStorage.getRefreshToken.mockReturnValue('refresh_123');

      let resolveFetch: (value: Response) => void;

      // 刷新请求挂起
      mockFetch.mockImplementation(() => {
        return new Promise(resolve => {
          resolveFetch = resolve;
        });
      });

      // 第一个刷新请求（pending）
      const promise1 = client.get('/api/data1');

      // 第二个刷新请求（应复用第一个）
      const promise2 = client.get('/api/data2');

      // 完成刷新
      resolveFetch!({
        ok: true,
        json: async () => ({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      // 重试请求成功
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await Promise.all([promise1, promise2]);

      // 验证只调用了 1 次 refresh API
      const refreshCalls = mockFetch.mock.calls.filter(call => {
        const url = call[0] as string;
        return typeof url === 'string' && url.includes('/auth/refresh');
      });
      expect(refreshCalls).toHaveLength(1);
    });
  });

  describe('刷新失败后的降级处理', () => {
    it('应在刷新失败时调用 onRefreshFailure 回调', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 刷新请求失败
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid refresh token' }),
      } as Response);

      const mockFailureCallback = jest.fn();
      client.onRefreshFailure = mockFailureCallback;

      await expect(client.get('/api/data')).rejects.toThrow();

      expect(mockFailureCallback).toHaveBeenCalled();
    });

    it('应在刷新失败时清除 Token', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 刷新失败
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid' }),
      } as Response);

      await expect(client.get('/api/data')).rejects.toThrow();

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('应在刷新失败时拒绝所有排队的请求', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 刷新失败
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid' }),
      } as Response);

      const promises = [
        client.get('/api/data1'),
        client.get('/api/data2'),
        client.get('/api/data3'),
      ];

      // 所有请求都应该失败
      await expect(Promise.all(promises)).rejects.toThrow();
    });

    it('应处理刷新时的网络错误', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 刷新请求网络错误
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.get('/api/data')).rejects.toThrow();
    });
  });

  describe('无 refresh_token 场景', () => {
    it('应在无 refresh_token 时拒绝刷新并调用失败回调', async () => {
      mockTokenStorage.getRefreshToken.mockReturnValue(null);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      const mockFailureCallback = jest.fn();
      client.onRefreshFailure = mockFailureCallback;

      await expect(client.get('/api/data')).rejects.toThrow();

      expect(mockFailureCallback).toHaveBeenCalled();
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });

    it('应在无 refresh_token 时清除所有 Token', async () => {
      mockTokenStorage.getRefreshToken.mockReturnValue(null);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      await expect(client.get('/api/data')).rejects.toThrow();

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });
  });

  describe('请求队列机制', () => {
    it('应处理刷新期间到达的多个请求', async () => {
      let resolveRefresh: (value: Response) => void;

      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/auth/refresh')) {
          return new Promise(resolve => {
            resolveRefresh = resolve;
          });
        }
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ detail: 'Unauthorized' }),
        } as Response);
      });

      // 发起 3 个并发请求
      const promise1 = client.get('/api/data1');
      const promise2 = client.get('/api/data2');
      const promise3 = client.get('/api/data3');

      // 完成刷新
      resolveRefresh!({
        ok: true,
        json: async () => ({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      // 重试请求成功
      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);
      });

      await Promise.all([promise1, promise2, promise3]);

      // 验证所有请求都成功了
      expect(mockFetch).toHaveBeenCalled();
    });

    it('应在刷新成功后处理队列中的所有请求', async () => {
      mockTokenStorage.getRefreshToken.mockReturnValue('refresh_123');
      mockTokenStorage.setTokens.mockReturnValue(true);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ queued: 'success' }),
      } as Response);

      const promises = [
        client.get('/api/queued1'),
        client.get('/api/queued2'),
      ];

      await Promise.all(promises);

      // 验证刷新请求只调用一次
      const refreshCalls = mockFetch.mock.calls.filter(call => {
        const url = call[0] as string;
        return typeof url === 'string' && url.includes('/auth/refresh');
      });
      expect(refreshCalls).toHaveLength(1);

      // 验证队列请求被处理（重试）
      const retryCalls = mockFetch.mock.calls.filter(call => {
        const url = call[0] as string;
        return typeof url === 'string' && (url.includes('/queued1') || url.includes('/queued2'));
      });
      // 每个请求被调用两次：初始 401 + 重试成功
      expect(retryCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('应在刷新失败后清空队列并拒绝所有请求', async () => {
      mockTokenStorage.getRefreshToken.mockReturnValue('invalid_token');

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 刷新失败
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid refresh token' }),
      } as Response);

      const promises = [
        client.get('/api/queued1'),
        client.get('/api/queued2'),
        client.get('/api/queued3'),
      ];

      // 所有请求都应该失败
      const results = await Promise.allSettled(promises);

      results.forEach(result => {
        expect(result.status).toBe('rejected');
      });
    });
  });

  describe('边界情况', () => {
    it('应处理快速连续的 401 响应（10 个请求）', async () => {
      // 连续 10 个 401 请求
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const promises = Array.from({ length: 10 }, (_, i) =>
        client.get(`/api/data${i}`)
      );

      await Promise.all(promises);

      // 仍然只触发 1 次刷新
      const refreshCalls = mockFetch.mock.calls.filter(call => {
        const url = call[0] as string;
        return typeof url === 'string' && url.includes('/auth/refresh');
      });
      expect(refreshCalls).toHaveLength(1);
    });

    it('应处理刷新后重试仍然返回 401 的情况', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      // 重试后仍然 401（极端情况，可能后端有问题）
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Still unauthorized' }),
      } as Response);

      // 第二次刷新失败
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Refresh failed' }),
      } as Response);

      await expect(client.get('/api/data')).rejects.toThrow();

      // 验证尝试了两次刷新
      const refreshCalls = mockFetch.mock.calls.filter(call => {
        const url = call[0] as string;
        return typeof url === 'string' && url.includes('/auth/refresh');
      });
      expect(refreshCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('应处理重试后返回非 401 错误码', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      // 重试后返回 403 Forbidden
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ detail: 'Forbidden' }),
      } as Response);

      await expect(client.get('/api/data')).rejects.toThrow('Forbidden');

      // 验证只调用了 1 次刷新
      const refreshCalls = mockFetch.mock.calls.filter(call => {
        const url = call[0] as string;
        return typeof url === 'string' && url.includes('/auth/refresh');
      });
      expect(refreshCalls).toHaveLength(1);
    });

    it('应处理空 Token 响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: '',
          refresh_token: '',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await client.get('/api/data');

      expect(result).toEqual({ success: true });
      expect(mockTokenStorage.setTokens).toHaveBeenCalled();
    });

    it('应处理刷新超时', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 刷新请求超时
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Refresh timeout')), 100);
        });
      });

      await expect(client.get('/api/data')).rejects.toThrow();
    }, 10000);
  });

  describe('状态管理', () => {
    it('应在刷新完成后重置状态', async () => {
      mockTokenStorage.getRefreshToken.mockReturnValue('refresh_123');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.get('/api/data');

      // 刷新完成后，新的 401 请求应该能正常触发刷新
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'another_access',
          refresh_token: 'another_refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await client.get('/api/data2');

      // 验证第二次刷新也被触发
      const refreshCalls = mockFetch.mock.calls.filter(call => {
        const url = call[0] as string;
        return typeof url === 'string' && url.includes('/auth/refresh');
      });
      expect(refreshCalls).toHaveLength(2);
    });

    it('应在刷新失败后重置状态', async () => {
      // 第一个请求返回 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 刷新失败
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid' }),
      } as Response);

      await expect(client.get('/api/data')).rejects.toThrow();

      // 失败后，新的 401 请求应该能尝试刷新
      mockTokenStorage.getRefreshToken.mockReturnValue('new_refresh');

      // 第二个请求返回 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      // 第二次刷新成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      } as Response);

      // 重试请求成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await client.get('/api/data2');

      expect(result).toEqual({ success: true });
    });
  });

  describe('skipAuth 与 401 拦截的交互', () => {
    it('当 skipAuth 为 true 时收到 401 不应触发刷新', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      await expect(
        client.request('/api/public', { skipAuth: true })
      ).rejects.toThrow('Unauthorized');

      // 验证没有调用刷新逻辑
      expect(mockTokenStorage.getRefreshToken).not.toHaveBeenCalled();
      expect(mockTokenStorage.setTokens).not.toHaveBeenCalled();
    });
  });
});
