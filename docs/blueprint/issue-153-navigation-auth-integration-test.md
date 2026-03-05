# Issue #153: 导航栏认证功能集成测试 - 实现蓝图

> **文档版本**: 1.0.0
> **创建日期**: 2026-03-05
> **作者**: 架构师 (Architect Agent)
> **状态**: 设计阶段

---

## 1. 需求分析

### 1.1 Issue 摘要
为导航栏的认证功能编写集成测试，验证 Navigation 组件和 HeaderAuth 组件与 useAuth Hook 的完整集成。

### 1.2 验收标准
- [ ] 覆盖所有认证状态场景（authenticated、unauthenticated、loading）
- [ ] 测试登录/注册按钮显示逻辑
- [ ] 测试用户信息和登出按钮显示逻辑
- [ ] 测试 logout 功能的完整流程
- [ ] 所有测试用例通过

### 1.3 依赖关系
- **前置依赖**: Issue #151 (Navigation 组件登录/注册按钮) - 已完成
- **前置依赖**: Issue #152 (Header 组件用户信息显示和登出按钮) - 已完成
- **被测组件**: `Navigation.tsx`, `HeaderAuth.tsx`
- **依赖 Hook**: `useAuth.ts`

---

## 2. 现有架构分析

### 2.1 被测组件概览

#### Navigation 组件
**文件**: `/workspace/frontend/src/components/layout/Navigation.tsx`

**认证相关功能**:
- 集成 `useAuth` Hook 获取认证状态
- 未认证时显示"登录"和"注册"按钮
- 已认证时隐藏认证按钮
- 按钮样式: `btn-outline` (登录), `btn-primary` (注册)

```typescript
const { isAuthenticated } = useAuth();

const renderAuthButtons = (): ReactNode => {
  if (isAuthenticated) {
    return null;
  }
  return (
    <>
      <a href="/login" className="navigation-item btn-outline">登录</a>
      <a href="/register" className="navigation-item btn-primary">注册</a>
    </>
  );
};
```

#### HeaderAuth 组件
**文件**: `/workspace/frontend/src/components/layout/HeaderAuth.tsx`

**认证相关功能**:
- 集成 `useAuth` Hook 获取认证状态
- 已认证时显示用户名和登出按钮
- 未认证时不渲染任何内容
- 处理登出逻辑

```typescript
const { isAuthenticated, user, logout } = authState ?? internalAuthState;

// 未认证时不渲染
if (!isAuthenticated) {
  return null;
}

// 边界情况：user 为 null 时不渲染
if (!user) {
  return null;
}

const handleLogout = async (): Promise<void> => {
  try {
    setIsLoggingOut(true);
    await logout();
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    setIsLoggingOut(false);
  }
};

return (
  <div className="header-auth flex items-center gap-3">
    <span className="header-auth-username">{displayUsername}</span>
    <button
      className="header-auth-logout btn btn-outline btn-sm"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      登出
    </button>
  </div>
);
```

### 2.2 useAuth Hook 接口
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

### 2.3 现有单元测试
- `Navigation.auth.test.tsx`: Navigation 组件认证功能契约测试（已完成）
- `HeaderAuth.test.tsx`: HeaderAuth 组件单元测试（已完成）
- `useAuth.test.ts`: useAuth Hook 集成测试（已完成）

---

## 3. 技术设计

### 3.1 设计决策

#### 决策 1: 集成测试 vs 端到端测试
**理由**: 集成测试位于单元测试和 E2E 测试之间，适合验证组件间的协作，无需启动完整应用。

#### 决策 2: Mock 策略 - 使用 Mock 组件而非真实 Hook
**理由**:
- 控制测试的确定性和速度
- 避免依赖外部 API 或 Store 状态
- 通过 `authState` prop 注入测试状态

#### 决策 3: 测试文件命名约定
**理由**:
- 与现有契约测试区分（`.auth.test.tsx` 为契约测试）
- `.integration.test.tsx` 明确表示集成测试性质
- Jest 配置已支持此模式

#### 决策 4: 不使用 MSW (Mock Service Worker)
**理由**:
- 当前测试使用 Mock 组件而非真实 API 调用
- MSW 更适合需要测试完整网络请求的场景
- 简化测试环境配置

### 3.2 测试架构

```
集成测试层级
├── 测试组件: Navigation + HeaderAuth
│   ├── Mock useAuth Hook (通过 authState prop)
│   └── Mock 依赖组件
└── 测试工具: React Testing Library
    ├── render()
    ├── screen 查询
    ├── userEvent 模拟
    └── waitFor 异步等待
```

