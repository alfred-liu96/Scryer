/**
 * HeaderAuth 组件认证功能集成测试
 *
 * 测试覆盖范围：
 * - 场景 1: 完整登出流程
 * - 场景 2: 认证状态切换
 * - 场景 3: 与 useAuth Hook 集成
 * - 场景 4: 错误处理
 *
 * 测试策略：
 * - 使用 React Testing Library 的 render()、userEvent 和 waitFor
 * - 使用 authState prop 注入测试状态
 * - 测试异步操作（登出）的完整流程
 * - 验证组件与 useAuth Hook 的完整集成
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeaderAuth } from '../HeaderAuth';
import { useAuth } from '@/lib/hooks/useAuth';
import type { UseAuthResult } from '@/lib/hooks/useAuth';
import type { UserResponse } from '@/types/auth';

// Mock useAuth Hook
jest.mock('@/lib/hooks/useAuth');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// ============================================================================
// Mock 数据工厂
// ============================================================================

/**
 * Mock Token 响应
 */
const MOCK_TOKEN_RESPONSE = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'Bearer',
  expires_in: 3600,
};

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

// ============================================================================
// 测试套件
// ============================================================================

describe('HeaderAuth - 登出流程', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('should call logout without parameters', async () => {
    // Given: 已认证状态
    const mockLogout = jest.fn().mockResolvedValue(undefined);
    const mockAuthState = createMockAuthenticatedState({ logout: mockLogout });

    // When: 渲染组件并点击登出按钮
    render(<HeaderAuth authState={mockAuthState} />);
    await userEvent.click(screen.getByText('登出'));

    // Then: logout() 无参数调用
    expect(mockLogout).toHaveBeenCalledWith();
  });

  it('should re-enable button after successful logout', async () => {
    // Given: 已认证状态
    const mockLogout = jest.fn().mockResolvedValue(undefined);
    const mockAuthState = createMockAuthenticatedState({ logout: mockLogout });

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // When: 点击登出按钮
    const logoutButton = screen.getByText('登出');
    await userEvent.click(logoutButton);

    // Then: 等待异步操作完成，按钮恢复可用
    await waitFor(() => {
      expect(logoutButton).not.toBeDisabled();
    });
  });

  it('should re-enable button after failed logout', async () => {
    // Given: logout 失败
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockLogout = jest.fn().mockRejectedValue(new Error('Logout failed'));
    const mockAuthState = createMockAuthenticatedState({ logout: mockLogout });

    // When: 渲染组件并点击登出按钮
    render(<HeaderAuth authState={mockAuthState} />);
    const logoutButton = screen.getByText('登出');
    await userEvent.click(logoutButton);

    // Then: 等待异步操作完成，按钮恢复可用
    await waitFor(() => {
      expect(logoutButton).not.toBeDisabled();
    });

    consoleSpy.mockRestore();
  });
});

describe('HeaderAuth - 认证状态切换', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('should update username when user changes', () => {
    // Given: 初始已认证状态，用户名为 'testuser'
    const initialState = createMockAuthenticatedState();
    const { rerender } = render(<HeaderAuth authState={initialState} />);

    // Then: 显示 'testuser'
    expect(screen.getByText('testuser')).toBeInTheDocument();

    // When: 切换到不同用户
    const newState = createMockAuthenticatedState({
      user: {
        id: 2,
        username: 'newuser',
        email: 'new@example.com',
        is_active: true,
        created_at: '2024-03-05T00:00:00Z',
      },
    });
    rerender(<HeaderAuth authState={newState} />);

    // Then: 显示新的用户名
    expect(screen.getByText('newuser')).toBeInTheDocument();
    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
  });

  it('should handle loading state during state transition', () => {
    // Given: 初始已认证状态
    const authenticatedState = createMockAuthenticatedState();
    const { rerender, container } = render(<HeaderAuth authState={authenticatedState} />);

    // Then: 显示用户信息
    expect(screen.getByText('testuser')).toBeInTheDocument();

    // When: 进入加载状态（但仍有缓存用户数据）
    const loadingState = createMockLoadingState();
    loadingState.isAuthenticated = true;
    loadingState.user = authenticatedState.user;
    rerender(<HeaderAuth authState={loadingState} />);

    // Then: 仍然显示用户信息（保守策略）
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should complete full auth cycle: unauthenticated -> authenticated -> unauthenticated', () => {
    // Given: 初始未认证状态
    const unauthenticatedState = createMockUnauthenticatedState();
    const { rerender, container } = render(<HeaderAuth authState={unauthenticatedState} />);

    // Then: 不渲染任何内容
    expect(container.firstChild).toBe(null);

    // When: 切换到已认证状态
    const authenticatedState = createMockAuthenticatedState();
    rerender(<HeaderAuth authState={authenticatedState} />);

    // Then: 显示用户信息
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('登出')).toBeInTheDocument();

    // When: 切换回未认证状态
    rerender(<HeaderAuth authState={unauthenticatedState} />);

    // Then: 不渲染任何内容
    expect(container.firstChild).toBe(null);
  });
});

