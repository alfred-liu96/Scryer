# Issue #116 开发蓝图：Auth API 客户端集成测试

## 元数据
- **Issue**: #116 - [Frontend] 编写 Auth API 客户端集成测试
- **优先级**: high-priority
- **依赖**: #115 (Auth API 客户端实现)
- **设计日期**: 2026-02-27
- **状态**: Draft

---

## 1. 概述

### 1.1 背景
Issue #115 已完成 `AuthClient` 的实现，包含 `refreshToken()` 和 `logout()` 方法。现有的 `auth-client.test.ts` (866 行) 主要覆盖单元测试场景。Issue #116 需要编写**集成测试**，验证 `HttpClient.onRefreshFailure` 回调正确调用 `AuthClient.logout()` 逻辑。

### 1.2 当前状态分析

#### 已完成的组件
- ✅ `auth-client.ts`: AuthClient 实现（refreshToken, logout）
- ✅ `client.ts`: HttpClient 实现（包含 onRefreshFailure 回调）
- ✅ `auth-client.test.ts`: 单元测试（866 行，覆盖 AuthClient 独立行为）
- ✅ `client.test.ts`: HttpClient 测试（已有 onRefreshFailure 基础测试）

#### 缺失的集成逻辑
**关键发现**：当前 `client.ts` 中的 `onRefreshFailure` 回调**未配置**调用 `authClient.logout()`：

```typescript
// 当前实现 (client.ts:282-286)
public onRefreshFailure: RefreshFailureCallback;

constructor(...) {
  // ...
  this.onRefreshFailure = (error) => {
    console.error('Token refresh failed:', error);
    this.tokenStorage?.clearTokens();
    // 不再抛出异常，因为 afterResponse 已经会抛出
  };
}
```

**缺失行为**：
1. ❌ 未调用 `authStore.clearAuth()`
2. ❌ 未调用 `authClient.logout()` 统一登出逻辑

### 1.3 核心需求

#### 集成测试目标
验证 Token 刷新失败后，系统正确执行登出流程：
1. 调用 `tokenStorage.clearTokens()`
2. 调用 `authStore.clearAuth()`
3. 拒绝所有排队的请求

#### 可能需要的配置修复
在 `client.ts` 中配置 `apiClient.onRefreshFailure` 回调以调用 `authClient.logout()`。

---

## 2. 技术规范

### 2.1 类型定义

#### 集成测试 Mock 类型
```typescript
/**
 * 集成测试 Mock 容器
 */
interface IntegrationTestMocks {
  /** Mock fetch API */
  mockFetch: jest.MockedFunction<typeof fetch>;
  /** Mock TokenStorage */
  mockTokenStorage: TokenStorage;
  /** Mock AuthStore */
  mockAuthStore: AuthStore;
  /** Mock HttpClient */
  mockHttpClient: HttpClient;
  /** Mock AuthClient */
  mockAuthClient: AuthClient;
}

/**
 * 集成测试场景配置
 */
interface IntegrationTestScenario {
  /** 场景名称 */
  name: string;
  /** 初始 Token 状态 */
  initialTokens: StoredTokens | null;
  /** Fetch 响应序列 */
  fetchResponses: MockResponse[];
  /** 预期行为 */
  expectations: {
    /** 是否调用 clearTokens */
    clearTokensCalled: boolean;
    /** 是否调用 clearAuth */
    clearAuthCalled: boolean;
    /** 是否调用 logout */
    logoutCalled: boolean;
    /** 排队请求是否被拒绝 */
    queuedRequestsRejected: boolean;
  };
}
```

### 2.2 接口签名

