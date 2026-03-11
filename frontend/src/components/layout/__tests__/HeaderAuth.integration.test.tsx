/**
 * HeaderAuth 集成测试
 *
 * 验证 Header + HeaderAuth 组合在导航栏中的行为
 *
 * 测试范围：
 * - 场景 1: 已认证状态 - Header + HeaderAuth 组合显示用户信息和登出按钮
 * - 场景 2: 未认证状态 - actions 区域为空
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';
import { HeaderAuth } from '../HeaderAuth';
import { useAuth } from '@/lib/hooks/useAuth';
import type { UseAuthResult } from '@/lib/hooks/useAuth';

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

// ============================================================================
// 测试套件
// ============================================================================

describe('Header + HeaderAuth 集成', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('已认证状态', () => {
    it('should render HeaderAuth in actions slot when authenticated', () => {
      // Given: 已认证状态
      mockUseAuth.mockReturnValue(createMockAuthenticatedState());

      // When: 渲染 Header with HeaderAuth as actions
      render(<Header actions={<HeaderAuth />} />);

      // Then: actions 区域显示用户信息和登出按钮
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('登出')).toBeInTheDocument();
    });

    it('should render user info within header-actions container', () => {
      // Given: 已认证状态
      mockUseAuth.mockReturnValue(createMockAuthenticatedState());

      // When: 渲染 Header with HeaderAuth
      const { container } = render(<Header actions={<HeaderAuth />} />);

      // Then: HeaderAuth 渲染在 header-actions 容器内
      const actionsContainer = container.querySelector('.header-actions');
      expect(actionsContainer).toBeInTheDocument();
      expect(actionsContainer).not.toBeEmptyDOMElement();
      expect(actionsContainer?.querySelector('.header-auth')).toBeInTheDocument();
    });

    it('should display correct username from auth state', () => {
      // Given: 已认证状态，自定义用户名
      mockUseAuth.mockReturnValue(createMockAuthenticatedState({
        user: {
          id: 2,
          username: 'johndoe',
          email: 'john@example.com',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      }));

      // When: 渲染 Header with HeaderAuth
      render(<Header actions={<HeaderAuth />} />);

      // Then: 显示正确的用户名
      expect(screen.getByText('johndoe')).toBeInTheDocument();
    });
  });

  describe('未认证状态', () => {
    it('should render nothing in actions slot when not authenticated', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue(createMockUnauthenticatedState());

      // When: 渲染 Header with HeaderAuth as actions
      const { container } = render(<Header actions={<HeaderAuth />} />);

      // Then: actions 区域为空
      const actionsContainer = container.querySelector('.header-actions');
      expect(actionsContainer).toBeEmptyDOMElement();
    });

    it('should not display any user info when unauthenticated', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue(createMockUnauthenticatedState());

      // When: 渲染 Header with HeaderAuth
      render(<Header actions={<HeaderAuth />} />);

      // Then: 不显示用户信息
      expect(screen.queryByText('testuser')).not.toBeInTheDocument();
      expect(screen.queryByText('登出')).not.toBeInTheDocument();
    });

    it('should still render header structure when unauthenticated', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue(createMockUnauthenticatedState());

      // When: 渲染 Header with HeaderAuth
      const { container } = render(<Header actions={<HeaderAuth />} />);

      // Then: Header 结构仍然存在
      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('.header-actions')).toBeInTheDocument();
    });
  });

  describe('状态切换', () => {
    it('should update actions area when auth state changes', () => {
      // Given: 初始未认证状态
      mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
      const { container, rerender } = render(<Header actions={<HeaderAuth />} />);

      // Then: actions 区域为空
      expect(container.querySelector('.header-actions')).toBeEmptyDOMElement();

      // When: 切换到已认证状态
      mockUseAuth.mockReturnValue(createMockAuthenticatedState());
      rerender(<Header actions={<HeaderAuth />} />);

      // Then: actions 区域显示用户信息
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('登出')).toBeInTheDocument();
    });

    it('should clear actions area when user logs out', () => {
      // Given: 初始已认证状态
      mockUseAuth.mockReturnValue(createMockAuthenticatedState());
      const { container, rerender } = render(<Header actions={<HeaderAuth />} />);

      // Then: 显示用户信息
      expect(screen.getByText('testuser')).toBeInTheDocument();

      // When: 登出后状态更新为未认证
      mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
      rerender(<Header actions={<HeaderAuth />} />);

      // Then: actions 区域为空
      expect(container.querySelector('.header-actions')).toBeEmptyDOMElement();
    });
  });

  describe('Header 结构验证', () => {
    it('should render Header with logo, nav, and actions slots', () => {
      // Given: 已认证状态
      mockUseAuth.mockReturnValue(createMockAuthenticatedState());

      // When: 渲染完整的 Header
      const { container } = render(
        <Header
          logo={<span data-testid="logo">Logo</span>}
          nav={<nav data-testid="nav">Navigation</nav>}
          actions={<HeaderAuth />}
        />
      );

      // Then: 所有插槽正确渲染
      expect(screen.getByTestId('logo')).toBeInTheDocument();
      expect(screen.getByTestId('nav')).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(container.querySelector('.header-auth')).toBeInTheDocument();
    });

    it('should maintain header structure regardless of auth state', () => {
      // Given: 已认证状态
      mockUseAuth.mockReturnValue(createMockAuthenticatedState());

      // When: 渲染 Header
      const { container, rerender } = render(<Header actions={<HeaderAuth />} />);

      // Then: 结构完整
      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('.header-logo')).toBeInTheDocument();
      expect(container.querySelector('.header-nav')).toBeInTheDocument();
      expect(container.querySelector('.header-actions')).toBeInTheDocument();

      // When: 切换到未认证状态
      mockUseAuth.mockReturnValue(createMockUnauthenticatedState());
      rerender(<Header actions={<HeaderAuth />} />);

      // Then: 结构仍然完整
      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('.header-logo')).toBeInTheDocument();
      expect(container.querySelector('.header-nav')).toBeInTheDocument();
      expect(container.querySelector('.header-actions')).toBeInTheDocument();
    });
  });
});