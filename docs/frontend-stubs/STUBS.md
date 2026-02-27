# 前端项目代码存根 (Stubs)

> **实施指南** - 这些是代码骨架，供开发人员直接填充实现
>
> **创建时间**: 2026-02-27
> **关联蓝图**: `/workspace/docs/frontend-blueprint.md`

---

## 文件说明

以下文件均为存根代码，**仅定义结构**，不包含业务逻辑实现。开发人员应基于这些骨架填充具体实现。

---

## 1. 类型定义

### `/workspace/frontend/src/types/api.ts`

```typescript
/**
 * API 通用类型定义
 */

// HTTP 方法
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// 通用 API 响应结构
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

// 分页参数
export interface PaginationParams {
  page: number;
  page_size: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// API 错误响应
export interface ApiError {
  detail: string;
  status: number;
  error_code?: string;
}

// 健康检查响应 (对应后端 HealthCheckResponse)
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  database: {
    status: 'healthy' | 'unhealthy';
    message?: string;
  };
  redis: {
    status: 'healthy' | 'unhealthy';
    message?: string;
  };
}
```

### `/workspace/frontend/src/types/models.ts`

```typescript
/**
 * 业务实体类型定义
 */

// 用户模型 (对应后端 User)
export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 任务模型 (对应后端 Task)
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
  user_id: number;
}

// 内容模型 (对应后端 Content)
export interface Content {
  id: number;
  title: string;
  body: string;
  summary?: string;
  source_url?: string;
  author?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}
```

### `/workspace/frontend/src/types/index.ts`

```typescript
/**
 * 类型定义统一导出
 */

// API 类型
export * from './api';

// 业务模型
export * from './models';

// 常用联合类型
export type Status = 'pending' | 'in_progress' | 'completed';
export type Priority = 'low' | 'medium' | 'high';
```

---

## 2. 配置文件

### `/workspace/frontend/src/lib/config.ts`

```typescript
/**
 * 环境变量验证和类型安全访问
 */

// 环境变量验证函数
function validateEnv(requiredVars: Record<string, string>): void {
  const missing: string[] = [];

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// 公共配置 (客户端可访问)
export const publicConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Scryer',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',
  environment: (process.env.NEXT_PUBLIC_ENVIRONMENT as 'development' | 'production' | 'testing') ?? 'development',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
  apiTimeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,
  debugEnabled: process.env.NEXT_PUBLIC_DEBUG_ENABLED === 'true',
  defaultTheme: (process.env.NEXT_PUBLIC_DEFAULT_THEME as 'light' | 'dark' | 'system') ?? 'system',
};

// 验证配置
if (typeof window === 'undefined') {
  // 服务端验证 (仅在构建时)
  validateEnv({
    NEXT_PUBLIC_API_URL: publicConfig.apiUrl,
  });
}

// 配置类型导出
export type PublicConfig = typeof publicConfig;
```

### `/workspace/frontend/src/lib/constants.ts`

```typescript
/**
 * 应用常量定义
 */

// API 相关常量
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  USERS: '/api/users',
  TASKS: '/api/tasks',
} as const;

// HTTP 状态码
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// 分页默认值
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
} as const;

// 本地存储键
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'scryer_auth_token',
  USER_PREFERENCES: 'scryer_user_preferences',
  THEME: 'scryer_theme',
} as const;
```

---

## 3. 工具函数

### `/workspace/frontend/src/lib/utils/cn.ts`

```typescript
/**
 * className 合并工具
 * 使用 clsx 和 tailwind-merge 合并类名
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 TailwindCSS 类名
 * @param inputs - 类名数组
 * @returns 合并后的类名字符串
 *
 * @example
 * cn('px-2', 'px-4') // => 'px-4' (后者覆盖前者)
 */
export function cn(...inputs: Class[]): string {
  return twMerge(clsx(inputs));
}
```

### `/workspace/frontend/src/lib/utils/format.ts`

```typescript
/**
 * 格式化工具函数
 */

/**
 * 格式化日期为本地字符串
 * @param date - 日期字符串或 Date 对象
 * @param locale - 地区代码，默认 'zh-CN'
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: string | Date, locale = 'zh-CN'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale);
}

/**
 * 格式化日期时间为本地字符串
 * @param date - 日期字符串或 Date 对象
 * @param locale - 地区代码，默认 'zh-CN'
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(date: string | Date, locale = 'zh-CN'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString(locale);
}

/**
 * 截断文本
 * @param text - 原始文本
 * @param maxLength - 最大长度
 * @param suffix - 后缀，默认 '...'
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}
```