#### 集成测试辅助函数
```typescript
/**
 * 创建集成测试环境
 *
 * 职责：
 * - 初始化所有依赖的 Mock 实例
 * - 配置 HttpClient 和 AuthClient 的集成关系
 * - 设置初始 Token 状态
 *
 * @param initialTokens - 初始 Token 状态
 * @returns 集成测试 Mock 容器
 *
 * @example
 * ```ts
 * const { mockFetch, client, authClient } = createIntegrationTestEnvironment({
 *   accessToken: 'old_token',
 *   refreshToken: 'old_refresh',
 *   expiresAt: Date.now() + 3600000,
 * });
 * ```
 */
function createIntegrationTestEnvironment(
  initialTokens?: StoredTokens | null
): IntegrationTestMocks {
  // Implementation pending
  ...
}

/**
 * 模拟 401 响应并触发 Token 刷新流程
 *
 * @param client - HttpClient 实例
 * @param endpoint - 返回 401 的端点
 * @param refreshResponse - 刷新端点的响应（成功或失败）
 * @returns Promise<void>
 *
 * @example
 * ```ts
 * await simulateRefreshFailure(client, '/api/data', {
 *   ok: false,
 *   status: 401,
 *   json: async () => ({ detail: 'Invalid refresh token' }),
 * });
 * ```
 */
async function simulateRefreshFailure(
  client: HttpClient,
  endpoint: string,
  refreshResponse: Partial<Response>
): Promise<void> {
  // Implementation pending
  ...
}
```

---

## 3. 架构设计

### 3.1 模块关系图

```
┌─────────────────────────────────────────────────────────────┐
│                     集成测试环境                              │
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │ Mock Fetch   │──────│  HttpClient  │                     │
│  │ (global)     │      │              │                     │
│  └──────────────┘      │ - onRefreshFailure │◄────────────┐ │
│                        └──────────────┘               │ │
│                               │                         │ │
│                               │ 使用                    │ │
│                               ▼                         │ │
│                        ┌──────────────┐               │ │
│                        │ AuthClient   │               │ │
│                        │              │──── 调用 ──────┘ │
│                        │ - logout()   │                   │
│                        └──────────────┘                   │
│                               │                           │
│                               │ 依赖注入                   │
│                               ▼                           │
│  ┌──────────────┐      ┌──────────────┐                  │
│  │TokenStorage  │      │  AuthStore   │                  │
│  │ (Mock)       │      │  (Mock)      │                  │
│  └──────────────┘      └──────────────┘                  │
└─────────────────────────────────────────────────────────────┘

测试验证流程：
1. Mock Fetch 返回 401 → 触发 HttpClient 刷新逻辑
2. 刷新失败 → 触发 onRefreshFailure 回调
3. 回调调用 AuthClient.logout()
4. logout() 调用 tokenStorage.clearTokens() + authStore.clearAuth()
5. 验证所有方法被正确调用
```

### 3.2 调用链路

#### 正常登出流程（用户主动触发）
```
用户操作
  └─> authClient.logout()
       └─> tokenStorage.clearTokens()
       └─> authStore.clearAuth()
```

#### Token 刷新失败登出流程（自动触发）
```
API 请求返回 401
  └─> HttpClient.afterResponse()
       └─> tokenRefresher.refreshAccessToken()
            └─> 刷新失败（401/Network Error）
                 └─> onRefreshFailure(error)
                      ├─> [当前] tokenStorage.clearTokens()
                      └─> [缺失] authClient.logout()
                           ├─> tokenStorage.clearTokens() (重复)
                           └─> authStore.clearAuth() (新增)
```

### 3.3 配置修复设计

#### 方案 A：在 HttpClient 构造函数中注入 AuthClient
```typescript
// client.ts
export class HttpClient {
  constructor(
    baseURL: string = publicConfig.apiUrl,
    timeout: number = publicConfig.apiTimeout,
    tokenStorage?: TokenStorage,
    authClient?: AuthClient  // 新增参数
  ) {
    this.tokenStorage = tokenStorage ?? createTokenStorage();
    this.tokenRefresher = new TokenRefresher(this.tokenStorage, {...});

    // 配置 onRefreshFailure 回调
    this.onRefreshFailure = (error) => {
      console.error('Token refresh failed:', error);
      this.tokenStorage?.clearTokens();

      // 如果注入了 authClient，调用统一登出逻辑
      if (authClient) {
        authClient.logout({ silent: true });
      }
    };
  }
}
```

