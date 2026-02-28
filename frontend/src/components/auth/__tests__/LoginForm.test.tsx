/**
 * LoginForm 组件单元测试
 *
 * 测试覆盖范围：
 * - 基础渲染（表单、字段、按钮）
 * - 用户输入（identifier、password）
 * - 表单验证（客户端验证、失焦验证）
 * - 提交成功（API 调用、状态更新、onSuccess 回调）
 * - 提交失败（错误处理、onError 回调）
 * - 加载状态（按钮禁用、显示加载文本）
 * - 可访问性（ARIA 属性）
 *
 * 基于蓝图设计：
 * - /workspace/ARCHITECTURE.md §8.2
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/components/auth/LoginForm.tsx
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

// ============================================================================
// Mock 工厂函数
// ============================================================================

/**
 * 创建 Mock AuthApi
 */
const createMockAuthApi = () => ({
  login: jest.fn(),
});

/**
 * 创建 Mock AuthStore
 */
const createMockAuthStore = () => ({
  status: 'unauthenticated',
  user: null,
  setAuthUser: jest.fn(),
  setError: jest.fn(),
  clearError: jest.fn(),
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

describe('LoginForm - 基础渲染', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该渲染表单', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('应该渲染用户名/邮箱输入框', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByLabelText(/用户名或邮箱/)).toBeInTheDocument();
  });

  it('应该渲染密码输入框', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByLabelText(/^密码$/)).toBeInTheDocument();
  });

  it('应该渲染登录按钮', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  it('输入框应该有正确的 autoComplete 属性', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByLabelText(/用户名或邮箱/)).toHaveAttribute('autoComplete', 'username');
    expect(screen.getByLabelText(/^密码$/)).toHaveAttribute('autoComplete', 'current-password');
  });
});

describe('LoginForm - 用户输入', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该支持输入用户名', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const identifierInput = screen.getByLabelText(/用户名或邮箱/);
    await user.type(identifierInput, 'testuser');

    expect(identifierInput).toHaveValue('testuser');
  });

  it('应该支持输入邮箱', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const identifierInput = screen.getByLabelText(/用户名或邮箱/);
    await user.type(identifierInput, 'test@example.com');

    expect(identifierInput).toHaveValue('test@example.com');
  });

  it('应该支持输入密码', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const passwordInput = screen.getByLabelText(/^密码$/);
    await user.type(passwordInput, 'password123');

    expect(passwordInput).toHaveValue('password123');
  });
});

describe('LoginForm - 表单验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('空表单提交应该显示验证错误', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const submitButton = screen.getByRole('button', { name: '登录' });
    await user.click(submitButton);

    // 应该显示验证错误
    await waitFor(() => {
      expect(screen.getByText(/请输入用户名或邮箱/)).toBeInTheDocument();
      expect(screen.getByText(/请输入密码/)).toBeInTheDocument();
    });

    // 不应该调用 API
    expect(mockAuthApi.login).not.toHaveBeenCalled();
  });

  it('太短的用户名应该显示错误提示', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const identifierInput = screen.getByLabelText(/用户名或邮箱/);
    await user.type(identifierInput, 'ab');

    const submitButton = screen.getByRole('button', { name: '登录' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/用户名或邮箱格式不正确/)).toBeInTheDocument();
    });
  });

  it('无效的邮箱格式应该显示错误提示', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const identifierInput = screen.getByLabelText(/用户名或邮箱/);
    await user.type(identifierInput, 'invalid@');

    const submitButton = screen.getByRole('button', { name: '登录' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/用户名或邮箱格式不正确/)).toBeInTheDocument();
    });
  });

  it('字段失焦时应该触发验证（太短的用户名）', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const identifierInput = screen.getByLabelText(/用户名或邮箱/);
    await user.type(identifierInput, 'ab');
    await user.tab(); // 触发 blur

    await waitFor(() => {
      expect(screen.getByText(/用户名或邮箱格式不正确/)).toBeInTheDocument();
    });
  });

  it('字段失焦时应该触发验证（无效的邮箱）', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const identifierInput = screen.getByLabelText(/用户名或邮箱/);
    await user.type(identifierInput, 'invalid@');
    await user.tab(); // 触发 blur

    await waitFor(() => {
      expect(screen.getByText(/用户名或邮箱格式不正确/)).toBeInTheDocument();
    });
  });

  it('字段失焦时应该触发验证（空密码）', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const passwordInput = screen.getByLabelText(/^密码$/);
    await user.click(passwordInput);
    await user.tab(); // 触发 blur（空字段）

    await waitFor(() => {
      expect(screen.getByText(/请输入密码/)).toBeInTheDocument();
    });
  });
});

