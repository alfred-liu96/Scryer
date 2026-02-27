# Issue #97 开发蓝图 - 前端认证状态管理基础层

## 项目元信息

- **Issue**: #97 - [Frontend] 认证状态管理基础层
- **创建时间**: 2026-02-27
- **状态**: 待实施
- **优先级**: P0 (核心基础)
- **预估工时**: 0.5-1 天
- **技术栈**: TypeScript + Zustand + Immer + Vitest + Testing Library

---

## 1. 需求分析

### 1.1 业务背景
前端需要实现完整的认证状态管理层，与后端 `/api/v1/auth` 端点对接，提供统一的用户认证状态管理能力。

### 1.2 后端 API 契约
根据后端实现（`/workspace/src/backend/app/api/v1/auth.py`），已提供以下端点：

| 端点 | 方法 | 描述 | 响应模型 |
|------|------|------|----------|
| `/api/v1/auth/register` | POST | 用户注册 | `RegisterResponse { user, tokens }` |
| `/api/v1/auth/login` | POST | 用户登录 | `LoginResponse { user, tokens }` |
| `/api/v1/auth/me` | GET | 获取当前用户 | `UserResponse` |

**Token 响应结构**（`TokenResponse`）:
```typescript
interface TokenResponse {
  access_token: string;   // JWT 访问令牌
  refresh_token: string;  // JWT 刷新令牌
  token_type: 'Bearer';   // 固定值
  expires_in: number;     // access_token 过期时间（秒）
}
```

**用户信息结构**（`UserResponse`）:
```typescript
interface UserResponse {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string; // ISO 8601 格式
}
```

### 1.3 核心需求
1. **Token 安全存储** - 使用 localStorage 封装 Token 存储/读取/清除
2. **认证状态管理** - 使用 Zustand + Immer 管理 user、tokens、actions
3. **类型安全** - 完整的 TypeScript 类型定义
4. **测试覆盖** - 单元测试覆盖率 >= 90%

---

## 2. 架构设计

### 2.1 文件结构
```
frontend/src/
├── types/
│   ├── auth.ts              # 认证相关类型定义
│   └── index.ts             # 统一导出（已存在）
├── lib/
│   ├── storage/
│   │   ├── token-storage.ts # Token 存储工具
│   │   └── index.ts         # 导出
│   ├── api/
│   │   └── auth-api.ts      # 认证 API 客户端（Issue #98 范畴，此处预留接口）
│   └── ...
├── store/
│   ├── auth-store.ts        # 认证 Store 实现
│   ├── auth-store.test.ts   # 单元测试
│   ├── index.ts             # 导出所有 stores
│   └── ...
└── ...
```

### 2.2 设计原则
1. **一致性** - 遵循现有 `ui-store.ts` 的代码风格和结构
2. **安全性** - Token 存储需考虑 XSS 防护（localStorage + 封装）
3. **测试友好** - Store 创建函数支持 `persist: false` 配置（测试环境）
4. **类型安全** - 严格 TypeScript 类型，使用 `readonly` 保护不可变性

---

## 3. 接口定义与数据模型

### 3.1 类型定义（`types/auth.ts`）

```typescript
/**
 * 认证相关类型定义
 *
 * 对应后端 schemas/auth.py 和 services/auth.py
 */

/**
 * Token 响应模型
 * 对应后端 TokenResponse
 */
export interface TokenResponse {
  /** JWT 访问令牌 */
  access_token: string;
  /** JWT 刷新令牌 */
  refresh_token: string;
  /** Token 类型（固定为 "Bearer"） */
  token_type: 'Bearer';
  /** 访问令牌过期时间（秒） */
  expires_in: number;
}

/**
 * 用户信息响应模型
 * 对应后端 UserResponse
 */
export interface UserResponse {
  /** 用户 ID */
  id: number;
  /** 用户名 */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 账户激活状态 */
  is_active: boolean;
  /** 创建时间（ISO 8601） */
  created_at: string;
}

/**
 * 登录请求模型
 * 对应后端 LoginRequest
 */
export interface LoginRequest {
  /** 用户名（与 email 二选一） */
  username?: string;
  /** 邮箱地址（与 username 二选一） */
  email?: string;
  /** 密码 */
  password: string;
}

/**
 * 注册请求模型
 * 对应后端 RegisterRequest
 */
export interface RegisterRequest {
  /** 用户名（3-50 字符） */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 密码（最少 8 字符） */
  password: string;
}

/**
 * 认证状态
 */
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

/**
 * Token 存储模型
 */
export interface StoredTokens {
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
}

/**
 * 认证错误类型
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_INACTIVE = 'USER_INACTIVE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 认证错误
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: unknown;
}
```

