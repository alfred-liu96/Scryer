/**
 * Session Manager - Token 自动刷新管理器
 *
 * 文件: frontend/src/lib/auth/session-manager.ts
 *
 * 职责：
 * - 监控 Token 过期时间，在过期前自动刷新
 * - 提供启动/停止定时器的接口
 * - 确保定时器正确清理，避免内存泄漏
 * - 刷新失败时自动登出
 *
 * 设计原则：
 * - 单一职责：仅负责会话生命周期管理
 * - 依赖注入：所有外部依赖通过构造函数注入
 * - 简洁直观：方法命名清晰，易于理解
 *
 * @depends
 * - @/lib/storage/token-storage (TokenStorage)
 * - @/lib/api/auth-client (AuthClient)
 * - @/store/auth/auth-store-types (AuthStore)
 */

import type { TokenStorage } from '@/lib/storage/token-storage';
import type { AuthClient } from '@/lib/api/auth-client';
import type { AuthStore } from '@/store/auth/auth-store-types';

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 默认刷新提前时间（5 分钟）
 *
 * 在 Token 过期前 5 分钟触发刷新
 */
const DEFAULT_REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000;

/**
 * 最小刷新间隔（30 秒）
 *
 * 避免过于频繁的刷新请求
 */
const MIN_REFRESH_INTERVAL = 30 * 1000;

// ============================================================================
// 类型定义
// ============================================================================

/**
 * SessionManager 配置选项
 */
export interface SessionManagerOptions {
  /** Token 存储实例 */
  tokenStorage: TokenStorage;
  /** 认证客户端实例 */
  authClient: AuthClient;
  /** 认证 Store 实例（可选） */
  authStore?: AuthStore;
  /** Token 刷新提前量（毫秒，默认 5 分钟） */
  refreshBeforeExpiry?: number;
  /** 是否在启动时立即检查并刷新（如果需要） */
  checkOnStartup?: boolean;
}

/**
 * 会话管理器状态
 */
export enum SessionManagerStatus {
  /** 未启动 */
  IDLE = 'idle',
  /** 运行中（定时器已激活） */
  RUNNING = 'running',
  /** 已停止 */
  STOPPED = 'stopped',
}

/**
 * JWT Token Payload（用于解析 exp 字段）
 */
interface JWTPayload {
  /** Token 过期时间（Unix 时间戳，秒） */
  exp?: number;
  /** Token 签发时间（Unix 时间戳，秒） */
  iat?: number;
  /** Token 主题（通常是用户 ID） */
  sub?: string;
}

/**
 * Token 刷新结果
 */
interface TokenRefreshResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息（失败时存在） */
  error?: Error;
}

// ============================================================================
// SessionManager 类
// ============================================================================

/**
 * Session Manager - Token 自动刷新管理器
 *
 * 负责管理 Token 的自动刷新生命周期，确保用户会话持续有效。
 *
 * @example
 * ```ts
 * // 创建 SessionManager 实例
 * const sessionManager = new SessionManager({
 *   tokenStorage: createTokenStorage(),
 *   authClient: authClient,
 *   authStore: authStore,
 * });
 *
 * // 启动自动刷新
 * await sessionManager.start();
 *
 * // 停止自动刷新（组件卸载时）
 * sessionManager.stop();
 * ```
 */
export class SessionManager {
  /**
   * Token 存储实例（用于读取和更新 Token）
   */
  private readonly tokenStorage: TokenStorage;

  /**
   * 认证客户端实例（用于执行 Token 刷新和登出）
   */
  private readonly authClient: AuthClient;

  /**
   * 认证 Store 实例（用于更新认证状态，可选）
   */
  private readonly authStore: AuthStore | undefined;

  /**
   * Token 刷新提前量（毫秒）
   *
   * 在 Token 过期前多久触发刷新
   * 默认：5 分钟（300,000 毫秒）
   */
  private readonly refreshBeforeExpiry: number;

  /**
   * 是否在启动时立即检查并刷新
   */
  private readonly checkOnStartup: boolean;

  /**
   * 定时器 ID（用于 clearTimeout）
   *
   * null 表示没有活动的定时器
   */
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  /**
   * 当前状态
   */
  private status: SessionManagerStatus = SessionManagerStatus.IDLE;

  /**
   * 构造函数
   *
   * @param options - SessionManager 配置选项
   *
   * @example
   * ```ts
   * const sessionManager = new SessionManager({
   *   tokenStorage: createTokenStorage(),
   *   authClient: authClient,
   *   authStore: authStore,
   *   refreshBeforeExpiry: 5 * 60 * 1000, // 可选
   *   checkOnStartup: true, // 可选
   * });
   * ```
   */
  constructor(options: SessionManagerOptions) {
    this.tokenStorage = options.tokenStorage;
    this.authClient = options.authClient;
    this.authStore = options.authStore;
    this.refreshBeforeExpiry =
      options.refreshBeforeExpiry ?? DEFAULT_REFRESH_BEFORE_EXPIRY;
    this.checkOnStartup = options.checkOnStartup ?? false;
  }

