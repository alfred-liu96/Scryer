/**
 * SessionManager 单元测试
 *
 * 测试覆盖范围：
 * - 构造函数依赖注入
 * - start() 启动定时器
 * - start() 无 Token 时保持 IDLE 状态
 * - start() 多次调用的幂等性
 * - stop() 清除定时器并设置 STOPPED 状态
 * - stop() 多次调用的幂等性
 * - getStatus() 返回当前状态
 * - parseJWT() 解析 JWT Token
 * - getTokenExpiry() 提取过期时间
 * - scheduleRefresh() 计算正确的刷新时机
 * - scheduleRefresh() 边界情况处理（过期时间已过）
 * - refreshAccessToken() 刷新成功后重新调度
 * - refreshAccessToken() 401 错误时自动登出
 * - refreshAccessToken() 网络错误时停止定时器
 * - 定时器清理验证（使用 jest.useFakeTimers()）
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/lib/auth/session-manager.ts
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// 注意：当前 session-manager.ts 尚未实现，这个 import 会导致测试失败
// 这是预期的行为（TDD Red First 原则）
// 当 task-developer 实现了 session-manager.ts 后，测试将能够正确运行
import { SessionManager, SessionManagerStatus } from '../session-manager';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { AuthClient } from '@/lib/api/auth-client';
import type { AuthStore } from '@/store/auth/auth-store-types';
import type { StoredTokens, TokenResponse } from '@/types/auth';

// ============================================================================
// Mock 工厂函数
// ============================================================================

/**
 * 创建 Mock TokenStorage
 */
const createMockTokenStorage = (): TokenStorage => ({
  setTokens: jest.fn(() => true),
  getTokens: jest.fn(() => null),
  getAccessToken: jest.fn(() => null),
  getRefreshToken: jest.fn(() => null),
  isTokenExpired: jest.fn(() => true),
  clearTokens: jest.fn(() => {}),
  hasValidTokens: jest.fn(() => false),
  updateAccessToken: jest.fn(() => true),
});

/**
 * 创建 Mock AuthClient
 */
const createMockAuthClient = (): AuthClient => ({
  refreshToken: jest.fn(),
  logout: jest.fn(),
} as unknown as AuthClient);

/**
 * 创建 Mock AuthStore
 */
const createMockAuthStore = (): AuthStore => ({
  status: 'unauthenticated',
  user: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  error: null,
  isAuthenticating: false,
  setLoading: jest.fn(),
  setAuthUser: jest.fn(),
  updateAccessToken: jest.fn(),
  clearAuth: jest.fn(),
  setError: jest.fn(),
  clearError: jest.fn(),
  toJSON: jest.fn(() => ({})),
  fromJSON: jest.fn(),
  reset: jest.fn(),
});

/**
 * Mock JWT 的固定基准时间（2024-01-01 00:00:00 UTC）
 *
 * 注意：在 Jest 假定时器环境下，Date.now() 返回 0，因此使用固定基准时间
 * 确保生成的 JWT Token 有正确的过期时间戳
 */
const MOCK_JWT_BASE_TIME = 1704067200; // 2024-01-01 00:00:00 UTC

/**
 * 创建 Mock JWT Token（带 exp 字段）
 *
 * @param expiresIn - 过期时间（秒）
 * @returns JWT Token 字符串
 */
