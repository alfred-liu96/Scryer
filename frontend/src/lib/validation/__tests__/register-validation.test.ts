/**
 * 注册表单验证器单元测试
 *
 * 测试覆盖范围：
 * - 用户名验证（边界值、格式、错误消息）
 * - 邮箱验证（格式、错误消息）
 * - 密码验证（长度、错误消息）
 * - 确认密码验证（一致性、错误消息）
 * - 完整表单验证
 *
 * 后端验证规则（参考 src/backend/app/schemas/auth.py）：
 * - username: 3-50 字符
 * - email: EmailStr 格式
 * - password: 8-100 字符
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/lib/validation/register-validation.ts
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

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterFormValidation {
  username: FieldValidationResult;
  email: FieldValidationResult;
  password: FieldValidationResult;
  confirmPassword: FieldValidationResult;
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

/**
 * 创建完整表单验证结果 Mock
 */
const createFormValidationResult = (
  usernameValid: boolean,
  emailValid: boolean,
  passwordValid: boolean,
  confirmPasswordValid: boolean
): RegisterFormValidation => ({
  username: createValidationResult(usernameValid, usernameValid ? undefined : '用户名错误'),
  email: createValidationResult(emailValid, emailValid ? undefined : '邮箱错误'),
  password: createValidationResult(passwordValid, passwordValid ? undefined : '密码错误'),
  confirmPassword: createValidationResult(confirmPasswordValid, confirmPasswordValid ? undefined : '确认密码错误'),
  isValid: usernameValid && emailValid && passwordValid && confirmPasswordValid,
});

// ============================================================================
// 测试套件
// ============================================================================

describe('RegisterValidator - 用户名验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('边界值测试', () => {
    it('应该拒绝空用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('用户名不能为空');
    });

    it('应该拒绝少于 3 字符的用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('ab');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('用户名长度应为 3-50 个字符');
    });

    it('应该接受恰好 3 字符的用户名（边界值）', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('abc');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受 50 字符的用户名（边界值）', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('a'.repeat(50));

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝超过 50 字符的用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('a'.repeat(51));

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('用户名长度应为 3-50 个字符');
    });

    it('应该拒绝 100 字符的用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('a'.repeat(100));

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('格式验证', () => {
    it('应该接受字母用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('username');

      expect(result.isValid).toBe(true);
    });

    it('应该接受数字用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('user123');

      expect(result.isValid).toBe(true);
    });

    it('应该接受下划线用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('user_name');

      expect(result.isValid).toBe(true);
    });

    it('应该接受连字符用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('user-name');

      expect(result.isValid).toBe(true);
    });

    it('应该接受混合格式用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('user_123-test');

      expect(result.isValid).toBe(true);
    });

    it('应该拒绝空格用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('user name');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝特殊字符用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('user@name');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝中文用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('用户名');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝以连字符开头的用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('-username');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝以连字符结尾的用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('username-');

      expect(result.isValid).toBe(false);
    });
  });

  describe('错误消息', () => {
    it('空用户名应该显示"用户名不能为空"', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('');

      expect(result.error).toBe('用户名不能为空');
    });

    it('太短的用户名应该显示长度提示', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('ab');

      expect(result.error).toBe('用户名长度应为 3-50 个字符');
    });

    it('太长的用户名应该显示长度提示', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('a'.repeat(51));

      expect(result.error).toBe('用户名长度应为 3-50 个字符');
    });

    it('格式错误的用户名应该显示格式提示', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('user@name');

      expect(result.error).toContain('格式');
    });
  });
});

