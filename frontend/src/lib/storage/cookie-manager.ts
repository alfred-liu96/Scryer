/**
 * Cookie 管理器
 *
 * 负责在浏览器环境中管理认证 Cookie（用于 Middleware 读取）
 *
 * 安全性说明：
 * - 前端设置的 Cookie 无法设置 HttpOnly 标志
 * - 理想情况下应通过后端 Set-Cookie 头设置（HttpOnly + Secure）
 * - 当前实现作为 MVP 方案，后续可优化为后端设置
 */

/**
 * Cookie 配置常量
 */
const COOKIE_CONFIG = {
  /** Cookie 过期时间（7天） */
  MAX_AGE: 7 * 24 * 60 * 60,
  /** Cookie 作用路径 */
  PATH: '/',
  /** SameSite 策略（防止 CSRF） */
  SAME_SITE: 'Lax' as const,
} as const;

/**
 * Cookie 名称（导出供测试使用）
 */
export const AUTH_COOKIE_NAME = 'access_token';

/**
 * 序列化 Cookie 字符串
 *
 * @param name - Cookie 名称
 * @param value - Cookie 值
 * @param options - Cookie 选项
 * @returns 序列化后的 Cookie 字符串
 */
function serializeCookie(
  name: string,
  value: string,
  options: { 'max-age'?: string; path?: string; sameSite?: string }
): string {
  const parts: string[] = [];

  // 名称=值
  parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);

  // Max-Age
  if (options['max-age'] !== undefined) {
    parts.push(`Max-Age=${options['max-age']}`);
  }

  // Path
  if (options.path !== undefined) {
    parts.push(`Path=${options.path}`);
  }

  // SameSite
  if (options.sameSite !== undefined) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join('; ');
}

/**
 * 解析 Cookie 字符串为对象
 *
 * @param cookieString - document.cookie 返回的字符串
 * @returns Cookie 键值对对象
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieString) {
    return cookies;
  }

  cookieString.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value !== undefined) {
      try {
        cookies[decodeURIComponent(name)] = decodeURIComponent(value);
      } catch {
        // 忽略解码错误，保留原始值
        cookies[name] = value;
      }
    }
  });

  return cookies;
}

/**
 * Cookie 管理器接口
 */
export interface CookieManager {
  /**
   * 设置认证 Token Cookie
   *
   * @param token - 访问令牌
   * @param expiresIn - 过期时间（秒），默认 7 天
   */
  setAuthToken(token: string, expiresIn?: number): void;

  /**
   * 获取认证 Token Cookie
   *
   * @returns Token 字符串，不存在返回 null
   */
  getAuthToken(): string | null;

  /**
   * 清除认证 Token Cookie
   */
  clearAuthToken(): void;

  /**
   * 检查是否存在认证 Token Cookie
   *
   * @returns 是否存在有效的 Token
   */
  hasAuthToken(): boolean;
}

/**
 * Cookie 管理器实现类
 */
class CookieManagerImpl implements CookieManager {
  /**
   * 设置认证 Token Cookie
   */
  setAuthToken(token: string, expiresIn: number = COOKIE_CONFIG.MAX_AGE): void {
    if (typeof window === 'undefined') {
      return; // 仅在浏览器环境执行
    }

    const value = serializeCookie(AUTH_COOKIE_NAME, token, {
      'max-age': expiresIn.toString(),
      path: COOKIE_CONFIG.PATH,
      sameSite: COOKIE_CONFIG.SAME_SITE,
    });

    document.cookie = value;
  }

  /**
   * 获取认证 Token Cookie
   */
  getAuthToken(): string | null {
    if (typeof window === 'undefined') {
      return null; // 仅在浏览器环境执行
    }

    const cookies = parseCookies(document.cookie);
    const token = cookies[AUTH_COOKIE_NAME];
    // 空字符串视为无 Token
    if (token === '' || token === undefined) {
      return null;
    }
    return token;
  }

  /**
   * 清除认证 Token Cookie
   */
  clearAuthToken(): void {
    if (typeof window === 'undefined') {
      return; // 仅在浏览器环境执行
    }

    const value = serializeCookie(AUTH_COOKIE_NAME, '', {
      'max-age': '0',
      path: COOKIE_CONFIG.PATH,
      sameSite: COOKIE_CONFIG.SAME_SITE,
    });

    document.cookie = value;
  }

  /**
   * 检查是否存在认证 Token Cookie
   */
  hasAuthToken(): boolean {
    const token = this.getAuthToken();
    return token !== null && token !== '';
  }
}

/**
 * 创建 Cookie 管理器实例
 *
 * @returns Cookie 管理器实例
 */
export function createCookieManager(): CookieManager {
  return new CookieManagerImpl();
}

// ============================================================================
// 静态方法便捷导出（供 auth-api.ts 和 auth-client.ts 使用）
// ============================================================================

/**
 * 静态 Cookie 管理器（单例）
 */
const staticCookieManager = createCookieManager();

/**
 * 设置认证 Token Cookie（静态方法）
 *
 * @param token - 访问令牌
 * @param expiresIn - 过期时间（秒），默认 7 天
 */
export function setAuthToken(token: string, expiresIn?: number): void {
  staticCookieManager.setAuthToken(token, expiresIn);
}

/**
 * 获取认证 Token Cookie（静态方法）
 *
 * @returns Token 字符串，不存在返回 null
 */
export function getAuthToken(): string | null {
  return staticCookieManager.getAuthToken();
}

/**
 * 清除认证 Token Cookie（静态方法）
 */
export function clearAuthToken(): void {
  staticCookieManager.clearAuthToken();
}

/**
 * 检查是否存在认证 Token Cookie（静态方法）
 *
 * @returns 是否存在有效的 Token
 */
export function hasAuthToken(): boolean {
  return staticCookieManager.hasAuthToken();
}
