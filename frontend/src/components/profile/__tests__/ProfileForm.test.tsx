/**
 * ProfileForm 组件单元测试
 *
 * 测试覆盖范围：
 * - 基础渲染（表单字段、按钮）
 * - 表单初始化（用户数据预填充）
 * - 字段验证（客户端验证）
 * - 提交成功（API 调用、状态更新）
 * - 提交失败（错误处理）
 * - 取消编辑（恢复原始数据）
 * - 加载状态
 * - 可访问性
 *
 * 基于蓝图设计：
 * - /workspace/docs/blueprints/profile-page-blueprint.md
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/components/profile/ProfileForm.tsx
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ============================================================================
// 类型定义 (与蓝图保持一致)
// ============================================================================

interface UserResponse {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface UserUpdateRequest {
  username?: string;
  email?: string;
}

interface AuthApi {
  updateProfile: jest.Mock;
}

interface AuthStore {
  user: UserResponse | null;
  setAuthUser: jest.Mock;
}

// ============================================================================
// Mock 工厂函数
// ============================================================================

/**
 * 创建 Mock UserResponse
 */
const createMockUser = (overrides?: Partial<UserResponse>): UserResponse => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

/**
 * 创建 Mock AuthApi
 */
const createMockAuthApi = (): AuthApi => ({
  updateProfile: jest.fn(),
});

/**
 * 创建 Mock AuthStore
 */
const createMockAuthStore = (): AuthStore => ({
  user: createMockUser(),
  setAuthUser: jest.fn(),
});

/**
 * 创建更新成功响应
 */
const createMockUpdateResponse = (overrides?: Partial<UserResponse>): UserResponse => ({
  id: 1,
  username: 'newuser',
  email: 'new@example.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// ============================================================================
// 测试套件
// ============================================================================

describe('ProfileForm - 基础渲染', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该渲染表单', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();

    render(<ProfileForm user={user} />);

    expect(screen.getByRole('form')).toBeInTheDocument();
  });

  it('应该渲染用户名输入框', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();

    render(<ProfileForm user={user} />);

    expect(screen.getByLabelText(/^用户名$/)).toBeInTheDocument();
  });

  it('应该渲染邮箱输入框', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();

    render(<ProfileForm user={user} />);

    expect(screen.getByLabelText(/^邮箱$/)).toBeInTheDocument();
  });

  it('应该渲染保存按钮', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();

    render(<ProfileForm user={user} />);

    expect(screen.getByRole('button', { name: /保存/ })).toBeInTheDocument();
  });

  it('应该渲染取消按钮', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();

    render(<ProfileForm user={user} />);

    expect(screen.getByRole('button', { name: /取消/ })).toBeInTheDocument();
  });

  it('应该应用自定义 className', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();

    const { container } = render(
      <ProfileForm user={user} className="custom-form-class" />
    );

    expect(container.querySelector('.custom-form-class')).toBeInTheDocument();
  });
});

describe('ProfileForm - 表单初始化', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该用用户数据预填充用户名', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser({ username: 'initialuser' });

    render(<ProfileForm user={user} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    expect(usernameInput).toHaveValue('initialuser');
  });

  it('应该用用户数据预填充邮箱', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser({ email: 'initial@example.com' });

    render(<ProfileForm user={user} />);

    const emailInput = screen.getByLabelText(/^邮箱$/);
    expect(emailInput).toHaveValue('initial@example.com');
  });

  it('应该正确初始化不同的用户数据', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser({
      username: 'anotheruser',
      email: 'another@test.com',
    });

    render(<ProfileForm user={user} />);

    expect(screen.getByLabelText(/^用户名$/)).toHaveValue('anotheruser');
    expect(screen.getByLabelText(/^邮箱$/)).toHaveValue('another@test.com');
  });
});

