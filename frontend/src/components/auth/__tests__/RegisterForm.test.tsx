/**
 * RegisterForm 组件单元测试
 *
 * 测试覆盖范围：
 * - 基础渲染（表单、字段、按钮）
 * - 用户输入（各字段输入）
 * - 表单验证（客户端验证）
 * - 提交成功（API 调用、状态更新）
 * - 提交失败（错误处理）
 * - 加载状态（按钮禁用、显示 Spinner）
 * - 可访问性（ARIA 属性）
 *
 * 基于蓝图设计：
 * - /workspace/.claude/tasks/issue-100-dev-team/blueprint.md
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/components/auth/RegisterForm.tsx
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '../RegisterForm';

// ============================================================================
// Mock 工厂函数
// ============================================================================

/**
 * 创建 Mock AuthApi
 */
const createMockAuthApi = () => ({
  register: jest.fn(),
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
 * 创建注册成功响应
 */
const createMockRegisterResponse = () => ({
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

describe('RegisterForm - 基础渲染', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该渲染表单', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('应该渲染用户名输入框', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByLabelText(/^用户名$/)).toBeInTheDocument();
  });

  it('应该渲染邮箱地址输入框', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByLabelText(/^邮箱地址$/)).toBeInTheDocument();
  });

  it('应该渲染密码输入框', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByLabelText(/^密码$/)).toBeInTheDocument();
  });

  it('应该渲染确认密码输入框', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByLabelText(/^确认密码$/)).toBeInTheDocument();
  });

  it('应该渲染注册按钮', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument();
  });
});

describe('RegisterForm - 用户输入', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该支持输入用户名', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await user.type(usernameInput, 'testuser');

    expect(usernameInput).toHaveValue('testuser');
  });

  it('应该支持输入邮箱地址', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const emailInput = screen.getByLabelText(/^邮箱地址$/);
    await user.type(emailInput, 'test@example.com');

    expect(emailInput).toHaveValue('test@example.com');
  });

  it('应该支持输入密码', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const passwordInput = screen.getByLabelText(/^密码$/);
    await user.type(passwordInput, 'password123');

    expect(passwordInput).toHaveValue('password123');
  });

  it('应该支持输入确认密码', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const confirmPasswordInput = screen.getByLabelText(/^确认密码$/);
    await user.type(confirmPasswordInput, 'password123');

    expect(confirmPasswordInput).toHaveValue('password123');
  });
});

describe('RegisterForm - 表单验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('空表单提交应该显示验证错误', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const submitButton = screen.getByRole('button', { name: '注册' });
    await user.click(submitButton);

    // 应该显示验证错误
    await waitFor(() => {
      expect(screen.getByText(/用户名/)).toBeInTheDocument();
    });

    // 不应该调用 API
    expect(mockAuthApi.register).not.toHaveBeenCalled();
  });

  it('太短的用户名应该显示错误提示', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await user.type(usernameInput, 'ab');

    const submitButton = screen.getByRole('button', { name: '注册' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/至少.*3.*字符/)).toBeInTheDocument();
    });
  });

  it('无效的邮箱格式应该显示错误提示', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const emailInput = screen.getByLabelText(/^邮箱地址$/);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: '注册' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/邮箱/)).toBeInTheDocument();
    });
  });

  it('太短的密码应该显示错误提示', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const passwordInput = screen.getByLabelText(/^密码$/);
    await user.type(passwordInput, 'short');

    const submitButton = screen.getByRole('button', { name: '注册' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/至少.*8.*字符/)).toBeInTheDocument();
    });
  });

  it('密码不匹配应该显示错误提示', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const passwordInput = screen.getByLabelText(/^密码$/);
    const confirmPasswordInput = screen.getByLabelText(/^确认密码$/);

    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password456');

    const submitButton = screen.getByRole('button', { name: '注册' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/密码.*不一致/)).toBeInTheDocument();
    });
  });
});