### 3.2 Token 存储工具接口（`lib/storage/token-storage.ts`）

```typescript
/**
 * Token 安全存储工具
 *
 * 职责：
 * - 封装 localStorage 操作
 * - 提供类型安全的 Token 存取接口
 * - 处理 Token 过期检查
 * - 提供 SSR 安全（服务端渲染兼容）
 */

import type { StoredTokens, TokenResponse } from '@/types/auth';

/**
 * Token 存储键名
 */
export const TOKEN_STORAGE_KEY = 'auth_tokens';

/**
 * TokenStorage 接口
 */
export interface TokenStorage {
  /**
   * 保存 Token 到 localStorage
   * @param tokens - Token 响应对象
   * @returns 保存成功返回 true
   */
  setTokens(tokens: TokenResponse): boolean;

  /**
   * 从 localStorage 读取 Token
   * @returns Token 存储对象，不存在或过期返回 null
   */
  getTokens(): StoredTokens | null;

  /**
   * 获取访问令牌
   * @returns 访问令牌，不存在返回 null
   */
  getAccessToken(): string | null;

  /**
   * 获取刷新令牌
   * @returns 刷新令牌，不存在返回 null
   */
  getRefreshToken(): string | null;

  /**
   * 检查 Token 是否过期
   * @returns 过期返回 true
   */
  isTokenExpired(): boolean;

  /**
   * 清除 Token
   */
  clearTokens(): void;

  /**
   * 检查是否有有效的 Token
   * @returns 有效返回 true
   */
  hasValidTokens(): boolean;
}

/**
 * 创建 TokenStorage 实例
 * @param storageKey - localStorage 键名（默认 TOKEN_STORAGE_KEY）
 * @returns TokenStorage 实例
 */
export function createTokenStorage(
  storageKey: string = TOKEN_STORAGE_KEY
): TokenStorage {
  // Implementation by task-developer
  throw new Error('Not implemented');
}
```

### 3.3 认证 Store 类型（`store/auth-store-types.ts`）

```typescript
/**
 * 认证 Store 类型定义
 *
 * 遵循 ui-store.ts 的设计模式
 */

import type { UserResponse, AuthStatus, AuthError } from '@/types/auth';

/**
 * 认证状态接口
 */
export interface AuthState {
  /** 认证状态 */
  status: AuthStatus;
  /** 当前用户信息（已认证时存在） */
  user: UserResponse | null;
  /** 访问令牌 */
  accessToken: string | null;
  /** 刷新令牌 */
  refreshToken: string | null;
  /** Token 过期时间戳（毫秒） */
  tokenExpiresAt: number | null;
  /** 认证错误 */
  error: AuthError | null;
  /** 是否正在执行认证操作 */
  isAuthenticating: boolean;
}

/**
 * 认证操作接口
 */
export interface AuthActions {
  /**
   * 设置认证状态为加载中
   */
  setLoading: () => void;

  /**
   * 设置认证用户信息
   * @param user - 用户信息
   * @param accessToken - 访问令牌
   * @param refreshToken - 刷新令牌
   * @param expiresIn - 过期时间（秒）
   */
  setAuthUser: (
    user: UserResponse,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ) => void;

  /**
   * 更新访问令牌（刷新 Token 后使用）
   * @param accessToken - 新的访问令牌
   * @param expiresIn - 过期时间（秒）
   */
  updateAccessToken: (accessToken: string, expiresIn: number) => void;

  /**
   * 清除认证信息（登出）
   */
  clearAuth: () => void;

  /**
   * 设置认证错误
   * @param error - 错误对象
   */
  setError: (error: AuthError) => void;

  /**
   * 清除错误
   */
  clearError: () => void;

  /**
   * 序列化状态为 JSON（用于持久化）
   * @returns 部分状态的深拷贝
   */
  toJSON: () => Readonly<DeepPartial<AuthState>>;

  /**
   * 从 JSON 恢复状态（用于持久化恢复）
   * @param data - 部分状态数据
   */
  fromJSON: (data: Readonly<DeepPartial<AuthState>>) => void;

  /**
   * 重置为初始状态
   */
  reset: () => void;
}

/**
 * DeepPartial 类型
 * 从 ui-store.ts 复用
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

/**
 * 认证 Store 完整类型
 */
export type AuthStore = AuthState & AuthActions;

/**
 * 认证 Store API（Zustand Store）
 */
export interface AuthStoreApi {
  getState: () => AuthStore;
  setState: (partial: Partial<AuthStore>) => void;
  subscribe: (listener: () => void) => () => void;
  destroy: () => void;
}

/**
 * 创建认证 Store 的选项
 */
export interface CreateAuthStoreOptions {
  /** 启用持久化（默认 false） */
  persist?: boolean;
  /** 启用 DevTools（默认 false） */
  devtools?: boolean;
  /** Store 名称（用于 DevTools 和持久化 key） */
  name?: string;
  /** Token 存储实例（用于测试 Mock） */
  tokenStorage?: import('@/lib/storage').TokenStorage;
}
```