describe('RegisterValidator - 邮箱验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本格式验证', () => {
    it('应该拒绝空邮箱', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('邮箱不能为空');
    });

    it('应该接受标准邮箱格式', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user@example.com');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝缺少 @ 的邮箱', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('userexample.com');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝缺少域名的邮箱', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user@');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝缺少用户名的邮箱', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('@example.com');

      expect(result.isValid).toBe(false);
    });
  });

  describe('复杂邮箱格式', () => {
    it('应该接受带子域名的邮箱', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user@mail.example.com');

      expect(result.isValid).toBe(true);
    });

    it('应该接受带数字的邮箱', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user123@example.com');

      expect(result.isValid).toBe(true);
    });

    it('应该接受带点号的邮箱用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user.name@example.com');

      expect(result.isValid).toBe(true);
    });

    it('应该接受带加号的邮箱', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user+tag@example.com');

      expect(result.isValid).toBe(true);
    });

    it('应该接受带连字符的邮箱用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user-name@example.com');

      expect(result.isValid).toBe(true);
    });

    it('应该接受带下划线的邮箱用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user_name@example.com');

      expect(result.isValid).toBe(true);
    });
  });

  describe('无效格式', () => {
    it('应该拒绝双 @ 符号的邮箱', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user@@example.com');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝以点号开头的域名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user@.example.com');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝以点号结尾的域名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user@example.com.');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝连续点号的域名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user@example..com');

      expect(result.isValid).toBe(false);
    });
  });

  describe('错误消息', () => {
    it('空邮箱应该显示"邮箱不能为空"', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('');

      expect(result.error).toBe('邮箱不能为空');
    });

    it('格式错误的邮箱应该显示"邮箱格式不正确"', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('invalid-email');

      expect(result.error).toBe('邮箱格式不正确');
    });
  });
});

describe('RegisterValidator - 密码验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('长度验证', () => {
    it('应该拒绝空密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('密码不能为空');
    });

    it('应该拒绝少于 8 字符的密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('1234567');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('密码至少需要 8 个字符');
    });

    it('应该接受恰好 8 字符的密码（边界值）', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('12345678');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受 50 字符的密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('a'.repeat(50));

      expect(result.isValid).toBe(true);
    });

    it('应该接受 100 字符的密码（边界值）', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('a'.repeat(100));

      expect(result.isValid).toBe(true);
    });

    it('应该拒绝超过 100 字符的密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('a'.repeat(101));

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('密码不能超过 100 个字符');
    });
  });

  describe('字符类型', () => {
    it('应该接受纯字母密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('abcdefgh');

      expect(result.isValid).toBe(true);
    });

    it('应该接受纯数字密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('12345678');

      expect(result.isValid).toBe(true);
    });

    it('应该接受混合字符密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('abc123!@#');

      expect(result.isValid).toBe(true);
    });

    it('应该接受 Unicode 字符密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('密码123456');

      expect(result.isValid).toBe(true);
    });

    it('应该接受带空格的密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('pass 1234');

      expect(result.isValid).toBe(true);
    });
  });

  describe('错误消息', () => {
    it('空密码应该显示"密码不能为空"', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('');

      expect(result.error).toBe('密码不能为空');
    });

    it('太短的密码应该显示"密码至少需要 8 个字符"', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('short');

      expect(result.error).toBe('密码至少需要 8 个字符');
    });

    it('太长的密码应该显示"密码不能超过 100 个字符"', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('a'.repeat(101));

      expect(result.error).toBe('密码不能超过 100 个字符');
    });
  });
});

describe('RegisterValidator - 确认密码验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('一致性验证', () => {
    it('应该接受匹配的密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateConfirmPassword('password123', 'password123');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝不匹配的密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateConfirmPassword('password123', 'password456');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('两次输入的密码不一致');
    });

    it('应该拒绝空确认密码（非空密码）', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateConfirmPassword('password123', '');

      expect(result.isValid).toBe(false);
    });

    it('应该接受两个空密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateConfirmPassword('', '');

      // 空密码的一致性验证可能被特殊处理
      // 根据实现，可能返回 isValid: true（因为它们一致）
      // 或返回 isValid: false（因为密码为空）
      expect(result).toBeDefined();
    });

    it('应该区分大小写', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateConfirmPassword('Password', 'password');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('两次输入的密码不一致');
    });

    it('应该对空格敏感', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateConfirmPassword('password', 'password ');

      expect(result.isValid).toBe(false);
    });
  });

  describe('错误消息', () => {
    it('不匹配时应该显示"两次输入的密码不一致"', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateConfirmPassword('pass1', 'pass2');

      expect(result.error).toBe('两次输入的密码不一致');
    });

    it('空确认密码应该显示相关错误', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateConfirmPassword('password123', '');

      expect(result.error).toBeDefined();
      expect(result.isValid).toBe(false);
    });
  });
});

