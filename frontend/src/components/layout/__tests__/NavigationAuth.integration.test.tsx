/**
 * Navigation 组件认证功能集成测试
 *
 * 测试覆盖范围：
 * - 场景 1: 认证状态切换（已认证 ⇄ 未认证）
 * - 场景 2: 加载状态行为
 * - 场景 3: 与 useAuth Hook 集成
 *
 * 测试策略：
 * - 使用 React Testing Library 的 render() 和 rerender()
 * - 使用 jest.mock 模拟 useAuth Hook
 * - 测试状态切换时 UI 的响应性
 * - 验证组件与 useAuth Hook 的完整集成
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navigation } from '../Navigation';
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

// 测试用导航项
const mockItems = [
  { id: '1', label: 'Home', href: '/' },
  { id: '2', label: 'Tasks', href: '/tasks' },
];

// ============================================================================
// 测试套件
// ============================================================================

describe('Navigation - 认证状态切换', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('should update button href when auth state changes', () => {
    // Given: 初始未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // Then: 登录按钮 href="/login"
    const loginButton = screen.getByText('登录');
    expect(loginButton.closest('a')).toHaveAttribute('href', '/login');

    // When: 切换到已认证再回到未认证
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    rerender(<Navigation items={mockItems} />);

    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: 登录按钮仍然有正确的 href
    const loginButtonAfter = screen.getByText('登录');
    expect(loginButtonAfter.closest('a')).toHaveAttribute('href', '/login');
  });

  it('should preserve button styles during state transitions', () => {
    // Given: 初始未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // Then: 按钮有正确的样式类
    const loginButton = screen.getByText('登录').closest('a');
    const registerButton = screen.getByText('注册').closest('a');
    expect(loginButton).toHaveClass('btn-outline');
    expect(registerButton).toHaveClass('btn-primary');

    // When: 切换到已认证再回到未认证
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    rerender(<Navigation items={mockItems} />);

    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: 按钮样式保持不变
    const loginButtonAfter = screen.getByText('登录').closest('a');
    const registerButtonAfter = screen.getByText('注册').closest('a');
    expect(loginButtonAfter).toHaveClass('btn-outline');
    expect(registerButtonAfter).toHaveClass('btn-primary');
  });
});

describe('Navigation - 加载状态', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    expect(screen.queryByText('注册')).not.toBeInTheDocument();
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
    expect(screen.getByText('注册')).toBeInTheDocument();
  });

  it('should show regular nav items during loading state', () => {
    // Given: 加载状态
    mockUseAuth.mockReturnValue(createMockLoadingState());

    // When: 渲染组件
    render(<Navigation items={mockItems} />);

    // Then: 普通导航项仍然显示
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('should complete full state cycle: unauthenticated -> loading -> authenticated', () => {
    // Given: 初始未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // Then: 显示认证按钮
    expect(screen.getByText('登录')).toBeInTheDocument();

    // When: 进入加载状态
    mockUseAuth.mockReturnValue(createMockLoadingState());
    rerender(<Navigation items={mockItems} />);

    // Then: 仍然显示认证按钮
    expect(screen.getByText('登录')).toBeInTheDocument();

    // When: 完成加载，进入已认证状态
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: 隐藏认证按钮
    expect(screen.queryByText('登录')).not.toBeInTheDocument();
  });
});

describe('Navigation - useAuth Hook 集成', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call useAuth hook on render', () => {
    // When: 渲染组件
    render(<Navigation items={mockItems} />);

    // Then: useAuth 被调用
    expect(mockUseAuth).toHaveBeenCalled();
  });

  it('should call useAuth hook exactly once per render', () => {
    // When: 渲染组件
    render(<Navigation items={mockItems} />);

    // Then: useAuth 被调用一次
    expect(mockUseAuth).toHaveBeenCalledTimes(1);
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

  it('should use isAuthenticated from useAuth result', () => {
    // Given: isAuthenticated = false
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // Then: 显示认证按钮
    expect(screen.getByText('登录')).toBeInTheDocument();

    // When: isAuthenticated = true
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: 隐藏认证按钮
    expect(screen.queryByText('登录')).not.toBeInTheDocument();
  });

  it('should work with different user data', () => {
    // Given: 已认证状态，但用户名不同
    const customUser: UserResponse = {
      id: 999,
      username: 'customuser',
      email: 'custom@example.com',
      is_active: true,
      created_at: '2024-03-05T00:00:00Z',
    };
    mockUseAuth.mockReturnValue(createMockAuthenticatedState({ user: customUser }));

    // When: 渲染组件
    render(<Navigation items={mockItems} />);

    // Then: 隐藏认证按钮（用户名不影响认证按钮的显示）
    expect(screen.queryByText('登录')).not.toBeInTheDocument();
    expect(screen.queryByText('注册')).not.toBeInTheDocument();
  });
});

describe('Navigation - 与 HeaderAuth 协同场景', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show auth buttons when unauthenticated (complementary to HeaderAuth)', () => {
    // Given: 未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());

    // When: 渲染 Navigation 组件
    render(<Navigation items={mockItems} />);

    // Then: 显示登录/注册按钮（HeaderAuth 此时应该不显示）
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('注册')).toBeInTheDocument();
  });

  it('should hide auth buttons when authenticated (HeaderAuth shows user info)', () => {
    // Given: 已认证状态
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());

    // When: 渲染 Navigation 组件
    render(<Navigation items={mockItems} />);

    // Then: 不显示认证按钮（HeaderAuth 此时应显示用户信息）
    expect(screen.queryByText('登录')).not.toBeInTheDocument();
    expect(screen.queryByText('注册')).not.toBeInTheDocument();
  });

  it('should handle synchronized auth state changes', () => {
    // Given: 未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // Then: 显示认证按钮
    expect(screen.getByText('登录')).toBeInTheDocument();

    // When: 模拟登录成功（状态同步更新）
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: Navigation 隐藏认证按钮，HeaderAuth 应显示用户信息
    expect(screen.queryByText('登录')).not.toBeInTheDocument();

    // When: 模拟登出（状态同步更新）
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: Navigation 显示认证按钮，HeaderAuth 应隐藏
    expect(screen.getByText('登录')).toBeInTheDocument();
  });
});

describe('Navigation - 边界情况处理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle empty items array with auth state', () => {
    // Given: 未认证状态 + 空导航项
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());

    // When: 渲染组件
    render(<Navigation items={[]} />);

    // Then: 仍显示认证按钮
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('注册')).toBeInTheDocument();
  });

  it('should handle authenticated state with empty items array', () => {
    // Given: 已认证状态 + 空导航项
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());

    // When: 渲染组件
    render(<Navigation items={[]} />);

    // Then: 不显示认证按钮
    expect(screen.queryByText('登录')).not.toBeInTheDocument();
    expect(screen.queryByText('注册')).not.toBeInTheDocument();
  });

  it('should handle rapid state changes', () => {
    // Given: 初始未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // When: 快速切换状态多次
    for (let i = 0; i < 5; i++) {
      const isEven = i % 2 === 0;
      mockUseAuth.mockReturnValue(
        isEven ? createMockAuthenticatedState() : createMockUnauthenticatedState()
      );
      rerender(<Navigation items={mockItems} />);
    }

    // Then: 最终状态正确反映（最后一次是未认证）
    expect(screen.getByText('登录')).toBeInTheDocument();
  });

  it('should preserve navigation role during auth state changes', () => {
    // Given: 未认证状态
    mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
    const { rerender } = render(<Navigation items={mockItems} />);

    // Then: 导航容器有 role="navigation"
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();

    // When: 切换到已认证状态
    mockUseAuth.mockReturnValue(createMockAuthenticatedState());
    rerender(<Navigation items={mockItems} />);

    // Then: 导航容器仍然有 role="navigation"
    const navAfter = screen.getByRole('navigation');
    expect(navAfter).toBeInTheDocument();
  });
});
