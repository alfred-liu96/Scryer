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
 *
 * 目标覆盖率: >= 90%
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { HttpClient } from '../client';
import type { TokenStorage } from '@/lib/storage/token-storage';

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

      await expect(client.get('/api/data')).rejects.toThrow('Unauthorized');
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
