/**
 * withAuthGuard HOC 单元测试
 *
 * 测试契约:
 * - Mock authStore 状态为 authenticated → 渲染被包裹组件
 * - Mock authStore 状态为 unauthenticated → 触发重定向
 * - Mock authStore 状态为 loading → 显示加载组件
 * - 测试自定义 redirectTo 选项
 * - 测试自定义 loadingComponent 选项
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { withAuthGuard } from '../guards';
import { createAuthStore } from '@/store/auth/auth-store';
import type { AuthStore } from '@/store/auth/auth-store-types';
import type { UserResponse, TokenResponse } from '@/types/auth';
import React from 'react';

// ============================================================================
// Mock 数据
// ============================================================================

const MOCK_USER: UserResponse = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

const MOCK_TOKEN_RESPONSE: TokenResponse = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'Bearer',
  expires_in: 3600,
};

// ============================================================================
// Mock 组件
// ============================================================================

const TestComponent = ({ title = 'Test' }: { title?: string }) => {
  return <div data-testid="test-component">{title}</div>;
};

const CustomLoadingComponent = () => {
  return <div data-testid="custom-loading">Custom Loading...</div>;
};

// ============================================================================
// 测试套件
// ============================================================================

describe('withAuthGuard HOC', () => {
  let authStore: AuthStore;
  let mockPush: jest.Mock;
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // 创建本地 authStore
    authStore = createAuthStore({ persist: false });
    authStore.getState().reset();

    // Mock next/router
    mockPush = jest.fn();
    mockRouter = {
      push: mockPush,
      pathname: '/test',
    };

    // Mock useRouter
    jest.doMock('next/router', () => ({
      useRouter: () => mockRouter,
    }));
  });

  // ============================================================================
  // Happy Path 测试
  // ============================================================================

  describe('Happy Path - 已认证用户', () => {
    it('应该渲染被包裹的组件（已认证状态）', () => {
      // 设置已认证状态
      authStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const ProtectedComponent = withAuthGuard(TestComponent, {
        authStore: authStore as any,
      });

      render(<ProtectedComponent title="Protected Content" />);

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('应该正确传递 Props 到被包裹组件', () => {
      authStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const ProtectedComponent = withAuthGuard(TestComponent, {
        authStore: authStore as any,
      });

      render(<ProtectedComponent title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 未认证重定向测试
  // ============================================================================

  describe('未认证重定向', () => {
    it('应该重定向到默认登录页（未认证状态）', () => {
      // 确保是未认证状态
      authStore.getState().reset();

      const ProtectedComponent = withAuthGuard(TestComponent, {
        authStore: authStore as any,
      });

      render(<ProtectedComponent />);

      // 不应该渲染受保护组件
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();

      // 应该调用 router.push 重定向到 /login
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('应该重定向到自定义路径（redirectTo 选项）', () => {
      authStore.getState().reset();

      const ProtectedComponent = withAuthGuard(TestComponent, {
        redirectTo: '/auth/signin',
        authStore: authStore as any,
      });

      render(<ProtectedComponent />);

      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    });

    it('应该使用自定义认证检查函数（isAuthenticatedCheck 选项）', () => {
      // 设置为已认证状态
      authStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      const customCheck = jest.fn(() => false);

      const ProtectedComponent = withAuthGuard(TestComponent, {
        isAuthenticatedCheck: customCheck,
        authStore: authStore as any,
      });

      render(<ProtectedComponent />);

      // 应该调用自定义检查函数
      expect(customCheck).toHaveBeenCalled();

      // 虽然状态是已认证，但自定义检查返回 false，应该重定向
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  // ============================================================================
  // 加载状态测试
  // ============================================================================

  describe('加载状态', () => {
    it('应该显示默认加载组件（loading 状态）', () => {
      authStore.getState().setLoading();

      const ProtectedComponent = withAuthGuard(TestComponent, {
        showLoading: true,
        authStore: authStore as any,
      });

      render(<ProtectedComponent />);

      // 不应该渲染受保护组件
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();

      // 不应该重定向
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('应该显示自定义加载组件（loadingComponent 选项）', () => {
      authStore.getState().setLoading();

      const ProtectedComponent = withAuthGuard(TestComponent, {
        showLoading: true,
        loadingComponent: CustomLoadingComponent,
        authStore: authStore as any,
      });

      render(<ProtectedComponent />);

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
      expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });

    it('应该不显示加载组件（showLoading: false）', () => {
      authStore.getState().setLoading();

      const ProtectedComponent = withAuthGuard(TestComponent, {
        showLoading: false,
        authStore: authStore as any,
      });

      render(<ProtectedComponent />);

      // 不应该显示任何内容
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      expect(screen.queryByTestId('custom-loading')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // 边界情况测试
  // ============================================================================

  describe('边界情况', () => {
    it('应该处理空选项（使用默认值）', () => {
      authStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      // 不传选项
      const ProtectedComponent = withAuthGuard(TestComponent);

      render(<ProtectedComponent />);

      // 应该正常渲染
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    it('应该处理从 loading 到 authenticated 的状态变化', () => {
      authStore.getState().setLoading();

      const ProtectedComponent = withAuthGuard(TestComponent, {
        showLoading: true,
        authStore: authStore as any,
      });

      const { rerender } = render(<ProtectedComponent />);

      // 初始状态：loading
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();

      // 状态变化：authenticated
      authStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      rerender(<ProtectedComponent />);

      // 应该渲染组件
      expect(screen.getByTestId('test-component')).toBeInTheDocument();
    });

    it('应该处理从 unauthenticated 到 authenticated 的状态变化', () => {
      authStore.getState().reset();

      const ProtectedComponent = withAuthGuard(TestComponent, {
        authStore: authStore as any,
      });

      const { rerender } = render(<ProtectedComponent />);

      // 初始状态：unauthenticated，应该重定向
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      expect(mockPush).toHaveBeenCalledWith('/login');

      // 清除 mock 记录
      mockPush.mockClear();

      // 状态变化：authenticated
      authStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      rerender(<ProtectedComponent />);

      // 应该渲染组件
      expect(screen.getByTestId('test-component')).toBeInTheDocument();

      // 不应该再次重定向
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('应该处理错误状态（视为未认证）', () => {
      authStore.getState().setError({
        type: 'INVALID_CREDENTIALS' as const,
        message: 'Invalid credentials',
      });

      const ProtectedComponent = withAuthGuard(TestComponent, {
        authStore: authStore as any,
      });

      render(<ProtectedComponent />);

      // 错误状态应该触发重定向
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  // ============================================================================
  // 选项默认值测试
  // ============================================================================

  describe('选项默认值', () => {
    it('showLoading 默认值应该是 true', () => {
      authStore.getState().setLoading();

      const ProtectedComponent = withAuthGuard(TestComponent, {
        authStore: authStore as any,
      });

      render(<ProtectedComponent />);

      // 默认显示加载状态
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('redirectTo 默认值应该是 /login', () => {
      authStore.getState().reset();

      const ProtectedComponent = withAuthGuard(TestComponent, {
        authStore: authStore as any,
      });

      render(<ProtectedComponent />);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  // ============================================================================
  // 组件 Props 类型安全测试
  // ============================================================================

  describe('Props 类型安全', () => {
    it('应该保持被包裹组件的 Props 类型', () => {
      authStore.getState().setAuthUser(
        MOCK_USER,
        MOCK_TOKEN_RESPONSE.access_token,
        MOCK_TOKEN_RESPONSE.refresh_token,
        MOCK_TOKEN_RESPONSE.expires_in
      );

      interface ComponentProps {
        value: number;
        label: string;
      }

      const TypedComponent: React.FC<ComponentProps> = ({ value, label }) => {
        return (
          <div>
            <span data-testid="value">{value}</span>
            <span data-testid="label">{label}</span>
          </div>
        );
      };

      const ProtectedComponent = withAuthGuard(TypedComponent, {
        authStore: authStore as any,
      });

      render(<ProtectedComponent value={42} label="Test Label" />);

      expect(screen.getByTestId('value')).toHaveTextContent('42');
      expect(screen.getByTestId('label')).toHaveTextContent('Test Label');
    });
  });
});
