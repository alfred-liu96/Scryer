/**
 * 注册表单验证规则
 *
 * 职责:
 * - 定义用户名、邮箱、密码的验证规则
 * - 提供字段级和表单级验证方法
 * - 返回用户友好的错误消息
 *
 * @module frontend/src/lib/validation/register-validation
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
 * 注册表单数据
 */
export interface RegisterFormData {
  /** 用户名 */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 密码 */
  password: string;
  /** 确认密码 */
  confirmPassword: string;
}

/**
 * 注册表单验证结果
 */
export interface RegisterFormValidation {
  /** 用户名验证结果 */
  username: FieldValidationResult;
  /** 邮箱验证结果 */
  email: FieldValidationResult;
  /** 密码验证结果 */
  password: FieldValidationResult;
  /** 确认密码验证结果 */
  confirmPassword: FieldValidationResult;
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
  /** 密码最小长度 */
  PASSWORD_MIN_LENGTH: 8,
  /** 密码最大长度 */
  PASSWORD_MAX_LENGTH: 100,
} as const;

/**
 * 错误消息常量
 */
const ERROR_MESSAGES = {
  USERNAME_REQUIRED: '用户名不能为空',
  USERNAME_LENGTH: '用户名长度应为 3-50 个字符',
  USERNAME_FORMAT: '用户名格式不正确，只能包含字母、数字、下划线和连字符',
  USERNAME_START_END_HYPHEN: '用户名不能以连字符开头或结尾',
  EMAIL_REQUIRED: '邮箱不能为空',
  EMAIL_INVALID: '邮箱格式不正确',
  PASSWORD_REQUIRED: '密码不能为空',
  PASSWORD_TOO_SHORT: '密码至少需要 8 个字符',
  PASSWORD_TOO_LONG: '密码不能超过 100 个字符',
  CONFIRM_PASSWORD_REQUIRED: '请再次输入密码',
  CONFIRM_PASSWORD_MISMATCH: '两次输入的密码不一致',
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
 * - 域名: 字母、数字、点、连字符 (不能以点开头/结尾，不能有连续点)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

// ============================================================================
// 验证器类
// ============================================================================

/**
 * 注册表单验证器
 *
 * 提供静态方法验证注册表单的各个字段
 */
export class RegisterValidator {
  /**
   * 验证用户名
   *
   * 规则:
   * - 必填
   * - 3-50 字符
   * - 仅允许字母、数字、下划线、连字符
   * - 不能以连字符开头或结尾
   *
   * @param username - 用户名
   * @returns 验证结果
   */
  static validateUsername(username: string): FieldValidationResult {
    // 检查必填
    if (!username || username.trim() === '') {
      return { isValid: false, error: ERROR_MESSAGES.USERNAME_REQUIRED };
    }

    const trimmed = username.trim();

    // 检查长度
    if (
      trimmed.length < VALIDATION_RULES.USERNAME_MIN_LENGTH ||
      trimmed.length > VALIDATION_RULES.USERNAME_MAX_LENGTH
    ) {
      return { isValid: false, error: ERROR_MESSAGES.USERNAME_LENGTH };
    }

    // 检查格式
    if (!USERNAME_REGEX.test(trimmed)) {
      // 特殊检查: 是否以连字符开头/结尾
      if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
        return { isValid: false, error: ERROR_MESSAGES.USERNAME_START_END_HYPHEN };
      }
      return { isValid: false, error: ERROR_MESSAGES.USERNAME_FORMAT };
    }

    return { isValid: true };
  }

  /**
   * 验证邮箱
   *
   * 规则:
   * - 必填
   * - 标准邮箱格式 (更严格的验证)
   *
   * @param email - 邮箱地址
   * @returns 验证结果
   */
  static validateEmail(email: string): FieldValidationResult {
    // 检查必填
    if (!email || email.trim() === '') {
      return { isValid: false, error: ERROR_MESSAGES.EMAIL_REQUIRED };
    }

    const trimmed = email.trim();

    // 检查格式
    if (!EMAIL_REGEX.test(trimmed)) {
      return { isValid: false, error: ERROR_MESSAGES.EMAIL_INVALID };
    }

    return { isValid: true };
  }

  /**
   * 验证密码
   *
   * 规则:
   * - 必填
   * - 8-100 字符
   *
   * @param password - 密码
   * @returns 验证结果
   */
  static validatePassword(password: string): FieldValidationResult {
    // 检查必填
    if (!password || password === '') {
      return { isValid: false, error: ERROR_MESSAGES.PASSWORD_REQUIRED };
    }

    // 检查最小长度
    if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
      return { isValid: false, error: ERROR_MESSAGES.PASSWORD_TOO_SHORT };
    }

    // 检查最大长度
    if (password.length > VALIDATION_RULES.PASSWORD_MAX_LENGTH) {
      return { isValid: false, error: ERROR_MESSAGES.PASSWORD_TOO_LONG };
    }

    return { isValid: true };
  }

  /**
   * 验证确认密码
   *
   * 规则:
   * - 必填
   * - 与密码一致
   *
   * @param password - 密码
   * @param confirmPassword - 确认密码
   * @returns 验证结果
   */
  static validateConfirmPassword(
    password: string,
    confirmPassword: string
  ): FieldValidationResult {
    // 检查必填
    if (!confirmPassword || confirmPassword === '') {
      return { isValid: false, error: ERROR_MESSAGES.CONFIRM_PASSWORD_REQUIRED };
    }

    // 检查一致性
    if (password !== confirmPassword) {
      return { isValid: false, error: ERROR_MESSAGES.CONFIRM_PASSWORD_MISMATCH };
    }

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
  static validateForm(data: RegisterFormData): RegisterFormValidation {
    const usernameResult = this.validateUsername(data.username);
    const emailResult = this.validateEmail(data.email);
    const passwordResult = this.validatePassword(data.password);
    const confirmPasswordResult = this.validateConfirmPassword(
      data.password,
      data.confirmPassword
    );

    const isValid =
      usernameResult.isValid &&
      emailResult.isValid &&
      passwordResult.isValid &&
      confirmPasswordResult.isValid;

    return {
      username: usernameResult,
      email: emailResult,
      password: passwordResult,
      confirmPassword: confirmPasswordResult,
      isValid,
    };
  }
}
