# Issue #152: Header 组件用户信息显示和登出按钮 - 实现蓝图

> **文档版本**: 1.0.0
> **创建日期**: 2026-03-05
> **作者**: 架构师 (Architect Agent)
> **状态**: 设计阶段

---

## 1. 需求分析

### 1.1 Issue 摘要
在 Header 组件中添加用户信息显示和登出按钮，当用户已认证时显示。

### 1.2 验收标准
- [ ] 已登录时显示用户名和'登出'按钮
- [ ] 未登录时隐藏用户信息
- [ ] 点击登出按钮成功调用 `logout()`
- [ ] 登出后 UI 正确更新
- [ ] 单元测试通过

### 1.3 依赖关系
- **前置依赖**: Issue #151 (Navigation 组件登录/注册按钮) - 已完成
- **数据源**: `useAuth` Hook - 已实现
- **容器组件**: `Header.tsx` - 已存在，需要扩展

---

## 2. 现有架构分析

### 2.1 Header 组件现状
**文件**: `/workspace/frontend/src/components/layout/Header.tsx`

当前 Header 组件是一个纯展示组件，接受三个 props：
```typescript
interface HeaderProps {
  logo?: ReactNode;    // Logo 区域
  nav?: ReactNode;     // 导航区域
  actions?: ReactNode; // 操作区域
}
```

**关键发现**:
- Header 本身不处理认证逻辑
- 认证相关的 UI 应通过 `actions` prop 传入
- 这是一个**容器/展示分离**的设计模式

### 2.2 Navigation 组件参考
**文件**: `/workspace/frontend/src/components/layout/Navigation.tsx`

Navigation 组件在 Issue #151 中已集成认证功能：
- 未认证时显示"登录"和"注册"按钮
- 已认证时隐藏这些按钮
- 使用 `useAuth` Hook 获取认证状态

**设计模式**:
```typescript
const { isAuthenticated } = useAuth();
const renderAuthButtons = (): ReactNode => {
  if (isAuthenticated) {
    return null;
  }
  return (<登录/注册按钮>);
};
```

### 2.3 useAuth Hook 接口
**文件**: `/workspace/frontend/src/lib/hooks/useAuth.ts`

```typescript
interface UseAuthResult {
  status: AuthStatus;           // 'authenticated' | 'unauthenticated' | 'loading'
  user: UserResponse | null;    // { id, username, email, is_active, created_at }
  isAuthenticated: boolean;      // 便捷属性
  isAuthenticating: boolean;     // 是否正在认证
  error: AuthError | null;       // 认证错误
  logout: (options?) => Promise<void>; // 登出方法
  refreshToken: () => Promise<TokenResponse>;
  clearError: () => void;
}
```

---

## 3. 技术设计

### 3.1 设计决策

#### 决策 1: 创建独立的 HeaderAuth 组件
**理由**:
- 保持 Header 组件的纯展示性质
- 遵循**单一职责原则**
- 便于测试和维护
- 与 Navigation 组件的设计模式一致

#### 决策 2: 用户信息显示在 Header.actions 区域
**理由**:
- Header 已经有 `actions` 区域用于放置操作按钮
- 用户信息和登出按钮属于"用户操作"范畴
- 与现有布局结构自然契合

#### 决策 3: 加载状态采用保守策略
**理由**:
- 与 Navigation 组件保持一致
- 避免页面闪烁
- `isAuthenticating = true` 时仍然显示已认证状态（如果有缓存数据）

### 3.2 组件层次结构

```
Header (容器组件，由应用层使用)
├── logo prop     ← 应用层传入
├── nav prop      ← 应用层传入（可能是 Navigation 组件）
└── actions prop  ← 应用层传入（HeaderAuth 组件）
    └── HeaderAuth (新组件)
        ├── 用户名显示
        └── 登出按钮
```

### 3.3 数据流设计

```
useAuth Hook (状态源)
    ↓
HeaderAuth 组件 (消费状态)
    ↓ 决定渲染逻辑
    ├─ isAuthenticated = true  → 显示用户名 + 登出按钮
    ├─ isAuthenticated = false → 不渲染任何内容
    └─ status = 'loading'      → 显示缓存状态（如果有）
```

