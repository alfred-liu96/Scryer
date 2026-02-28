# useAuth Hook 架构蓝图 (Issue #141)

> **文档版本**: 1.0
> **创建日期**: 2026-02-28
> **状态**: 设计完成，待实现

---

## 1. 需求概述

### 1.1 任务目标
创建 `useAuth` Hook，为 React 组件提供全局认证状态查询和操作接口。

### 1.2 核心功能
1. 创建 `frontend/src/lib/hooks/useAuth.ts`
2. 封装全局认证状态查询接口
3. 集成 `SessionManager`，提供自动刷新能力
4. 提供登出、刷新等操作方法
5. 编写单元测试（任务 #142 负责集成测试）

### 1.3 设计原则
- **KISS 原则**: 保持代码简洁，直接暴露 `authStore` 的状态
- **一致性**: 遵循现有 hooks 的代码风格（`useApi.ts`, `useLocalStorage.ts`）
- **SSR 安全**: 检查 `window` 是否存在，避免服务端渲染错误
- **单一职责**: 仅作为 `authStore` 的 React 层适配器，不包含业务逻辑

---

## 2. 接口定义

### 2.1 TypeScript 类型

```typescript
/**
 * useAuth Hook 返回值类型
 */
export interface UseAuthResult {
  // ========== 状态查询 ==========
  /** 认证状态（'authenticated' | 'unauthenticated' | 'loading'） */
  status: AuthStatus;
  /** 当前用户信息（已认证时存在） */
  user: UserResponse | null;
  /** 是否已认证（便捷属性） */
  isAuthenticated: boolean;
  /** 是否正在认证 */
  isAuthenticating: boolean;
  /** 认证错误（如果存在） */
  error: AuthError | null;

  // ========== 操作方法 ==========
  /** 刷新访问令牌（调用 AuthClient） */
  refreshToken: () => Promise<TokenResponse>;
  /** 登出（清除认证状态） */
  logout: (options?: LogoutOptions) => Promise<void>;
  /** 清除认证错误 */
  clearError: () => void;
}

/**
 * useAuth Hook 配置选项（预留，当前版本不使用） */
export interface UseAuthOptions {
  /** 是否自动启动 SessionManager（默认 true） */
  autoStartSessionManager?: boolean;
  /** SessionManager 实例（可选，用于测试） */
  sessionManager?: import('@/lib/auth/session-manager').SessionManager;
}
```

### 2.2 函数签名

```typescript
/**
 * useAuth Hook - React 层认证状态管理
 *
 * 职责：
 * - 订阅 authStore 状态变化
 * - 提供便捷的认证操作方法
 * - 集成 SessionManager 实现自动刷新
 * - 保证 SSR 安全性
 *
 * @param options - 配置选项（可选）
 * @returns UseAuthResult 认证状态与操作方法
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, user, logout } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <LoginButton />;
 *   }
 *
 *   return (
 *     <div>
 *       Welcome, {user.username}!
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth(options?: UseAuthOptions): UseAuthResult {
  // Implementation pending
}
```

---

## 3. 模块集成

### 3.1 依赖模块

| 模块 | 用途 | 集成方式 |
|------|------|----------|
| `authStore` | 认证状态存储 | Zustand `useStore` hook 订阅 |
| `SessionManager` | Token 自动刷新 | Hook 内部单例管理 |
| `AuthClient` | Token 刷新和登出 | 调用 `authClient` 方法 |
| `TokenStorage` | Token 读取 | 通过 `AuthClient` 间接访问 |

### 3.2 状态流向

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Component                          │
│                                                                 │
│   const { isAuthenticated, user, logout } = useAuth()          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         useAuth Hook                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  const authStore = useAuthStore()                          │ │
│  │  const sessionManager = useSessionManager()                │ │
│  │                                                            │ │
│  │  return {                                                  │ │
│  │    status: authStore.status,                               │ │
│  │    user: authStore.user,                                   │ │
│  │    isAuthenticated: status === 'authenticated',            │ │
│  │    logout: () => authClient.logout(),                      │ │
│  │    refreshToken: () => authClient.refreshToken(),          │ │
│  │  }                                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   authStore     │  │ SessionManager   │  │  AuthClient      │
│  (Zustand)      │  │  (单例管理)      │  │  (API 调用)      │
│                 │  │                  │  │                  │
│ - status        │  │ - start()        │  │ - refreshToken() │
│ - user          │  │ - stop()         │  │ - logout()       │
│ - error         │  │                  │  │                  │
└─────────────────┘  └──────────────────┘  └──────────────────┘
```

### 3.3 SessionManager 生命周期

```typescript
// 全局单例 SessionManager（延迟初始化）
let sessionManagerInstance: SessionManager | null = null;

