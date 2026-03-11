# 用户资料页面开发蓝图

**Issue**: #171 (父 Issue)
**子任务**:
- #173: 前端 API 扩展
- #174: UI 组件开发
- #175: 页面集成与测试

**架构师**: task-architect
**日期**: 2026-03-11

---

## 1. 架构概览

### 1.1 文件结构

```
frontend/src/
├── types/
│   └── auth.ts                    # [修改] 添加 UserUpdateRequest/Response
├── lib/
│   ├── api/
│   │   └── auth-api.ts            # [修改] 添加 updateProfile() 方法
│   └── validation/
│       └── profile-validation.ts  # [新建] 用户资料验证规则
├── components/
│   └── profile/
│       ├── UserInfoCard.tsx       # [新建] 用户信息展示卡片
│       ├── ProfileForm.tsx        # [新建] 资料编辑表单
│       └── index.ts               # [新建] 导出文件
└── app/
    └── profile/
        └── page.tsx               # [新建] 用户资料页面
```

### 1.2 数据流

```
[ProfilePage]
    │
    ├── 加载阶段 ──► [authApi.getCurrentUser()] ──► [authStore.user]
    │                                                   │
    │                                                   ▼
    │                                           [UserInfoCard] (展示)
    │
    └── 编辑阶段 ──► [ProfileForm]
                          │
                          ├── 验证 ──► [ProfileValidator]
                          │
                          └── 提交 ──► [authApi.updateProfile()]
                                            │
                                            ▼
                                      [authStore.user] (更新)
```

---

## 2. 类型定义 (TypeScript Interfaces)

### 2.1 请求/响应模型

**文件**: `frontend/src/types/auth.ts`

```typescript
// ============================================================================
// 用户资料更新相关类型 (新增)
// ============================================================================

/**
 * 用户资料更新请求模型
 * 对应后端 UserUpdateRequest schema
 */
export interface UserUpdateRequest {
  /** 用户名 (可选, 3-50 字符) */
  username?: string;
  /** 邮箱地址 (可选) */
  email?: string;
}

/**
 * 用户资料更新响应模型
 * 对应后端 UserResponse schema (与 getCurrentUser 返回类型一致)
 */
export type UserUpdateResponse = UserResponse;

/**
 * 用户资料表单数据
 * 用于 ProfileForm 组件内部状态管理
 */
export interface ProfileFormData {
  /** 用户名 */
  username: string;
  /** 邮箱地址 */
  email: string;
}

/**
 * 用户资料表单错误
 */
export interface ProfileFormErrors {
  /** 用户名错误 */
  username?: string;
  /** 邮箱错误 */
  email?: string;
}
```

### 2.2 API 错误类型扩展

```typescript
/**
 * API 错误响应类型 (扩展现有定义)
 */
export interface ApiErrorResponse {
  /** 错误详情 */
  detail: string;
  /** 冲突字段 (用于 409 错误) */
  field?: 'username' | 'email';
}

/**
 * 用户资料更新错误类型枚举
 */
export enum ProfileUpdateErrorType {
  /** 用户名已存在 */
  USERNAME_EXISTS = 'USERNAME_EXISTS',
  /** 邮箱已存在 */
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 验证错误 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 未认证 */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** 未知错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

---

## 3. API 层设计

### 3.1 AuthApi 扩展

**文件**: `frontend/src/lib/api/auth-api.ts`

```typescript
// ============================================================================
// 新增方法 (添加到现有 AuthApi 类中)
// ============================================================================

/**
 * 更新当前用户资料
 *
 * 对应后端：PATCH /api/v1/auth/me
 *
 * @param data - 更新数据 (username 和/或 email)
 * @returns 更新后的用户信息
 * @throws {Error} 更新失败时抛出异常
 *
 * @example
 * ```ts
 * // 仅更新用户名
 * const user = await authApi.updateProfile({ username: 'newname' });
 *
 * // 同时更新用户名和邮箱
 * const user = await authApi.updateProfile({
 *   username: 'newname',
 *   email: 'new@email.com'
 * });
 * ```
 */