---

## 4. 接口定义

### 4.1 HeaderAuth 组件接口

**文件**: `/workspace/frontend/src/components/layout/HeaderAuth.tsx`

```typescript
/**
 * HeaderAuth 组件接口定义
 */
import type { UseAuthResult } from '@/lib/hooks/useAuth';

/**
 * HeaderAuth 组件 Props
 */
interface HeaderAuthProps {
  /**
   * 可选的 useAuth 返回值，用于测试或自定义状态
   * 如果不提供，组件内部会调用 useAuth()
   */
  authState?: UseAuthResult;
}

/**
 * HeaderAuth 组件
 *
 * 职责：
 * - 显示已认证用户的用户名
 * - 提供登出按钮
 * - 处理登出逻辑
 * - 根据认证状态决定是否渲染
 *
 * @param props - HeaderAuthProps
 * @returns 用户信息区域 JSX 或 null
 */
export function HeaderAuth({ authState }: HeaderAuthProps): JSX.Element | null {
  // 实现逻辑由开发工程师完成
  ...;
}
```

### 4.2 类型定义（已在现有系统中）

**UserResponse** (`/workspace/frontend/src/types/auth.ts`):
```typescript
interface UserResponse {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}
```

---

## 5. 样式设计

### 5.1 CSS 类名规范

基于现有的 `globals.css` 样式系统：

```css
/* 新增样式类 - 添加到 @layer components */

/* Header 认证区域容器 */
.header-auth {
  @apply flex items-center gap-3;
}

/* 用户名显示 */
.header-auth-username {
  @apply text-sm font-medium text-gray-700;
}

/* 登出按钮 */
.header-auth-logout {
  @apply btn btn-outline btn-sm;
}

/* 用户头像（可选扩展） */
.header-auth-avatar {
  @apply h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium;
}
```

### 5.2 布局结构