function getSessionManager(): SessionManager {
  if (sessionManagerInstance) {
    return sessionManagerInstance;
  }

  if (typeof window === 'undefined') {
    // SSR 环境返回 Mock（避免服务端错误）
    return createMockSessionManager();
  }

  sessionManagerInstance = createSessionManager({
    tokenStorage: createTokenStorage(),
    authClient: authClient,
    authStore: authStore,
  });

  return sessionManagerInstance;
}
```

---

## 4. 错误处理策略

### 4.1 错误来源

| 错误来源 | 处理方式 |
|----------|----------|
| `refreshToken()` 失败 | 由 `SessionManager` 处理，401 自动登出 |
| `logout()` 失败 | 记录警告，不影响本地状态清除 |
| 网络错误 | 由 `AuthClient` 抛出，调用者决定处理方式 |

### 4.2 错误传播

```typescript
// useAuth Hook 不吞没错误，允许调用者处理
export function useAuth(): UseAuthResult {
  const refreshToken = useCallback(async () => {
    try {
      return await authClient.refreshToken();
    } catch (error) {
      // 重新抛出，由调用者决定是否显示 Toast
      throw error;
    }
  }, []);

  const logout = useCallback(async (options?: LogoutOptions) => {
    try {
      await authClient.logout(options);
    } catch (error) {
      // logout 失败不影响本地状态清除，但记录警告
      console.warn('Logout API failed:', error);
    }
  }, []);

  return { refreshToken, logout };
}
```

---

## 5. SSR 兼容性方案

### 5.1 问题分析

- `authStore` 在 SSR 环境下不存在
- `SessionManager` 依赖 `window` 和 `setTimeout`
- 需要避免服务端渲染时访问浏览器 API

### 5.2 解决方案

```typescript
// 方案 1: 检测浏览器环境
const isBrowser = typeof window !== 'undefined';

// 方案 2: 延迟初始化 SessionManager
function useAuth(options?: UseAuthOptions): UseAuthResult {
  const authStore = useAuthStore();

  // 仅在浏览器环境启动 SessionManager
  useEffect(() => {
    if (isBrowser) {
      const manager = getSessionManager();
      manager.start();

      return () => manager.stop();
    }
  }, []);

  // ... 其余逻辑
}

// 方案 3: 提供默认状态（SSR 场景）
const defaultState: UseAuthResult = {
  status: 'loading',
  user: null,
  isAuthenticated: false,
  isAuthenticating: false,
  error: null,
  refreshToken: async () => { throw new Error('Not available in SSR'); },
  logout: async () => {},
  clearError: () => {},
};
```

---

## 6. 文件结构

```
frontend/src/lib/hooks/
├── __tests__/
│   └── useAuth.test.ts           # 单元测试（本任务）
├── useApi.ts                     # 现有文件（参考）
├── useLocalStorage.ts            # 现有文件（参考）
└── useAuth.ts                    # 新建文件（本任务）
```

---

## 7. 测试要求（任务 #142 集成测试）

### 7.1 单元测试范围（本任务）

```typescript
describe('useAuth', () => {
  it('应该返回正确的认证状态', () => {
    // 测试 isAuthenticated、user 等状态
  });

  it('应该调用 logout 并清除状态', () => {
    // 测试 logout 方法
  });

  it('应该调用 refreshToken 并更新 Token', () => {
    // 测试 refreshToken 方法
  });

  it('应该在组件挂载时启动 SessionManager', () => {
    // 测试 SessionManager 集成
  });

  it('应该在组件卸载时停止 SessionManager', () => {
    // 测试清理逻辑
  });

  it('SSR 环境下不应该抛出错误', () => {
    // 测试 SSR 兼容性
  });
});
```

### 7.2 集成测试范围（任务 #142）

- 与登录流程的端到端集成
- Token 自动刷新的完整流程
- 多组件共享认证状态的一致性

---

## 8. 实现检查清单

- [ ] 创建 `frontend/src/lib/hooks/useAuth.ts`
- [ ] 定义 `UseAuthResult` 和 `UseAuthOptions` 类型
- [ ] 实现 `useAuth` Hook 函数
- [ ] 集成 `authStore`（使用 `useAuthStore()`）
- [ ] 集成 `SessionManager`（单例模式）
- [ ] 实现 `logout` 方法
- [ ] 实现 `refreshToken` 方法
- [ ] 实现 `clearError` 方法
- [ ] 添加 SSR 安全检查
- [ ] 编写单元测试 `frontend/src/lib/hooks/__tests__/useAuth.test.ts`
- [ ] 更新导出 `frontend/src/lib/hooks/index.ts`（如果存在）

---

## 9. 依赖关系

### 9.1 前置依赖

- ✅ `authStore` (`frontend/src/store/auth/auth-store.ts`) - 已完成
- ✅ `SessionManager` (`frontend/src/lib/auth/session-manager.ts`) - 已完成
- ✅ `AuthClient` (`frontend/src/lib/api/auth-client.ts`) - 已完成

### 9.2 后续依赖

- 任务 #142: SessionManager 与 useAuth Hook 集成测试与文档完善

---

## 10. 风险与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SessionManager 重复启动 | 内存泄漏 | 使用单例模式，确保只有一个实例 |
| SSR 渲染报错 | 应用崩溃 | 添加 `typeof window` 检查 |
| logout 网络失败 | 用户状态不一致 | 无论 API 成功与否都清除本地状态 |
| 多个组件同时调用 refreshToken | 重复请求 | SessionManager 内部已实现请求去重 |

---

## 11. 测试策略（架构指导）

### 11.1 测试方案选择

**推荐方案：方案 A - 依赖注入 + jest.mock() 混合模式**

基于项目现有测试模式分析，采用混合策略：

| 场景 | 策略 | 原因 |
|------|------|------|
| 全局模块 mock | `jest.mock()` | 与项目现有测试风格一致（见 `session-manager.test.ts`） |
| 测试数据控制 | `UseAuthOptions` 依赖注入 | 支持测试隔离，避免测试间相互影响 |
| SSR 测试 | 环境变量模拟 | 覆盖边界情况 |

### 11.2 UseAuthOptions 接口扩展

```typescript
/**
 * useAuth Hook 配置选项
 * 支持依赖注入，便于测试
 */
