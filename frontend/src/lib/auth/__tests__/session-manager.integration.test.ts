/**
 * SessionManager 集成测试
 *
 * 测试覆盖范围：
 * - 场景 1: 完整的会话生命周期（启动 -> 多次刷新 -> 停止）
 * - 场景 2: Token 刷新失败后的自动登出
 * - 场景 3: 页面可见性切换 + Token 即将过期
 * - 场景 4: 并发刷新请求的去重
 * - 场景 5: checkOnStartup 选项验证
 * - 场景 6: 网络错误后用户手动登录恢复会话
 *
 * 测试策略：
 * - 使用 Mock AuthClient 和 TokenStorage
 * - 关注端到端行为，而非内部实现细节
 * - 验证 SessionManager 直接调用的方法
 *
 * 测试状态: RED (等待实现验证)
 * 依赖文件: /workspace/frontend/src/lib/auth/session-manager.ts
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
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
 *
 * 注意：logout 需要实际调用 tokenStorage 和 authStore 的清除方法，
 * 以模拟真实的 AuthClient 行为（见 auth-client.ts:213-214）
 */
const createMockAuthClient = (
  tokenStorage?: TokenStorage,
  authStore?: AuthStore
): AuthClient => ({
  refreshToken: jest.fn(),
  logout: jest.fn(async (options?: any) => {
    // 模拟真实的 logout 行为
    if (options?.clearLocalState !== false) {
      tokenStorage?.clearTokens();
      authStore?.clearAuth();
    }
  }),
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
 */
const MOCK_JWT_BASE_TIME = 1704067200;

/**
 * 创建 Mock JWT Token（带 exp 字段）
 */
const createMockJWT = (expiresIn: number): string => {
  const now = MOCK_JWT_BASE_TIME;
  const exp = now + expiresIn;

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const payload = btoa(JSON.stringify({ exp, sub: 'user123', iat: now }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${header}.${payload}.mock_signature`;
};

/**
 * 创建 Mock StoredTokens
 */
const createMockStoredTokens = (
  overrides?: Partial<StoredTokens>
): StoredTokens => ({
  accessToken: createMockJWT(3600),
  refreshToken: 'test_refresh_token',
  expiresAt: MOCK_JWT_BASE_TIME * 1000 + 3600 * 1000,
  ...overrides,
});

/**
 * 创建 Mock TokenResponse
 */
const createMockTokenResponse = (
  overrides?: Partial<TokenResponse>
): TokenResponse => ({
  access_token: createMockJWT(3600),
  refresh_token: 'new_refresh_token',
  token_type: 'Bearer',
  expires_in: 3600,
  ...overrides,
});

// ============================================================================
// 测试套件
// ============================================================================

describe('SessionManager 集成测试', () => {
  let mockTokenStorage: TokenStorage;
  let mockAuthClient: AuthClient;
  let mockAuthStore: AuthStore;

  beforeEach(() => {
    mockTokenStorage = createMockTokenStorage();
    mockAuthStore = createMockAuthStore();

    jest.useFakeTimers();
    jest.setSystemTime(new Date(MOCK_JWT_BASE_TIME * 1000));

    // 注意：必须在 beforeEach 中创建 mockAuthClient，
    // 因为它依赖于 mockTokenStorage 和 mockAuthStore
    mockAuthClient = createMockAuthClient(mockTokenStorage, mockAuthStore);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.setSystemTime();
    jest.useRealTimers();
  });

  // ==========================================================================
  // 场景 1: 完整的会话生命周期
  // ==========================================================================

  describe('场景 1: 完整的会话生命周期', () => {
    it('应该完成启动 -> 多次刷新 -> 停止的完整流程', async () => {
      // 前置条件：TokenStorage 存在有效 Token（1 小时后过期）
      const initialTokens = createMockStoredTokens();

      // 使用 mockReturnValue 模拟每次返回新 Token
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(initialTokens);

      // Mock refreshToken 返回新 Token（使用 mockReturnValue 支持多次调用）
      (mockAuthClient.refreshToken as jest.Mock).mockResolvedValue(createMockTokenResponse());

      // 1. 创建 SessionManager 实例
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      // 2. 调用 start() 启动
      await sessionManager.start();

      // 3. 验证状态为 RUNNING
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.RUNNING);

      // 4-8. 第一次刷新：快进时间到 55 分钟后
      jest.advanceTimersByTime(55 * 60 * 1000);
      await jest.runOnlyPendingTimersAsync();

      // 5. 验证 refreshToken() 被调用
      expect(mockAuthClient.refreshToken).toHaveBeenCalled();

      // 9-10. 第二次刷新：快进另一个 55 分钟
      jest.advanceTimersByTime(55 * 60 * 1000);
      await jest.runOnlyPendingTimersAsync();

      // 验证第二次刷新成功（至少调用 2 次）
      expect((mockAuthClient.refreshToken as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);

      // 11. 调用 stop()
      sessionManager.stop();

      // 12. 验证定时器被清除，状态为 STOPPED
      expect(jest.getTimerCount()).toBe(0);
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.STOPPED);
    });
  });

  // ==========================================================================
  // 场景 2: Token 刷新失败后的自动登出
  // ==========================================================================

  describe('场景 2: Token 刷新失败后的自动登出', () => {
    it('应该在 401 错误时触发自动登出流程', async () => {
      // 前置条件：TokenStorage 存在即将过期的 Token
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      // Mock refreshToken 抛出 401 错误
      const refreshError = new Error('Unauthorized');
      (refreshError as any).status = 401;
      (mockAuthClient.refreshToken as jest.Mock).mockRejectedValue(refreshError);

      // 1. 启动 SessionManager
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });
      await sessionManager.start();

      // 2. 快进时间触发刷新
      jest.advanceTimersByTime(55 * 60 * 1000);

      // 等待异步操作完成
      await jest.runAllTimersAsync();

      // 3. 验证 refreshToken() 抛出 401 错误（内部处理）
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);

      // 4. 验证 authClient.logout({ silent: true }) 被调用
      expect(mockAuthClient.logout).toHaveBeenCalledWith({ silent: true });

      // 5. 验证 TokenStorage 被清除（由 mock logout 调用）
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();

      // 6. 验证 AuthStore 被清除（由 mock logout 调用）
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();

      // 8. 验证定时器被停止
      expect(jest.getTimerCount()).toBe(0);

      // 9. 验证状态为 STOPPED
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.STOPPED);
    });
  });

  // ==========================================================================
  // 场景 3: 页面可见性切换 + Token 即将过期
  // ==========================================================================

  describe('场景 3: 页面可见性切换 + Token 即将过期', () => {
    it('应该在页面隐藏后恢复显示时触发刷新', async () => {
      // 前置条件：Token 有效期充足（10 分钟后过期）
      const now = MOCK_JWT_BASE_TIME * 1000;
      const tenMinutesInSeconds = 10 * 60;
      const mockTokens = createMockStoredTokens({
        accessToken: createMockJWT(tenMinutesInSeconds),
        expiresAt: now + 10 * 60 * 1000,
      });

      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      const mockTokenResponse = createMockTokenResponse();
      (mockAuthClient.refreshToken as jest.Mock).mockResolvedValue(mockTokenResponse);

      // 1. 启动 SessionManager
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });
      await sessionManager.start();

      // 2. 修改 document.visibilityState 为 'hidden'
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden',
      });
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
      });

      // 3. 触发 visibilitychange 事件
      document.dispatchEvent(new Event('visibilitychange'));

      // 4. 验证刷新未被触发
      expect(mockAuthClient.refreshToken).not.toHaveBeenCalled();

      // 5. 快进时间使 Token 剩余 4 分钟
      jest.advanceTimersByTime(6 * 60 * 1000);

      // 6. 修改 document.visibilityState 为 'visible'
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible',
      });
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      });

      // 7. 触发 visibilitychange 事件
      document.dispatchEvent(new Event('visibilitychange'));

      // 等待异步操作完成
      await jest.runOnlyPendingTimersAsync();

      // 9. 验证 refreshToken() 被调用
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // 场景 4: 并发刷新请求的去重
  // ==========================================================================

  describe('场景 4: 并发刷新请求的去重', () => {
    it('应该在多个组件同时触发刷新时进行去重', async () => {
      // 前置条件：Token 即将过期
      const now = MOCK_JWT_BASE_TIME * 1000;
      const fourMinutesInSeconds = 4 * 60;
      const mockTokens = createMockStoredTokens({
        accessToken: createMockJWT(fourMinutesInSeconds),
        expiresAt: now + 4 * 60 * 1000,
      });
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      // 模拟网络延迟（100ms）
      let refreshCallCount = 0;
      const mockTokenResponse = createMockTokenResponse();
      (mockAuthClient.refreshToken as jest.Mock).mockImplementation(async () => {
        refreshCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return mockTokenResponse;
      });

      // 1. 启动 SessionManager
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });
      await sessionManager.start();

      // 2. 快进时间触发定时器刷新
      jest.advanceTimersByTime(55 * 60 * 1000);

      // 3. 在刷新进行中时（50ms 后），手动触发页面可见性事件
      await jest.advanceTimersByTimeAsync(50);

      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // 4. 等待所有异步操作完成
      await jest.runOnlyPendingTimersAsync();

      // 5. 验证 refreshToken() 只被调用 1 次
      expect(refreshCallCount).toBe(1);

      // 6. 验证所有调用者收到相同的响应（通过只调用一次证明）
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // 场景 5: checkOnStartup 选项验证
  // ==========================================================================

  describe('场景 5: checkOnStartup 选项验证', () => {
    it('应该在启动时立即检查并刷新即将过期的 Token', async () => {
      // 前置条件：Token 剩余有效期 < refreshBeforeExpiry（5 分钟）
      const now = MOCK_JWT_BASE_TIME * 1000;
      const fourMinutesInSeconds = 4 * 60;
      const mockTokens = createMockStoredTokens({
        accessToken: createMockJWT(fourMinutesInSeconds),
        expiresAt: now + 4 * 60 * 1000,
      });
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      const mockTokenResponse = createMockTokenResponse();
      (mockAuthClient.refreshToken as jest.Mock).mockResolvedValue(mockTokenResponse);

      // 在 start() 之前设置 spy
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      // 2. 创建 SessionManager，设置 checkOnStartup: true
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
        checkOnStartup: true,
      });

      // 3. 调用 start()
      await sessionManager.start();

      // 4. 验证 refreshToken() 被立即调用（不等定时器）
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);

      // 6. 验证事件监听器被注册
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
      addEventListenerSpy.mockRestore();
    });
  });

  // ==========================================================================
  // 场景 6: 网络错误后用户手动登录恢复会话
  // ==========================================================================

  describe('场景 6: 网络错误后用户手动登录恢复会话', () => {
    it('应该在网络错误后支持用户手动登录恢复', async () => {
      // 前置条件：Token 即将过期
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(mockTokens);

      // 模拟网络错误（非 401）
      const networkError = new Error('Network error');
      (networkError as any).code = 'NETWORK_ERROR';
      (mockAuthClient.refreshToken as jest.Mock).mockRejectedValue(networkError);

      // 1. 启动 SessionManager
      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });
      await sessionManager.start();

      // 2. 快进时间触发刷新
      jest.advanceTimersByTime(55 * 60 * 1000);

      // 等待异步操作完成
      await jest.runAllTimersAsync();

      // 3. 模拟网络错误
      expect(mockAuthClient.refreshToken).toHaveBeenCalledTimes(1);

      // 4. 验证定时器停止，状态为 STOPPED
      expect(jest.getTimerCount()).toBe(0);
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.STOPPED);

      // 5. 验证未调用 logout()
      expect(mockAuthClient.logout).not.toHaveBeenCalled();

      // 6. 模拟用户重新登录（外部提供新 Token）
      const newTokens = createMockStoredTokens({
        accessToken: createMockJWT(3600),
        refreshToken: 'new_refresh_token_after_login',
        expiresAt: MOCK_JWT_BASE_TIME * 1000 + 3600 * 1000,
      });

      // Mock 第二次 start() 调用返回新 Token
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValueOnce(newTokens);

      const mockTokenResponse = createMockTokenResponse();
      (mockAuthClient.refreshToken as jest.Mock).mockResolvedValue(mockTokenResponse);

      // 7. 验证可以重新启动 SessionManager
      await sessionManager.start();

      // 8. 验证新会话正常工作
      expect(sessionManager.getStatus()).toBe(SessionManagerStatus.RUNNING);
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 额外场景：清理验证
  // ==========================================================================

  describe('定时器和事件监听器清理验证', () => {
    it('应该在测试完成后正确清理所有资源', async () => {
      const mockTokens = createMockStoredTokens();
      (mockTokenStorage.getTokens as jest.Mock).mockReturnValue(mockTokens);

      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const sessionManager = new SessionManager({
        tokenStorage: mockTokenStorage,
        authClient: mockAuthClient,
        authStore: mockAuthStore,
      });

      // 启动：注册事件监听器
      await sessionManager.start();
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );

      // 停止：移除事件监听器
      sessionManager.stop();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );

      // 验证无定时器泄漏
      expect(jest.getTimerCount()).toBe(0);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