  /**
   * 启动会话管理器
   *
   * 逻辑流程：
   * 1. 检查是否已有有效 Token
   * 2. 如果有 Token，解析过期时间并设置定时器
   * 3. 如果没有 Token，保持 IDLE 状态
   *
   * 注意：
   * - 重复调用 start() 不会创建多个定时器
   * - 如果已有定时器在运行，会先清除旧的定时器
   * - 如果无法解析 Token（无效或缺少 exp），保持 IDLE 状态
   *
   * @example
   * ```ts
   * await sessionManager.start();
   * ```
   */
  async start(): Promise<void> {
    // 步骤 1: 如果定时器已存在，先清除（幂等性）
    if (this.refreshTimerId !== null) {
      this.stop();
    }

    // 步骤 2: 从 TokenStorage 读取 Token
    const tokens = this.tokenStorage.getTokens();
    if (!tokens) {
      // 没有 Token，保持 IDLE 状态
      return;
    }

    // 步骤 3: 获取 Token 过期时间
    // 优先从 tokens.accessToken 解析 JWT
    let expiresAt: number | null = null;
    if (tokens.accessToken) {
      const payload = this.parseJWT(tokens.accessToken);
      if (payload && payload.exp) {
        expiresAt = payload.exp * 1000;
      }
    }

    // 如果无法解析 JWT，保持 IDLE 状态
    if (!expiresAt) {
      return;
    }

    // 步骤 4: 如果启动时检查开启，检查是否需要立即刷新
    if (this.checkOnStartup) {
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      // 如果 Token 即将过期（小于 refreshBeforeExpiry），立即刷新
      if (timeUntilExpiry < this.refreshBeforeExpiry) {
        await this.refreshAccessToken();
        return;
      }
    }

    // 步骤 5: 调度刷新
    this.scheduleRefresh(expiresAt);
  }

  /**
   * 停止会话管理器
   *
   * 逻辑流程：
   * 1. 清除当前定时器
   * 2. 将状态设置为 STOPPED
   *
   * 注意：
   * - 重复调用 stop() 是安全的（幂等操作）
   * - stop() 不会清除 Token 或登出用户
   *
   * @example
   * ```ts
   * sessionManager.stop();
   * ```
   */
  stop(): void {
    // 清除定时器
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    this.status = SessionManagerStatus.STOPPED;
  }

  /**
   * 获取当前状态
   *
   * @returns 当前状态
   *
   * @example
   * ```ts
   * const status = sessionManager.getStatus();
   * console.log(status); // 'running'
   * ```
   */
  getStatus(): SessionManagerStatus {
    return this.status;
  }

  /**
   * 调度下一次 Token 刷新
   *
   * 逻辑流程：
   * 1. 从 TokenStorage 获取当前 Token
   * 2. 解析 JWT 的 exp 字段
   * 3. 计算刷新时间（exp - refreshBeforeExpiry）
   * 4. 设置 setTimeout 定时器
   *
   * 注意：
   * - 如果 Token 已过期，立即触发刷新
   * - 如果刷新时间 < 0，立即触发刷新
   * - 如果刷新时间 > 0，设置定时器
   *
   * @param expiresAt - Token 过期时间戳（毫秒）
   *
   * @example
   * ```ts
   * // Token 在 1 小时后过期
   * // 将在 55 分钟后触发刷新
   * this.scheduleRefresh(Date.now() + 3600 * 1000);
   * ```
   */
  private scheduleRefresh(expiresAt: number): void {
    // 清除现有定时器
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
    }

    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshDelay = Math.max(
      0,
      timeUntilExpiry - this.refreshBeforeExpiry
    );

    // 设置新的定时器
    this.refreshTimerId = setTimeout(async () => {
      await this.refreshAccessToken();
    }, refreshDelay);