**优点**：
- 依赖注入，测试友好
- 解耦，不依赖全局单例

**缺点**：
- 需要修改现有构造函数签名
- 可能影响其他使用 HttpClient 的地方

#### 方案 B：在全局 apiClient 初始化时配置回调
```typescript
// client.ts (文件末尾)
// 动态导入（避免循环依赖）
const { authClient } = require('./auth-client');

// 配置 apiClient 的 onRefreshFailure 回调
apiClient.onRefreshFailure = (error) => {
  console.error('Token refresh failed:', error);
  authClient.logout({ silent: true });
};

export { apiClient };
```

**优点**：
- 不修改构造函数签名
- 最小化代码变更

**缺点**：
- 依赖全局单例
- 循环依赖风险（需要动态导入）

**推荐方案**：方案 B（最小侵入性）

---

## 4. 实施细节

### 4.1 测试文件结构

#### 选项 1：扩展现有 `auth-client.test.ts`
```typescript
// auth-client.test.ts (文件末尾追加)

describe('AuthClient - Integration with HttpClient', () => {
  // 集成测试场景
});
```

**优点**：
- 集中管理所有 AuthClient 相关测试
- 复用现有的 Mock 工厂函数

**缺点**：
- 文件已较大（866 行）
- 混合单元测试和集成测试

#### 选项 2：创建新的集成测试文件
```
frontend/src/lib/api/__tests__/auth-client.integration.test.ts
```

**优点**：
- 清晰的测试分层（单元 vs 集成）
- 独立的测试环境配置

**缺点**：
- 需要重复定义 Mock 工厂
- 维护两套测试配置

**推荐方案**：选项 2（清晰的测试分层）

### 4.2 Mock 策略

#### Mock Fetch API
```typescript
/**
 * 创建 Mock Fetch 并注入到全局
 */
const setupMockFetch = (): jest.MockedFunction<typeof fetch> => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  mockFetch.mockClear();
  return mockFetch;
};

/**
 * 配置 Mock Fetch 响应序列
 *
 * @param mockFetch - Mock fetch 实例
 * @param responses - 响应序列（按顺序返回）
 *
 * @example
 * ```ts
 * configureFetchResponses(mockFetch, [
 *   // 第一次调用：原始请求返回 401
 *   { ok: false, status: 401, json: async () => ({ detail: 'Unauthorized' }) },
 *   // 第二次调用：刷新请求返回 401
 *   { ok: false, status: 401, json: async () => ({ detail: 'Invalid refresh token' }) },
 * ]);
 * ```
 */
const configureFetchResponses = (
  mockFetch: jest.MockedFunction<typeof fetch>,
  responses: Partial<Response>[]
): void => {
  responses.forEach((response) => {
    mockFetch.mockResolvedValueOnce({
      ok: response.ok ?? false,
      status: response.status ?? 500,
      json: response.json ?? (async () => ({})),
      ...response,
    } as Response);
  });
};
```

#### Mock TokenStorage
```typescript
/**
 * 创建集成测试用的 Mock TokenStorage
 *
 * 特点：
 * - 支持状态追踪（验证 clearTokens 调用）
 * - 支持初始 Token 设置
 * - 支持方法调用计数
 */
const createIntegrationMockTokenStorage = (
  initialTokens?: StoredTokens | null
): TokenStorage => {
  let tokens = initialTokens;
  let clearTokensCallCount = 0;

  return {
    setTokens: jest.fn((newTokens) => {
      tokens = newTokens;
      return true;
    }),
    getTokens: jest.fn(() => tokens),
    getAccessToken: jest.fn(() => tokens?.accessToken ?? null),
    getRefreshToken: jest.fn(() => tokens?.refreshToken ?? null),
    isTokenExpired: jest.fn(() => {
      if (!tokens) return true;
      return Date.now() > (tokens.expiresAt ?? 0);
    }),
    clearTokens: jest.fn(() => {
      tokens = null;
      clearTokensCallCount++;
    }),
    hasValidTokens: jest.fn(() => !!tokens),
    // 测试辅助方法
    getClearTokensCallCount: () => clearTokensCallCount,
  };
};
```