async updateProfile(data: UserUpdateRequest): Promise<UserUpdateResponse> {
  // 实现待补充 (task-developer)
  // 步骤 1: 调用 this.httpClient.patch<UserUpdateResponse>('/api/v1/auth/me', data)
  // 步骤 2: 更新 authStore.user (可选, 通过外部回调或 store 方法)
  // 步骤 3: 返回更新后的用户信息
  throw new Error('Not implemented');
}
```

### 3.2 错误处理策略

```typescript
/**
 * 用户资料更新错误处理映射
 */
const PROFILE_UPDATE_ERROR_MESSAGES: Record<string, string> = {
  USERNAME_EXISTS: '该用户名已被使用',
  EMAIL_EXISTS: '该邮箱已被注册',
  NETWORK_ERROR: '网络连接失败，请稍后重试',
  VALIDATION_ERROR: '输入信息格式不正确',
  UNAUTHORIZED: '请先登录后再试',
  UNKNOWN_ERROR: '更新失败，请稍后重试',
};

/**
 * 解析 API 错误响应
 *
 * @param error - 捕获的错误对象
 * @returns 用户友好的错误消息
 */
function parseUpdateError(error: unknown): string {
  // 实现待补充 (task-developer)
  // 解析 409 Conflict 错误的 field 字段
  // 解析 400 Validation 错误
  // 返回对应的中文错误消息
  throw new Error('Not implemented');
}
```

---

## 4. 验证层设计

### 4.1 ProfileValidator 类

**文件**: `frontend/src/lib/validation/profile-validation.ts`

```typescript
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
 * 邮箱正则表达式
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    // 实现待补充 (task-developer)
    throw new Error('Not implemented');
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
    // 实现待补充 (task-developer)
    throw new Error('Not implemented');
  }

  /**
   * 验证整个表单
   *
   * @param data - 表单数据
   * @returns 表单验证结果
   */
  static validateForm(data: ProfileFormData): ProfileFormValidation {
    // 实现待补充 (task-developer)
    throw new Error('Not implemented');
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
```

---

## 5. 组件设计

### 5.1 UserInfoCard 组件

**文件**: `frontend/src/components/profile/UserInfoCard.tsx`

```typescript
/**
 * 用户信息展示卡片组件
 *
 * 功能:
 * - 展示用户基本信息 (用户名、邮箱、注册时间)
 * - 提供编辑按钮切换到编辑模式
 * - 支持加载状态和骨架屏
 *
 * @module frontend/src/components/profile/UserInfoCard
 */

import type { UserResponse } from '@/types/auth';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * UserInfoCard Props
 */
export interface UserInfoCardProps {
  /** 用户信息 */
  user: UserResponse;
  /** 是否处于编辑模式 */
  isEditing?: boolean;
  /** 编辑按钮点击回调 */
  onEditClick?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// 组件实现
// ============================================================================

/**
 * 用户信息展示卡片
 *
 * @example
 * ```tsx
 * <UserInfoCard
 *   user={authStore.user}
 *   isEditing={false}
 *   onEditClick={() => setIsEditing(true)}
 * />
 * ```
 */
export function UserInfoCard({
  user,
  isEditing = false,
  onEditClick,
  className,
}: UserInfoCardProps): JSX.Element {
  // 实现待补充 (task-developer)
  // 渲染:
  // - Card 容器
  // - 用户头像 (可选, 使用首字母占位)
  // - 用户名
  // - 邮箱
  // - 注册时间 (格式化显示)
  // - 编辑按钮 (非编辑模式时显示)
  throw new Error('Not implemented');
}
```

### 5.2 ProfileForm 组件

**文件**: `frontend/src/components/profile/ProfileForm.tsx`

```typescript
/**
 * 用户资料编辑表单组件
 *
 * 功能:
 * - 渲染用户名和邮箱输入框
 * - 实时表单验证
 * - 提交处理
 * - 加载状态显示
 * - 错误提示
 * - 取消编辑恢复原始数据
 *
 * @module frontend/src/components/profile/ProfileForm
 */

import { useState, useCallback, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Button, Input, Alert, Spinner } from '@/components/ui';
import { ProfileValidator } from '@/lib/validation/profile-validation';
import type {
  UserResponse,
  UserUpdateRequest,
  ProfileFormData,
  ProfileFormErrors,
} from '@/types/auth';
import type { AuthApi } from '@/lib/api/auth-api';
import type { AuthStore } from '@/store/auth/auth-store-types';
import { cn } from '@/lib/utils';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 触碰状态 (字段是否被用户交互过)
 */
interface TouchedState {
  username: boolean;
  email: boolean;
}

/**
 * ProfileForm Props
 */
export interface ProfileFormProps {
  /** 当前用户信息 (用于初始化表单) */
  user: UserResponse;
  /** AuthApi 实例 (可选, 用于测试) */
  authApi?: AuthApi;
  /** AuthStore 实例 (可选, 用于测试) */
  authStore?: AuthStore;
  /** 更新成功回调 */
  onSuccess?: (user: UserResponse) => void;
  /** 更新失败回调 */
  onError?: (error: Error) => void;
  /** 取消编辑回调 */
  onCancel?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// 组件实现
// ============================================================================

/**
 * 用户资料编辑表单
 *
 * @example
 * ```tsx
 * <ProfileForm
 *   user={authStore.user}
 *   onSuccess={(user) => {
 *     console.log('更新成功:', user);
 *     setIsEditing(false);
 *   }}
 *   onCancel={() => setIsEditing(false)}
 * />
 * ```
 */
export function ProfileForm({
  user,
  authApi: injectedAuthApi,
  authStore: injectedAuthStore,
  onSuccess,
  onError,
  onCancel,
  className,
}: ProfileFormProps): JSX.Element {
  // ----------------------------------------------------------------------
  // 状态管理
  // ----------------------------------------------------------------------

  /** 表单字段值 */
  const [formData, setFormData] = useState<ProfileFormData>({
    username: user.username,
    email: user.email,
  });

  /** 原始数据 (用于取消时恢复) */
  const [originalData] = useState<ProfileFormData>({
    username: user.username,
    email: user.email,
  });

  /** 字段级验证错误 */
  const [fieldErrors, setFieldErrors] = useState<ProfileFormErrors>({});

  /** 表单触碰状态 */
  const [touched, setTouched] = useState<TouchedState>({
    username: false,
    email: false,
  });

  /** 提交状态 */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 提交级别的错误 */
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // 验证逻辑
  // ----------------------------------------------------------------------

  /**
   * 验证单个字段
   */
  const validateField = useCallback(
    (field: keyof ProfileFormErrors, value: string) => {
      // 实现待补充 (task-developer)
      throw new Error('Not implemented');
    },
    []
  );

  /**
   * 验证整个表单
   */
  const validateForm = useCallback((): boolean => {
    // 实现待补充 (task-developer)
    throw new Error('Not implemented');
  }, [formData]);

  // ----------------------------------------------------------------------
  // 事件处理
  // ----------------------------------------------------------------------

  /**
   * 字段变更处理
   */
  const handleFieldChange = (
    field: keyof typeof touched,
    value: string
  ) => {
    // 实现待补充 (task-developer)
    throw new Error('Not implemented');
  };

  /**
   * 字段失焦处理
   */
  const handleFieldBlur = (field: keyof typeof touched) => {
    // 实现待补充 (task-developer)
    throw new Error('Not implemented');
  };

  /**
   * 表单提交处理
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    // 实现待补充 (task-developer)
    // 步骤 1: 阻止默认提交
    // 步骤 2: 清除提交错误
    // 步骤 3: 标记所有字段为已触碰
    // 步骤 4: 验证表单
    // 步骤 5: 检查是否有变更 (ProfileValidator.hasChanges)
    // 步骤 6: 调用 authApi.updateProfile()
    // 步骤 7: 更新 authStore.user (可选)
    // 步骤 8: 触发成功回调
    throw new Error('Not implemented');
  };

  /**
   * 取消编辑处理
   */
  const handleCancel = () => {
    // 实现待补充 (task-developer)
    // 恢复原始数据
    // 清除错误
    // 触发取消回调
    throw new Error('Not implemented');
  };

  // ----------------------------------------------------------------------
  // 渲染
  // ----------------------------------------------------------------------

  /** 计算是否有变更 */
  const hasChanges = ProfileValidator.hasChanges(originalData, formData);

  /** 计算表单是否有效 */
  const isFormValid =
    formData.username !== '' &&
    formData.email !== '' &&
    Object.keys(fieldErrors).length === 0 &&
    hasChanges;

  return (
    <form
      role="form"
      aria-labelledby="profile-form-title"
      onSubmit={handleSubmit}
      noValidate
      className={cn('profile-form', className)}
    >
      {/* 实现待补充 (task-developer) */}
      {/* 用户名输入框 */}
      {/* 邮箱输入框 */}
      {/* 提交错误提示 */}
      {/* 操作按钮 (保存/取消) */}
      throw new Error('Not implemented');
    </form>
  );
}
```

---

## 6. 页面集成设计

### 6.1 ProfilePage 页面

**文件**: `frontend/src/app/profile/page.tsx`

```typescript
/**
 * 用户资料页面
 *
 * 功能:
 * - 使用 withAuthGuard HOC 保护路由
 * - 展示用户信息卡片
 * - 支持编辑模式切换
 * - 数据加载状态处理
 *
 * @module frontend/src/app/profile/page
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { withAuthGuard } from '@/lib/auth/guards';
import { authStore } from '@/store/auth/auth-store';
import { authApi } from '@/lib/api/endpoints';
import { UserInfoCard } from '@/components/profile/UserInfoCard';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { Spinner } from '@/components/ui';
import type { UserResponse } from '@/types/auth';

// ============================================================================
// 内部页面组件 (未保护)
// ============================================================================

/**
 * 用户资料页面内部组件
 */
function ProfilePageInternal(): JSX.Element {
  // ----------------------------------------------------------------------
  // 状态管理
  // ----------------------------------------------------------------------

  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // 数据加载
  // ----------------------------------------------------------------------

  /**
   * 加载用户信息
   */
  const loadUser = useCallback(async () => {
    // 实现待补充 (task-developer)
    // 从 authStore 获取用户信息
    // 如果 store 中没有, 调用 authApi.getCurrentUser()
    // 更新本地状态
    throw new Error('Not implemented');
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // ----------------------------------------------------------------------
  // 事件处理
  // ----------------------------------------------------------------------

  /**
   * 更新成功处理
   */
  const handleUpdateSuccess = (updatedUser: UserResponse) => {
    // 实现待补充 (task-developer)
    // 更新本地状态
    // 更新 authStore.user
    // 退出编辑模式
    throw new Error('Not implemented');
  };

  /**
   * 更新失败处理
   */
  const handleUpdateError = (error: Error) => {
    // 实现待补充 (task-developer)
    // 设置错误状态
    // 可选: 显示 Toast 提示
    throw new Error('Not implemented');
  };

  // ----------------------------------------------------------------------
  // 渲染
  // ----------------------------------------------------------------------

  // 加载状态
  if (isLoading) {
    return (
      <div className="profile-page-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="profile-page-error">
        <p>{error}</p>
        <button onClick={loadUser}>重试</button>
      </div>
    );
  }

  // 无用户数据
  if (!user) {
    return (
      <div className="profile-page-empty">
        <p>无法加载用户信息</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h1 className="profile-page-title">个人资料</h1>

      {isEditing ? (
        <ProfileForm
          user={user}
          onSuccess={handleUpdateSuccess}
          onError={handleUpdateError}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <UserInfoCard
          user={user}
          isEditing={false}
          onEditClick={() => setIsEditing(true)}
        />
      )}
    </div>
  );
}

// ============================================================================
// 导出 (使用 withAuthGuard 保护)
// ============================================================================

/**
 * 用户资料页面 (已保护)
 */
const ProfilePage = withAuthGuard(ProfilePageInternal, {
  redirectTo: '/login',
  showLoading: true,
});

export default ProfilePage;
```

---

## 7. 测试规划

### 7.1 单元测试范围

| 模块 | 测试文件 | 测试重点 |
|------|----------|----------|
| ProfileValidator | `profile-validation.test.ts` | 验证规则、边界条件、错误消息 |
| ProfileForm | `ProfileForm.test.tsx` | 表单交互、验证、提交、错误处理 |
| UserInfoCard | `UserInfoCard.test.tsx` | 数据展示、编辑按钮交互 |
| AuthApi.updateProfile | `auth-api.test.ts` (扩展) | API 调用、错误处理、Token 更新 |

### 7.2 集成测试范围

- 页面加载流程: 未登录重定向、数据加载
- 编辑流程: 切换编辑模式、表单验证、提交成功/失败
- 数据同步: authStore 状态更新、页面状态同步

### 7.3 E2E 测试场景

- 完整资料更新流程
- 冲突错误处理 (用户名/邮箱已存在)
- 网络错误恢复

---

## 8. 依赖关系

```
#173 (API 扩展)
    │
    ├──► 无前置依赖
    │
    └──► 被 #174 依赖

#174 (UI 组件)
    │
    ├──► 依赖 #173 (API 扩展)
    │
    └──► 被 #175 依赖

#175 (页面集成)
    │
    ├──► 依赖 #174 (UI 组件)
    │
    └──► 无后续依赖
```

---

## 9. 技术规范

### 9.1 命名约定

- 组件: PascalCase (如 `ProfileForm`)
- 文件: kebab-case (如 `profile-validation.ts`)
- 类型/接口: PascalCase (如 `UserUpdateRequest`)
- 常量: UPPER_SNAKE_CASE (如 `USERNAME_MIN_LENGTH`)

### 9.2 代码风格

- 使用 TypeScript 严格模式
- 遵循现有项目的 ESLint 配置
- 组件使用函数式组件 + Hooks
- 状态管理使用 Zustand (与现有架构一致)

### 9.3 验证规则对齐

| 字段 | 前端规则 | 后端规则 | 状态 |
|------|----------|----------|------|
| username | 3-50字符, 字母数字下划线连字符 | 3-50字符, 同左 | 一致 |
| email | 标准邮箱格式 | EmailStr | 一致 |

---

## 10. 附录: 完整类型导出

```typescript
// types/auth.ts (新增导出)
export type { UserUpdateRequest, UserUpdateResponse, ProfileFormData, ProfileFormErrors };
export { ProfileUpdateErrorType };
```

```typescript
// lib/api/auth-api.ts (新增方法签名)
export interface AuthApi {
  login(usernameOrEmail: string, password: string): Promise<LoginResponse>;
  register(username: string, email: string, password: string): Promise<RegisterResponse>;
  refreshToken(): Promise<TokenResponse>;
  getCurrentUser(): Promise<UserResponse>;
  updateProfile(data: UserUpdateRequest): Promise<UserUpdateResponse>; // 新增
}
```

```typescript
// components/profile/index.ts (导出文件)
export { UserInfoCard } from './UserInfoCard';
export type { UserInfoCardProps } from './UserInfoCard';
export { ProfileForm } from './ProfileForm';
export type { ProfileFormProps } from './ProfileForm';
```