describe('RegisterForm - 提交成功场景', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('有效表单应该调用 authApi.register()', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    mockAuthApi.register.mockResolvedValue(createMockRegisterResponse());

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/^用户名$/), 'testuser');
    await user.type(screen.getByLabelText(/^邮箱地址$/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');
    await user.type(screen.getByLabelText(/^确认密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(mockAuthApi.register).toHaveBeenCalledWith(
        'testuser',
        'test@example.com',
        'password123'
      );
    });
  });

  it('注册成功后应该调用 authStore.setAuthUser()', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    const mockResponse = createMockRegisterResponse();
    mockAuthApi.register.mockResolvedValue(mockResponse);

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/^用户名$/), 'testuser');
    await user.type(screen.getByLabelText(/^邮箱地址$/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');
    await user.type(screen.getByLabelText(/^确认密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(mockAuthStore.setAuthUser).toHaveBeenCalledWith(
        mockResponse.user,
        mockResponse.tokens.access_token,
        mockResponse.tokens.refresh_token,
        mockResponse.tokens.expires_in
      );
    });
  });

  it('注册成功后应该调用 onSuccess 回调', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const onSuccess = jest.fn();

    const mockResponse = createMockRegisterResponse();
    mockAuthApi.register.mockResolvedValue(mockResponse);

    render(
      <RegisterForm
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        onSuccess={onSuccess}
      />
    );

    await user.type(screen.getByLabelText(/^用户名$/), 'testuser');
    await user.type(screen.getByLabelText(/^邮箱地址$/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');
    await user.type(screen.getByLabelText(/^确认密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResponse.user);
    });
  });
});

describe('RegisterForm - 提交失败场景', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该处理用户名已存在的错误', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    const error = new Error('Username already exists');
    (error as any).status = 400;
    mockAuthApi.register.mockRejectedValue(error);

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/^用户名$/), 'existinguser');
    await user.type(screen.getByLabelText(/^邮箱地址$/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');
    await user.type(screen.getByLabelText(/^确认密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(screen.getByText(/用户名已存在|已被注册/)).toBeInTheDocument();
    });

    expect(mockAuthStore.setAuthUser).not.toHaveBeenCalled();
  });

  it('应该处理邮箱已存在的错误', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    const error = new Error('Email already exists');
    (error as any).status = 400;
    mockAuthApi.register.mockRejectedValue(error);

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/^用户名$/), 'testuser');
    await user.type(screen.getByLabelText(/^邮箱地址$/), 'existing@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');
    await user.type(screen.getByLabelText(/^确认密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(screen.getByText(/邮箱已存在|已被注册/)).toBeInTheDocument();
    });
  });

  it('应该调用 onError 回调', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();
    const onError = jest.fn();

    const error = new Error('Registration failed');
    mockAuthApi.register.mockRejectedValue(error);

    render(
      <RegisterForm
        authApi={mockAuthApi}
        authStore={mockAuthStore}
        onError={onError}
      />
    );

    await user.type(screen.getByLabelText(/^用户名$/), 'testuser');
    await user.type(screen.getByLabelText(/^邮箱地址$/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');
    await user.type(screen.getByLabelText(/^确认密码$/), 'password123');

    await user.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});

describe('RegisterForm - 加载状态', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('提交时应该显示加载状态', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    mockAuthApi.register.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(createMockRegisterResponse()), 100))
    );

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/^用户名$/), 'testuser');
    await user.type(screen.getByLabelText(/^邮箱地址$/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');
    await user.type(screen.getByLabelText(/^确认密码$/), 'password123');

    const submitButton = screen.getByRole('button', { name: '注册' });
    await user.click(submitButton);

    // 按钮应该被禁用
    expect(submitButton).toBeDisabled();
  });

  it('提交完成后应该恢复可用状态', async () => {
    const user = userEvent.setup();
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    mockAuthApi.register.mockResolvedValue(createMockRegisterResponse());

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    await user.type(screen.getByLabelText(/^用户名$/), 'testuser');
    await user.type(screen.getByLabelText(/^邮箱地址$/), 'test@example.com');
    await user.type(screen.getByLabelText(/^密码$/), 'password123');
    await user.type(screen.getByLabelText(/^确认密码$/), 'password123');

    const submitButton = screen.getByRole('button', { name: '注册' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});

describe('RegisterForm - 可访问性', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('表单应该有正确的 ARIA 属性', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
  });

  it('输入框应该有关联的 label', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    expect(screen.getByLabelText(/^用户名$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^邮箱地址$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^密码$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^确认密码$/)).toBeInTheDocument();
  });

  it('提交按钮应该有 type="submit"', () => {
    const mockAuthApi = createMockAuthApi();
    const mockAuthStore = createMockAuthStore();

    render(<RegisterForm authApi={mockAuthApi} authStore={mockAuthStore} />);

    const submitButton = screen.getByRole('button', { name: '注册' });
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
});