#### Mock AuthStore
```typescript
/**
 * 创建集成测试用的 Mock AuthStore
 *
 * 特点：
 * - 支持状态追踪（验证 clearAuth 调用）
 * - 支持方法调用计数
 * - 支持 toJSON/fromJSON 测试
 */
const createIntegrationMockAuthStore = (): AuthStore => {
  let clearAuthCallCount = 0;

  return {
    // State
    status: 'authenticated',
    user: { id: 1, username: 'test@example.com' },
    accessToken: 'test_access_token',
    refreshToken: 'test_refresh_token',
    tokenExpiresAt: Date.now() + 3600000,
    error: null,
    isAuthenticating: false,

    // Actions
    setLoading: jest.fn(),
    setAuthUser: jest.fn(),
    updateAccessToken: jest.fn(),
    clearAuth: jest.fn(() => {
      clearAuthCallCount++;
    }),
    setError: jest.fn(),
    clearError: jest.fn(),
    toJSON: jest.fn(() => ({})),
    fromJSON: jest.fn(),
    reset: jest.fn(),

    // 测试辅助方法
    getClearAuthCallCount: () => clearAuthCallCount,
  };
};
```

#### Mock AuthClient
```typescript
/**
 * 创建集成测试用的 Mock AuthClient
 *
 * 特点：
 * - 记录 logout 调用历史
 * - 支持验证调用参数
 */
const createIntegrationMockAuthClient = (): AuthClient & {
  getLogoutCallHistory: () => Array<LogoutOptions>;
} => {
  const logoutCallHistory: Array<LogoutOptions> = [];

  return {
    refreshToken: jest.fn(),
    logout: jest.fn((options?: LogoutOptions) => {
      logoutCallHistory.push(options ?? {});
    }),
    getLogoutCallHistory: () => logoutCallHistory,
  } as unknown as AuthClient & {
    getLogoutCallHistory: () => Array<LogoutOptions>;
  };
};
```

### 4.3 测试用例设计

#### 场景 1：刷新失败后正确调用登出逻辑（核心场景）

**Given-When-Then 格式**：

```typescript
describe('集成测试：Token 刷新失败后自动登出', () => {
  it('应在刷新失败后调用 authClient.logout({ silent: true })', async () => {
    // ===== Given =====
    const { mockFetch, client, mockAuthClient, mockTokenStorage, mockAuthStore }
      = createIntegrationTestEnvironment({
        accessToken: 'expired_access_token',
        refreshToken: 'invalid_refresh_token',
        expiresAt: Date.now() - 1000, // 已过期
      });

    // 配置 Fetch 响应序列
    configureFetchResponses(mockFetch, [
      // 原始请求返回 401
      {
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      },
      // 刷新请求返回 401
      {
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid refresh token' }),
      },
    ]);

    // 配置 onRefreshFailure 回调
    client.onRefreshFailure = (error) => {
      mockAuthClient.logout({ silent: true });
    };

    // ===== When =====
    // 发起请求 → 触发 401 → 触发刷新 → 刷新失败 → 触发 onRefreshFailure
    await expect(client.get('/api/data')).rejects.toThrow();

    // ===== Then =====
    // 1. 验证 authClient.logout 被调用
    expect(mockAuthClient.logout).toHaveBeenCalledTimes(1);
    expect(mockAuthClient.logout).toHaveBeenCalledWith({ silent: true });

    // 2. 验证 tokenStorage.clearTokens 被调用
    expect(mockTokenStorage.clearTokens).toHaveBeenCalledTimes(1);

    // 3. 验证 authStore.clearAuth 被调用
    expect(mockAuthStore.clearAuth).toHaveBeenCalledTimes(1);
  });
});
```

#### 场景 2：并发多个 401 请求刷新失败后全部拒绝

