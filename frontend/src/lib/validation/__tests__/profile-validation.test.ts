/**
 * ProfileValidator 单元测试
 *
 * 测试覆盖范围：
 * - 用户名验证（边界值 3-50、格式、错误消息）
 * - 邮箱验证（格式、错误消息）
 * - 完整表单验证
 * - 表单变更检测
 *
 * 后端验证规则（参考 Issue #170）：
 * - username: 3-50 字符, 字母数字下划线连字符
 * - email: EmailStr 格式
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/lib/validation/profile-validation.ts
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ============================================================================
// 类型定义 (与蓝图保持一致)
// ============================================================================

interface FieldValidationResult {
  isValid: boolean;
  error?: string;
}

interface ProfileFormData {
  username: string;
  email: string;
}

interface ProfileFormValidation {
  username: FieldValidationResult;
  email: FieldValidationResult;
  isValid: boolean;
}

// ============================================================================
// 测试套件
// ============================================================================

describe('ProfileValidator - 用户名验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('边界值测试', () => {
    it('应该拒绝空用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('用户名不能为空');
    });

    it('应该拒绝少于 3 字符的用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('ab');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('用户名长度应为 3-50 个字符');
    });

    it('应该接受恰好 3 字符的用户名（边界值）', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('abc');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该接受 50 字符的用户名（边界值）', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('a'.repeat(50));

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝超过 50 字符的用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('a'.repeat(51));

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('用户名长度应为 3-50 个字符');
    });
  });

  describe('格式验证', () => {
    it('应该接受字母用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('username');

      expect(result.isValid).toBe(true);
    });

    it('应该接受数字用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('user123');

      expect(result.isValid).toBe(true);
    });

    it('应该接受下划线用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('user_name');

      expect(result.isValid).toBe(true);
    });

    it('应该接受连字符用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('user-name');

      expect(result.isValid).toBe(true);
    });

    it('应该接受混合格式用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('user_123-test');

      expect(result.isValid).toBe(true);
    });

    it('应该拒绝空格用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('user name');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('格式');
    });

    it('应该拒绝特殊字符用户名 (@)', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('user@name');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('格式');
    });

    it('应该拒绝中文用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('用户名');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('格式');
    });

    it('应该接受以数字开头的用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('123user');

      expect(result.isValid).toBe(true);
    });

    it('应该接受以下划线开头的用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('_username');

      expect(result.isValid).toBe(true);
    });
  });

  describe('错误消息', () => {
    it('空用户名应该显示"用户名不能为空"', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('');

      expect(result.error).toBe('用户名不能为空');
    });

    it('太短的用户名应该显示长度提示', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('ab');

      expect(result.error).toBe('用户名长度应为 3-50 个字符');
    });

    it('太长的用户名应该显示长度提示', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('a'.repeat(51));

      expect(result.error).toBe('用户名长度应为 3-50 个字符');
    });

    it('格式错误的用户名应该显示格式提示', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateUsername('user@name');

      expect(result.error).toBe('用户名格式不正确，只能包含字母、数字、下划线和连字符');
    });
  });
});

describe('ProfileValidator - 邮箱验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本格式验证', () => {
    it('应该拒绝空邮箱', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('邮箱不能为空');
    });

    it('应该接受标准邮箱格式', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user@example.com');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝缺少 @ 的邮箱', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('userexample.com');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('邮箱格式不正确');
    });

    it('应该拒绝缺少域名的邮箱', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user@');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('邮箱格式不正确');
    });

    it('应该拒绝缺少用户名的邮箱', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('@example.com');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('邮箱格式不正确');
    });
  });

  describe('复杂邮箱格式', () => {
    it('应该接受带子域名的邮箱', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user@mail.example.com');

      expect(result.isValid).toBe(true);
    });

    it('应该接受带数字的邮箱', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user123@example.com');

      expect(result.isValid).toBe(true);
    });

    it('应该接受带点号的邮箱用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user.name@example.com');

      expect(result.isValid).toBe(true);
    });

    it('应该接受带加号的邮箱', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user+tag@example.com');

      expect(result.isValid).toBe(true);
    });

    it('应该接受带连字符的邮箱用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user-name@example.com');

      expect(result.isValid).toBe(true);
    });

    it('应该接受带下划线的邮箱用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user_name@example.com');

      expect(result.isValid).toBe(true);
    });
  });

  describe('无效格式', () => {
    it('应该拒绝双 @ 符号的邮箱', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user@@example.com');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝以点号开头的域名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user@.example.com');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝以点号结尾的域名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user@example.com.');

      expect(result.isValid).toBe(false);
    });

    it('应该拒绝连续点号的域名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('user@example..com');

      expect(result.isValid).toBe(false);
    });
  });

  describe('错误消息', () => {
    it('空邮箱应该显示"邮箱不能为空"', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('');

      expect(result.error).toBe('邮箱不能为空');
    });

    it('格式错误的邮箱应该显示"邮箱格式不正确"', () => {
      const { ProfileValidator } = require('../profile-validation');
      const result = ProfileValidator.validateEmail('invalid-email');

      expect(result.error).toBe('邮箱格式不正确');
    });
  });
});

describe('ProfileValidator - 完整表单验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('有效表单', () => {
    it('应该接受完整的有效表单', () => {
      const { ProfileValidator } = require('../profile-validation');
      const formData: ProfileFormData = {
        username: 'validuser',
        email: 'user@example.com',
      };

      const result = ProfileValidator.validateForm(formData);

      expect(result.isValid).toBe(true);
      expect(result.username.isValid).toBe(true);
      expect(result.email.isValid).toBe(true);
    });

    it('边界值有效表单应该通过（最小用户名）', () => {
      const { ProfileValidator } = require('../profile-validation');
      const formData: ProfileFormData = {
        username: 'abc',  // 最小长度
        email: 'user@example.com',
      };

      const result = ProfileValidator.validateForm(formData);

      expect(result.isValid).toBe(true);
    });

    it('边界值有效表单应该通过（最大用户名）', () => {
      const { ProfileValidator } = require('../profile-validation');
      const formData: ProfileFormData = {
        username: 'a'.repeat(50),  // 最大长度
        email: 'user@example.com',
      };

      const result = ProfileValidator.validateForm(formData);

      expect(result.isValid).toBe(true);
    });
  });

  describe('无效表单', () => {
    it('应该标记无效用户名', () => {
      const { ProfileValidator } = require('../profile-validation');
      const formData: ProfileFormData = {
        username: 'ab',  // 太短
        email: 'user@example.com',
      };

      const result = ProfileValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.username.isValid).toBe(false);
      expect(result.email.isValid).toBe(true);
    });

    it('应该标记无效邮箱', () => {
      const { ProfileValidator } = require('../profile-validation');
      const formData: ProfileFormData = {
        username: 'validuser',
        email: 'invalid-email',
      };

      const result = ProfileValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.username.isValid).toBe(true);
      expect(result.email.isValid).toBe(false);
    });

    it('应该标记所有无效字段', () => {
      const { ProfileValidator } = require('../profile-validation');
      const formData: ProfileFormData = {
        username: 'ab',  // 太短
        email: 'invalid-email',  // 无效格式
      };

      const result = ProfileValidator.validateForm(formData);

      expect(result.isValid).toBe(false);
      expect(result.username.isValid).toBe(false);
      expect(result.email.isValid).toBe(false);
    });
  });

  describe('错误消息收集', () => {
    it('应该收集所有字段的错误消息', () => {
      const { ProfileValidator } = require('../profile-validation');
      const formData: ProfileFormData = {
        username: '',
        email: '',
      };

      const result = ProfileValidator.validateForm(formData);

      expect(result.username.error).toBeDefined();
      expect(result.email.error).toBeDefined();
    });

    it('有效字段不应该有错误消息', () => {
      const { ProfileValidator } = require('../profile-validation');
      const formData: ProfileFormData = {
        username: 'validuser',
        email: '',
      };

      const result = ProfileValidator.validateForm(formData);

      expect(result.username.error).toBeUndefined();
      expect(result.email.error).toBeDefined();
    });
  });
});

describe('ProfileValidator - 表单变更检测', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasChanges()', () => {
    it('应该检测到用户名变更', () => {
      const { ProfileValidator } = require('../profile-validation');
      const original: ProfileFormData = {
        username: 'olduser',
        email: 'user@example.com',
      };
      const current: ProfileFormData = {
        username: 'newuser',
        email: 'user@example.com',
      };

      const result = ProfileValidator.hasChanges(original, current);

      expect(result).toBe(true);
    });

    it('应该检测到邮箱变更', () => {
      const { ProfileValidator } = require('../profile-validation');
      const original: ProfileFormData = {
        username: 'user',
        email: 'old@example.com',
      };
      const current: ProfileFormData = {
        username: 'user',
        email: 'new@example.com',
      };

      const result = ProfileValidator.hasChanges(original, current);

      expect(result).toBe(true);
    });

    it('应该检测到两个字段都有变更', () => {
      const { ProfileValidator } = require('../profile-validation');
      const original: ProfileFormData = {
        username: 'olduser',
        email: 'old@example.com',
      };
      const current: ProfileFormData = {
        username: 'newuser',
        email: 'new@example.com',
      };

      const result = ProfileValidator.hasChanges(original, current);

      expect(result).toBe(true);
    });

    it('没有变更时应该返回 false', () => {
      const { ProfileValidator } = require('../profile-validation');
      const original: ProfileFormData = {
        username: 'user',
        email: 'user@example.com',
      };
      const current: ProfileFormData = {
        username: 'user',
        email: 'user@example.com',
      };

      const result = ProfileValidator.hasChanges(original, current);

      expect(result).toBe(false);
    });

    it('应该对用户名大小写敏感', () => {
      const { ProfileValidator } = require('../profile-validation');
      const original: ProfileFormData = {
        username: 'User',
        email: 'user@example.com',
      };
      const current: ProfileFormData = {
        username: 'user',
        email: 'user@example.com',
      };

      const result = ProfileValidator.hasChanges(original, current);

      expect(result).toBe(true);
    });

    it('应该对邮箱大小写敏感', () => {
      const { ProfileValidator } = require('../profile-validation');
      const original: ProfileFormData = {
        username: 'user',
        email: 'User@Example.com',
      };
      const current: ProfileFormData = {
        username: 'user',
        email: 'user@example.com',
      };

      const result = ProfileValidator.hasChanges(original, current);

      expect(result).toBe(true);
    });

    it('应该对空格敏感', () => {
      const { ProfileValidator } = require('../profile-validation');
      const original: ProfileFormData = {
        username: 'user',
        email: 'user@example.com',
      };
      const current: ProfileFormData = {
        username: 'user ',
        email: 'user@example.com',
      };

      const result = ProfileValidator.hasChanges(original, current);

      expect(result).toBe(true);
    });
  });
});