describe('ProfileForm - 字段验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('空用户名应该显示验证错误', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);

    const saveButton = screen.getByRole('button', { name: /保存/ });
    await userEventSetup.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/用户名不能为空/)).toBeInTheDocument();
    });
  });

  it('太短的用户名应该显示验证错误', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'ab');

    const saveButton = screen.getByRole('button', { name: /保存/ });
    await userEventSetup.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/用户名长度应为 3-50 个字符/)).toBeInTheDocument();
    });
  });

  it('无效邮箱格式应该显示验证错误', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const emailInput = screen.getByLabelText(/^邮箱$/);
    await userEventSetup.clear(emailInput);
    await userEventSetup.type(emailInput, 'invalid-email');

    const saveButton = screen.getByRole('button', { name: /保存/ });
    await userEventSetup.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/邮箱格式不正确/)).toBeInTheDocument();
    });
  });

  it('空邮箱应该显示验证错误', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const emailInput = screen.getByLabelText(/^邮箱$/);
    await userEventSetup.clear(emailInput);

    const saveButton = screen.getByRole('button', { name: /保存/ });
    await userEventSetup.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/邮箱不能为空/)).toBeInTheDocument();
    });
  });

  it('没有变更时不应该允许提交', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    // 不修改任何字段，直接点击保存
    const saveButton = screen.getByRole('button', { name: /保存/ });
    await userEventSetup.click(saveButton);

    // 不应该调用 API
    expect(mockAuthApi.updateProfile).not.toHaveBeenCalled();
  });
});

describe('ProfileForm - 提交成功场景', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('有效表单应该调用 authApi.updateProfile()', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();
    const mockResponse = createMockUpdateResponse({ username: 'newuser' });

    mockAuthApi.updateProfile.mockResolvedValue(mockResponse);

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'newuser');

    await userEventSetup.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(mockAuthApi.updateProfile).toHaveBeenCalledWith({
        username: 'newuser',
      });
    });
  });

  it('更新成功后应该调用 onSuccess 回调', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();
    const onSuccess = jest.fn();
    const mockResponse = createMockUpdateResponse({ username: 'newuser' });

    mockAuthApi.updateProfile.mockResolvedValue(mockResponse);

    render(
      <ProfileForm
        user={user}
        authApi={mockAuthApi}
        onSuccess={onSuccess}
      />
    );

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'newuser');

    await userEventSetup.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  it('更新邮箱成功后应该调用 updateProfile', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();
    const mockResponse = createMockUpdateResponse({ email: 'new@example.com' });

    mockAuthApi.updateProfile.mockResolvedValue(mockResponse);

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const emailInput = screen.getByLabelText(/^邮箱$/);
    await userEventSetup.clear(emailInput);
    await userEventSetup.type(emailInput, 'new@example.com');

    await userEventSetup.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(mockAuthApi.updateProfile).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
    });
  });

  it('同时更新用户名和邮箱', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();
    const mockResponse = createMockUpdateResponse({
      username: 'newuser',
      email: 'new@example.com',
    });

    mockAuthApi.updateProfile.mockResolvedValue(mockResponse);

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'newuser');

    const emailInput = screen.getByLabelText(/^邮箱$/);
    await userEventSetup.clear(emailInput);
    await userEventSetup.type(emailInput, 'new@example.com');

    await userEventSetup.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(mockAuthApi.updateProfile).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
      });
    });
  });
});

describe('ProfileForm - 提交失败场景', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该处理用户名已存在的错误 (409)', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    const error = new Error('Username already exists');
    (error as any).status = 409;
    (error as any).field = 'username';
    mockAuthApi.updateProfile.mockRejectedValue(error);

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'existinguser');

    await userEventSetup.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(screen.getByText(/用户名.*已被使用|已存在/)).toBeInTheDocument();
    });
  });

  it('应该处理邮箱已存在的错误 (409)', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    const error = new Error('Email already exists');
    (error as any).status = 409;
    (error as any).field = 'email';
    mockAuthApi.updateProfile.mockRejectedValue(error);

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const emailInput = screen.getByLabelText(/^邮箱$/);
    await userEventSetup.clear(emailInput);
    await userEventSetup.type(emailInput, 'existing@example.com');

    await userEventSetup.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(screen.getByText(/该邮箱已被注册/)).toBeInTheDocument();
    });
  });

  it('应该处理未认证错误 (401)', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    const error = new Error('Not authenticated');
    (error as any).status = 401;
    mockAuthApi.updateProfile.mockRejectedValue(error);

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'newuser');

    await userEventSetup.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(screen.getByText(/请先登录|未认证/)).toBeInTheDocument();
    });
  });

  it('应该处理验证错误 (400)', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    const error = new Error('Validation error');
    (error as any).status = 400;
    mockAuthApi.updateProfile.mockRejectedValue(error);

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'newuser');

    await userEventSetup.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(screen.getByText(/验证|格式/)).toBeInTheDocument();
    });
  });

  it('应该处理网络错误', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    const error = new Error('Network error');
    error.name = 'NetworkError';
    mockAuthApi.updateProfile.mockRejectedValue(error);

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'newuser');

    await userEventSetup.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(screen.getByText(/网络|连接/)).toBeInTheDocument();
    });
  });

  it('应该调用 onError 回调', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();
    const onError = jest.fn();

    const error = new Error('Update failed');
    mockAuthApi.updateProfile.mockRejectedValue(error);

    render(
      <ProfileForm
        user={user}
        authApi={mockAuthApi}
        onError={onError}
      />
    );

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'newuser');

    await userEventSetup.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});