### 3.3 测试数据流

```
测试用例
  ↓
提供 Mock authState
  ↓
渲染组件 (Navigation/HeaderAuth)
  ↓
验证 UI 状态
  ↓
触发用户操作 (点击、状态变化)
  ↓
验证 UI 更新
```

---

## 4. 测试文件结构

### 4.1 文件位置

**方案 1: 独立集成测试文件** (推荐)
```
/workspace/frontend/src/components/layout/__tests__/
├── Navigation.auth.test.tsx          (现有 - 契约测试)
├── NavigationAuth.integration.test.tsx  (新增 - 集成测试)
├── HeaderAuth.test.tsx               (现有 - 单元测试)
└── LayoutAuth.integration.test.tsx   (可选 - 完整布局集成测试)
```

**方案 2: 合并到现有文件**
- 在现有契约测试文件中添加集成测试套件
- 优点: 减少文件数量
- 缺点: 混合测试类型，不易区分

**决策**: 采用方案 1，创建独立的集成测试文件。

### 4.2 测试文件命名规范

| 后缀 | 用途 | 示例 |
|------|------|------|
| `.test.tsx` | 通用单元测试 | `Navigation.test.tsx` |
| `.auth.test.tsx` | 认证功能契约测试 | `Navigation.auth.test.tsx` |
| `.integration.test.tsx` | 集成测试 | `NavigationAuth.integration.test.tsx` |
| `.import.test.tsx` | 导入验证测试 | `HeaderAuth.import.test.tsx` |

---

## 5. Mock 策略设计

### 5.1 useAuth Hook Mock

```typescript
// Mock useAuth Hook
jest.mock('@/lib/hooks/useAuth');

import { useAuth } from '@/lib/hooks/useAuth';
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
```

### 5.2 Mock 数据工厂

```typescript
/**
 * 创建已认证状态 Mock
 */
function createMockAuthenticatedState(overrides?: Partial<UseAuthResult>): UseAuthResult {
  return {
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
    logout: jest.fn().mockResolvedValue(undefined),
    refreshToken: jest.fn().mockResolvedValue(MOCK_TOKEN_RESPONSE),
    clearError: jest.fn(),
    ...overrides,
  };
}

/**
 * 创建未认证状态 Mock
 */
function createMockUnauthenticatedState(): UseAuthResult {
  return {
    isAuthenticated: false,
    user: null,
    status: 'unauthenticated',
    isAuthenticating: false,
    error: null,
    logout: jest.fn().mockResolvedValue(undefined),
    refreshToken: jest.fn().mockResolvedValue(MOCK_TOKEN_RESPONSE),
    clearError: jest.fn(),
  };
}

/**
 * 创建加载状态 Mock
 */
function createMockLoadingState(): UseAuthResult {
  return {
    isAuthenticated: false,
    user: null,
    status: 'loading',
    isAuthenticating: true,
    error: null,
    logout: jest.fn().mockResolvedValue(undefined),
    refreshToken: jest.fn().mockResolvedValue(MOCK_TOKEN_RESPONSE),
    clearError: jest.fn(),
  };
}
```

### 5.3 Mock 清理策略

```typescript
describe('集成测试套件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
```

---

## 6. 测试场景设计

### 6.1 Navigation 组件集成测试

#### 测试套件 1: 状态切换场景

```typescript
describe('Navigation - 认证状态切换', () => {
  it('should render auth buttons when switching from authenticated to unauthenticated', () => {
    // Given: 初始已认证状态
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // Then: 不显示认证按钮
    expect(screen.queryByText('登录')).not.toBeInTheDocument();
    expect(screen.queryByText('注册')).not.toBeInTheDocument();

    // When: 切换到未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: 显示认证按钮
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('注册')).toBeInTheDocument();
  });

  it('should hide auth buttons when switching from unauthenticated to authenticated', () => {
    // Given: 初始未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // Then: 显示认证按钮
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('注册')).toBeInTheDocument();

    // When: 切换到已认证状态
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: 不显示认证按钮
    expect(screen.queryByText('登录')).not.toBeInTheDocument();
    expect(screen.queryByText('注册')).not.toBeInTheDocument();
  });

  it('should maintain regular nav items during auth state changes', () => {
    // Given: 初始未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // Then: 显示普通导航项
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();

    // When: 切换到已认证状态
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: 仍然显示普通导航项
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });
});
```

#### 测试套件 2: 加载状态场景