---

## 4. Store 实现契约

### 4.1 认证 Store 实现（`store/auth-store.ts`）

```typescript
/**
 * 认证 Store 实现
 *
 * 使用 Zustand + Immer 实现的认证状态管理
 * 设计原则：
 * - 与 ui-store.ts 保持一致的代码风格
 * - 支持持久化（可选，生产环境启用）
 * - 支持 DevTools（可选）
 * - 测试环境可禁用持久化
 *
 * @depends
 * - zustand
 * - zustand/middleware/immer
 * - zustand/middleware/devtools
 * - zustand/middleware/persist
 * - @/types/auth
 * - @/lib/storage/token-storage
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import type {
  AuthStore,
  AuthState,
  AuthActions,
  CreateAuthStoreOptions,
  DeepPartial,
} from './auth-store-types';
import type { UserResponse, TokenResponse } from '@/types/auth';
import { createTokenStorage, TOKEN_STORAGE_KEY } from '@/lib/storage/token-storage';

/**
 * 初始认证状态
 */
export const INITIAL_AUTH_STATE: AuthState = {
  status: 'unauthenticated',
  user: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  error: null,
  isAuthenticating: false,
};

/**
 * 创建认证 Store
 *
 * @param options - Store 配置选项
 * @returns Zustand Store 对象
 *
 * @example
 * ```ts
 * // 测试环境（无持久化）
 * const testStore = createAuthStore();
 *
 * // 生产环境（持久化 + DevTools）
 * const prodStore = createAuthStore({
 *   persist: true,
 *   devtools: true,
 *   name: 'auth-store',
 * });
 * ```
 */
export function createAuthStore(
  options: CreateAuthStoreOptions = {}
): AuthStore {
  const {
    persist: enablePersist = false,
    devtools: enableDevtools = false,
    name = 'auth-store',
    tokenStorage,
  } = options;

  // 使用依赖注入的 tokenStorage 或创建默认实例
  const storage = tokenStorage ?? createTokenStorage();

  // 创建基础 store（使用 immer 中间件）
  const baseStore = create<AuthState & AuthActions>()(
    immer((set, get) => ({
      // ========== 初始状态 ==========
      ...INITIAL_AUTH_STATE,

      // ========== Actions ==========
      setLoading: () => {
        set((state) => {
          state.status = 'loading';
          state.isAuthenticating = true;
          state.error = null;
        });
      },

      setAuthUser: (
        user: UserResponse,
        accessToken: string,
        refreshToken: string,
        expiresIn: number
      ) => {
        const expiresAt = Date.now() + expiresIn * 1000;

        set((state) => {
          state.status = 'authenticated';
          state.user = user;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.tokenExpiresAt = expiresAt;
          state.isAuthenticating = false;
          state.error = null;
        });

        // 同步更新 Token 存储
        storage.setTokens({ access_token: accessToken, refresh_token: refreshToken, token_type: 'Bearer', expires_in: expiresIn });
      },

      updateAccessToken: (accessToken: string, expiresIn: number) => {
        const expiresAt = Date.now() + expiresIn * 1000;

        set((state) => {
          state.accessToken = accessToken;
          state.tokenExpiresAt = expiresAt;
        });

        // 注意：这里仅更新 access_token，refresh_token 保持不变
        // 实际实现需要考虑如何更新 storage 中的 access_token
      },

      clearAuth: () => {
        set((state) => {
          state.status = 'unauthenticated';
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
          state.tokenExpiresAt = null;
          state.isAuthenticating = false;
          state.error = null;
        });

        // 清除 Token 存储
        storage.clearTokens();
      },

      setError: (error) => {
        set((state) => {
          state.error = error;
          state.status = 'unauthenticated';
          state.isAuthenticating = false;
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      toJSON: (): Readonly<DeepPartial<AuthState>> => {
        const state = get();
        return {
          status: state.status,
          user: state.user ? { ...state.user } : null,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          tokenExpiresAt: state.tokenExpiresAt,
          error: state.error ? { ...state.error } : null,
          isAuthenticating: state.isAuthenticating,
        };
      },

      fromJSON: (data: Readonly<DeepPartial<AuthState>>) => {
        set((state) => {
          if (data.status !== undefined) state.status = data.status;
          if (data.user !== undefined) state.user = data.user ?? null;
          if (data.accessToken !== undefined) state.accessToken = data.accessToken;
          if (data.refreshToken !== undefined) state.refreshToken = data.refreshToken;
          if (data.tokenExpiresAt !== undefined) state.tokenExpiresAt = data.tokenExpiresAt;
          if (data.error !== undefined) state.error = data.error ?? null;
          if (data.isAuthenticating !== undefined) state.isAuthenticating = data.isAuthenticating;
        });
      },

      reset: () => {
        set((state) => {
          state.status = INITIAL_AUTH_STATE.status;
          state.user = INITIAL_AUTH_STATE.user;
          state.accessToken = INITIAL_AUTH_STATE.accessToken;
          state.refreshToken = INITIAL_AUTH_STATE.refreshToken;
          state.tokenExpiresAt = INITIAL_AUTH_STATE.tokenExpiresAt;
          state.error = INITIAL_AUTH_STATE.error;
          state.isAuthenticating = INITIAL_AUTH_STATE.isAuthenticating;
        });

        storage.clearTokens();
      },
    }))
  );

  // 应用 devtools 中间件（可选）
  if (enableDevtools) {
    // DevTools 配置
  }

  // 应用 persist 中间件（可选）
  if (enablePersist) {
    // 持久化配置（注意：Token 已由 token-storage 管理，这里只持久化 user 和 status）
  }

  return baseStore;
}

/**
 * 默认导出的认证 Store 单例
 *
 * 注意：这个单例应该在应用启动时创建，并注入到组件树中
 * 实际实现可能需要延迟初始化（考虑 SSR）
 */
export const authStore = createAuthStore({
  persist: process.env.NODE_ENV === 'production',
  devtools: process.env.NODE_ENV === 'development',
  name: 'auth-store',
});
```