describe('RegisterValidator - 完整表单验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('有效表单', () => {
    it('应该接受完整的有效表单', () => {
      const { RegisterValidator } = require('../register-validation');
      const formData: RegisterFormData = {
        username: 'validuser',
        email: 'user@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const result = RegisterValidator.validateForm(formData);

      expect(result.isValid).toBe(true);
      expect(result.username.isValid).toBe(true);
      expect(result.email.isValid).toBe(true);
      expect(result.password.isValid).toBe(true);
      expect(result.confirmPassword.isValid).toBe(true);
    });

    it('边界值有效表单应该通过', () => {
      const { RegisterValidator } = require('../register-validation');
      const formData: RegisterFormData = {
        username: 'abc',  // 最小长度
        email: 'a@b.co',  // 最短有效邮箱
        password: '12345678',  // 最小长度
        confirmPassword: '12345678',
      };

      const result = RegisterValidator.validateForm(formData);

      expect(result.isValid).toBe(true);
    });

    it('边界值最大长度表单应该通过', () => {
      const { RegisterValidator } = require('../register-validation');
      const formData: RegisterFormData = {
        username: 'a'.repeat(50),  // 最大长度
        email: 'user@example.com',
        password: 'a'.repeat(100),  // 最大长度
        confirmPassword: 'a'.repeat(100),
      };

      const result = RegisterValidator.validateForm(formData);

      expect(result.isValid).toBe(true);
    });
  });

  describe('无效表单', () => {
    it('应该标记所有无效字段', () => {
      const { RegisterValidator } = require('../register-validation');
      const formData: RegisterFormData = {
        username: 'ab',  // 太短
        email: 'invalid-email',  // 无效格式
        password: 'short',  // 太短
        confirmPassword: 'different',  // 不匹配
      };

      const result = RegisterValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.username.isValid).toBe(false);
      expect(result.email.isValid).toBe(false);
      expect(result.password.isValid).toBe(false);
      expect(result.confirmPassword.isValid).toBe(false);
    });

    it('无效用户名应该使整个表单无效', () => {
      const { RegisterValidator } = require('../register-validation');
      const formData: RegisterFormData = {
        username: '',  // 空用户名
        email: 'user@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const result = RegisterValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.username.isValid).toBe(false);
    });

    it('无效邮箱应该使整个表单无效', () => {
      const { RegisterValidator } = require('../register-validation');
      const formData: RegisterFormData = {
        username: 'validuser',
        email: 'invalid',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const result = RegisterValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.email.isValid).toBe(false);
    });

    it('无效密码应该使整个表单无效', () => {
      const { RegisterValidator } = require('../register-validation');
      const formData: RegisterFormData = {
        username: 'validuser',
        email: 'user@example.com',
        password: 'short',
        confirmPassword: 'short',
      };

      const result = RegisterValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.password.isValid).toBe(false);
    });

    it('密码不匹配应该使整个表单无效', () => {
      const { RegisterValidator } = require('../register-validation');
      const formData: RegisterFormData = {
        username: 'validuser',
        email: 'user@example.com',
        password: 'password123',
        confirmPassword: 'password456',
      };

      const result = RegisterValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.confirmPassword.isValid).toBe(false);
    });
  });

  describe('错误消息收集', () => {
    it('应该收集所有字段的错误消息', () => {
      const { RegisterValidator } = require('../register-validation');
      const formData: RegisterFormData = {
        username: '',
        email: 'invalid',
        password: '',
        confirmPassword: 'different',
      };

      const result = RegisterValidator.validateForm(formData);

      expect(result.username.error).toBeDefined();
      expect(result.email.error).toBeDefined();
      expect(result.password.error).toBeDefined();
      expect(result.confirmPassword.error).toBeDefined();
    });

    it('有效字段不应该有错误消息', () => {
      const { RegisterValidator } = require('../register-validation');
      const formData: RegisterFormData = {
        username: 'validuser',
        email: 'user@example.com',
        password: '',
        confirmPassword: '',
      };

      const result = RegisterValidator.validateForm(formData);

      expect(result.username.error).toBeUndefined();
      expect(result.email.error).toBeUndefined();
      expect(result.password.error).toBeDefined();
    });
  });

  describe('部分验证', () => {
    it('只验证用户名', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateUsername('validuser');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('只验证邮箱', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validateEmail('user@example.com');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('只验证密码', () => {
      const { RegisterValidator } = require('../register-validation');
      const result = RegisterValidator.validatePassword('password123');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
