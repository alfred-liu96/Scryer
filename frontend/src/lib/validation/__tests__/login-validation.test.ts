/**
 * 登录表单验证器单元测试
 *
 * 测试覆盖范围：
 * - 用户名/邮箱验证（格式、错误消息）
 * - 密码验证（非空、错误消息）
 * - 完整表单验证
 *
 * 验证规则（参考 ARCHITECTURE.md §4.1）：
 * - identifier: 必填，如果包含 @ 验证邮箱格式，否则验证用户名格式（3-50字符，字母/数字/下划线/连字符）
 * - password: 必填
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/lib/validation/login-validation.ts
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ============================================================================
// 类型定义
// ============================================================================

interface FieldValidationResult {
  isValid: boolean;
  error?: string;
}

interface LoginFormData {
  identifier: string;
  password: string;
}

interface LoginFormValidation {
  identifier: FieldValidationResult;
  password: FieldValidationResult;
  isValid: boolean;
}

// ============================================================================
// Mock 工厂函数
// ============================================================================

/**
 * 创建验证结果 Mock
 */
const createValidationResult = (isValid: boolean, error?: string): FieldValidationResult => ({
  isValid,
  error,
});

// ============================================================================
// 测试套件
// ============================================================================

describe('LoginValidator - 用户名/邮箱验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('有效用户名验证', () => {
    it('应该接受有效的用户名（字母）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user123');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受有效的用户名（数字）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('123456');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受有效的用户名（下划线）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user_name');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受有效的用户名（连字符）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user-name');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受有效的用户名（混合格式）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user_123-test');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受恰好 3 字符的用户名（边界值）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('abc');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受 50 字符的用户名（边界值）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('a'.repeat(50));

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('有效邮箱验证', () => {
    it('应该接受有效的邮箱（标准格式）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user@example.com');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受有效的邮箱（带子域名）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user@mail.example.com');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受有效的邮箱（带数字）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user123@example.com');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受有效的邮箱（带点号）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user.name@example.com');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受有效的邮箱（带加号）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user+tag@example.com');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('空值验证', () => {
    it('应该拒绝空字符串', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('请输入用户名或邮箱');
    });

    it('应该拒绝纯空格字符串', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('   ');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('请输入用户名或邮箱');
    });
  });

  describe('无效邮箱格式验证', () => {
    it('应该拒绝缺少 @ 的邮箱', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('userexample.com');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该拒绝缺少域名的邮箱', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user@');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该拒绝缺少用户名的邮箱', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('@example.com');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该拒绝双 @ 符号的邮箱', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user@@example.com');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('无效用户名格式验证', () => {
    it('应该拒绝少于 3 字符的用户名', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('ab');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该拒绝超过 50 字符的用户名', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('a'.repeat(51));

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该拒绝包含空格的用户名', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user name');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该拒绝包含特殊字符的用户名', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('user@name');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该拒绝以连字符开头的用户名', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('-username');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该拒绝以连字符结尾的用户名', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('username-');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('错误消息验证', () => {
    it('空值应该显示"请输入用户名或邮箱"', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('');

      expect(result.error).toBe('请输入用户名或邮箱');
    });

    it('无效格式应该显示"用户名或邮箱格式不正确"', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('ab');

      expect(result.error).toBe('用户名或邮箱格式不正确');
    });

    it('无效邮箱格式应该显示"用户名或邮箱格式不正确"', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validateIdentifier('invalid@');

      expect(result.error).toBe('用户名或邮箱格式不正确');
    });
  });
});

describe('LoginValidator - 密码验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('有效密码验证', () => {
    it('应该接受非空密码（字母）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validatePassword('password');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受非空密码（数字）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validatePassword('123456');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受非空密码（混合字符）', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validatePassword('pass123!@#');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受包含空格的密码', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validatePassword('pass 1234');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受 Unicode 字符密码', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validatePassword('密码123456');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('无效密码验证', () => {
    it('应该拒绝空密码', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validatePassword('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('请输入密码');
    });

    it('应该拒绝纯空格密码', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validatePassword('   ');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('请输入密码');
    });
  });

  describe('错误消息验证', () => {
    it('空密码应该显示"请输入密码"', () => {
      const { LoginValidator } = require('../login-validation');
      const result = LoginValidator.validatePassword('');

      expect(result.error).toBe('请输入密码');
    });
  });
});