```
┌─────────────────────────────────────────────────────────────┐
│  Logo          Navigation                [用户名] [登出]    │
│  区域           区域                    ↑        ↑         │
│                                         │        │         │
│                                    .header-auth-username  │
│                                    .header-auth-logout    │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 行为规范

### 6.1 渲染逻辑

| 条件 | 渲染内容 | 说明 |
|------|----------|------|
| `isAuthenticated = true` | 用户名 + 登出按钮 | 显示用户信息 |
| `isAuthenticated = false` | `null` | 不渲染任何内容 |
| `status = 'loading'` 且无缓存 | `null` | 加载中且无数据时不显示 |
| `status = 'loading'` 且有缓存 | 用户名 + 登出按钮 | 保守策略，显示缓存 |

### 6.2 登出处理

```typescript
const handleLogout = async () => {
  try {
    await logout();
    // logout() 会自动清除认证状态
    // authStore 会被更新
    // 组件会自动重新渲染
  } catch (error) {
    // logout 内部已经处理了错误
    // 这里可以添加额外的错误处理（如 Toast 通知）
    console.error('Logout failed:', error);
  }
};
```

### 6.3 边界情况处理

| 场景 | 处理方式 |
|------|----------|
| `user` 为 null（理论上不可能） | 不渲染 |
| `user.username` 为空字符串 | 显示 "用户" 作为默认值 |
| 登出过程中 | 禁用登出按钮，显示加载状态 |

---

## 7. 测试契约

### 7.1 单元测试文件

**文件**: `/workspace/frontend/src/components/layout/__tests__/HeaderAuth.test.tsx`

### 7.2 测试用例列表

#### 7.2.1 渲染测试
```typescript
describe('HeaderAuth - 渲染行为', () => {
  it('should render username and logout button when authenticated');
  it('should not render anything when not authenticated');
  it('should render nothing when user is null');
  it('should handle empty username gracefully');
});
```

#### 7.2.2 登出功能测试
```typescript
describe('HeaderAuth - 登出功能', () => {
  it('should call logout() when logout button is clicked');
  it('should disable logout button during logout process');
  it('should update UI after successful logout');
});
```

#### 7.2.3 样式测试
```typescript
describe('HeaderAuth - 样式类名', () => {
  it('should apply correct CSS classes to container');
  it('should apply correct CSS classes to username');
  it('should apply correct CSS classes to logout button');
});
```

#### 7.2.4 可访问性测试
```typescript
describe('HeaderAuth - 可访问性', () => {
  it('should have proper ARIA labels');
  it('should have button role for logout action');
  it('should be keyboard navigable');
});
```

#### 7.2.5 快照测试
```typescript
describe('HeaderAuth - 快照', () => {
  it('should match snapshot when authenticated');
  it('should match snapshot when not authenticated');
});
```

### 7.3 Mock 数据示例

```typescript
const mockAuthenticatedState: UseAuthResult = {
  isAuthenticated: true,
  user: {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  status: 'authenticated',
  isAuthenticating: false,
  error: null,
  logout: jest.fn(),
  refreshToken: jest.fn(),
  clearError: jest.fn(),
};

const mockUnauthenticatedState: UseAuthResult = {
  isAuthenticated: false,
  user: null,
  status: 'unauthenticated',
  isAuthenticating: false,
  error: null,
  logout: jest.fn(),
  refreshToken: jest.fn(),
  clearError: jest.fn(),
};
```

---

## 8. 实现检查清单

### 8.1 开发工程师任务
- [ ] 创建 `/workspace/frontend/src/components/layout/HeaderAuth.tsx`
- [ ] 实现组件逻辑（参考第 4 节接口定义）
- [ ] 添加 CSS 样式到 `globals.css`
- [ ] 更新 `Header.test.tsx` 快照（如果需要）
- [ ] 运行单元测试确保通过

### 8.2 测试工程师任务
- [ ] 创建 `/workspace/frontend/src/components/layout/__tests__/HeaderAuth.test.tsx`
- [ ] 实现第 7 节列出的所有测试用例
- [ ] 确保测试覆盖率 >= 90%
- [ ] 验证与 `useAuth` Hook 的集成

### 8.3 集成任务
- [ ] 在应用层使用 Header 时传入 HeaderAuth 到 actions prop
- [ ] 验证与 Navigation 组件的协同工作
- [ ] 端到端测试验证完整登出流程

---

## 9. 风险与注意事项

### 9.1 技术风险
| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `useAuth` 状态更新延迟 | UI 可能短暂显示错误状态 | 使用乐观更新 |
| 登出 API 失败 | 用户可能认为已登出但实际未登出 | logout() 内部已处理本地状态清除 |
| CSS 类名冲突 | 样式可能被覆盖 | 使用 BEM 命名规范 |

### 9.2 设计约束
- **必须保持** Header 组件的纯展示性质
- **不得破坏** 现有的 Header props 接口
- **必须遵循** 项目的 CSS 类名约定
- **必须保持** 与 Navigation 组件的设计一致性

### 9.3 可访问性要求
- 登出按钮必须有明确的 `aria-label`
- 用户名区域应有适当的 `aria-live` 属性（如动态更新）
- 支持键盘导航（Tab 键顺序）

---

## 10. 附录

### 10.1 相关文件清单
```
/workspace/frontend/src/
├── components/layout/
│   ├── Header.tsx                    (已存在)
│   ├── HeaderAuth.tsx                (新增)
│   └── __tests__/
│       ├── Header.test.tsx           (已存在，可能需要更新)
│       └── HeaderAuth.test.tsx       (新增)
├── lib/hooks/
│   └── useAuth.ts                    (已存在，依赖)
├── types/
│   ├── auth.ts                       (已存在，依赖)
│   └── layout.ts                     (已存在，参考)
└── app/
    └── globals.css                   (已存在，添加样式)
```

### 10.2 参考资料
- Issue #151 PR: Navigation 组件认证功能实现
- useAuth Hook 集成测试: `/workspace/frontend/src/lib/hooks/__tests__/useAuth.test.ts`
- TailwindCSS 文档: https://tailwindcss.com/docs

### 10.3 版本历史
| 版本 | 日期 | 变更说明 | 作者 |
|------|------|----------|------|
| 1.0.0 | 2026-03-05 | 初始版本 | 架构师 |

---

**文档结束**

> **下一步**: 测试工程师根据本蓝图创建测试契约，开发工程师根据蓝图实现组件逻辑。
