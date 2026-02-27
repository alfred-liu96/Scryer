/**
 * AuthApi 类型定义测试
 *
 * 测试覆盖范围：
 * - LoginResponse 类型结构验证
 * - RegisterResponse 类型别名验证
 * - RefreshTokenRequest 类型结构验证
 * - RefreshTokenResponse 类型别名验证
 * - UserResponse 类型结构验证
 * - TokenResponse 类型结构验证
 * - AuthResponse 类型向后兼容性验证
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/types/auth.ts, /workspace/frontend/src/lib/api/auth-api.ts
 *
 * @jest-environment jsdom
 */

import { describe, it, expect } from '@jest/globals';
import type {
  LoginResponse,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '@/types/auth';
import type {
  TokenResponse,
  UserResponse,
} from '@/types/auth';
import type { AuthResponse } from '@/lib/api/auth-api';

// ============================================================================
// Mock 数据工厂
// ============================================================================

/**
 * 创建有效的 TokenResponse mock 数据
 */
const createValidTokenResponse = (): TokenResponse => ({
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
  token_type: 'Bearer',
  expires_in: 3600,
});

/**
 * 创建有效的 UserResponse mock 数据
 */
const createValidUserResponse = (
  overrides?: Partial<UserResponse>
): UserResponse => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

/**
 *创建有效的 LoginResponse mock 数据
 */
const createValidLoginResponse = (): LoginResponse => ({
  user: createValidUserResponse(),
  tokens: createValidTokenResponse(),
});

// ============================================================================
// 类型契约测试
// ============================================================================

describe('Auth Type Definitions', () => {
  // ========================================================================
  // LoginResponse 类型测试
  // ========================================================================

  describe('LoginResponse', () => {
    it('应包含 user 字段（UserResponse 类型）', () => {
      // Arrange
      const loginResponse: LoginResponse = createValidLoginResponse();

      // Assert
      expect(loginResponse).toHaveProperty('user');
      expect(loginResponse.user).toHaveProperty('id');
      expect(loginResponse.user).toHaveProperty('username');
      expect(loginResponse.user).toHaveProperty('email');
      expect(loginResponse.user).toHaveProperty('is_active');
      expect(loginResponse.user).toHaveProperty('created_at');
    });

    it('应包含 tokens 字段（TokenResponse 类型）', () => {
      // Arrange
      const loginResponse: LoginResponse = createValidLoginResponse();

      // Assert
      expect(loginResponse).toHaveProperty('tokens');
      expect(loginResponse.tokens).toHaveProperty('access_token');
      expect(loginResponse.tokens).toHaveProperty('refresh_token');
      expect(loginResponse.tokens).toHaveProperty('token_type');
      expect(loginResponse.tokens).toHaveProperty('expires_in');
    });

    it('应接受符合后端 API 契约的完整响应', () => {
      // Arrange & Act - 模拟后端返回的真实响应
      const backendLoginResponse: LoginResponse = {
        user: {
          id: 123,
          username: 'realuser',
          email: 'real@example.com',
          is_active: true,
          created_at: '2024-01-15T08:30:00Z',
        },
        tokens: {
          access_token: 'real_access_token',
          refresh_token: 'real_refresh_token',
          token_type: 'Bearer',
          expires_in: 7200,
        },
      };

      // Assert - 验证类型接受后端响应
      expect(backendLoginResponse.user.id).toBe(123);
      expect(backendLoginResponse.user.username).toBe('realuser');
      expect(backendLoginResponse.tokens.access_token).toBe('real_access_token');
      expect(backendLoginResponse.tokens.expires_in).toBe(7200);
    });

    it('应拒绝缺少 user 字段的无效响应', () => {
      // Arrange - 创建缺少 user 字段的无效响应
      const invalidResponse = {
        tokens: createValidTokenResponse(),
      } as unknown;

      // Act & Assert - TypeScript 应该在编译时报错
      // 运行时验证：强制转换会缺失字段
      expect(() => {
        const loginResponse = invalidResponse as LoginResponse;
        if (!loginResponse.user) {
          throw new Error('Missing user field');
        }
      }).toThrow();
    });

    it('应拒绝缺少 tokens 字段的无效响应', () => {
      // Arrange - 创建缺少 tokens 字段的无效响应
      const invalidResponse = {
        user: createValidUserResponse(),
      } as unknown;

      // Act & Assert - TypeScript 应该在编译时报错
      // 运行时验证：强制转换会缺失字段
      expect(() => {
        const loginResponse = invalidResponse as LoginResponse;
        if (!loginResponse.tokens) {
          throw new Error('Missing tokens field');
        }
      }).toThrow();
    });
  });

  // ========================================================================
  // RegisterResponse 类型测试
  // ========================================================================

  describe('RegisterResponse', () => {
    it('应与 LoginResponse 类型结构一致', () => {
      // Arrange
      const registerResponse: RegisterResponse = createValidLoginResponse();
      const loginResponse: LoginResponse = createValidLoginResponse();

      // Assert - RegisterResponse 是 LoginResponse 的别名
      expect(registerResponse).toEqual(loginResponse);
      expect(typeof registerResponse).toBe(typeof loginResponse);
    });

    it('应接受注册后的完整响应', () => {
      // Arrange & Act - 模拟注册后的后端响应
      const backendRegisterResponse: RegisterResponse = {
        user: {
          id: 456,
          username: 'newuser',
          email: 'new@example.com',
          is_active: true,
          created_at: '2024-02-01T12:00:00Z',
        },
        tokens: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      };

      // Assert
      expect(backendRegisterResponse.user.username).toBe('newuser');
      expect(backendRegisterResponse.tokens.access_token).toBe('new_access_token');
    });
  });

  // ========================================================================
  // RefreshTokenRequest 类型测试
  // ========================================================================

  describe('RefreshTokenRequest', () => {
    it('应包含 refresh_token 字段', () => {
      // Arrange & Act
      const request: RefreshTokenRequest = {
        refresh_token: 'valid_refresh_token',
      };

      // Assert
      expect(request).toHaveProperty('refresh_token');
      expect(request.refresh_token).toBe('valid_refresh_token');
    });

    it('应符合后端 API 契约', () => {
      // Arrange - 后端期望的请求体
      const backendRequest: RefreshTokenRequest = {
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
      };

      // Assert
      expect(Object.keys(backendRequest)).toEqual(['refresh_token']);
      expect(backendRequest.refresh_token).toBeTruthy();
    });

    it('应拒绝缺少 refresh_token 的请求', () => {
      // Arrange - 创建无效请求
      const invalidRequest = {} as RefreshTokenRequest;

      // Act & Assert
      expect(() => {
        if (!invalidRequest.refresh_token) {
          throw new Error('Missing refresh_token');
        }
      }).toThrow();
    });
  });

  // ========================================================================
  // RefreshTokenResponse 类型测试
  // ========================================================================

  describe('RefreshTokenResponse', () => {
    it('应与 TokenResponse 类型结构一致', () => {
      // Arrange
      const tokenResponse: TokenResponse = createValidTokenResponse();
      const refreshResponse: RefreshTokenResponse = createValidTokenResponse();

      // Assert - RefreshTokenResponse 是 TokenResponse 的别名
      expect(refreshResponse).toEqual(tokenResponse);
      expect(typeof refreshResponse).toBe(typeof tokenResponse);
    });

    it('应接受刷新后的完整 Token 响应', () => {
      // Arrange & Act - 模拟刷新后的后端响应
      const backendRefreshResponse: RefreshTokenResponse = {
        access_token: 'new_access_token_after_refresh',
        refresh_token: 'new_refresh_token_after_refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      // Assert
      expect(backendRefreshResponse.access_token).toContain('after_refresh');
      expect(backendRefreshResponse.token_type).toBe('Bearer');
      expect(backendRefreshResponse.expires_in).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // TokenResponse 类型测试
  // ========================================================================

  describe('TokenResponse', () => {
    it('应包含所有必需字段', () => {
      // Arrange
      const tokenResponse: TokenResponse = createValidTokenResponse();

      // Assert - 验证所有必需字段存在
      expect(tokenResponse.access_token).toBeDefined();
      expect(tokenResponse.refresh_token).toBeDefined();
      expect(tokenResponse.token_type).toBe('Bearer');
      expect(tokenResponse.expires_in).toBeGreaterThan(0);
    });

    it('token_type 应固定为 Bearer', () => {
      // Arrange
      const tokenResponse: TokenResponse = createValidTokenResponse();

      // Assert
      expect(tokenResponse.token_type).toBe('Bearer');

      // 验证类型安全
      const validTypes: Array<'Bearer'> = ['Bearer'];
      expect(validTypes).toContain(tokenResponse.token_type);
    });

    it('expires_in 应为正整数', () => {
      // Arrange
      const tokenResponse: TokenResponse = createValidTokenResponse();

      // Assert
      expect(Number.isInteger(tokenResponse.expires_in)).toBe(true);
      expect(tokenResponse.expires_in).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // UserResponse 类型测试
  // ========================================================================

  describe('UserResponse', () => {
    it('应包含所有必需字段', () => {
      // Arrange
      const userResponse: UserResponse = createValidUserResponse();

      // Assert - 验证所有必需字段存在
      expect(userResponse.id).toBeDefined();
      expect(userResponse.username).toBeDefined();
      expect(userResponse.email).toBeDefined();
      expect(userResponse.is_active).toBeDefined();
      expect(userResponse.created_at).toBeDefined();
    });

    it('id 应为正整数', () => {
      // Arrange
      const userResponse: UserResponse = createValidUserResponse();

      // Assert
      expect(Number.isInteger(userResponse.id)).toBe(true);
      expect(userResponse.id).toBeGreaterThan(0);
    });

    it('created_at 应符合 ISO 8601 格式', () => {
      // Arrange
      const userResponse: UserResponse = createValidUserResponse();

      // Assert - 验证 ISO 8601 格式（支持毫秒）
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
      expect(userResponse.created_at).toMatch(iso8601Regex);

      // 验证可以被 Date 构造函数解析
      const date = new Date(userResponse.created_at);
      expect(date.toISOString()).toMatch(iso8601Regex);
    });

    it('is_active 应为布尔值', () => {
      // Arrange
      const activeUser: UserResponse = createValidUserResponse({ is_active: true });
      const inactiveUser: UserResponse = createValidUserResponse({ is_active: false });

      // Assert
      expect(typeof activeUser.is_active).toBe('boolean');
      expect(typeof inactiveUser.is_active).toBe('boolean');
      expect(activeUser.is_active).toBe(true);
      expect(inactiveUser.is_active).toBe(false);
    });

    it('email 应包含 @ 符号', () => {
      // Arrange
      const userResponse: UserResponse = createValidUserResponse();

      // Assert
      expect(userResponse.email).toContain('@');
      expect(userResponse.email).toMatch(/^[^@]+@[^@]+$/);
    });
  });

  // ========================================================================
  // AuthResponse 向后兼容性测试
  // ========================================================================

  describe('AuthResponse (向后兼容)', () => {
    it('应支持旧的扁平结构（如果存在）', () => {
      // Arrange - 旧的 AuthResponse 结构（UserResponse + TokenResponse 的交叉类型）
      const oldAuthResponse: AuthResponse = {
        // UserResponse 字段
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        // TokenResponse 字段
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      // Assert - 验证所有字段都存在
      expect(oldAuthResponse.id).toBe(1);
      expect(oldAuthResponse.username).toBe('testuser');
      expect(oldAuthResponse.access_token).toBe('test_access_token');
      expect(oldAuthResponse.refresh_token).toBe('test_refresh_token');
    });

    it('新 LoginResponse 应包含所有 AuthResponse 的字段', () => {
      // Arrange
      const loginResponse: LoginResponse = createValidLoginResponse();

      // Assert - 新结构的字段组合应等于旧结构
      const combinedFields = {
        ...loginResponse.user,
        ...loginResponse.tokens,
      };

      expect(combinedFields).toHaveProperty('id');
      expect(combinedFields).toHaveProperty('username');
      expect(combinedFields).toHaveProperty('email');
      expect(combinedFields).toHaveProperty('is_active');
      expect(combinedFields).toHaveProperty('created_at');
      expect(combinedFields).toHaveProperty('access_token');
      expect(combinedFields).toHaveProperty('refresh_token');
      expect(combinedFields).toHaveProperty('token_type');
      expect(combinedFields).toHaveProperty('expires_in');
    });
  });

  // ========================================================================
  // 边界值测试
  // ========================================================================

  describe('边界值测试', () => {
    it('应处理最小有效 expires_in 值', () => {
      // Arrange
      const tokenResponse: TokenResponse = {
        ...createValidTokenResponse(),
        expires_in: 1, // 最小值：1秒
      };

      // Assert
      expect(tokenResponse.expires_in).toBe(1);
    });

    it('应处理较大的 expires_in 值', () => {
      // Arrange
      const tokenResponse: TokenResponse = {
        ...createValidTokenResponse(),
        expires_in: 86400, // 24小时
      };

      // Assert
      expect(tokenResponse.expires_in).toBe(86400);
    });

    it('应处理非常长的用户名', () => {
      // Arrange
      const longUsername = 'a'.repeat(50); // 最大长度
      const userResponse: UserResponse = createValidUserResponse({
        username: longUsername,
      });

      // Assert
      expect(userResponse.username.length).toBe(50);
    });

    it('应处理包含特殊字符的邮箱', () => {
      // Arrange
      const specialEmail = 'user+tag@sub.example.com';
      const userResponse: UserResponse = createValidUserResponse({
        email: specialEmail,
      });

      // Assert
      expect(userResponse.email).toBe(specialEmail);
    });
  });

  // ========================================================================
  // 类型转换测试
  // ========================================================================

  describe('类型转换', () => {
    it('应能从 LoginResponse 提取 UserResponse', () => {
      // Arrange
      const loginResponse: LoginResponse = createValidLoginResponse();

      // Act
      const userResponse: UserResponse = loginResponse.user;

      // Assert
      expect(userResponse).toEqual(loginResponse.user);
      expect(userResponse.id).toBe(loginResponse.user.id);
    });

    it('应能从 LoginResponse 提取 TokenResponse', () => {
      // Arrange
      const loginResponse: LoginResponse = createValidLoginResponse();

      // Act
      const tokenResponse: TokenResponse = loginResponse.tokens;

      // Assert
      expect(tokenResponse).toEqual(loginResponse.tokens);
      expect(tokenResponse.access_token).toBe(loginResponse.tokens.access_token);
    });

    it('应能从 RegisterResponse 转换为 LoginResponse', () => {
      // Arrange
      const registerResponse: RegisterResponse = createValidLoginResponse();

      // Act - 类型别名，可以直接赋值
      const loginResponse: LoginResponse = registerResponse;

      // Assert
      expect(loginResponse).toEqual(registerResponse);
    });

    it('应能从 RefreshTokenResponse 转换为 TokenResponse', () => {
      // Arrange
      const refreshTokenResponse: RefreshTokenResponse = createValidTokenResponse();

      // Act - 类型别名，可以直接赋值
      const tokenResponse: TokenResponse = refreshTokenResponse;

      // Assert
      expect(tokenResponse).toEqual(refreshTokenResponse);
    });
  });
});