---

## 5. 测试规范

### 5.1 Token Storage 测试（`lib/storage/__tests__/token-storage.test.ts`）

```typescript
/**
 * Token Storage 单元测试
 *
 * 测试覆盖范围：
 * - Token 保存与读取
 * - Token 过期检查
 * - Token 清除
 * - SSR 安全（服务端环境）
 * - 边界情况处理
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTokenStorage, TOKEN_STORAGE_KEY } from '../token-storage';
import type { TokenResponse } from '@/types/auth';

describe('TokenStorage', () => {
  let storage: ReturnType<typeof createTokenStorage>;
  let mockLocalStorage: Storage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      length: 0,
      clear: jest.fn(),
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      key: jest.fn(),
    };

    // 替换全局 localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    storage = createTokenStorage();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setTokens', () => {
    it('should save tokens to localStorage', () => {
      const mockTokens: TokenResponse = {
        access_token: 'access123',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      storage.setTokens(mockTokens);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        TOKEN_STORAGE_KEY,
        expect.stringContaining('access123')
      );
    });

    it('should calculate expiration timestamp correctly', () => {
      const beforeTime = Date.now();
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });
      const afterTime = Date.now();

      const saved = storage.getTokens();
      expect(saved?.expiresAt).toBeGreaterThanOrEqual(beforeTime + 3600 * 1000);
      expect(saved?.expiresAt).toBeLessThanOrEqual(afterTime + 3600 * 1000);
    });

    it('should return true on success', () => {
      const result = storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(result).toBe(true);
    });
  });

  describe('getTokens', () => {
    it('should return null when no tokens exist', () => {
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(null);

      const tokens = storage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should return stored tokens', () => {
      const storedData = JSON.stringify({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() + 3600000,
      });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(storedData);

      const tokens = storage.getTokens();

      expect(tokens).toEqual({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: expect.any(Number),
      });
    });

    it('should return null for expired tokens', () => {
      const expiredData = JSON.stringify({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() - 1000, // 1秒前过期
      });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(expiredData);

      const tokens = storage.getTokens();

      expect(tokens).toBeNull();
    });

    it('should handle malformed JSON gracefully', () => {
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue('invalid json');

      const tokens = storage.getTokens();

      expect(tokens).toBeNull();
    });
  });

  describe('getAccessToken', () => {
    it('should return access token', () => {
      const mockTokens: TokenResponse = {
        access_token: 'access123',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: 3600,
      };
      storage.setTokens(mockTokens);

      const accessToken = storage.getAccessToken();

      expect(accessToken).toBe('access123');
    });

    it('should return null when no tokens', () => {
      const accessToken = storage.getAccessToken();
      expect(accessToken).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    it('should return refresh token', () => {
      const mockTokens: TokenResponse = {
        access_token: 'access123',
        refresh_token: 'refresh123',
        token_type: 'Bearer',
        expires_in: 3600,
      };
      storage.setTokens(mockTokens);

      const refreshToken = storage.getRefreshToken();

      expect(refreshToken).toBe('refresh123');
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired tokens', () => {
      const expiredData = JSON.stringify({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() - 1000,
      });
      (mockLocalStorage.getItem as jest.Mock).mockReturnValue(expiredData);

      expect(storage.isTokenExpired()).toBe(true);
    });

    it('should return false for valid tokens', () => {
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(storage.isTokenExpired()).toBe(false);
    });

    it('should return true when no tokens', () => {
      expect(storage.isTokenExpired()).toBe(true);
    });
  });

  describe('clearTokens', () => {
    it('should remove tokens from localStorage', () => {
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      storage.clearTokens();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(TOKEN_STORAGE_KEY);
    });
  });

  describe('hasValidTokens', () => {
    it('should return true for valid tokens', () => {
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      expect(storage.hasValidTokens()).toBe(true);
    });

    it('should return false for expired tokens', () => {
      storage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: -1, // 已过期
      });

      expect(storage.hasValidTokens()).toBe(false);
    });

    it('should return false when no tokens', () => {
      expect(storage.hasValidTokens()).toBe(false);
    });
  });

  describe('SSR Safety', () => {
    it('should handle missing localStorage gracefully', () => {
      // 模拟服务端环境
      const originalLocalStorage = window.localStorage;
      // @ts-ignore - 模拟服务端
      delete window.localStorage;

      const ssrStorage = createTokenStorage();
      const result = ssrStorage.setTokens({
        access_token: 'access',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      // 应该返回 false 或优雅失败，不抛出异常
      expect(result).toBe(false);

      // 恢复
      window.localStorage = originalLocalStorage;
    });
  });
});
```

