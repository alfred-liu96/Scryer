/**
 * LoginPage 单元测试
 *
 * 测试覆盖范围：
 * - 基础渲染（页面结构、标题、Card）
 * - 注册链接（href、文本）
 * - LoginForm 集成
 * - 登录成功后跳转（Router.push）
 * - 依赖注入（authApi、authStore、router）
 *
 * 基于蓝图设计：
 * - /workspace/ARCHITECTURE.md §8.3
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/app/login/page.tsx
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest, vi } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './page';
import type { AuthApi } from '@/lib/api/auth-api';
import type { AuthStore } from '@/store/auth/auth-store-types';

// ============================================================================
// Mock 工厂函数
// ============================================================================

/**
 * 创建 Mock AuthApi
 */
const createMockAuthApi = (): AuthApi => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  getCurrentUser: jest.fn(),
}) as AuthApi;

/**
 * 创建 Mock AuthStore
 */
const createMockAuthStore = (): AuthStore => ({
  status: 'unauthenticated',
  user: null,
  setAuthUser: jest.fn(),
  setError: jest.fn(),
  clearError: jest.fn(),
}) as AuthStore;

/**
 * 创建 Mock Router
 */
const createMockRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
});

/**
 * 创建登录成功响应
 */
const createMockLoginResponse = () => ({
  user: {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  tokens: {
    access_token: 'test_access_token',
    refresh_token: 'test_refresh_token',
    token_type: 'Bearer' as const,
    expires_in: 3600,
  },
});

// ============================================================================
// 测试套件
// ============================================================================

describe('LoginPage - 基础渲染', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该渲染登录页面', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    const { container } = render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    // 页面容器应该存在
    expect(container.firstChild).toBeInTheDocument();
  });

  it('应该显示"欢迎回来"标题', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    const heading = screen.getByRole('heading', { name: /欢迎回来/ });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('欢迎回来');
  });

  it('应该显示"登录您的账号"描述', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    expect(screen.getByText(/登录您的账号/)).toBeInTheDocument();
  });

  it('应该渲染 Card 组件', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    // 验证标题存在（Card 内的内容）
    expect(screen.getByRole('heading', { name: /欢迎回来/ })).toBeInTheDocument();
    // 验证登录按钮存在（Card 内的 LoginForm）
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });
});

describe('LoginPage - 注册链接', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该包含"没有账号"文本', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    expect(screen.getByText(/没有账号/)).toBeInTheDocument();
  });

  it('应该包含"立即注册"链接', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    const link = screen.getByRole('link', { name: /立即注册/ });
    expect(link).toBeInTheDocument();
  });

  it('注册链接应该指向 /register', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    const link = screen.getByRole('link', { name: /立即注册/ });
    expect(link).toHaveAttribute('href', '/register');
  });
});

describe('LoginPage - LoginForm 集成', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该渲染 LoginForm 组件', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    // LoginForm 应该渲染用户名/邮箱输入框
    expect(screen.getByLabelText(/用户名或邮箱/)).toBeInTheDocument();
    // LoginForm 应该渲染密码输入框
    expect(screen.getByLabelText(/^密码$/)).toBeInTheDocument();
    // LoginForm 应该渲染登录按钮
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  it('应该将 authApi 传递给 LoginForm', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    // 如果 LoginForm 正确接收了 authApi，它应该能正常渲染
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  it('应该将 authStore 传递给 LoginForm', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    // LoginForm 应该正常渲染
    expect(screen.getByLabelText(/用户名或邮箱/)).toBeInTheDocument();
  });
});

describe('LoginPage - 登录成功后跳转', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('登录成功后应该跳转到首页', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    // Mock login API
    (mockAuthApi.login as jest.Mock).mockResolvedValue(createMockLoginResponse());

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    // 填写表单
    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');

    // 提交表单
    await user.click(screen.getByRole('button', { name: '登录' }));

    // 等待登录成功
    await waitFor(() => {
      expect(mockAuthApi.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    // 验证跳转到首页
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  it('登录成功后应该调用 authStore.setAuthUser()', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    const mockResponse = createMockLoginResponse();
    (mockAuthApi.login as jest.Mock).mockResolvedValue(mockResponse);

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(mockAuthStore.setAuthUser).toHaveBeenCalledWith(
        mockResponse.user,
        mockResponse.tokens.access_token,
        mockResponse.tokens.refresh_token,
        mockResponse.tokens.expires_in
      );
    });
  });
});

describe('LoginPage - 依赖注入', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该支持注入 Mock AuthApi', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    // 验证组件正常渲染（使用了注入的 mock）
    expect(screen.getByRole('heading', { name: /欢迎回来/ })).toBeInTheDocument();
  });

  it('应该支持注入 Mock AuthStore', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    expect(screen.getByRole('heading', { name: /欢迎回来/ })).toBeInTheDocument();
  });

  it('应该支持注入 Mock Router', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    expect(screen.getByRole('heading', { name: /欢迎回来/ })).toBeInTheDocument();
  });

  it('应该不传任何参数也能正常渲染', () => {
    // 测试运行时行为（不注入 mock）
    // 注意：这个测试可能需要 mock next/navigation 的 useRouter
    jest.mock('next/navigation', () => ({
      useRouter: jest.fn(() => createMockRouter()),
    }));

    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /欢迎回来/ })).toBeInTheDocument();
  });
});

describe('LoginPage - 错误处理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('登录失败时不应该跳转', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    // Mock login API 失败
    const error = new Error('Invalid credentials');
    (error as any).detail = 'Invalid username or password';
    (mockAuthApi.login as jest.Mock).mockRejectedValue(error);

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: '登录' }));

    // 等待 API 调用
    await waitFor(() => {
      expect(mockAuthApi.login).toHaveBeenCalled();
    });

    // 验证没有跳转
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('登录失败时不应该更新 authStore', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    const error = new Error('Invalid credentials');
    (error as any).detail = 'Invalid username or password';
    (mockAuthApi.login as jest.Mock).mockRejectedValue(error);

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(mockAuthApi.login).toHaveBeenCalled();
    });

    expect(mockAuthStore.setAuthUser).not.toHaveBeenCalled();
  });
});

describe('LoginPage - 可访问性', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('标题应该是 h1 标签', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    const heading = screen.getByRole('heading', { level: 1, name: /欢迎回来/ });
    expect(heading).toBeInTheDocument();
  });

  it('注册链接应该是可访问的', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const mockRouter = createMockRouter();

    render(
      <LoginPage
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        router={mockRouter}
      />
    );

    const link = screen.getByRole('link', { name: /立即注册/ });
    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', '/register');
  });
});