export interface UseAuthOptions {
  /** 是否自动启动 SessionManager（默认 true） */
  autoStartSessionManager?: boolean;
  /** SessionManager 实例（可选，用于测试） */
  sessionManager?: SessionManager;
  /** AuthClient 实例（可选，用于测试） */
  authClient?: AuthClient;
  /** AuthStore 实例（可选，用于测试） */
  authStore?: AuthStore;
}
```

### 11.3 测试模式示例

```typescript
// 1. 全局模块 Mock（与项目风格一致）
jest.mock('@/store/auth/auth-store', () => ({
  authStore: mockAuthStore,
  createAuthStore: jest.fn(() => mockAuthStore),
}));

jest.mock('@/lib/auth/session-manager', () => ({
  createSessionManager: jest.fn(() => mockSessionManager),
}));

jest.mock('@/lib/api/auth-client', () => ({
  authClient: {
    refreshToken: mockRefreshToken,
    logout: mockLogout,
  },
}));

// 2. 测试中使用 UseAuthOptions 注入 mock
it('应该返回正确的认证状态', () => {
  const customStore = createMockAuthStore();
  customStore.setAuthUser(MOCK_USER, 'token', 'refresh', 3600);

  const { result } = renderHook(() =>
    useAuth({ authStore: customStore as any })
  );

  expect(result.current.isAuthenticated).toBe(true);
});
```

### 11.4 为什么不采用纯依赖注入？

| 方案 | 优点 | 缺点 | 决策 |
|------|------|------|------|
| A) 纯依赖注入 | 完全解耦，测试隔离 | 增加生产代码复杂度；与现有风格不一致 | ❌ 不推荐 |
| B) 纯 jest.mock() | 生产代码简洁 | 测试间可能相互影响；Mock 状态管理复杂 | ⚠️ 部分场景可用 |
| **C) 混合模式** | **兼顾简洁性和可测试性** | **需要维护两套机制** | ✅ **推荐** |

### 11.5 测试编写规范

```typescript
// ✅ 推荐写法：使用 UseAuthOptions 控制测试数据
describe('useAuth Hook', () => {
  it('应该返回正确的认证状态', () => {
    const localAuthStore = createMockAuthStore();
    localAuthStore.setAuthUser(MOCK_USER, 'token', 'refresh', 3600);

    const { result } = renderHook(() =>
      useAuth({ authStore: localAuthStore as any })
    );

    expect(result.current.isAuthenticated).toBe(true);
  });
});

// ✅ 推荐写法：测试全局默认行为
describe('useAuth Hook - 默认行为', () => {
  it('应该使用全局 authStore', () => {
    // 不传入 options，测试默认行为
    const { result } = renderHook(() => useAuth());
    // 验证使用的是全局 mock
  });
});
```

---

## 12. 附录

### 12.1 参考文档

- [Zustand 官方文档](https://github.com/pmndrs/zustand)
- [React Hooks 规则](https://react.dev/reference/react)
- [Jest Mock 最佳实践](https://jestjs.io/docs/mock-functions)
- Issue #141: [feat: 实现 useAuth Hook（React 层认证状态）](https://github.com/...)

### 12.2 代码风格参考

- `frontend/src/lib/hooks/useApi.ts` - API 状态管理模式
- `frontend/src/lib/hooks/useLocalStorage.ts` - SSR 安全处理
- `frontend/src/store/auth/auth-store.ts` - Zustand Store 结构
- `frontend/src/lib/auth/__tests__/session-manager.test.ts` - 测试模式参考