### 5.2 认证 Store 测试（`store/__tests__/auth-store.test.ts`）

```typescript
/**
 * 认证 Store 单元测试
 *
 * 测试覆盖范围：
 * - 初始状态验证
 * - 用户认证流程（setAuthUser）
 * - Token 更新（updateAccessToken）
 * - 登出（clearAuth）
 * - 错误处理（setError, clearError）
 * - 状态序列化（toJSON, fromJSON）
 * - 状态重置（reset）
 * - 边界情况处理
 *
 * 目标覆盖率: >= 90%
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createAuthStore, INITIAL_AUTH_STATE } from '../auth-store';
import type { AuthStore } from '../auth-store-types';
import type { UserResponse, TokenResponse } from '@/types/auth';
import { AuthErrorType } from '@/types/auth';
import { createTokenStorage } from '@/lib/storage/token-storage';

// Mock Token Storage
jest.mock('@/lib/storage/token-storage');

describe('Auth Store - Initial State', () => {
  let store: AuthStore;

  beforeEach(() => {
    store = createAuthStore({ persist: false });
  });

  it('should initialize with default state', () => {
    const state = store.getState();

    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.tokenExpiresAt).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isAuthenticating).toBe(false);
  });

  it('should have all actions defined', () => {
    const actions = store.getState();

    expect(typeof actions.setLoading).toBe('function');
    expect(typeof actions.setAuthUser).toBe('function');
    expect(typeof actions.updateAccessToken).toBe('function');
    expect(typeof actions.clearAuth).toBe('function');
    expect(typeof actions.setError).toBe('function');
    expect(typeof actions.clearError).toBe('function');
    expect(typeof actions.toJSON).toBe('function');
    expect(typeof actions.fromJSON).toBe('function');
    expect(typeof actions.reset).toBe('function');
  });
});

describe('Auth Store - Authentication Flow', () => {
  let store: AuthStore;
  let mockTokenStorage: ReturnType<typeof createTokenStorage>;

  const mockUser: UserResponse = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockTokenStorage = {
      setTokens: jest.fn(),
      getTokens: jest.fn(),
      getAccessToken: jest.fn(),
      getRefreshToken: jest.fn(),
      isTokenExpired: jest.fn(),
      clearTokens: jest.fn(),
      hasValidTokens: jest.fn(),
    };

    store = createAuthStore({
      persist: false,
      tokenStorage: mockTokenStorage,
    });
  });

  describe('setLoading', () => {
    it('should set status to loading', () => {
      store.getState().setLoading();
      const state = store.getState();

      expect(state.status).toBe('loading');
      expect(state.isAuthenticating).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('setAuthUser', () => {
    it('should set authenticated user with tokens', () => {
      const beforeTime = Date.now();

      store.getState().setAuthUser(
        mockUser,
        'access_token_123',
        'refresh_token_123',
        3600
      );

      const afterTime = Date.now();
      const state = store.getState();

      expect(state.status).toBe('authenticated');
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('access_token_123');
      expect(state.refreshToken).toBe('refresh_token_123');
      expect(state.isAuthenticating).toBe(false);
      expect(state.error).toBeNull();

      // 验证过期时间计算
      expect(state.tokenExpiresAt).toBeGreaterThanOrEqual(beforeTime + 3600 * 1000);
      expect(state.tokenExpiresAt).toBeLessThanOrEqual(afterTime + 3600 * 1000);

      // 验证 Token 存储同步
      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith({
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        token_type: 'Bearer',
        expires_in: 3600,
      });
    });

    it('should handle multiple authentications', () => {
      store.getState().setAuthUser(mockUser, 'token1', 'refresh1', 3600);
      expect(store.getState().accessToken).toBe('token1');

      store.getState().setAuthUser(mockUser, 'token2', 'refresh2', 7200);
      expect(store.getState().accessToken).toBe('token2');
      expect(store.getState().refreshToken).toBe('refresh2');
    });
  });

  describe('updateAccessToken', () => {
    it('should update access token and expiration', () => {
      store.getState().setAuthUser(mockUser, 'old_access', 'refresh', 3600);

      const beforeTime = Date.now();
      store.getState().updateAccessToken('new_access', 7200);
      const afterTime = Date.now();

      const state = store.getState();

      expect(state.accessToken).toBe('new_access');
      expect(state.refreshToken).toBe('refresh'); // 不变
      expect(state.user).toEqual(mockUser); // 不变
      expect(state.tokenExpiresAt).toBeGreaterThanOrEqual(beforeTime + 7200 * 1000);
      expect(state.tokenExpiresAt).toBeLessThanOrEqual(afterTime + 7200 * 1000);
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth data', () => {
      store.getState().setAuthUser(mockUser, 'access', 'refresh', 3600);
      expect(store.getState().status).toBe('authenticated');

      store.getState().clearAuth();
      const state = store.getState();

      expect(state.status).toBe('unauthenticated');
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.tokenExpiresAt).toBeNull();
      expect(state.isAuthenticating).toBe(false);
      expect(state.error).toBeNull();

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('should handle clear when already unauthenticated', () => {
      store.getState().clearAuth(); // 未认证状态调用
      const state = store.getState();

      expect(state.status).toBe('unauthenticated');
      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });
  });
});

describe('Auth Store - Error Handling', () => {
  let store: AuthStore;

  beforeEach(() => {
    store = createAuthStore({ persist: false });
  });

  it('should set error and update status', () => {
    const error = {
      type: AuthErrorType.INVALID_CREDENTIALS,
      message: 'Invalid username or password',
    };

    store.getState().setError(error);
    const state = store.getState();

    expect(state.error).toEqual(error);
    expect(state.status).toBe('unauthenticated');
    expect(state.isAuthenticating).toBe(false);
  });

  it('should clear error', () => {
    store.getState().setError({
      type: AuthErrorType.NETWORK_ERROR,
      message: 'Network error',
    });

    store.getState().clearError();
    expect(store.getState().error).toBeNull();
  });

  it('should handle error updates', () => {
    store.getState().setError({
      type: AuthErrorType.INVALID_CREDENTIALS,
      message: 'Error 1',
    });

    store.getState().setError({
      type: AuthErrorType.USER_INACTIVE,
      message: 'Error 2',
    });

    expect(store.getState().error?.message).toBe('Error 2');
    expect(store.getState().error?.type).toBe(AuthErrorType.USER_INACTIVE);
  });
});

describe('Auth Store - State Serialization', () => {
  let store: AuthStore;

  beforeEach(() => {
    store = createAuthStore({ persist: false });
  });

  describe('toJSON', () => {
    it('should serialize default state', () => {
      const json = store.getState().toJSON();

      expect(json).toEqual({
        status: 'unauthenticated',
        user: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        error: null,
        isAuthenticating: false,
      });
    });

    it('should serialize authenticated state', () => {
      store.getState().setAuthUser(
        {
          id: 1,
          username: 'test',
          email: 'test@example.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        'access',
        'refresh',
        3600
      );

      const json = store.getState().toJSON();

      expect(json.status).toBe('authenticated');
      expect(json.user).toBeDefined();
      expect(json.accessToken).toBe('access');
      expect(json.refreshToken).toBe('refresh');
      expect(json.tokenExpiresAt).toBeDefined();
    });

    it('should return immutable object', () => {
      const json1 = store.getState().toJSON();
      const json2 = store.getState().toJSON();

      expect(json1).toEqual(json2);
      expect(json1).not.toBe(json2);
    });
  });

  describe('fromJSON', () => {
    it('should restore authenticated state', () => {
      const partialState = {
        status: 'authenticated' as const,
        user: {
          id: 1,
          username: 'test',
          email: 'test@example.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        accessToken: 'access123',
        refreshToken: 'refresh123',
      };

      store.getState().fromJSON(partialState);
      const state = store.getState();

      expect(state.status).toBe('authenticated');
      expect(state.user?.username).toBe('test');
      expect(state.accessToken).toBe('access123');
    });

    it('should handle empty state', () => {
      store.getState().setAuthUser(
        {
          id: 1,
          username: 'test',
          email: 'test@example.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        'access',
        'refresh',
        3600
      );

      store.getState().fromJSON({});
      const state = store.getState();

      // 空对象不改变状态
      expect(state.status).toBe('authenticated');
    });

    it('should handle partial state update', () => {
      store.getState().setAuthUser(
        {
          id: 1,
          username: 'test',
          email: 'test@example.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        'access1',
        'refresh1',
        3600
      );

      store.getState().fromJSON({ accessToken: 'access2' });
      const state = store.getState();

      expect(state.accessToken).toBe('access2');
      expect(state.refreshToken).toBe('refresh1'); // 不变
      expect(state.user?.username).toBe('test'); // 不变
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      store.getState().setLoading();
      store.getState().setAuthUser(
        {
          id: 1,
          username: 'test',
          email: 'test@example.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        'access',
        'refresh',
        3600
      );

      store.getState().reset();
      const state = store.getState();

      expect(state).toMatchObject(INITIAL_AUTH_STATE);
    });

    it('should handle reset when already at initial state', () => {
      const beforeState = store.getState();

      store.getState().reset();
      const afterState = store.getState();

      expect(beforeState).toEqual(afterState);
    });
  });
});

describe('Auth Store - Edge Cases', () => {
  let store: AuthStore;

  beforeEach(() => {
    store = createAuthStore({ persist: false });
  });

  it('should handle rapid state changes', () => {
    for (let i = 0; i < 100; i++) {
      store.getState().setLoading();
      store.getState().clearError();
    }

    const state = store.getState();
    expect(state.status).toBe('loading');
    expect(state.isAuthenticating).toBe(true);
  });

  it('should handle special characters in user data', () => {
    const specialUser: UserResponse = {
      id: 1,
      username: 'user<script>alert("XSS")</script>',
      email: 'test+tag@example.com',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    };

    store.getState().setAuthUser(specialUser, 'access', 'refresh', 3600);

    expect(store.getState().user?.username).toContain('<script>');
  });

  it('should handle very long tokens', () => {
    const longToken = 'a'.repeat(10000);

    store.getState().setAuthUser(
      {
        id: 1,
        username: 'test',
        email: 'test@example.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
      longToken,
      'refresh',
      3600
    );

    expect(store.getState().accessToken).toBe(longToken);
  });
});
```