```typescript
describe('Navigation - 加载状态', () => {
  it('should show auth buttons during loading state (conservative)', () => {
    // Given: 加载状态
    mockUseAuth.mockReturnValue(createMockLoadingState());

    // When: 渲染组件
    render(<Navigation items={mockItems} />);

    // Then: 显示认证按钮（保守策略）
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('注册')).toBeInTheDocument();
  });

  it('should transition from loading to authenticated state', () => {
    // Given: 初始加载状态
    mockUseAuth.mockReturnValue(createMockLoadingState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // Then: 显示认证按钮
    expect(screen.getByText('登录')).toBeInTheDocument();

    // When: 切换到已认证状态
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: 隐藏认证按钮
    expect(screen.queryByText('登录')).not.toBeInTheDocument();
  });

  it('should transition from loading to unauthenticated state', () => {
    // Given: 初始加载状态
    mockUseAuth.mockReturnValue(createMockLoadingState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // Then: 显示认证按钮
    expect(screen.getByText('登录')).toBeInTheDocument();

    // When: 切换到未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: 仍然显示认证按钮
    expect(screen.getByText('登录')).toBeInTheDocument();
  });
});
```

#### 测试套件 3: 与 useAuth Hook 集成

```typescript
describe('Navigation - useAuth Hook 集成', () => {
  it('should call useAuth hook on render', () => {
    // When: 渲染组件
    render(<Navigation items={mockItems} />);

    // Then: useAuth 被调用
    expect(mockUseAuth).toHaveBeenCalled();
  });

  it('should re-render when useAuth state changes', () => {
    // Given: 初始状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    const { rerender } = render(<Navigation items={mockItems} />);

    const initialCallCount = mockUseAuth.mock.calls.length;

    // When: 触发重新渲染
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: useAuth 再次被调用
    expect(mockUseAuth.mock.calls.length).toBeGreaterThan(initialCallCount);
  });
});
```

### 6.2 HeaderAuth 组件集成测试

#### 测试套件 1: 登出流程场景

```typescript
describe('HeaderAuth - 登出流程', () => {
  it('should complete full logout flow', async () => {
    // Given: 已认证状态
    const mockLogout = jest.fn().mockResolvedValue(undefined);
    const mockAuthState = createMockAuthenticatedState({ logout: mockLogout });

    // When: 渲染组件
    const { rerender } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 显示用户名和登出按钮
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('登出')).toBeInTheDocument();

    // When: 点击登出按钮
    const logoutButton = screen.getByText('登出');
    await userEvent.click(logoutButton);

    // Then: logout() 被调用
    expect(mockLogout).toHaveBeenCalledTimes(1);

    // When: 状态更新为未认证
    const unauthenticatedState = createMockUnauthenticatedState();
    rerender(<HeaderAuth authState={unauthenticatedState} />);

    // Then: UI 更新，不再显示任何内容
    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
    expect(screen.queryByText('登出')).not.toBeInTheDocument();
  });

  it('should disable logout button during logout process', async () => {
    // Given: 已认证状态，logout 返回 pending promise
    let resolveLogout: () => void;
    const mockLogout = jest.fn(() => new Promise<void>((resolve) => {
      resolveLogout = resolve;
    }));
    const mockAuthState = createMockAuthenticatedState({ logout: mockLogout });

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // When: 点击登出按钮
    const logoutButton = screen.getByText('登出');
    await userEvent.click(logoutButton);

    // Then: 按钮被禁用
    expect(logoutButton).toBeDisabled();

    // Cleanup
    resolveLogout!();
    await waitFor(() => {
      expect(logoutButton).not.toBeDisabled();
    });
  });

  it('should handle logout error gracefully', async () => {
    // Given: logout 返回 rejected promise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockLogout = jest.fn().mockRejectedValue(new Error('Network error'));
    const mockAuthState = createMockAuthenticatedState({ logout: mockLogout });

    // When: 渲染组件并点击登出按钮
    render(<HeaderAuth authState={mockAuthState} />);
    const logoutButton = screen.getByText('登出');

    // Then: 点击不应抛出错误
    await expect(userEvent.click(logoutButton)).resolves.not.toThrow();
    expect(mockLogout).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
```

#### 测试套件 2: 状态切换场景