### `/workspace/frontend/src/lib/utils/validation.ts`

```typescript
/**
 * 验证工具函数
 */

/**
 * 验证邮箱格式
 * @param email - 邮箱地址
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证 URL 格式
 * @param url - URL 字符串
 * @returns 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证字符串长度
 * @param str - 输入字符串
 * @param min - 最小长度
 * @param max - 最大长度
 * @returns 是否有效
 */
export function isValidLength(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}
```

---

## 4. API 客户端

### `/workspace/frontend/src/lib/api/client.ts`

```typescript
/**
 * 基础 HTTP 客户端
 * 封装 fetch API，提供统一的请求处理和错误处理
 */

import type { ApiResponse, ApiError } from '@/types';
import { publicConfig } from '@/lib/config';

/**
 * HTTP 客户端类
 */
export class HttpClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL = publicConfig.apiUrl, timeout = publicConfig.apiTimeout) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * 发起 HTTP 请求
   * @param endpoint - API 端点
   * @param options - 请求选项
   * @returns Promise<T>
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.detail || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * GET 请求
   * @param endpoint - API 端点
   * @param params - 查询参数
   * @returns Promise<T>
   */
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const url = params ? `${endpoint}?${new URLSearchParams(params as Record<string, string>)}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * POST 请求
   * @param endpoint - API 端点
   * @param data - 请求体数据
   * @returns Promise<T>
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT 请求
   * @param endpoint - API 端点
   * @param data - 请求体数据
   * @returns Promise<T>
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH 请求
   * @param endpoint - API 端点
   * @param data - 请求体数据
   * @returns Promise<T>
   */
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE 请求
   * @param endpoint - API 端点
   * @returns Promise<T>
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// 默认客户端实例
export const apiClient = new HttpClient();
```

### `/workspace/frontend/src/lib/api/endpoints.ts`

```typescript
/**
 * API 端点定义
 * 提供类型安全的 API 调用接口
 */

import { apiClient } from './client';
import type { HealthCheckResponse, User, Task, PaginatedResponse } from '@/types';
import type { PaginationParams } from '@/types';

/**
 * 健康检查 API
 */
export const healthApi = {
  /**
   * 获取系统健康状态
   * @returns Promise<HealthCheckResponse>
   */
  get: (): Promise<HealthCheckResponse> =>
    apiClient.get<HealthCheckResponse>('/api/health'),
};

/**
 * 用户 API
 */
export const usersApi = {
  /**
   * 获取用户列表
   * @param params - 分页参数
   * @returns Promise<PaginatedResponse<User>>
   */
  list: (params: PaginationParams): Promise<PaginatedResponse<User>> =>
    apiClient.get<PaginatedResponse<User>>('/api/users', params),

  /**
   * 获取单个用户
   * @param id - 用户 ID
   * @returns Promise<User>
   */
  get: (id: number): Promise<User> =>
    apiClient.get<User>(`/api/users/${id}`),
};

/**
 * 任务 API
 */
export const tasksApi = {
  /**
   * 获取任务列表
   * @param params - 分页参数
   * @returns Promise<PaginatedResponse<Task>>
   */
  list: (params: PaginationParams): Promise<PaginatedResponse<Task>> =>
    apiClient.get<PaginatedResponse<Task>>('/api/tasks', params),

  /**
   * 获取单个任务
   * @param id - 任务 ID
   * @returns Promise<Task>
   */
  get: (id: number): Promise<Task> =>
    apiClient.get<Task>(`/api/tasks/${id}`),

  /**
   * 创建任务
   * @param data - 任务数据
   * @returns Promise<Task>
   */
  create: (data: Partial<Task>): Promise<Task> =>
    apiClient.post<Task>('/api/tasks', data),

  /**
   * 更新任务
   * @param id - 任务 ID
   * @param data - 更新数据
   * @returns Promise<Task>
   */
  update: (id: number, data: Partial<Task>): Promise<Task> =>
    apiClient.patch<Task>(`/api/tasks/${id}`, data),

  /**
   * 删除任务
   * @param id - 任务 ID
   * @returns Promise<void>
   */
  delete: (id: number): Promise<void> =>
    apiClient.delete<void>(`/api/tasks/${id}`),
};
```

---

## 5. React Hooks

### `/workspace/frontend/src/lib/hooks/useApi.ts`

```typescript
/**
 * API 调用 Hook
 * 提供统一的 API 调用状态管理
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * API 调用 Hook
 * @param apiFunction - API 调用函数
 * @param deps - 依赖数组
 * @returns UseApiResult<T>
 */
