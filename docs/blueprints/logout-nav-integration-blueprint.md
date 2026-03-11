# Issue #167: 登出功能与导航栏集成 - 架构蓝图

## 1. 需求摘要

将已有的 `HeaderAuth` 组件集成到导航栏，确保：
- 已认证用户看到用户名和登出按钮
- 未认证用户看到登录/注册入口

## 2. 现有架构分析

### 2.1 组件职责矩阵

| 组件 | 文件路径 | 职责 | 认证状态行为 |
|------|----------|------|-------------|
| `Header` | `src/components/layout/Header.tsx` | 骨架容器，接收 `logo`/`nav`/`actions` | 无认证逻辑 |
| `Navigation` | `src/components/layout/Navigation.tsx` | 导航菜单 + 未认证入口 | 未认证：显示登录/注册<br>已认证：隐藏按钮 |
| `HeaderAuth` | `src/components/layout/HeaderAuth.tsx` | 已认证用户信息 + 登出 | 未认证：返回 `null`<br>已认证：显示用户名 + 登出按钮 |

### 2.2 当前集成状态

```tsx
// frontend/src/app/layout.tsx (当前实现)
const header = <Header />;  // 未传入任何 props
```

**问题**：`HeaderAuth` 组件已存在但**未集成**到导航栏。

### 2.3 认证基础设施（已完整实现）

```
src/lib/hooks/useAuth.ts      - 认证状态 Hook
src/lib/api/auth-client.ts    - logout() 方法
src/lib/auth/session-manager.ts - 会话管理
src/store/auth/auth-store.ts  - Zustand Store
```

## 3. 架构决策

### 3.1 方案选择：最小改动原则

**决策**：修改 `layout.tsx`，将 `HeaderAuth` 作为 `Header` 的 `actions` prop 传入。

**理由**：
1. `Header` 已支持 `actions` prop，无需修改 Header 组件
2. `Navigation` 已处理未认证状态（登录/注册按钮）
3. `HeaderAuth` 已处理已认证状态（用户名 + 登出）
4. 两个组件职责互补，只需组合

### 3.2 认证状态 UI 行为

| 认证状态 | Navigation 行为 | HeaderAuth 行为 | 最终 UI |
|----------|-----------------|-----------------|---------|
| `unauthenticated` | 显示「登录」「注册」按钮 | 返回 `null` | 导航栏显示登录/注册入口 |
| `authenticated` | 隐藏认证按钮 | 显示用户名 + 登出 | 右侧显示用户信息和登出按钮 |
| `loading` | 显示按钮（保守策略） | 返回 `null` | 导航栏显示登录/注册入口 |

## 4. 文件修改清单

### 4.1 需要修改的文件

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `src/components/layout/index.ts` | 导出 | 添加 `HeaderAuth` 导出 |
| `src/app/layout.tsx` | 集成 | 传入 `HeaderAuth` 作为 `actions` |

### 4.2 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `Header.tsx` | 已支持 `actions` prop |
| `HeaderAuth.tsx` | 已实现完整功能 |
| `Navigation.tsx` | 已处理未认证状态 |
| `useAuth.ts` | 已实现完整功能 |
| `auth-client.ts` | 已实现 `logout()` |

## 5. 代码存根 (Stub)

### 5.1 导出修改

```python
# File: frontend/src/components/layout/index.ts

/**
 * 布局组件统一导出
 */

export { Header } from './Header';
export { Footer } from './Footer';
export { Navigation } from './Navigation';
export { MobileMenu } from './MobileMenu';
export { MainLayout } from './MainLayout';
export { PageSkeleton } from './PageSkeleton';
export { HeaderAuth } from './HeaderAuth';  // 新增导出
```

### 5.2 布局集成

```python
# File: frontend/src/app/layout.tsx

/**
 * 根布局组件
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header, Footer, HeaderAuth } from '@/components/layout';

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
  // HeaderAuth 作为 actions 传入
  // 未认证时返回 null，已认证时显示用户信息 + 登出按钮
  const header = (
    <Header
      actions={<HeaderAuth />}
    />
  );
  const footer = <Footer />;

  return (
    <html lang="zh-CN">
      <body className={inter.variable}>
        <div className="min-h-screen flex flex-col">
          {header}
          <div className="flex-1">{children}</div>
          {footer}
        </div>
      </body>
    </html>
  );
}
```