const createMockJWT = (expiresIn: number): string => {
  const now = MOCK_JWT_BASE_TIME;
  const exp = now + expiresIn;

  // 创建 Base64URL 编码的 Header 和 Payload
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const payload = btoa(
    JSON.stringify({ exp, sub: 'user123', iat: now })
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const signature = 'mock_signature';

  return `${header}.${payload}.${signature}`;
};

/**
 * 创建 Mock StoredTokens
 */
const createMockStoredTokens = (
  overrides?: Partial<StoredTokens>
): StoredTokens => ({
  accessToken: createMockJWT(3600), // 默认 1 小时后过期
  refreshToken: 'test_refresh_token',
  // 使用固定基准时间计算 expiresAt，确保与 JWT exp 字段一致
  expiresAt: MOCK_JWT_BASE_TIME * 1000 + 3600 * 1000, // 1 小时后过期
  ...overrides,
});

/**
 * 创建 Mock TokenResponse
 */
const createMockTokenResponse = (
  overrides?: Partial<TokenResponse>
): TokenResponse => ({
  access_token: createMockJWT(3600), // 默认 1 小时后过期
  refresh_token: 'new_refresh_token',
  token_type: 'Bearer',
  expires_in: 3600,
  ...overrides,
});

// ============================================================================
// 测试套件
// ============================================================================

describe('SessionManager', () => {
  let mockTokenStorage: TokenStorage;
  let mockAuthClient: AuthClient;
  let mockAuthStore: AuthStore;

  beforeEach(() => {
    // 每个测试前创建新的 Mock 对象
    mockTokenStorage = createMockTokenStorage();
    mockAuthClient = createMockAuthClient();
    mockAuthStore = createMockAuthStore();

    // 启用假定时器并设置固定基准时间
    // 这确保 Date.now() 返回一致的值，与 JWT Token 中的时间戳匹配
    jest.useFakeTimers();
    jest.setSystemTime(new Date(MOCK_JWT_BASE_TIME * 1000));
  });

  afterEach(() => {
    // 清理定时器
    // 注意：不要在这里调用 jest.runOnlyPendingTimers()，因为它会触发定时器回调
    // 只需要清除所有定时器并恢复真实定时器即可
    jest.clearAllTimers();
    jest.useRealTimers();
    // 恢复系统时间
    jest.setSystemTime();
  });

  // ==========================================================================
  // 构造函数测试
  // ==========================================================================

  describe('constructor', () => {
    it('应该正确注入依赖', () => {
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      // 验证实例已创建
      expect(sessionManager).toBeInstanceOf(SessionManager);
    });

    it('应该使用默认的 refreshBeforeExpiry（5 分钟）', () => {
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      expect(sessionManager).toBeInstanceOf(SessionManager);
      // 初始状态应该是 IDLE
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.IDLE);
    });

    it('应该使用自定义的 refreshBeforeExpiry', () => {
      const customBuffer = 10 * 60 * 1000; // 10 分钟
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
        refreshBeforeExpiry: customBuffer,
      });

      expect(sessionManager).toBeInstanceOf(SessionManager);
    });

    it('应该使用默认的 checkOnStartup（false）', () => {
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      expect(sessionManager).toBeInstanceOf(SessionManager);
    });

    it('应该支持自定义 checkOnStartup', () => {
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
        checkOnStartup: true,
      });

      expect(sessionManager).toBeInstanceOf(SessionManager);
    });
  });

  // ==========================================================================
  // getStatus() 方法测试
  // ==========================================================================

  describe('getStatus()', () => {
    it('应该在初始状态返回 IDLE', () => {
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.IDLE);
    });

    it('应该在 start() 后返回 RUNNING', async () => {
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.RUNNING);
    });

    it('应该在 stop() 后返回 STOPPED', async () => {
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();
      sessionManager.stop();

      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.STOPPED);
    });
  });

  // ==========================================================================
  // start() 方法测试
  // ==========================================================================

  describe('start()', () => {
    it('应该在 Token 存在时启动定时器', async () => {
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 验证 getTokens 被调用
      expect(mockTokenStorage.getTokens).toHaveBeenCalledTimes(1);
      // 验证状态变为 RUNNING
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.RUNNING);
    });

    it('应该在 Token 不存在时保持 IDLE 状态', async () => {
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(null);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 验证状态保持 IDLE（不抛出错误）
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.IDLE);
    });

    it('应该具有幂等性：多次调用 start() 不会创建多个定时器', async () => {
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();
      await sessionManager.start();
      await sessionManager.start();

      // 验证状态为 RUNNING
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.RUNNING);
    });

    it('应该在多次调用 start() 时清除旧定时器', async () => {
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 第一次 start 设置了一个定时器
      const timerCountAfterFirstStart = jest.getTimerCount();

      await sessionManager.start();

      // 第二次 start 应该清除旧定时器并设置新定时器
      // 定时器数量应该保持为 1（幂等性）
      const timerCountAfterSecondStart = jest.getTimerCount();

      expect(timerCountAfterSecondStart).toBe(timerCountAfterFirstStart);
    });
  });

  // ==========================================================================
  // stop() 方法测试
  // ==========================================================================

  describe('stop()', () => {
    it('应该清除定时器并设置 STOPPED 状态', async () => {
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 定时器应该被设置
      const timerCountAfterStart = jest.getTimerCount();
      expect(timerCountAfterStart).toBeGreaterThan(0);

      sessionManager.stop();

      // 所有定时器应该被清除
      const timerCountAfterStop = jest.getTimerCount();
      expect(timerCountAfterStop).toBe(0);
      // 验证状态变为 STOPPED
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.STOPPED);
    });

    it('应该具有幂等性：多次调用 stop() 不会报错', async () => {
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      // 多次调用 stop() 不应该抛出错误
      sessionManager.stop();
      sessionManager.stop();
      sessionManager.stop();

      // 验证状态为 STOPPED
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.STOPPED);
    });

    it('应该在未启动时调用 stop() 也不报错', () => {
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      // 未调用 start() 就调用 stop()，不应该抛出错误
      expect(() => sessionManager.stop()).not.toThrow();
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.STOPPED);
    });

    it('不应该清除 TokenStorage 和 AuthStore', async () => {
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();
      sessionManager.stop();

      // 验证没有清除操作
      expect(mockTokenStorage.clearTokens).not.toHaveBeenCalled();
      expect(mockAuthStore.clearAuth).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // refreshAccessToken() 方法测试
  // ==========================================================================

  describe('refreshAccessToken()', () => {
    it('应该在刷新成功后重新调度下一次刷新', async () => {
      const now = MOCK_JWT_BASE_TIME * 1000;
      const mockTokens = createMockStoredTokens({
        expiresAt: now + 3600 * 1000,
      });
      const newMockTokens = createMockStoredTokens({
        expiresAt: now + 7200 * 1000,
      });

      (mockTokenStorage.getTokens as jest.Mock)
        .mockReturnValueOnce(mockTokens)       // 第1次：start() 调用
        .mockReturnValueOnce(newMockTokens)    // 第2次：refreshAccessToken() 调用
        .mockReturnValue(null);                 // 第3次及以后：返回 null，停止循环

      const mockTokenResponse = createMockTokenResponse({
        expires_in: 7200,
      });
      (mockAuthClient.refreshToken as jest.Mock).mockResolvedValue(
        mockTokenResponse
      );

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 快进到刷新时间（过期时间 - 5 分钟 = 55 分钟后）
      jest.advanceTimersByTime(55 * 60 * 1000);

      // 等待异步操作完成
      await jest.runAllTimersAsync();

      // 验证 refreshToken 被调用
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);

      // 验证状态仍为 RUNNING
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.RUNNING);
    });

    it('应该在 401 错误时自动登出并停止定时器', async () => {
      const mockTokens = createMockStoredTokens();
      // 使用 mockReturnValueOnce 确保不会在 refreshAccessToken 中再次获取时循环
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      const refreshError = new Error('Unauthorized');
      (refreshError as any).status = 401;
      (mockAuthClient.refreshToken as jest.Mock).mockRejectedValue(
        refreshError
      );

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 快进到刷新时间
      jest.advanceTimersByTime(55 * 60 * 1000);

      // 等待异步操作完成
      await jest.runAllTimersAsync();

      // 验证 refreshToken 被调用
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);

      // 验证自动登出被调用
      expect(mockAuthClient.logout).toHaveBeenCalledWith({ silent: true });

      // 验证定时器被清除
      expect(jest.getTimerCount()).toBe(0);
    });

    it('应该在网络错误时停止定时器但不登出', async () => {
      const mockTokens = createMockStoredTokens();
      // 使用 mockReturnValueOnce 避免无限循环
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      const networkError = new Error('Network error');
      (networkError as any).code = 'NETWORK_ERROR';
      (mockAuthClient.refreshToken as jest.Mock).mockRejectedValue(
        networkError
      );

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 快进到刷新时间
      jest.advanceTimersByTime(55 * 60 * 1000);

      // 等待异步操作完成
      await jest.runAllTimersAsync();

      // 验证 refreshToken 被调用
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);

      // 验证没有调用登出
      expect(mockAuthClient.logout).not.toHaveBeenCalled();

      // 验证定时器被清除
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  // ==========================================================================
  // scheduleRefresh() 边界情况测试
  // ==========================================================================

  describe('scheduleRefresh() 边界情况', () => {
    it('应该在 Token 即将过期时立即触发刷新', async () => {
      const now = MOCK_JWT_BASE_TIME * 1000;
      const mockTokens = createMockStoredTokens({
        expiresAt: now + 20 * 1000, // 20 秒后过期
      });
      // 使用 mockReturnValueOnce 避免刷新成功后再次获取 Token 导致循环
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
        refreshBeforeExpiry: 5 * 60 * 1000, // 5 分钟
      });

      await sessionManager.start();

      // 验证有一个定时器被设置（延迟为 0，立即触发）
      const timerCount = jest.getTimerCount();
      expect(timerCount).toBeGreaterThan(0);

      // 运行所有定时器
      await jest.runAllTimersAsync();

      // 验证刷新被触发
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('应该在 Token 已过期时立即触发刷新', async () => {
      const now = MOCK_JWT_BASE_TIME * 1000;
      const mockTokens = createMockStoredTokens({
        expiresAt: now - 1000, // 1 秒前已过期
      });
      // 使用 mockReturnValueOnce 避免刷新成功后再次获取 Token 导致循环
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 验证有一个定时器被设置（延迟为 0，立即触发）
      const timerCount = jest.getTimerCount();
      expect(timerCount).toBeGreaterThan(0);

      // 运行所有定时器
      await jest.runAllTimersAsync();

      // 验证刷新被触发
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // 定时器清理验证测试
  // ==========================================================================

  describe('定时器清理验证', () => {
    it('应该正确设置和清除定时器', async () => {
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      // 初始状态：无定时器
      expect(jest.getTimerCount()).toBe(0);

      // 启动：应该设置定时器
      await sessionManager.start();
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      // 停止：应该清除定时器
      sessionManager.stop();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('应该在组件卸载场景下正确清理（start -> stop -> start -> stop）', async () => {
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      // 模拟组件挂载
      await sessionManager.start();
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      // 模拟组件卸载
      sessionManager.stop();
      expect(jest.getTimerCount()).toBe(0);

      // 模拟组件重新挂载
      await sessionManager.start();
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      // 模拟组件再次卸载
      sessionManager.stop();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  // ==========================================================================
  // 刷新时机计算测试
  // ==========================================================================

  describe('刷新时机计算', () => {
    it('应该在过期前 5 分钟触发刷新（默认 refreshBeforeExpiry）', async () => {
      const mockTokens = createMockStoredTokens();
      // 使用 mockReturnValueOnce 避免刷新成功后再次获取 Token 导致循环
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 验证定时器被设置
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      // 快进 54 分钟（不应该触发刷新）
      jest.advanceTimersByTime(54 * 60 * 1000);
      expect(mockAuthClient.refreshToken).not.toHaveBeenCalled();

      // 再快进 1 分钟（总计 55 分钟，应该触发刷新）
      jest.advanceTimersByTime(1 * 60 * 1000);
      await jest.runAllTimersAsync();
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('应该使用自定义的 refreshBeforeExpiry', async () => {
      const mockTokens = createMockStoredTokens();
      // 使用 mockReturnValueOnce 避免刷新成功后再次获取 Token 导致循环
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      const customBuffer = 10 * 60 * 1000; // 10 分钟
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
        refreshBeforeExpiry: customBuffer,
      });

      await sessionManager.start();

      // 验证定时器被设置
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      // 快进 49 分钟（不应该触发刷新）
      jest.advanceTimersByTime(49 * 60 * 1000);
      expect(mockAuthClient.refreshToken).not.toHaveBeenCalled();

      // 再快进 1 分钟（总计 50 分钟，应该触发刷新）
      jest.advanceTimersByTime(1 * 60 * 1000);
      await jest.runAllTimersAsync();
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // parseJWT() 方法测试
  // ==========================================================================

  describe('parseJWT()', () => {
    it('应该正确解析有效的 JWT Token', async () => {
      const expiresIn = 3600; // 1 小时
      const mockToken = createMockJWT(expiresIn);
      const mockTokens = createMockStoredTokens({
        accessToken: mockToken,
      });
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 验证定时器被设置（说明 JWT 解析成功）
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('应该处理无效格式的 Token', async () => {
      const mockTokens = createMockStoredTokens({
        accessToken: 'invalid-token-format',
      });
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      // 无效 Token 应该保持 IDLE 状态
      await sessionManager.start();

      // 验证状态保持 IDLE（因为无法解析 Token）
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.IDLE);
    });

    it('应该处理缺少 exp 字段的 Token', async () => {
      // 创建没有 exp 字段的 JWT
      const now = MOCK_JWT_BASE_TIME;
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const payload = btoa(JSON.stringify({ sub: 'user123', iat: now }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const invalidToken = `${header}.${payload}.mock_signature`;

      const mockTokens = createMockStoredTokens({
        accessToken: invalidToken,
      });
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      // 缺少 exp 字段的 Token 应该保持 IDLE 状态
      await sessionManager.start();

      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.IDLE);
    });
  });

  // ==========================================================================
  // getTokenExpiry() 方法测试
  // ==========================================================================

  describe('getTokenExpiry()', () => {
    it('应该正确提取 Token 的过期时间（毫秒）', async () => {
      const expiresIn = 3600; // 1 小时
      const mockToken = createMockJWT(expiresIn);
      const mockTokens = createMockStoredTokens({
        accessToken: mockToken,
      });
      // 使用 mockReturnValueOnce 避免刷新成功后再次获取 Token 导致循环
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 验证定时器被设置在正确的时间（55 分钟后）
      jest.advanceTimersByTime(55 * 60 * 1000);
      await jest.runAllTimersAsync();

      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('应该在 Token 无效时返回 null', async () => {
      const mockTokens = createMockStoredTokens({
        accessToken: 'invalid-token',
      });
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 无法解析 Token，应该保持 IDLE 状态
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.IDLE);
    });
  });

  // ==========================================================================
  // 集成测试
  // ==========================================================================

  describe('集成测试', () => {
    it('应该完成完整的启动-刷新-停止循环', async () => {
      const mockTokens = createMockStoredTokens();
      const newMockTokens = createMockStoredTokens({
        expiresAt: MOCK_JWT_BASE_TIME * 1000 + 7200 * 1000, // 2 小时后过期
      });

      (mockTokenStorage.getTokens as jest.Mock)
        .mockReturnValueOnce(mockTokens)       // 第1次：start() 调用
        .mockReturnValueOnce(newMockTokens)    // 第2次：refreshAccessToken() 调用
        .mockReturnValue(null);                 // 第3次及以后：返回 null，停止循环

      const mockTokenResponse = createMockTokenResponse({
        expires_in: 7200,
      });
      (mockAuthClient.refreshToken as jest.Mock).mockResolvedValue(
        mockTokenResponse
      );

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      // 1. 启动
      await sessionManager.start();
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.RUNNING);

      // 2. 等待刷新触发
      jest.advanceTimersByTime(55 * 60 * 1000);
      await jest.runAllTimersAsync();
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);

      // 3. 停止
      sessionManager.stop();
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.STOPPED);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('应该支持多个刷新周期', async () => {
      const mockTokens = createMockStoredTokens();
      // 使用 mockReturnValue 支持多个刷新周期
      // 注意：使用 runOnlyPendingTimersAsync 避免运行新创建的定时器
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const mockTokenResponse = createMockTokenResponse({
        expires_in: 3600,
      });
      (mockAuthClient.refreshToken as jest.Mock).mockResolvedValue(
        mockTokenResponse
      );

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      await sessionManager.start();

      // 第一次刷新
      jest.advanceTimersByTime(55 * 60 * 1000);
      await jest.runOnlyPendingTimersAsync();
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);

      // 第二次刷新（在新的定时器上）
      jest.advanceTimersByTime(55 * 60 * 1000);
      await jest.runOnlyPendingTimersAsync();
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(2);

      // 第三次刷新
      jest.advanceTimersByTime(55 * 60 * 1000);
      await jest.runOnlyPendingTimersAsync();
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(3);
    });
  });
});