```typescript
it('应在刷新失败后拒绝所有排队的请求', async () => {
  // ===== Given =====
  const { mockFetch, client, mockAuthClient } =
    createIntegrationTestEnvironment();

  // 配置 onRefreshFailure 回调
  client.onRefreshFailure = (error) => {
    mockAuthClient.logout({ silent: true });
  };

  // ===== When =====
  // 配置 Fetch 响应
  configureFetchResponses(mockFetch, [
    // 原始请求 1 返回 401
    { ok: false, status: 401, json: async () => ({ detail: 'Unauthorized' }) },
    // 刷新请求返回 401
    { ok: false, status: 401, json: async () => ({ detail: 'Invalid' }) },
  ]);

  // 并发发起 3 个请求
  const promises = [
    client.get('/api/data1'),
    client.get('/api/data2'),
    client.get('/api/data3'),
  ];

  // ===== Then =====
  // 所有请求都应该失败
  await expect(Promise.all(promises)).rejects.toThrow();

  // 验证 logout 只被调用一次
  expect(mockAuthClient.logout).toHaveBeenCalledTimes(1);
});
```

#### 场景 3：刷新失败后清除状态并阻止后续请求

```typescript
it('应在刷新失败后清除 Token 并阻止后续请求', async () => {
  // ===== Given =====
  const { mockFetch, client, mockAuthClient, mockTokenStorage }
    = createIntegrationTestEnvironment();

  client.onRefreshFailure = (error) => {
    mockAuthClient.logout({ silent: true });
  };

  // ===== When =====
  // 第一个请求触发刷新失败
  configureFetchResponses(mockFetch, [
    { ok: false, status: 401, json: async () => ({ detail: 'Unauthorized' }) },
    { ok: false, status: 401, json: async () => ({ detail: 'Invalid' }) },
  ]);

  await expect(client.get('/api/data1')).rejects.toThrow();

  // 第二个请求应该无法注入 Token（已清除）
  mockFetch.mockClear();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: 'success' }),
  } as Response);

  await client.get('/api/data2');

  // ===== Then =====
  // 验证 clearTokens 被调用
  expect(mockTokenStorage.clearTokens).toHaveBeenCalled();

  // 验证第二个请求没有 Authorization header
  const lastCallArgs = mockFetch.mock.calls[0];
  const headers = lastCallArgs[1]?.headers as Headers;
  expect(headers?.get('Authorization')).toBeNull();
});
```

#### 场景 4：刷新网络错误后正确登出

```typescript
it('应在刷新网络错误后调用登出逻辑', async () => {
  // ===== Given =====
  const { mockFetch, client, mockAuthClient } =
    createIntegrationTestEnvironment();

  client.onRefreshFailure = (error) => {
    mockAuthClient.logout({ silent: true });
  };

  // ===== When =====
  // 原始请求返回 401
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({ detail: 'Unauthorized' }),
  } as Response);

  // 刷新请求网络错误
  mockFetch.mockRejectedValueOnce(new Error('Network error'));

  await expect(client.get('/api/data')).rejects.toThrow();

  // ===== Then =====
  expect(mockAuthClient.logout).toHaveBeenCalledTimes(1);
  expect(mockAuthClient.logout).toHaveBeenCalledWith({ silent: true });
});
```

### 4.4 测试文件模板

```typescript
/**
 * AuthClient 集成测试
 *
 * 测试覆盖范围：
 * - Token 刷新失败后自动调用 AuthClient.logout()
 * - 验证 TokenStorage 和 AuthStore 状态清除
 * - 验证并发请求的队列处理
 * - 验证网络错误场景
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HttpClient } from '../client';
import { AuthClient } from '../auth-client';
import type { TokenStorage } from '@/lib/storage/token-storage';
import type { AuthStore } from '@/store/auth/auth-store-types';
import type { StoredTokens } from '@/types/auth';

// ============================================================================
// Mock 工厂函数
// ============================================================================

// [参考 4.2 节的 Mock 实现]

// ============================================================================
// 集成测试套件
// ============================================================================

describe('AuthClient - Integration with HttpClient', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockTokenStorage: TokenStorage;
  let mockAuthStore: AuthStore;
  let mockAuthClient: AuthClient;
  let client: HttpClient;

  beforeEach(() => {
    // Mock fetch API
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();

    // 创建 Mock 实例
    mockTokenStorage = createIntegrationMockTokenStorage();
    mockAuthStore = createIntegrationMockAuthStore();
    mockAuthClient = createIntegrationMockAuthClient();

    // 创建 HttpClient 实例
    client = new HttpClient(
      'http://localhost:8000',
      5000,
      mockTokenStorage
    );
  });

  // [测试用例实现 - 参考 4.3 节]
});
```