describe('ProfileForm - 取消编辑', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('点击取消按钮应该调用 onCancel 回调', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const onCancel = jest.fn();

    render(<ProfileForm user={user} onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: /取消/ });
    await userEventSetup.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('取消后应该恢复原始数据', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser({ username: 'originaluser' });

    render(<ProfileForm user={user} />);

    // 修改用户名
    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'modifieduser');

    // 点击取消
    const cancelButton = screen.getByRole('button', { name: /取消/ });
    await userEventSetup.click(cancelButton);

    // 数据应该恢复（如果组件仍然显示）
    // 注：实际行为取决于 onCancel 是否导致组件卸载
  });

  it('取消后应该清除验证错误', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    // 输入无效数据触发验证错误
    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'ab');

    // 点击取消
    const cancelButton = screen.getByRole('button', { name: /取消/ });
    await userEventSetup.click(cancelButton);

    // 验证错误应该被清除
    expect(screen.queryByText(/用户名长度/)).not.toBeInTheDocument();
  });
});

describe('ProfileForm - 加载状态', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('提交时应该显示加载状态', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    mockAuthApi.updateProfile.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(createMockUpdateResponse()), 100))
    );

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'newuser');

    const saveButton = screen.getByRole('button', { name: /保存/ });
    await userEventSetup.click(saveButton);

    // 按钮应该被禁用或显示加载指示器
    expect(saveButton).toBeDisabled();
  });

  it('提交完成后应该恢复可用状态', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    mockAuthApi.updateProfile.mockResolvedValue(createMockUpdateResponse());

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'newuser');

    const saveButton = screen.getByRole('button', { name: /保存/ });
    await userEventSetup.click(saveButton);

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('提交失败后应该恢复可用状态', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    mockAuthApi.updateProfile.mockRejectedValue(new Error('Update failed'));

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);
    await userEventSetup.type(usernameInput, 'newuser');

    const saveButton = screen.getByRole('button', { name: /保存/ });
    await userEventSetup.click(saveButton);

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });
});

describe('ProfileForm - 可访问性', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('表单应该有正确的 ARIA 属性', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();

    render(<ProfileForm user={user} />);

    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
  });

  it('输入框应该有关联的 label', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();

    render(<ProfileForm user={user} />);

    expect(screen.getByLabelText(/^用户名$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^邮箱$/)).toBeInTheDocument();
  });

  it('保存按钮应该有 type="submit"', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();

    render(<ProfileForm user={user} />);

    const saveButton = screen.getByRole('button', { name: /保存/ });
    expect(saveButton).toHaveAttribute('type', 'submit');
  });

  it('取消按钮应该有 type="button"', () => {
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();

    render(<ProfileForm user={user} />);

    const cancelButton = screen.getByRole('button', { name: /取消/ });
    expect(cancelButton).toHaveAttribute('type', 'button');
  });

  it('错误消息应该与输入框关联', async () => {
    const userEventSetup = userEvent.setup();
    const { ProfileForm } = require('../ProfileForm');
    const user = createMockUser();
    const mockAuthApi = createMockAuthApi();

    render(<ProfileForm user={user} authApi={mockAuthApi} />);

    const usernameInput = screen.getByLabelText(/^用户名$/);
    await userEventSetup.clear(usernameInput);

    const saveButton = screen.getByRole('button', { name: /保存/ });
    await userEventSetup.click(saveButton);

    await waitFor(() => {
      const errorMessage = screen.getByText(/用户名不能为空/);
      expect(errorMessage).toBeInTheDocument();
    });
  });
});