---

## 6. 集成与导出

### 6.1 更新 `types/index.ts`
```typescript
/**
 * 类型定义统一导出
 */

// API 类型
export * from './api';

// 业务模型
export * from './models';

// 认证类型
export * from './auth';

// 常用联合类型
export type Status = 'pending' | 'in_progress' | 'completed';
export type Priority = 'low' | 'medium' | 'high';
```

### 6.2 创建 `lib/storage/index.ts`
```typescript
/**
 * 存储工具统一导出
 */

export * from './token-storage';
```

### 6.3 更新 `store/index.ts`
```typescript
/**
 * Store 统一导出
 */

export * from './ui-store';
export * from './auth-store';
export * from './auth-store-types';

// 导出默认 Store 单例
export { authStore } from './auth-store';
export { uiStore } from './ui-store';
```

---

## 7. 实施检查清单

### Phase 1: 类型定义（30 分钟）
- [ ] 创建 `types/auth.ts`，定义所有认证相关类型
- [ ] 更新 `types/index.ts`，导出认证类型
- [ ] 验证类型与后端 API 契约一致

### Phase 2: Token 存储（1 小时）
- [ ] 实现 `lib/storage/token-storage.ts`
- [ ] 编写 `lib/storage/__tests__/token-storage.test.ts`
- [ ] 运行测试，确保覆盖率 >= 90%
- [ ] 创建 `lib/storage/index.ts`，导出 TokenStorage

