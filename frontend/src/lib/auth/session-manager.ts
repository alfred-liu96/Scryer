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
   * 正在进行的刷新 Promise（用于请求去重）
   *
   * - null: 当前没有进行中的刷新
   * - Promise<TokenRefreshResult>: 刷新进行中，后续调用复用此 Promise
   */
  private refreshingPromise: Promise<TokenRefreshResult> | null = null;

  /**
   * 页面可见性变化事件处理器引用（用于移除监听）
   *
   * 保存绑定后的函数引用，确保 stop() 时能正确移除监听器
   */
  private visibilityChangeHandler: (() => void) | null = null;

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
   * 启动会话管理器（扩展版本）
   *
   * 新增逻辑：
   * - 在步骤 5（调度刷新）之后，注册 visibilitychange 事件监听
   *
   * 逻辑流程：
   * 1. 如果定时器已存在，先清除
   * 2. 从 TokenStorage 读取 Token
   * 3. 获取 Token 过期时间
   * 4. 如果启动时检查开启，检查是否需要立即刷新
   * 5. 调度刷新
   * 6. [新增] 注册页面可见性事件监听
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
        // 刷新成功后注册事件监听
        this.setupVisibilityListener();
        return;
      }
    }

    // 步骤 5: 调度刷新
    this.scheduleRefresh(expiresAt);

    // 步骤 6: 注册页面可见性事件监听
    this.setupVisibilityListener();
  }

  /**
   * 停止会话管理器（扩展版本）
   *
   * 新增逻辑：
   * - 在清除定时器之后，移除 visibilitychange 事件监听
   *
   * 逻辑流程：
   * 1. 清除当前定时器
   * 2. 移除页面可见性事件监听
   * 3. 将状态设置为 STOPPED
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

    // 移除页面可见性事件监听
    this.removeVisibilityListener();

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
   * 检查是否应该刷新 Token
   *
   * 判断逻辑：
   * 1. 获取 Token 过期时间
   * 2. 如果无法获取过期时间，返回 false
   * 3. 计算距离过期的剩余时间
   * 4. 如果剩余时间 < refreshBeforeExpiry，返回 true
   *
   * @returns 是否需要刷新
   *
   * @example
   * ```ts
   * if (this.shouldRefreshToken()) {
   *   await this.refreshAccessToken();
   * }
   * ```
   */
  private shouldRefreshToken(): boolean {
    const expiresAt = this.getTokenExpiry();
    if (!expiresAt) return false;

    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    return timeUntilExpiry < this.refreshBeforeExpiry;
  }

  /**
   * 处理页面可见性变化事件
   *
   * 逻辑流程：
   * 1. 检查 document.visibilityState
   * 2. 如果变为 'visible'（页面显示）：
   *    - 检查是否需要刷新 Token
   *    - 如果需要，触发刷新
   * 3. 如果变为 'hidden'（页面隐藏）：
   *    - 不做处理（定时器继续运行，但刷新只在显示时触发）
   *
   * 注意：
   * - 页面隐藏时不暂停定时器，避免页面恢复后 Token 已过期
   * - 仅在页面显示时主动检查是否需要立即刷新
   *
   * @example
   * ```ts
   * // 用户切换标签页回来，检查 Token 是否需要刷新
   * document.addEventListener('visibilitychange', this.handleVisibilityChange);
   * ```
   */
  private handleVisibilityChange(): void {
    // 仅在页面显示时检查是否需要刷新
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      if (this.shouldRefreshToken()) {
        // 异步触发刷新，不阻塞事件处理
        this.refreshAccessToken().catch(() => {
          // 错误已在 refreshAccessToken 内部处理
        });
      }
    }
  }

  /**
   * 设置页面可见性事件监听
   *
   * 逻辑流程：
   * 1. 检查是否已在浏览器环境（typeof document !== 'undefined'）
   * 2. 创建绑定的事件处理器
   * 3. 添加 'visibilitychange' 事件监听
   *
   * 注意：
   * - 保存绑定的处理器引用，以便后续移除
   * - 避免重复注册（检查 visibilityChangeHandler 是否已存在）
   */
  private setupVisibilityListener(): void {
    // SSR 安全检查
    if (typeof document === 'undefined') return;

    // 避免重复注册
    if (this.visibilityChangeHandler !== null) return;

    // 绑定处理器
    this.visibilityChangeHandler = () => this.handleVisibilityChange();
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  /**
   * 移除页面可见性事件监听
   *
   * 逻辑流程：
   * 1. 检查是否有已注册的处理器
   * 2. 如果有，移除事件监听
   * 3. 清空处理器引用
   *
   * 注意：
   * - 多次调用是安全的（幂等操作）
   */
  private removeVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    if (this.visibilityChangeHandler !== null) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
  }

  /**
   * 刷新访问令牌（带请求去重）
   *
   * 逻辑流程：
   * 1. 检查 refreshingPromise 是否存在
   * 2. 如果存在，返回该 Promise（复用进行中的请求）
   * 3. 如果不存在，创建新的刷新 Promise 并保存
   * 4. 等待刷新完成
   * 5. 清空 refreshingPromise
   * 6. 返回刷新结果
   *
   * 去重机制：
   * - 防止多个并发调用同时发起刷新请求
   * - 确保同一时间只有一个刷新请求在进行
   * - 所有调用者共享同一个刷新结果
   *
   * @returns Promise<TokenRefreshResult> 刷新结果
   *
   * @example
   * ```ts
   * // 场景：三个组件同时调用 refreshAccessToken()
   * // 结果：只有一个 HTTP 请求被发起，其他两个等待同一个 Promise
   * await Promise.all([
   *   this.refreshAccessToken(),
   *   this.refreshAccessToken(),
   *   this.refreshAccessToken(),
   * ]);
   * ```
   */
  private async refreshAccessToken(): Promise<TokenRefreshResult> {
    // 步骤 1: 复用进行中的刷新请求（去重核心逻辑）
    if (this.refreshingPromise !== null) {
      return this.refreshingPromise;
    }

    // 步骤 2: 创建新的刷新 Promise
    this.refreshingPromise = this.performRefresh();

    try {
      // 步骤 3: 等待刷新完成
      const result = await this.refreshingPromise;
      return result;
    } finally {
      // 步骤 4: 无论成功失败，清空 Promise 引用
      this.refreshingPromise = null;
    }
  }

  /**
   * 执行实际的刷新操作（内部方法）
   *
   * 逻辑流程（保持原有实现）：
   * 1. 调用 AuthClient.refreshToken()
   * 2. 如果成功，解析新 Token 并安排下一次刷新
   * 3. 如果失败，调用 handleRefreshFailure()
   *
   * @returns Promise<TokenRefreshResult> 刷新结果
   */
  private async performRefresh(): Promise<TokenRefreshResult> {
    try {
      // 调用 authClient.refreshToken()
      await this.authClient.refreshToken();

      // 刷新成功，重新调度下一次刷新
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