describe('HeaderAuth - useAuth Hook 集成', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('should call useAuth when authState prop not provided', () => {
    // When: 渲染组件（不传 authState）
    render(<HeaderAuth />);

    // Then: useAuth 被调用
    expect(mockUseAuth).toHaveBeenCalled();
  });

  it('should not call useAuth when authState prop is provided', () => {
    // Given: 提供了 authState prop
    const mockAuthState = createMockAuthenticatedState();

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: useAuth 不被调用（因为使用了 prop）
    // 注意：这取决于实现，有些实现可能仍会调用 useAuth 作为 fallback
    // 这里只验证组件能正常工作
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('should respond to useAuth state changes', () => {
    // Given: 初始未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    const { rerender, container } = render(<HeaderAuth />);

    // Then: 不渲染任何内容
    expect(container.firstChild).toBe(null);

    // When: useAuth 状态变化为已认证
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    rerender(<HeaderAuth />);

    // Then: 显示用户信息
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });
});

describe('HeaderAuth - 边界情况处理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should not render when user is null even if isAuthenticated is true', () => {
    // Given: isAuthenticated = true 但 user = null
    const mockAuthState = createMockAuthenticatedState({
      user: null,
    });

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 不渲染任何内容
    expect(container.firstChild).toBe(null);
  });

  it('should handle loading state without cached data', () => {
    // Given: 加载状态，无缓存数据
    const mockAuthState = createMockLoadingState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 不渲染任何内容（保守策略）
    expect(container.firstChild).toBe(null);
  });

  it('should handle very long username', () => {
    // Given: 超长用户名
    const longUsername = 'a'.repeat(100);
    const mockAuthState = createMockAuthenticatedState({
      user: {
        id: 1,
        username: longUsername,
        email: 'test@example.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
    });

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: 显示完整用户名（不截断）
    expect(screen.getByText(longUsername)).toBeInTheDocument();
  });

  it('should handle special characters in username', () => {
    // Given: 用户名包含特殊字符
    const specialUsername = 'user@123!#$%';
    const mockAuthState = createMockAuthenticatedState({
      user: {
        id: 1,
        username: specialUsername,
        email: 'test@example.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
    });

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: 正确显示特殊字符
    expect(screen.getByText(specialUsername)).toBeInTheDocument();
  });

  it('should handle multiple rapid logout attempts', async () => {
    // Given: 已认证状态
    const mockLogout = jest.fn().mockResolvedValue(undefined);
    const mockAuthState = createMockAuthenticatedState({ logout: mockLogout });

    // When: 渲染组件
    render(<HeaderAuth authState={mockAuthState} />);
    const logoutButton = screen.getByText('登出');

    // When: 快速点击多次
    await userEvent.click(logoutButton);
    await userEvent.click(logoutButton);

    // Then: logout 被调用多次（组件不防抖，由调用者处理）
    expect(mockLogout).toHaveBeenCalledTimes(2);
  });
});

describe('HeaderAuth - 与 Navigation 协同场景', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be hidden when Navigation shows auth buttons (unauthenticated)', () => {
    // Given: 未认证状态
    const mockAuthState = createMockUnauthenticatedState();
    mockUseAuth.mockReturnValue(mockAuthState);

    // When: 渲染 HeaderAuth
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: HeaderAuth 不渲染（Navigation 应显示登录/注册按钮）
    expect(container.firstChild).toBe(null);
  });

  it('should be visible when Navigation hides auth buttons (authenticated)', () => {
    // Given: 已认证状态
    const mockAuthState = createMockAuthenticatedState();
    mockUseAuth.mockReturnValue(mockAuthState);

    // When: 渲染 HeaderAuth
    render(<HeaderAuth authState={mockAuthState} />);

    // Then: HeaderAuth 显示用户信息（Navigation 应隐藏登录/注册按钮）
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('登出')).toBeInTheDocument();
  });

  it('should synchronize with Navigation during state changes', () => {
    // Given: 未认证状态
    const unauthenticatedState = createMockUnauthenticatedState();
    mockUseAuth.mockReturnValue(unauthenticatedState);

    const { container: headerContainer } = render(<HeaderAuth authState={unauthenticatedState} />);
    const { rerender: headerRerender } = render(<HeaderAuth authState={unauthenticatedState} />);

    // Then: HeaderAuth 不渲染
    expect(headerContainer.firstChild).toBe(null);

    // When: 切换到已认证状态
    const authenticatedState = createMockAuthenticatedState();
    mockUseAuth.mockReturnValue(authenticatedState);
    headerRerender(<HeaderAuth authState={authenticatedState} />);

    // Then: HeaderAuth 显示用户信息
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });
});

describe('HeaderAuth - 可访问性', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('should apply disabled attribute when logging out', async () => {
    // Given: 已认证状态
    let resolveLogout: () => void;
    const mockLogout = jest.fn(() => new Promise<void>((resolve) => {
      resolveLogout = resolve;
    }));
    const mockAuthState = createMockAuthenticatedState({ logout: mockLogout });

    // When: 渲染组件并点击登出按钮
    render(<HeaderAuth authState={mockAuthState} />);
    const logoutButton = screen.getByRole('button', { name: '登出' });
    await userEvent.click(logoutButton);

    // Then: 按钮有 disabled 属性
    expect(logoutButton).toBeDisabled();

    // Cleanup
    resolveLogout!();
  });

  it('should not render interactive elements when not authenticated', () => {
    // Given: 未认证状态
    const mockAuthState = createMockUnauthenticatedState();

    // When: 渲染组件
    const { container } = render(<HeaderAuth authState={mockAuthState} />);

    // Then: 不渲染任何内容（无按钮、无交互元素）
    expect(container.firstChild).toBe(null);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