### Phase 3: 认证 Store（2 小时）
- [ ] 创建 `store/auth-store-types.ts`
- [ ] 实现 `store/auth-store.ts`
- [ ] 编写 `store/__tests__/auth-store.test.ts`
- [ ] 运行测试，确保覆盖率 >= 90%
- [ ] 更新 `store/index.ts`，导出 auth-store

### Phase 4: 集成验证（30 分钟）
- [ ] 验证所有 TypeScript 类型检查通过
- [ ] 运行 `npm run test:coverage`，确认整体覆盖率
- [ ] 运行 `npm run lint`，确保代码风格一致
- [ ] 更新 `frontend/README.md`（如需要）

---

## 8. 依赖与兼容性

### 8.1 依赖包
```json
{
  "dependencies": {
    "zustand": "^5.0.11",
    "immer": "^11.1.4"
  },
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "@testing-library/jest-dom": "^6.9.1",
    "typescript": "^5"
  }
}
```

### 8.2 浏览器兼容性
- **localStorage**: 需要 IE8+（现代浏览器全支持）
- **Zustand**: 需要 ES2022+ 支持
- **Immer**: 需要 ES5+ 支持

### 8.3 TypeScript 配置
无需修改现有 `tsconfig.json`，当前配置已满足：
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`

---

## 9. 注意事项

### 9.1 安全考虑
1. **XSS 防护** - localStorage 可被 JavaScript 访问，需确保:
   - 不在 Token 中存储敏感信息（应已在后端实现）
   - 使用 CSP（Content Security Policy）限制脚本执行
   - 考虑使用 httpOnly cookie（后端已实现，前端仍需 localStorage 用于请求）

2. **CSRF 防护** - 后端应实现 CSRF Token 验证（由 Issue #89 处理）

3. **Token 过期处理** - 前端需定期检查 Token 过期时间，及时刷新或登出

### 9.2 SSR 兼容性
- Next.js SSR 环境下 `localStorage` 不存在
- `token-storage.ts` 必须处理 `typeof window === 'undefined'` 的情况
- 建议：延迟初始化 authStore（在客户端组件中）

### 9.3 测试注意事项
1. **Mock localStorage** - 使用 `jest.mock` 或手动创建 mock 对象
2. **隔离测试** - 每个测试前调用 `beforeEach` 重置状态
3. **异步测试** - Token 过期计算涉及 `Date.now()`，需注意时序问题

### 9.4 与后续 Issue 的协同
- **Issue #98** (认证 API 客户端) - 将使用本 Store 的 `setAuthUser`、`setError` 等 actions
- **Issue #99** (登录页面) - 将调用本 Store 的 actions
- **Issue #100** (注册页面) - 将调用本 Store 的 actions

---

## 10. 附录

### 10.1 后端 API 端点完整定义
参考文件：`/workspace/src/backend/app/api/v1/auth.py`

| 端点 | 方法 | 请求体 | 响应体 | 错误码 |
|------|------|--------|--------|--------|
| `/api/v1/auth/register` | POST | `RegisterRequest` | `RegisterResponse { user, tokens }` | 409 (冲突) |
| `/api/v1/auth/login` | POST | `LoginRequest` | `LoginResponse { user, tokens }` | 401 (凭证无效), 403 (账户未激活) |
| `/api/v1/auth/me` | GET | - (需 Authorization Header) | `UserResponse` | 401 (Token 无效) |

### 10.2 参考资料
- [Zustand 官方文档](https://github.com/pmndrs/zustand)
- [Immer 官方文档](https://immerjs.github.io/immer/)
- [Jest 官方文档](https://jestjs.io/)
- [Testing Library 官方文档](https://testing-library.com/)

### 10.3 代码风格检查
遵循现有 `.eslintrc.json` 和 `.prettierrc.json` 配置。

---

## 签署

**架构师**: Claude Sonnet 4.5
**创建时间**: 2026-02-27
**适用 Issue**: #97
**状态**: 待实施

**备注**: 本蓝图定义了前端认证状态管理的基础架构，所有接口签名、类型定义和测试规范已明确。task-developer 应严格按照此蓝图实施，确保代码风格与现有 `ui-store.ts` 保持一致。