describe('LoginValidator - 完整表单验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('有效表单验证', () => {
    it('应该接受有效的用户名登录表单', () => {
      const { LoginValidator } = require('../login-validation');
      const formData: LoginFormData = {
        identifier: 'user123',
        password: 'password123',
      };

      const result = LoginValidator.validateForm(formData);

      expect(result.isValid).toBe(true);
      expect(result.identifier.isValid).toBe(true);
      expect(result.password.isValid).toBe(true);
    });

    it('应该接受有效的邮箱登录表单', () => {
      const { LoginValidator } = require('../login-validation');
      const formData: LoginFormData = {
        identifier: 'user@example.com',
        password: 'password123',
      };

      const result = LoginValidator.validateForm(formData);

      expect(result.isValid).toBe(true);
      expect(result.identifier.isValid).toBe(true);
      expect(result.password.isValid).toBe(true);
    });

    it('应该接受边界值有效表单', () => {
      const { LoginValidator } = require('../login-validation');
      const formData: LoginFormData = {
        identifier: 'abc',  // 最小长度用户名
        password: 'pass',    // 非空密码
      };

      const result = LoginValidator.validateForm(formData);

      expect(result.isValid).toBe(true);
    });

    it('应该接受边界值最大长度表单', () => {
      const { LoginValidator } = require('../login-validation');
      const formData: LoginFormData = {
        identifier: 'a'.repeat(50),  // 最大长度用户名
        password: 'a'.repeat(100),   // 长密码
      };

      const result = LoginValidator.validateForm(formData);

      expect(result.isValid).toBe(true);
    });
  });

  describe('无效表单验证', () => {
    it('应该拒绝空的 identifier', () => {
      const { LoginValidator } = require('../login-validation');
      const formData: LoginFormData = {
        identifier: '',
        password: 'password123',
      };

      const result = LoginValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.identifier.isValid).toBe(false);
      expect(result.password.isValid).toBe(true);
    });

    it('应该拒绝空的密码', () => {
      const { LoginValidator } = require('../login-validation');
      const formData: LoginFormData = {
        identifier: 'user123',
        password: '',
      };

      const result = LoginValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.identifier.isValid).toBe(true);
      expect(result.password.isValid).toBe(false);
    });

    it('应该拒绝所有空字段', () => {
      const { LoginValidator } = require('../login-validation');
      const formData: LoginFormData = {
        identifier: '',
        password: '',
      };

      const result = LoginValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.identifier.isValid).toBe(false);
      expect(result.password.isValid).toBe(false);
    });

    it('应该拒绝无效格式的 identifier', () => {
      const { LoginValidator } = require('../login-validation');
      const formData: LoginFormData = {
        identifier: 'ab',  // 太短
        password: 'password123',
      };

      const result = LoginValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.identifier.isValid).toBe(false);
      expect(result.password.isValid).toBe(true);
    });

    it('应该拒绝无效格式的邮箱', () => {
      const { LoginValidator } = require('../login-validation');
      const formData: LoginFormData = {
        identifier: 'invalid@',
        password: 'password123',
      };

      const result = LoginValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.identifier.isValid).toBe(false);
      expect(result.password.isValid).toBe(true);
    });
  });

  describe('错误消息收集', () => {
    it('应该返回所有字段的错误消息', () => {
      const { LoginValidator } = require('../login-validation');
      const formData: LoginFormData = {
        identifier: '',
        password: '',
      };

      const result = LoginValidator.validateForm(formData);

      expect(result.identifier.error).toBeDefined();
      expect(result.password.error).toBeDefined();
    });

    it('有效字段不应该有错误消息', () => {
      const { LoginValidator } = require('../login-validation');
      const formData: LoginFormData = {
        identifier: 'user123',
        password: '',
      };

      const result = LoginValidator.validateForm(formData);

      expect(result.identifier.error).toBeUndefined();
      expect(result.password.error).toBeDefined();
    });
  });
});