describe('LoginForm - 提交成功场景', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('有效表单（用户名）应该调用 authApi.login()', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    mockAuthApi.login.mockResolvedValue(createMockLoginResponse());

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'testuser');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(mockAuthApi.login).toHaveBeenCalledWith('testuser', 'password123');
    });
  });

  it('有效表单（邮箱）应该调用 authApi.login()', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    mockAuthApi.login.mockResolvedValue(createMockLoginResponse());

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(mockAuthApi.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('登录成功后应该调用 authStore.setAuthUser()', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    const mockResponse = createMockLoginResponse();
    mockAuthApi.login.mockResolvedValue(mockResponse);

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

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

  it('登录成功后应该调用 onSuccess 回调', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const onSuccess = jest.fn();

    const mockResponse = createMockLoginResponse();
    mockAuthApi.login.mockResolvedValue(mockResponse);

    render(
      <LoginForm
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        onSuccess={onSuccess}
      />
    );

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResponse.user);
    });
  });
});

describe('LoginForm - 提交失败场景', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该处理登录失败（用户名或密码错误）', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    const error = new Error('Invalid credentials');
    (error as any).detail = 'Invalid username or password';
    mockAuthApi.login.mockRejectedValue(error);

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'wrongpassword');

    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(screen.getByText(/用户名或密码错误/)).toBeInTheDocument();
    });

    expect(mockAuthStore.setAuthUser).not.toHaveBeenCalled();
  });

  it('应该处理账号被禁用的错误', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    const error = new Error('User inactive');
    (error as any).detail = 'User account is disabled';
    mockAuthApi.login.mockRejectedValue(error);

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(screen.getByText(/账号已被禁用/)).toBeInTheDocument();
    });
  });

  it('应该处理网络错误', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    const error = new Error('Network error');
    mockAuthApi.login.mockRejectedValue(error);

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(screen.getByText(/网络连接失败|登录失败/)).toBeInTheDocument();
    });
  });

  it('应该调用 onError 回调', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const onError = jest.fn();

    const error = new Error('Login failed');
    mockAuthApi.login.mockRejectedValue(error);

    render(
      <LoginForm
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        onError={onError}
      />
    );

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});

describe('LoginForm - 加载状态', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('提交时应该显示加载状态', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    mockAuthApi.login.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(createMockLoginResponse()), 100))
    );

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');

    const submitButton = screen.getByRole('button', { name: '登录' });
    await user.click(submitButton);

    // 按钮应该被禁用
    expect(submitButton).toBeDisabled();

    // 应该显示加载文本
    await waitFor(() => {
      expect(screen.getByText(/登录中.../)).toBeInTheDocument();
    });
  });

  it('提交完成后应该恢复可用状态', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    mockAuthApi.login.mockResolvedValue(createMockLoginResponse());

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/用户名或邮箱/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');

    const submitButton = screen.getByRole('button', { name: '登录' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});

describe('LoginForm - 可访问性', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('表单应该有正确的 ARIA 属性', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
  });

  it('输入框应该有关联的 label', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByLabelText(/用户名或邮箱/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^密码$/)).toBeInTheDocument();
  });

  it('提交按钮应该有 type="submit"', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<LoginForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const submitButton = screen.getByRole('button', { name: '登录' });
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
});
