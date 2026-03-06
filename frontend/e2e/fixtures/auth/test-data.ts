/**
 * 认证测试数据 Fixtures
 *
 * 职责：
 * - 提供测试用的用户数据
 * - 提供无效数据用于验证测试
 * - 生成唯一标识符避免测试冲突
 *
 * @module e2e/fixtures/auth/test-data
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 用户凭据
 */
export interface UserCredentials {
  /** 用户名 */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 密码 */
  password: string;
}

/**
 * 登录凭据
 */
export interface LoginCredentials {
  /** 用户名或邮箱 */
  usernameOrEmail: string;
  /** 密码 */
  password: string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成唯一标识符（基于时间戳和随机数）
 * @returns 唯一字符串
 */
export function generateUniqueId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 生成唯一的测试用户名
 * @param prefix 前缀（默认 'testuser'）
 * @returns 唯一用户名
 */
export function generateUsername(prefix: string = 'testuser'): string {
  return `${prefix}_${generateUniqueId()}`;
}

/**
 * 生成唯一的测试邮箱
 * @param prefix 前缀（默认 'testuser'）
 * @returns 唯一邮箱地址
 */
export function generateEmail(prefix: string = 'testuser'): string {
  const uniqueId = generateUniqueId();
  return `${prefix}_${uniqueId}@example.com`;
}

/**
 * 生成固定的测试用户（用于跨测试共享）
 * @param identifier 标识符
 * @returns 用户凭据
 */
export function createFixedUser(identifier: string): UserCredentials {
  return {
    username: `testuser_${identifier}`,
    email: `testuser_${identifier}@example.com`,
    password: 'TestPass123!',
  };
}

// ============================================================================
// 有效测试数据
// ============================================================================

/**
 * 有效的用户凭据（符合所有验证规则）
 */
export const VALID_USER: UserCredentials = {
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'TestPass123!',
};

/**
 * 有效的登录凭据（用户名）
 */
export const VALID_LOGIN_BY_USERNAME: LoginCredentials = {
  usernameOrEmail: 'testuser',
  password: 'TestPass123!',
};

/**
 * 有效的登录凭据（邮箱）
 */
export const VALID_LOGIN_BY_EMAIL: LoginCredentials = {
  usernameOrEmail: 'testuser@example.com',
  password: 'TestPass123!',
};

/**
 * 边界值有效数据（最小长度）
 */
export const VALID_MINIMAL: UserCredentials = {
  username: 'abc',           // 最少 3 字符
  email: 'a@b.co',           // 有效邮箱
  password: '12345678',      // 最少 8 字符
};

/**
 * 边界值有效数据（最大长度）
 */
export const VALID_MAXIMUM: UserCredentials = {
  username: 'a'.repeat(50),              // 最多 50 字符
  email: 'verylongemailaddress@verylongdomain.com',
  password: 'a'.repeat(100),             // 最多 100 字符
};

// ============================================================================
// 无效测试数据（用于表单验证）
// ============================================================================

/**
 * 用户名过短（少于 3 字符）
 */
export const INVALID_SHORT_USERNAME: UserCredentials = {
  username: 'ab',
  email: 'test@example.com',
  password: 'TestPass123!',
};

/**
 * 用户名过长（超过 50 字符）
 */
export const INVALID_LONG_USERNAME: UserCredentials = {
  username: 'a'.repeat(51),
  email: 'test@example.com',
  password: 'TestPass123!',
};

/**
 * 无效邮箱格式
 */
export const INVALID_EMAIL_FORMAT: UserCredentials = {
  username: 'testuser',
  email: 'invalid-email',
  password: 'TestPass123!',
};

/**
 * 密码过短（少于 8 字符）
 */
export const INVALID_SHORT_PASSWORD: UserCredentials = {
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'abc123',
};

/**
 * 密码过长（超过 100 字符）
 */
export const INVALID_LONG_PASSWORD: UserCredentials = {
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'a'.repeat(101),
};

/**
 * 空字段数据
 */
export const INVALID_EMPTY_FIELDS = {
  username: '',
  email: '',
  password: '',
};

// ============================================================================
// 错误场景测试数据
// ============================================================================

/**
 * 用于测试重复用户名的数据
 * （在注册测试中，先用 VALID_USER 注册，再用此数据测试）
 */
export const DUPLICATE_USERNAME: UserCredentials = {
  username: 'testuser',     // 与 VALID_USER 相同
  email: 'another@example.com',
  password: 'TestPass123!',
};

/**
 * 用于测试重复邮箱的数据
 * （在注册测试中，先用 VALID_USER 注册，再用此数据测试）
 */
export const DUPLICATE_EMAIL: UserCredentials = {
  username: 'anotheruser',
  email: 'testuser@example.com',  // 与 VALID_USER 相同
  password: 'TestPass123!',
};

/**
 * 错误的登录凭据（密码错误）
 */
export const INVALID_PASSWORD: LoginCredentials = {
  usernameOrEmail: 'testuser',
  password: 'WrongPassword123!',
};

/**
 * 不存在的用户凭据
 */
export const NON_EXISTENT_USER: LoginCredentials = {
  usernameOrEmail: 'nonexistentuser',
  password: 'TestPass123!',
};