---

## 5. 配置修复实施

### 5.1 方案 B 实现（推荐）

```typescript
// frontend/src/lib/api/client.ts (文件末尾)

// ============================================================================
// 全局客户端实例
// ============================================================================

/**
 * 默认客户端实例
 */
export const apiClient = new HttpClient();

// ============================================================================
// 配置 onRefreshFailure 回调（集成 AuthClient）
// ============================================================================

/**
 * 动态导入 AuthClient 并配置回调
 *
 * 注意：使用 require() 避免循环依赖
 * AuthClient 依赖 HttpClient，HttpClient 需要 AuthClient 的 logout()
 */
const setupRefreshFailureCallback = () => {
  try {
    // 动态导入（运行时执行）
    const { authClient } = require('./auth-client');

    // 配置 onRefreshFailure 回调
    apiClient.onRefreshFailure = (error: Error) => {
      console.error('Token refresh failed:', error);

      // 调用 AuthClient 的统一登出逻辑
      // silent: true 表示不调用后端登出端点（仅清除本地状态）
      authClient.logout({ silent: true, clearLocalState: true });
    };
  } catch (error) {
    console.error('Failed to setup refresh failure callback:', error);
  }
};

// 初始化回调
setupRefreshFailureCallback();
```

### 5.2 测试覆盖的配置

```typescript
/**
 * 验证 apiClient 的 onRefreshFailure 回调配置正确
 */
it('应正确配置 apiClient.onRefreshFailure 回调', async () => {
  // ===== Given =====
  const { apiClient } = require('../client');
  const { authClient } = require('../auth-client');

  // Mock authClient.logout
  const mockLogout = jest.spyOn(authClient, 'logout');

  // ===== When =====
  // 手动触发回调
  const testError = new Error('Test refresh failure');
  apiClient.onRefreshFailure(testError);

  // ===== Then =====
  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(mockLogout).toHaveBeenCalledWith({
    silent: true,
    clearLocalState: true,
  });
});
```

---

## 6. 验收标准

### 6.1 功能验收

- [ ] **集成测试文件创建**
  - [ ] 文件路径：`frontend/src/lib/api/__tests__/auth-client.integration.test.ts`
  - [ ] 使用 Jest 环境（jsdom）

- [ ] **测试场景覆盖**
  - [ ] 场景 1：刷新失败后调用 `authClient.logout({ silent: true })`
  - [ ] 场景 2：并发多个 401 请求刷新失败后全部拒绝
  - [ ] 场景 3：刷新失败后清除状态并阻止后续请求
  - [ ] 场景 4：刷新网络错误后正确登出

- [ ] **配置修复**
  - [ ] `client.ts` 中配置 `apiClient.onRefreshFailure` 回调
  - [ ] 回调正确调用 `authClient.logout({ silent: true })`
  - [ ] 使用动态导入避免循环依赖

- [ ] **Mock 验证**
  - [ ] `tokenStorage.clearTokens()` 被调用
  - [ ] `authStore.clearAuth()` 被调用
  - [ ] 所有排队的请求被拒绝

### 6.2 测试覆盖率

| 组件 | 目标覆盖率 | 当前覆盖率 | 差距 |
|------|-----------|-----------|------|
| `auth-client.ts` | > 90% | ~85% (单元) | +5% (集成) |
| `client.ts` | > 90% | ~88% | +2% (集成) |

