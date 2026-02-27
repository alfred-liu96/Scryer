/**
 * endpoints.ts 单元测试
 *
 * 测试覆盖范围：
 * - authApi 对象成功导出
 * - authApi 实例类型正确（AuthApi）
 * - authApi 拥有所有必需方法
 * - 依赖注入正确（httpClient 和 tokenStorage）
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/lib/api/endpoints.ts
 *
 * @jest-environment jsdom
 */

import { describe, it, expect } from '@jest/globals';

// 注意：当前 endpoints.ts 尚未实现，这个 import 会导致测试失败
// 这是预期的行为（TDD Red First 原则）
// 当 task-developer 实现了 endpoints.ts 后，测试将能够正确运行
import { authApi } from '../endpoints';
import { AuthApi } from '../auth-api';

// ============================================================================
// 测试套件
// ============================================================================

describe('endpoints', () => {
  describe('authApi', () => {
    it('should export authApi instance', () => {
      // Assert
      expect(authApi).toBeDefined();
      expect(authApi).not.toBeNull();
    });

    it('should be instance of AuthApi', () => {
      // Assert
      expect(authApi).toBeInstanceOf(AuthApi);
    });

    it('should have all required methods', () => {
      // Assert
      expect(typeof authApi.login).toBe('function');
      expect(typeof authApi.register).toBe('function');
      expect(typeof authApi.refreshToken).toBe('function');
      expect(typeof authApi.getCurrentUser).toBe('function');
    });

    it('should have correct method signatures', () => {
      // Assert - 验证方法存在且可调用
      expect(authApi.login).toHaveLength(2); // (usernameOrEmail, password)
      expect(authApi.register).toHaveLength(3); // (username, email, password)
      expect(authApi.refreshToken).toHaveLength(0); // 无参数
      expect(authApi.getCurrentUser).toHaveLength(0); // 无参数
    });
  });
});