```typescript
describe('HeaderAuth - 认证状态切换', () => {
  it('should appear when switching from unauthenticated to authenticated', () => {
    // Given: 初始未认证状态
    const mockUnauthenticatedState = createMockUnauthenticatedState();
    const { rerender, container } = render(<HeaderAuth authState={mockUnauthenticatedState} />);

    // Then: 不渲染任何内容
    expect(container.firstChild).toBe(null);

    // When: 切换到已认证状态
    const mockAuthenticatedState = createMockAuthenticatedState();
    rerender(<HeaderAuth authState={mockAuthenticatedState} />);

    // Then: 显示用户名和登出按钮
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('登出')).toBeInTheDocument();
  });

  it('should disappear when switching from authenticated to unauthenticated', () => {
    // Given: 初始已认证状态
    const mockAuthenticatedState = createMockAuthenticatedState();
    const { rerender, container } = render(<HeaderAuth authState={mockAuthenticatedState} />);

    // Then: 显示用户名和登出按钮
    expect(screen.getByText('testuser')).toBeInTheDocument();

    // When: 切换到未认证状态
    const mockUnauthenticatedState = createMockUnauthenticatedState();
    rerender(<HeaderAuth authState={mockUnauthenticatedState} />);

    // Then: 不渲染任何内容
    expect(container.firstChild).toBe(null);
    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
  });
});
```

#### 测试套件 3: 与 useAuth Hook 集成

```typescript
describe('HeaderAuth - useAuth Hook 集成', () => {
  it('should work with real useAuth hook when authState not provided', () => {
    // Given: Mock useAuth 返回已认证状态
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());

    // When: 渲染组件（不传 authState）
    const { container } = render(<HeaderAuth />);

    // Then: 组件使用内部 useAuth
    expect(container.querySelector('.header-auth')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(mockUseAuth).toHaveBeenCalled();
  });

  it('should prioritize authState prop over useAuth hook', () => {
    // Given: Mock useAuth 返回未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());

    // When: 渲染组件并传入 authState prop（已认证）
    const mockAuthState = createMockAuthenticatedState();
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: 使用 authState prop 的值
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });
});
```

### 6.3 完整布局集成测试（可选）

#### 测试套件 1: 协同工作场景

```typescript
describe('Layout - Navigation 与 HeaderAuth 协同', () => {
  it('should show correct UI when unauthenticated', () => {
    // Given: 未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());

    // When: 渲染完整布局
    render(
      <MainLayout
        header={<Header logo={<div>Logo</div>} nav={<Navigation items={mockItems} />} actions={<HeaderAuth />} />}
      >
        <div>Content</div>
      </MainLayout>
    );

    // Then: Navigation 显示登录/注册按钮
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('注册')).toBeInTheDocument();

    // Then: HeaderAuth 不显示任何内容
    expect(screen.queryByText(/testuser/)).not.toBeInTheDocument();
  });

  it('should show correct UI when authenticated', () => {
    // Given: 已认证状态
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());

    // When: 渲染完整布局
    render(
      <MainLayout
        header={<Header logo={<div>Logo</div>} nav={<Navigation items={mockItems} />} actions={<HeaderAuth />} />}
      >
        <div>Content</div>
      </MainLayout>
    );

    // Then: Navigation 不显示登录/注册按钮
    expect(screen.queryByText('登录')).not.toBeInTheDocument();
    expect(screen.queryByText('注册')).not.toBeInTheDocument();

    // Then: HeaderAuth 显示用户名和登出按钮
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('登出')).toBeInTheDocument();
  });
});
```

---

## 7. 测试验证点

### 7.1 Navigation 组件验证点

| 验证点 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 未认证时显示登录/注册按钮 | `getByText('登录')` | 存在 |
| 已认证时隐藏登录/注册按钮 | `queryByText('登录')` | 不存在 |
| 按钮正确链接 | `toHaveAttribute('href', '/login')` | 匹配 |
| 按钮样式类 | `toHaveClass('btn-outline')` | 匹配 |
| 状态切换响应 | `rerender()` + 断言 | UI 更新 |
| 加载状态行为 | 渲染 + 断言 | 显示按钮 |
| useAuth 调用 | `expect(mockUseAuth)` | 被调用 |

### 7.2 HeaderAuth 组件验证点

| 验证点 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 已认证时显示用户名 | `getByText('testuser')` | 存在 |
| 已认证时显示登出按钮 | `getByText('登出')` | 存在 |
| 未认证时不渲染 | `container.firstChild` | null |
| 登出方法调用 | `expect(mockLogout)` | 被调用 |
| 登出时禁用按钮 | `toBeDisabled()` | true |
| 状态切换响应 | `rerender()` + 断言 | UI 更新 |
| 错误处理 | mockRejectedValue | 不抛出 |

