/**
 * 用户资料验证规则
 *
 * 职责:
 * - 定义用户名、邮箱的验证规则
 * - 提供字段级验证方法
 * - 与后端 Pydantic 验证规则保持一致
 *
 * @module frontend/src/lib/validation/profile-validation
 */

import type { ProfileFormData } from '@/types/auth';

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
 * 用户资料表单验证结果
 */
export interface ProfileFormValidation {
  /** 用户名验证结果 */
  username: FieldValidationResult;
  /** 邮箱验证结果 */
  email: FieldValidationResult;
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
  USERNAME_REQUIRED: '用户名不能为空',
  USERNAME_LENGTH: '用户名长度应为 3-50 个字符',
  USERNAME_FORMAT: '用户名格式不正确，只能包含字母、数字、下划线和连字符',
  EMAIL_REQUIRED: '邮箱不能为空',
  EMAIL_INVALID: '邮箱格式不正确',
} as const;

/**
 * 用户名正则表达式
 * 与后端验证规则保持一致
 */
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

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
 * 用户资料验证器
 *
 * 提供静态方法验证用户资料表单的各个字段
 */
export class ProfileValidator {
  /**
   * 验证用户名
   *
   * 规则:
   * - 必填
   * - 3-50 字符
   * - 仅允许字母、数字、下划线、连字符
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
      return { isValid: false, error: ERROR_MESSAGES.USERNAME_FORMAT };
    }

    return { isValid: true };
  }

  /**
   * 验证邮箱
   *
   * 规则:
   * - 必填
   * - 标准邮箱格式
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
   * 验证整个表单
   *
   * @param data - 表单数据
   * @returns 表单验证结果
   */
  static validateForm(data: ProfileFormData): ProfileFormValidation {
    const usernameResult = this.validateUsername(data.username);
    const emailResult = this.validateEmail(data.email);

    const isValid = usernameResult.isValid && emailResult.isValid;

    return {
      username: usernameResult,
      email: emailResult,
      isValid,
    };
  }

  /**
   * 检查表单数据是否有变更
   *
   * @param original - 原始数据
   * @param current - 当前数据
   * @returns 是否有变更
   */
  static hasChanges(
    original: ProfileFormData,
    current: ProfileFormData
  ): boolean {
    return original.username !== current.username || original.email !== current.email;
  }
}