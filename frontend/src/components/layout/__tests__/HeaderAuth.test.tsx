/**
 * HeaderAuth 组件契约测试 (TDD)
 *
 * 契约定义 (基于 Issue #152 架构蓝图):
 * - 已认证时显示用户名和登出按钮
 * - 未认证时不渲染任何内容
 * - 点击登出按钮调用 logout()
 * - 登出过程中禁用按钮
 * - 容器使用 header-auth 类名
 * - 用户名使用 header-auth-username 类名
 * - 登出按钮使用 header-auth-logout 类名
 *
 * 注意: 此测试为契约测试，HeaderAuth 组件实现尚不存在
 * 预期: 这些测试在实现前会失败 (RED)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeaderAuth } from '../HeaderAuth';
import type { UseAuthResult } from '@/lib/hooks/useAuth';
import type { UserResponse } from '@/types/auth';

// Mock useAuth Hook
jest.mock('@/lib/hooks/useAuth');

// ============================================================================
// Mock 数据工厂
// ============================================================================

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
    refreshToken: jest.fn(),
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
    refreshToken: jest.fn(),
    clearError: jest.fn(),
  };
}

// ============================================================================
// 测试套件
// ============================================================================

describe('HeaderAuth - 渲染行为', () => {
  it('should render username and logout button when authenticated', () => {
    // Given: isAuthenticated = true, user.username = 'testuser'
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: 显示用户名和登出按钮
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('登出')).toBeInTheDocument();
  });

  it('should not render anything when not authenticated', () => {
    // Given: isAuthenticated = false
    const mockAuthState = createMockUnauthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 不渲染任何内容
    expect(container.firstChild).toBe(null);
  });

  it('should render nothing when user is null even if isAuthenticated is true', () => {
    // Given: isAuthenticated = true 但 user = null (边界情况)
    const mockAuthState = createMockAuthenticatedState({
      user: null,
    });

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 不渲染任何内容
    expect(container.firstChild).toBe(null);
  });

  it('should handle empty username gracefully', () => {
    // Given: 用户名为空字符串
    const mockAuthState = createMockAuthenticatedState({
      user: {
        id: 1,
        username: '',
        email: 'test@example.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
    });

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: 显示默认值 "用户"
    expect(screen.getByText('用户')).toBeInTheDocument();
  });

  it('should not render during loading without cached data', () => {
    // Given: status = 'loading', isAuthenticated = false, 无缓存数据
    const mockAuthState: UseAuthResult = {
      isAuthenticated: false,
      user: null,
      status: 'loading',
      isAuthenticating: true,
      error: null,
      logout: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
    };

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 不渲染任何内容（保守策略）
    expect(container.firstChild).toBe(null);
  });

  it('should render during loading with cached data (conservative)', () => {
    // Given: status = 'loading' 但有缓存用户数据（保守策略）
    const mockAuthState: UseAuthResult = {
      isAuthenticated: true,
      user: {
        id: 1,
        username: 'cacheduser',
        email: 'cached@example.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
      status: 'loading',
      isAuthenticating: true,
      error: null,
      logout: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
    };

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: 仍然显示缓存的用户信息
    expect(screen.getByText('cacheduser')).toBeInTheDocument();
  });
});

describe('HeaderAuth - 登出功能', () => {
  it('should call logout() when logout button is clicked', async () => {
    // Given: 已认证状态
    const mockLogout = jest.fn().mockResolvedValue(undefined);
    const mockAuthState = createMockAuthenticatedState({
      logout: mockLogout,
    });

    // When: 渲染组件并点击登出按钮
    render(<HeaderAuth authState={mockAuthState} />);
    const logoutButton = screen.getByText('登出');
    await userEvent.click(logoutButton);

    // Then: logout() 被调用一次
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('should call logout() without parameters', async () => {
    // Given: 已认证状态
    const mockLogout = jest.fn().mockResolvedValue(undefined);
    const mockAuthState = createMockAuthenticatedState({
      logout: mockLogout,
    });

    // When: 点击登出按钮
    render(<HeaderAuth authState={mockAuthState} />);
    await userEvent.click(screen.getByText('登出'));

    // Then: logout() 无参数调用
    expect(mockLogout).toHaveBeenCalledWith();
  });

  it('should update UI after successful logout', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    const { rerender } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 初始状态下显示用户名和登出按钮
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('登出')).toBeInTheDocument();

    // When: 登出后状态更新为未认证
    const unauthenticatedState = createMockUnauthenticatedState();
    rerender(<HeaderAuth authState={unauthenticatedState} />);

    // Then: UI 更新，不再显示任何内容
    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
    expect(screen.queryByText('登出')).not.toBeInTheDocument();
  });

  it('should handle logout promise rejection gracefully', async () => {
    // Given: logout() 返回 rejected promise
    const mockLogout = jest.fn().mockRejectedValue(new Error('Network error'));
    const mockAuthState = createMockAuthenticatedState({
      logout: mockLogout,
    });

    // When: 点击登出按钮
    render(<HeaderAuth authState={mockAuthState} />);
    const logoutButton = screen.getByText('登出');

    // Then: 点击不应抛出错误（组件内部处理）
    await expect(userEvent.click(logoutButton)).resolves.not.toThrow();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

describe('HeaderAuth - 样式类名', () => {
  it('should apply correct CSS classes to container', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 容器有 header-auth 类名
    const authContainer = container.querySelector('.header-auth');
    expect(authContainer).toBeInTheDocument();
  });

  it('should apply correct CSS classes to username', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 用户名元素有 header-auth-username 类名
    const usernameElement = container.querySelector('.header-auth-username');
    expect(usernameElement).toBeInTheDocument();
    expect(usernameElement).toHaveTextContent('testuser');
  });

  it('should apply correct CSS classes to logout button', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 登出按钮有 header-auth-logout 类名
    const logoutButton = container.querySelector('.header-auth-logout');
    expect(logoutButton).toBeInTheDocument();
  });

  it('should apply btn-outline and btn-sm classes to logout button', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 登出按钮有 btn-outline 和 btn-sm 类名
    const logoutButton = container.querySelector('.header-auth-logout');
    expect(logoutButton).toHaveClass('btn-outline');
    expect(logoutButton).toHaveClass('btn-sm');
  });

  it('should render container with flex and gap styles', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 容器有 flex 和 items-center 类（Tailwind flex 工具类）
    const authContainer = container.querySelector('.header-auth');
    expect(authContainer).toHaveClass('flex');
    expect(authContainer).toHaveClass('items-center');
  });
});

describe('HeaderAuth - 可访问性', () => {
  it('should have proper aria-label on logout button', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: 登出按钮有 aria-label
    const logoutButton = screen.getByText('登出');
    expect(logoutButton).toHaveAttribute('aria-label', '登出');
  });

  it('should have button role for logout action', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: 登出按钮是 button 元素
    const logoutButton = screen.getByRole('button', { name: '登出' });
    expect(logoutButton).toBeInTheDocument();
  });

  it('should be keyboard navigable (tab index)', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: 登出按钮可以通过 Tab 键访问（默认行为）
    const logoutButton = screen.getByRole('button', { name: '登出' });
    expect(logoutButton.tagName).toBe('BUTTON');
  });

  it('should not render interactive elements when not authenticated', () => {
    // Given: 未认证状态
    const mockAuthState = createMockUnauthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 不渲染任何内容（无按钮、无链接）
    expect(container.firstChild).toBe(null);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('HeaderAuth - 快照测试', () => {
  it('should match snapshot when authenticated', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 快照匹配
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot when not authenticated', () => {
    // Given: 未认证状态
    const mockAuthState = createMockUnauthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 快照匹配（应为 null）
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with empty username', () => {
    // Given: 用户名为空
    const mockAuthState = createMockAuthenticatedState({
      user: {
        id: 1,
        username: '',
        email: 'test@example.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
    });

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 快照匹配（应显示 "用户"）
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe('HeaderAuth - 组件结构', () => {
  it('should render username before logout button', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 用户名在登出按钮之前
    const authContainer = container.querySelector('.header-auth');
    const children = authContainer?.children;
    expect(children?.[0]).toHaveClass('header-auth-username');
    expect(children?.[1]).toHaveClass('header-auth-logout');
  });

  it('should render exactly two children when authenticated', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 容器有两个子元素（用户名 + 登出按钮）
    const authContainer = container.querySelector('.header-auth');
    expect(authContainer?.children).toHaveLength(2);
  });
});

describe('HeaderAuth - 边界情况', () => {
  it('should handle user object with missing username field', () => {
    // Given: user 对象缺少 username（类型不完整）
    const mockAuthState = createMockAuthenticatedState({
      user: {
        id: 1,
        username: '',
        email: 'test@example.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      } as UserResponse,
    });

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: 显示默认值
    expect(screen.getByText('用户')).toBeInTheDocument();
  });

  it('should render without authState prop (uses useAuth hook)', () => {
    // Given: 未提供 authState prop（需要 mock useAuth）
    const mockUseAuth = require('@/lib/hooks/useAuth').useAuth;
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());

    // When: 渲染组件（不传 authState）
    const { container } = render(<HeaderAuth />);

    // Then: 组件渲染（使用内部 useAuth）
    expect(container.querySelector('.header-auth')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();

    // Cleanup
    mockUseAuth.mockRestore();
  });
});