### 7.3 集成验证点

| 验证点 | 测试方法 | 预期结果 |
|--------|----------|----------|
| useAuth 集成 | mock + 渲染 | 正常工作 |
| 状态同步 | 改变状态 + 重新渲染 | UI 同步更新 |
| 事件处理 | userEvent.click | 正确触发 |
| 异步操作 | waitFor + 断言 | 完成操作 |
| 边界情况 | user=null, username='' | 优雅处理 |

---

## 8. 实现检查清单

### 8.1 测试工程师任务
- [ ] 创建 `NavigationAuth.integration.test.tsx`
- [ ] 实现 Navigation 组件集成测试（第 6.1 节）
- [ ] 创建 `HeaderAuth.integration.test.tsx`
- [ ] 实现 HeaderAuth 组件集成测试（第 6.2 节）
- [ ] （可选）创建 `LayoutAuth.integration.test.tsx`
- [ ] （可选）实现完整布局集成测试（第 6.3 节）
- [ ] 确保所有测试通过
- [ ] 确保测试覆盖率 >= 85%

### 8.2 开发工程师任务
- [ ] 代码审查集成测试
- [ ] 验证测试覆盖所有验收标准
- [ ] 确保测试与单元测试不重复
- [ ] 确保测试不依赖外部服务

### 8.3 文档任务
- [ ] 更新测试文档
- [ ] 记录测试覆盖的场景
- [ ] 记录已知的测试限制

---

## 9. 风险与注意事项

### 9.1 技术风险
| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 测试与单元测试重复 | 维护成本增加 | 明确测试边界，避免重复 |
| Mock 配置错误 | 测试不准确 | 使用标准 Mock 工厂 |
| 异步测试不稳定 | 测试间歇性失败 | 使用 waitFor 和适当超时 |
| 状态更新时机 | 测试不可靠 | 使用 act() 包装状态更新 |

### 9.2 测试约束
- **不得依赖**外部 API 或网络请求
- **不得依赖**真实的 authStore 状态
- **必须使用** React Testing Library 最佳实践
- **必须避免**测试实现细节（如内部函数）

### 9.3 测试原则
1. **用户视角**: 测试用户看到的行为，而非实现细节
2. **独立性**: 每个测试用例独立运行
3. **可读性**: 测试名称清晰描述测试场景
4. **可维护性**: 使用 Mock 工厂减少重复代码

---

## 10. 附录

### 10.1 相关文件清单
```
/workspace/frontend/src/
├── components/layout/
│   ├── Navigation.tsx                     (已存在 - 被测组件)
│   ├── HeaderAuth.tsx                     (已存在 - 被测组件)
│   ├── Header.tsx                         (已存在 - 容器组件)
│   └── __tests__/
│       ├── Navigation.auth.test.tsx       (已存在 - 契约测试)
│       ├── HeaderAuth.test.tsx            (已存在 - 单元测试)
│       ├── NavigationAuth.integration.test.tsx  (新增)
│       ├── HeaderAuth.integration.test.tsx      (新增)
│       └── LayoutAuth.integration.test.tsx       (可选)
├── lib/hooks/
│   ├── useAuth.ts                         (已存在 - 依赖)
│   └── __tests__/
│       └── useAuth.test.ts                (已存在 - Hook 测试)
└── types/
    └── auth.ts                            (已存在 - 类型定义)
```

### 10.2 测试命令
```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test NavigationAuth.integration.test.tsx

# 运行集成测试（使用模式匹配）
npm test -- --testPathPattern=".integration.test."

# 生成覆盖率报告
npm run test:coverage

# 监视模式
npm run test:watch
```

### 10.3 参考资料
- React Testing Library 文档: https://testing-library.com/docs/react-testing-library/intro
- Jest 文档: https://jestjs.io/docs/getting-started
- useAuth Hook 集成测试: `/workspace/frontend/src/lib/hooks/__tests__/useAuth.test.ts`
- Issue #151 蓝图: `/workspace/docs/blueprint/issue-151-navigation-auth-ui.md` (如果存在)
- Issue #152 蓝图: `/workspace/docs/blueprint/issue-152-header-auth-ui.md`

### 10.4 版本历史
| 版本 | 日期 | 变更说明 | 作者 |
|------|------|----------|------|
| 1.0.0 | 2026-03-05 | 初始版本 | 架构师 |

---

**文档结束**

> **下一步**: 测试工程师根据本蓝图编写集成测试，开发工程师验证测试正确性。