## 6. 测试策略

### 6.1 现有测试（已通过）

| 测试文件 | 覆盖范围 |
|----------|----------|
| `__tests__/HeaderAuth.test.tsx` | HeaderAuth 组件契约测试（完整） |
| `__tests__/Navigation.auth.test.tsx` | Navigation 认证功能（完整） |
| `e2e/specs/auth/logout.spec.ts` | 登出流程 E2E 测试（完整） |

### 6.2 新增测试（可选）

**HeaderAuth 集成测试**：验证 Header + HeaderAuth 组合行为

```typescript
// File: frontend/src/components/layout/__tests__/HeaderAuth.integration.test.tsx

/**
 * HeaderAuth 集成测试
 *
 * 验证 Header + HeaderAuth 组合在导航栏中的行为
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';
import { HeaderAuth } from '../HeaderAuth';
import { useAuth } from '@/lib/hooks/useAuth';

jest.mock('@/lib/hooks/useAuth');

describe('Header + HeaderAuth 集成', () => {
  it('should render HeaderAuth in actions slot when authenticated', () => {
    // Given: 已认证状态
    const mockUseAuth = require('@/lib/hooks/useAuth').useAuth;
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      status: 'authenticated',
      isAuthenticating: false,
      error: null,
      logout: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
    });

    // When: 渲染 Header with HeaderAuth
    render(<Header actions={<HeaderAuth />} />);

    // Then: actions 区域显示用户信息
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('登出')).toBeInTheDocument();
  });

  it('should render nothing in actions slot when not authenticated', () => {
    // Given: 未认证状态
    const mockUseAuth = require('@/lib/hooks/useAuth').useAuth;
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      status: 'unauthenticated',
      isAuthenticating: false,
      error: null,
      logout: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
    });

    // When: 渲染 Header with HeaderAuth
    const { container } = render(<Header actions={<HeaderAuth />} />);

    // Then: actions 区域为空
    const actionsContainer = container.querySelector('.header-actions');
    expect(actionsContainer).toBeEmptyDOMElement();
  });
});
```

## 7. E2E 验收标准

现有 E2E 测试 `e2e/specs/auth/logout.spec.ts` 已覆盖：

| AC | 描述 | 测试用例 |
|----|------|----------|
| AC1 | 用户可以主动登出 | `点击登出按钮应清除认证状态` |
| AC2 | 登出后清除所有认证状态 | `登出后应清除 localStorage 中的 access_token` |
| AC3 | 登出后重定向到首页并显示登录按钮 | `登出后应显示登录按钮` |

## 8. 依赖关系图

```
layout.tsx
    │
    ├── Header (骨架容器)
    │       │
    │       ├── logo (未使用)
    │       ├── nav (未使用)
    │       └── actions
    │               │
    │               └── HeaderAuth (认证状态组件)
    │                       │
    │                       └── useAuth Hook
    │                               │
    │                               └── authStore (Zustand)
    │
    └── Footer

Navigation (独立组件，在页面中使用)
    │
    └── useAuth Hook
            │
            └── 未认证时显示登录/注册按钮
```

## 9. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Header 样式与 HeaderAuth 不兼容 | UI 错位 | 已验证：HeaderAuth 使用标准 flex 布局 |
| SSR 水合不匹配 | 控制台警告 | useAuth 已处理 SSR：服务端返回 loading 状态 |
| 未认证时 actions 区域为空 | 视觉空白 | Navigation 组件提供登录/注册入口 |

## 10. 实现清单

- [ ] 修改 `src/components/layout/index.ts`：导出 `HeaderAuth`
- [ ] 修改 `src/app/layout.tsx`：集成 `HeaderAuth` 到 Header
- [ ] 运行现有测试验证无回归
- [ ] 手动验证 UI 行为

## 11. 后续优化建议（Out of Scope）

以下功能不在本次 Issue 范围，但可作为后续优化：

1. **用户头像下拉菜单**：点击头像展开更多操作（个人设置、登出等）
2. **响应式布局**：移动端 HeaderAuth 适配
3. **登出确认弹窗**：防止误点击登出按钮