export function useApi<T>(
  apiFunction: () => Promise<T>,
  deps: unknown[] = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFunction();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [apiFunction]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...deps]);

  return { data, isLoading, error, refetch: fetchData };
}
```

---

## 6. UI 组件存根

### `/workspace/frontend/src/components/ui/Button.tsx`

```typescript
/**
 * 按钮组件
 */

import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

### `/workspace/frontend/src/components/ui/Input.tsx`

```typescript
/**
 * 输入框组件
 */

import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <input
        className={cn('input', error && 'input-error', className)}
        {...props}
      />
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}
```

### `/workspace/frontend/src/components/ui/Card.tsx`

```typescript
/**
 * 卡片组件
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outlined' | 'elevated';
}

export function Card({ title, children, className, variant = 'default' }: CardProps) {
  return (
    <div className={cn('card', `card-${variant}`, className)}>
      {title && <h3 className="card-title">{title}</h3>}
      <div className="card-content">{children}</div>
    </div>
  );
}
```

---

## 7. 布局组件存根

### `/workspace/frontend/src/components/layout/Header.tsx`

```typescript
/**
 * 头部组件
 */

import type { ReactNode } from 'react';

interface HeaderProps {
  logo?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
}

export function Header({ logo, nav, actions }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-logo">{logo}</div>
      <nav className="header-nav">{nav}</nav>
      <div className="header-actions">{actions}</div>
    </header>
  );
}
```

### `/workspace/frontend/src/components/layout/Footer.tsx`

```typescript
/**
 * 底部组件
 */

import type { ReactNode } from 'react';

interface FooterProps {
  copyright?: string;
  links?: ReactNode;
}

export function Footer({ copyright, links }: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-copyright">{copyright}</div>
        <div className="footer-links">{links}</div>
      </div>
    </footer>
  );
}
```

---

## 8. 应用入口存根

### `/workspace/frontend/src/app/layout.tsx`

```typescript
/**
 * 根布局组件
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Scryer',
  description: 'Scryer Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
```

### `/workspace/frontend/src/app/page.tsx`

```typescript
/**
 * 首页组件
 */

export default function HomePage() {
  return (
    <main className="main">
      <h1>Welcome to Scryer</h1>
      <p>Frontend infrastructure is ready.</p>
    </main>
  );
}
```

### `/workspace/frontend/src/app/globals.css`

```css
/**
 * 全局样式 - TailwindCSS 指令
 */

@tailwind base;
@tailwind components;
@tailwind utilities;

/* 自定义基础样式 */
@layer base {
  :root {
    --color-primary: #0ea5e9;
    --color-primary-dark: #0284c7;
  }

  body {
    @apply bg-gray-50 text-gray-900;
  }
}

/* 自定义组件样式 */
@layer components {
  /* 按钮样式 */
  .btn {
    @apply inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2;
  }

  .btn-primary {
    @apply bg-primary text-white hover:bg-primary-dark;
  }

  .btn-secondary {
    @apply bg-gray-200 text-gray-900 hover:bg-gray-300;
  }

  /* 卡片样式 */
  .card {
    @apply rounded-lg border bg-white p-6 shadow-sm;
  }

  /* 输入框样式 */
  .input {
    @apply w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20;
  }
}
```

---

## 使用说明

### 开发流程

1. **初始化项目**
   ```bash
   npx create-next-app@14 frontend --typescript --tailwind --eslint --app --src-dir
   ```

2. **复制配置文件**
   - 按照 `/workspace/docs/frontend-blueprint.md` 第 3 节创建配置文件

3. **复制类型定义**
   - 使用本文件第 1 节的类型定义

4. **填充实现**
   - 本文件中的存根代码均包含 `...` 或空实现
   - 开发人员根据业务需求填充具体逻辑

5. **测试验证**
   ```bash
   npm run lint
   npm run build
   ```

### 注意事项

- 所有存根代码仅定义结构，不包含业务逻辑
- 组件样式类名使用 TailwindCSS 或 CSS 模块
- 类型定义必须与后端 API 保持同步
- 环境变量必须从 `.env.local` 加载，不提交到版本控制

---

**文档状态**: ✅ 已完成
**关联蓝图**: `/workspace/docs/frontend-blueprint.md`