    this.status = SessionManagerStatus.RUNNING;
  }

  /**
   * 刷新访问令牌
   *
   * 逻辑流程：
   * 1. 调用 AuthClient.refreshToken()
   * 2. 如果成功，解析新 Token 并安排下一次刷新
   * 3. 如果失败（401/网络错误），调用 AuthClient.logout() 并停止定时器
   *
   * 错误处理：
   * - 401 Unauthorized: Token 刷新失败，自动登出
   * - 网络错误: 停止定时器，等待用户手动刷新页面
   * - 其他错误: 记录日志，停止定时器
   *
   * @returns Promise<TokenRefreshResult> 刷新结果
   *
   * @example
   * ```ts
   * const result = await this.refreshAccessToken();
   * if (!result.success) {
   *   console.error('Refresh failed:', result.error);
   * }
   * ```
   */
  private async refreshAccessToken(): Promise<TokenRefreshResult> {
    try {
      // 步骤 1: 调用 authClient.refreshToken()
      // 这会更新 TokenStorage 和 AuthStore
      await this.authClient.refreshToken();

      // 步骤 2: 刷新成功，重新调度下一次刷新
      // 重新读取新的过期时间
      const tokens = this.tokenStorage.getTokens();
      if (tokens && tokens.accessToken) {
        const payload = this.parseJWT(tokens.accessToken);
        if (payload && payload.exp) {
          const expiresAt = payload.exp * 1000;
          this.scheduleRefresh(expiresAt);
        }
      }

      return { success: true };
    } catch (error) {
      // 步骤 3: 刷新失败，处理错误
      const err =
        error instanceof Error ? error : new Error(String(error));
      this.handleRefreshFailure(err);
      return { success: false, error: err };
    }
  }

  /**
   * 从 Token 中提取过期时间
   *
   * 逻辑流程：
   * 1. 从 TokenStorage 获取 access_token
   * 2. 调用 parseJWT() 解析 Token
   * 3. 返回 exp 字段（转换为毫秒）
   *
   * 注意：
   * - 如果 Token 无效或没有 exp 字段，返回 null
   * - JWT 的 exp 是秒级时间戳，需要转换为毫秒
   *
   * @returns 过期时间戳（毫秒），失败返回 null
   *
   * @example
   * ```ts
   * const expiresAt = this.getTokenExpiry();
   * if (expiresAt) {
   *   console.log('Token expires at:', new Date(expiresAt));
   * }
   * ```
   */
  private getTokenExpiry(): number | null {
    const accessToken = this.tokenStorage.getAccessToken();
    if (!accessToken) {
      return null;
    }

    const payload = this.parseJWT(accessToken);
    if (!payload || !payload.exp) {
      return null;
    }

    // JWT 的 exp 是秒级时间戳，需要转换为毫秒
    return payload.exp * 1000;
  }

  /**
   * 解析 JWT Token 的 Payload
   *
   * 逻辑流程：
   * 1. 分割 Token（按 '.' 分割）
   * 2. Base64URL 解码中间部分（Payload）
   * 3. 解析为 JSON 对象
   *
   * 注意：
   * - 使用 base64URLDecode() 进行 Base64URL 解码
   * - 捕获解析错误（格式无效）
   *
   * @param token - JWT Token 字符串
   * @returns JWT Payload 对象，解析失败返回 null
   *
   * @example
   * ```ts
   * const payload = this.parseJWT('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
   * console.log(payload?.exp); // 1740000000
   * ```
   */
  private parseJWT(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = base64URLDecode(payload);
      return JSON.parse(decoded) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * 处理刷新失败
   *
   * 逻辑流程：
   * 1. 清除定时器
   * 2. 根据错误类型决定是否登出：
   *    - 401 错误：自动登出
   *    - 网络错误：仅停止定时器，不登出
   * 3. 记录错误日志
   *
   * @param error - 错误对象
   *
   * @example
   * ```ts
   * try {
   *   await this.authClient.refreshToken();
   * } catch (error) {
   *   this.handleRefreshFailure(error);
   * }
   * ```
   */
  private async handleRefreshFailure(error: Error): Promise<void> {
    // 清除定时器
    this.stop();

    // 检查是否为 401 错误
    const isUnauthorized = (error as any).status === 401;

    // 只有 401 错误才自动登出
    if (isUnauthorized) {
      try {
        await this.authClient.logout({ silent: true });
      } catch {
        // 忽略 logout 错误
      }
    }

    // 记录错误日志
    console.error('Token refresh failed, logging out:', error);
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * Base64URL 解码
 *
 * 将 Base64URL 编码的字符串解码为原始字符串
 *
 * @param base64url - Base64URL 编码的字符串
 * @returns 解码后的字符串
 *
 * @example
 * ```ts
 * const decoded = base64URLDecode('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
 * console.log(decoded); // '{"alg":"HS256","typ":"JWT"}'
 * ```
 */
function base64URLDecode(base64url: string): string {
  // 将 Base64URL 转换为 Base64
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // 补全 padding
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '='
  );
  // 使用 atob 解码
  return atob(paddedBase64);
}

// ============================================================================
// 工厂函数（可选，便于创建实例）
// ============================================================================

/**
 * 创建 SessionManager 实例的工厂函数
 *
 * @param options - SessionManager 配置选项
 * @returns SessionManager 实例
 *
 * @example
 * ```ts
 * import { createTokenStorage } from '@/lib/storage/token-storage';
 * import { authClient } from '@/lib/api/auth-client';
 * import { authStore } from '@/store/auth/auth-store';
 *
 * const sessionManager = createSessionManager({
 *   tokenStorage: createTokenStorage(),
 *   authClient: authClient,
 *   authStore: authStore,
 * });
 * ```
 */
export function createSessionManager(
  options: SessionManagerOptions
): SessionManager {
  return new SessionManager(options);
}
