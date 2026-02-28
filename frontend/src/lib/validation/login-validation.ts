/**
 * 登录表单验证规则
 *
 * 职责:
 * - 定义用户名/邮箱（单一输入框）、密码的验证规则
 * - 提供字段级和表单级验证方法
 * - 返回用户友好的错误消息
 *
 * @module frontend/src/lib/validation/login-validation
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 字段验证结果
 */
export interface FieldValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误消息 (无效时存在) */
  error?: string;
}

/**
 * 登录表单数据
 */
export interface LoginFormData {
  /** 用户名或邮箱 */
  identifier: string;
  /** 密码 */
  password: string;
}

/**
 * 登录表单验证结果
 */
export interface LoginFormValidation {
  /** 用户名/邮箱验证结果 */
  identifier: FieldValidationResult;
  /** 密码验证结果 */
  password: FieldValidationResult;
  /** 整体表单是否有效 */
  isValid: boolean;
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 验证规则常量
 */
const VALIDATION_RULES = {
  /** 用户名最小长度 */
  USERNAME_MIN_LENGTH: 3,
  /** 用户名最大长度 */
  USERNAME_MAX_LENGTH: 50,
} as const;

/**
 * 错误消息常量
 */
const ERROR_MESSAGES = {
  IDENTIFIER_REQUIRED: '请输入用户名或邮箱',
  IDENTIFIER_INVALID: '用户名或邮箱格式不正确',
  PASSWORD_REQUIRED: '请输入密码',
} as const;

/**
 * 用户名正则表达式 (字母/数字/下划线/连字符)
 * 不能以连字符开头或结尾
 */
const USERNAME_REGEX = /^[a-zA-Z0-9_](?:[a-zA-Z0-9_-]*[a-zA-Z0-9_])?$/;

/**
 * 邮箱正则表达式 (更严格的验证)
 * - 用户名: 字母、数字、点、加号、连字符、下划线
 * - @ 符号
 * - 域名: 必须包含至少一个点号和顶级域名
 * - 域名部分: 字母、数字、点、连字符 (不能以点开头/结尾，不能有连续点)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

// ============================================================================
// 验证器类
// ============================================================================

/**
 * 登录表单验证器
 *
 * 提供静态方法验证登录表单的各个字段
 */
export class LoginValidator {
  /**
   * 验证用户名或邮箱
   *
   * 规则:
   * - 必填
   * - 如果包含 '@': 验证邮箱格式
   * - 如果不包含 '@': 验证用户名格式 (3-50 字符，字母/数字/下划线/连字符)
   *
   * @param identifier - 用户名或邮箱
   * @returns 验证结果
   */
  static validateIdentifier(identifier: string): FieldValidationResult {
    // 检查必填
    if (!identifier || identifier.trim() === '') {
      return { isValid: false, error: ERROR_MESSAGES.IDENTIFIER_REQUIRED };
    }

    const trimmed = identifier.trim();

    // 判断是邮箱还是用户名（根据是否包含 '@'）
    if (trimmed.includes('@')) {
      // 验证邮箱格式
      if (!EMAIL_REGEX.test(trimmed)) {
        return { isValid: false, error: ERROR_MESSAGES.IDENTIFIER_INVALID };
      }
    } else {
      // 验证用户名格式

      // 检查长度
      if (
        trimmed.length < VALIDATION_RULES.USERNAME_MIN_LENGTH ||
        trimmed.length > VALIDATION_RULES.USERNAME_MAX_LENGTH
      ) {
        return { isValid: false, error: ERROR_MESSAGES.IDENTIFIER_INVALID };
      }

      // 检查格式
      if (!USERNAME_REGEX.test(trimmed)) {
        return { isValid: false, error: ERROR_MESSAGES.IDENTIFIER_INVALID };
      }
    }

    return { isValid: true };
  }

  /**
   * 验证密码
   *
   * 规则:
   * - 必填
   *
   * 注意: 登录时不验证密码强度，避免给攻击者提示
   *
   * @param password - 密码
   * @returns 验证结果
   */
  static validatePassword(password: string): FieldValidationResult {
    // 检查必填
    if (!password || password.trim() === '') {
      return { isValid: false, error: ERROR_MESSAGES.PASSWORD_REQUIRED };
    }

    // 登录时不验证密码长度或格式
    // 仅验证非空即可

    return { isValid: true };
  }

  /**
   * 验证整个表单
   *
   * 依次验证所有字段,返回完整验证结果
   *
   * @param data - 表单数据
   * @returns 表单验证结果
   */
  static validateForm(data: LoginFormData): LoginFormValidation {
    const identifierResult = this.validateIdentifier(data.identifier);
    const passwordResult = this.validatePassword(data.password);

    const isValid = identifierResult.isValid && passwordResult.isValid;

    return {
      identifier: identifierResult,
      password: passwordResult,
      isValid,
    };
  }
}
