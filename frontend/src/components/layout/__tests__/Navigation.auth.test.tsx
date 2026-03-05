/**
 * Navigation 组件认证功能契约测试 (TDD)
 *
 * 契约定义 (基于 Issue #151 架构蓝图):
 * - 未认证时显示'登录'和'注册'按钮
 * - 已认证时隐藏认证按钮
 * - 登录按钮使用 btn-outline 样式，href="/login"
 * - 注册按钮使用 btn-primary 样式，href="/register"
 * - 加载状态采用保守策略，显示按钮
 *
 * 注意: 此测试为契约测试，认证功能实现尚不存在
 * 预期: 这些测试在实现前会失败 (RED)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Navigation } from '../Navigation';
import { useAuth } from '@/lib/hooks/useAuth';

// Mock useAuth Hook
jest.mock('@/lib/hooks/useAuth');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// 测试用导航项
const mockItems = [
  { id: '1', label: 'Home', href: '/' },
  { id: '2', label: 'Tasks', href: '/tasks' },
];

describe('Navigation - 认证功能 (Contract)', () => {
  beforeEach(() => {
    // 默认未认证状态
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      status: 'unauthenticated',
      isAuthenticating: false,
      error: null,
      refreshToken: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('未认证状态', () => {
    it('should render login and register buttons when not authenticated', () => {
      // Given: isAuthenticated = false
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'unauthenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 显示 "登录" 和 "注册" 按钮
      const loginButton = screen.getByText('登录');
      const registerButton = screen.getByText('注册');

      expect(loginButton).toBeInTheDocument();
      expect(registerButton).toBeInTheDocument();
    });

    it('should render login button with correct href', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'unauthenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 登录按钮 href="/login"
      const loginButton = screen.getByText('登录');
      expect(loginButton.closest('a')).toHaveAttribute('href', '/login');
    });

    it('should render register button with correct href', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'unauthenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 注册按钮 href="/register"
      const registerButton = screen.getByText('注册');
      expect(registerButton.closest('a')).toHaveAttribute('href', '/register');
    });

    it('should apply btn-outline class to login button', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'unauthenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      const { container } = render(<Navigation items={mockItems} />);

      // Then: 登录按钮有 btn-outline 类
      const loginButton = screen.getByText('登录');
      expect(loginButton.closest('a')).toHaveClass('btn-outline');
    });

    it('should apply btn-primary class to register button', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'unauthenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 注册按钮有 btn-primary 类
      const registerButton = screen.getByText('注册');
      expect(registerButton.closest('a')).toHaveClass('btn-primary');
    });

    it('should render both buttons with navigation-item class', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'unauthenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 两个按钮都有 navigation-item 类
      const loginButton = screen.getByText('登录');
      const registerButton = screen.getByText('注册');

      expect(loginButton.closest('a')).toHaveClass('navigation-item');
      expect(registerButton.closest('a')).toHaveClass('navigation-item');
    });
  });

  describe('已认证状态', () => {
    it('should not render auth buttons when authenticated', () => {
      // Given: isAuthenticated = true
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', username: 'testuser', email: 'test@example.com' },
        status: 'authenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 不显示认证按钮
      const loginButton = screen.queryByText('登录');
      const registerButton = screen.queryByText('注册');

      expect(loginButton).not.toBeInTheDocument();
      expect(registerButton).not.toBeInTheDocument();
    });

    it('should still render regular nav items when authenticated', () => {
      // Given: 已认证状态
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', username: 'testuser', email: 'test@example.com' },
        status: 'authenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 仍然显示普通导航项
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('should show auth buttons during loading state (conservative)', () => {
      // Given: status = 'loading' (保守策略：加载时显示按钮)
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'loading',
        isAuthenticating: true,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 显示按钮
      expect(screen.getByText('登录')).toBeInTheDocument();
      expect(screen.getByText('注册')).toBeInTheDocument();
    });
  });

  describe('按钮顺序和位置', () => {
    it('should render login button before register button', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'unauthenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 登录按钮在注册按钮之前
      const loginButton = screen.getByText('登录');
      const registerButton = screen.getByText('注册');
      const allButtons = screen.getAllByRole('link');

      const loginIndex = allButtons.indexOf(loginButton.closest('a') as HTMLElement);
      const registerIndex = allButtons.indexOf(registerButton.closest('a') as HTMLElement);

      expect(loginIndex).toBeLessThan(registerIndex);
    });

    it('should render auth buttons after regular nav items', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'unauthenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 认证按钮在普通导航项之后
      const allButtons = screen.getAllByRole('link');
      const lastNavIndex = allButtons.findIndex(btn => btn.textContent === 'Tasks');
      const loginIndex = allButtons.findIndex(btn => btn.textContent === '登录');

      expect(loginIndex).toBeGreaterThan(lastNavIndex);
    });
  });

  describe('边界情况', () => {
    it('should render auth buttons when nav items array is empty', () => {
      // Given: 未认证状态 + 空导航项
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'unauthenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件（空导航项）
      render(<Navigation items={[]} />);

      // Then: 仍显示认证按钮
      expect(screen.getByText('登录')).toBeInTheDocument();
      expect(screen.getByText('注册')).toBeInTheDocument();
    });

    it('should not render auth buttons when authenticated with empty items', () => {
      // Given: 已认证状态 + 空导航项
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', username: 'testuser', email: 'test@example.com' },
        status: 'authenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={[]} />);

      // Then: 不显示认证按钮
      expect(screen.queryByText('登录')).not.toBeInTheDocument();
      expect(screen.queryByText('注册')).not.toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('should render auth buttons as links with proper role', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'unauthenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 按钮作为链接渲染，具有 role="link"
      const loginButton = screen.getByText('登录').closest('a');
      const registerButton = screen.getByText('注册').closest('a');

      expect(loginButton?.tagName).toBe('A');
      expect(registerButton?.tagName).toBe('A');
    });

    it('should maintain navigation container role', () => {
      // Given: 未认证状态
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        status: 'unauthenticated',
        isAuthenticating: false,
        error: null,
        refreshToken: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      });

      // When: 渲染组件
      render(<Navigation items={mockItems} />);

      // Then: 导航容器保持 role="navigation"
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });
  });
});