**覆盖率报告生成**：
```bash
npm test -- --coverage --collectCoverageFrom='src/lib/api/**/*.{ts,tsx}'
```

### 6.3 通过标准

1. **所有测试用例通过**
   ```bash
   npm test -- auth-client.integration.test.ts
   ```

2. **无 TypeScript 类型错误**
   ```bash
   npm run type-check
   ```

3. **无 ESLint 警告**
   ```bash
   npm run lint
   ```

4. **测试覆盖率达标**
   ```bash
   npm test -- --coverage --coverageReporters=text
   ```

---

## 7. 实施计划

### 7.1 任务分解

| 任务 | 估时 | 优先级 | 依赖 |
|------|------|--------|------|
| 任务 1：创建集成测试文件模板 | 0.5h | P0 | - |
| 任务 2：实现 Mock 工厂函数 | 1h | P0 | 任务 1 |
| 任务 3：实现场景 1 测试用例 | 1h | P0 | 任务 2 |
| 任务 4：实现场景 2 测试用例 | 0.5h | P1 | 任务 3 |
| 任务 5：实现场景 3 测试用例 | 0.5h | P1 | 任务 3 |
| 任务 6：实现场景 4 测试用例 | 0.5h | P1 | 任务 3 |
| 任务 7：修复 client.ts 配置 | 0.5h | P0 | - |
| 任务 8：验证测试覆盖率 | 0.5h | P0 | 所有任务 |

**总计**：约 5 小时

### 7.2 实施顺序

```
阶段 1：测试基础设施（1.5h）
  ├─ 任务 1：创建集成测试文件模板
  ├─ 任务 2：实现 Mock 工厂函数
  └─ 任务 7：修复 client.ts 配置（并行）

阶段 2：核心测试场景（1h）
  └─ 任务 3：实现场景 1 测试用例

阶段 3：扩展测试场景（1.5h）
  ├─ 任务 4：实现场景 2 测试用例
  ├─ 任务 5：实现场景 3 测试用例
  └─ 任务 6：实现场景 4 测试用例

阶段 4：验证与优化（1h）
  └─ 任务 8：验证测试覆盖率
```

### 7.3 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 循环依赖导致配置失败 | 高 | 中 | 使用动态导入（require） |
| Mock Fetch 与真实 fetch 行为不一致 | 中 | 低 | 参考现有 client.test.ts 的 Mock 策略 |
| 测试环境隔离问题 | 中 | 低 | 使用 beforeEach 清理状态 |
| 测试运行时间过长 | 低 | 低 | 使用合理的数据量，避免无限循环 |

---

## 8. 附录

### 8.1 相关 Issue 链接

- #115 - Auth API 客户端实现（已完成）
- #111 - 401 响应拦截器与 Token 刷新（已完成）
- #110 - Token Refresh API 端点（已完成）
- #105 - 认证拦截器与 Token 自动注入（已完成）
- #97 - 前端认证状态管理基础层（已完成）

### 8.2 代码文件清单

| 文件路径 | 类型 | 说明 |
|---------|------|------|
| `frontend/src/lib/api/auth-client.ts` | 实现 | AuthClient 核心逻辑 |
| `frontend/src/lib/api/client.ts` | 实现 | HttpClient + onRefreshFailure |
| `frontend/src/lib/api/__tests__/auth-client.test.ts` | 单元测试 | 已有（866 行） |
| `frontend/src/lib/api/__tests__/auth-client.integration.test.ts` | 集成测试 | **新增** |
| `frontend/src/lib/api/__tests__/client.test.ts` | 单元测试 | 已有（1369 行） |

### 8.3 参考文档

- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
- [Testing Async Code](https://jestjs.io/docs/asynchronous)
- [Vitest Integration Testing](https://vitest.dev/guide/in-memory.html)

---

## 9. 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-02-27 | 1.0 | 初始版本 | Claude (Architect) |

---

**文档状态**: Draft（待 Review）
**下一步行动**: 等待用户确认后，移交给 task-developer 实施
