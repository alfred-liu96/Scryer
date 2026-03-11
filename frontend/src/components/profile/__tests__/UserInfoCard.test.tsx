/**
 * UserInfoCard 组件单元测试
 *
 * 测试覆盖范围：
 * - 基础渲染（用户信息展示）
 * - 编辑按钮交互
 * - 加载状态
 * - 可访问性（ARIA 属性）
 *
 * 基于蓝图设计：
 * - /workspace/docs/blueprints/profile-page-blueprint.md
 *
 * 测试状态: RED (等待实现)
 * 依赖文件: /workspace/frontend/src/components/profile/UserInfoCard.tsx
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
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

// ============================================================================
// 测试套件
// ============================================================================

describe('UserInfoCard - 基础渲染', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该渲染用户名', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser();

    render(<UserInfoCard user={user} />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('应该渲染邮箱地址', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser();

    render(<UserInfoCard user={user} />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('应该渲染注册时间', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser();

    render(<UserInfoCard user={user} />);

    // 注册时间应该被格式化显示
    expect(screen.getByText(/注册/)).toBeInTheDocument();
  });

  it('应该渲染用户 ID', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser({ id: 42 });

    render(<UserInfoCard user={user} />);

    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('应该应用自定义 className', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser();

    const { container } = render(
      <UserInfoCard user={user} className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('UserInfoCard - 编辑按钮交互', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('非编辑模式下应该显示编辑按钮', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser();

    render(<UserInfoCard user={user} isEditing={false} />);

    expect(screen.getByRole('button', { name: /编辑/ })).toBeInTheDocument();
  });

  it('编辑模式下应该隐藏编辑按钮', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser();

    render(<UserInfoCard user={user} isEditing={true} />);

    expect(screen.queryByRole('button', { name: /编辑/ })).not.toBeInTheDocument();
  });

  it('点击编辑按钮应该触发 onEditClick 回调', async () => {
    const userEventSetup = userEvent.setup();
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser();
    const onEditClick = jest.fn();

    render(
      <UserInfoCard
        user={user}
        isEditing={false}
        onEditClick={onEditClick}
      />
    );

    const editButton = screen.getByRole('button', { name: /编辑/ });
    await userEventSetup.click(editButton);

    expect(onEditClick).toHaveBeenCalledTimes(1);
  });

  it('未提供 onEditClick 时编辑按钮不应该崩溃', async () => {
    const userEventSetup = userEvent.setup();
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser();

    render(<UserInfoCard user={user} isEditing={false} />);

    const editButton = screen.getByRole('button', { name: /编辑/ });
    // 应该不会抛出错误
    await userEventSetup.click(editButton);
  });
});

describe('UserInfoCard - 数据展示', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该正确显示不同的用户名', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser({ username: 'anotheruser' });

    render(<UserInfoCard user={user} />);

    expect(screen.getByText('anotheruser')).toBeInTheDocument();
  });

  it('应该正确显示不同的邮箱', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser({ email: 'another@example.com' });

    render(<UserInfoCard user={user} />);

    expect(screen.getByText('another@example.com')).toBeInTheDocument();
  });

  it('应该正确格式化不同的注册时间', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser({ created_at: '2024-06-15T10:30:00Z' });

    render(<UserInfoCard user={user} />);

    // 应该显示格式化后的日期
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('应该显示用户状态（活跃）', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser({ is_active: true });

    render(<UserInfoCard user={user} />);

    // 活跃用户可能显示状态指示器
    expect(screen.getByText(/活跃|已激活|active/i)).toBeInTheDocument();
  });

  it('应该显示用户状态（非活跃）', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser({ is_active: false });

    render(<UserInfoCard user={user} />);

    // 非活跃用户可能显示不同的状态
    expect(screen.getByText(/未激活|inactive|已禁用/i)).toBeInTheDocument();
  });
});

describe('UserInfoCard - 可访问性', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('卡片应该有正确的语义结构', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser();

    render(<UserInfoCard user={user} />);

    // 应该使用卡片组件（article 或 section），或至少有卡片容器
    const cardByRole = screen.queryByRole('article') || screen.queryByRole('region');
    const cardByClass = document.querySelector('.user-info-card');

    expect(cardByRole || cardByClass).toBeTruthy();
  });

  it('编辑按钮应该有可访问的标签', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser();

    render(<UserInfoCard user={user} isEditing={false} />);

    const editButton = screen.getByRole('button', { name: /编辑/ });
    expect(editButton).toHaveAttribute('aria-label');
  });

  it('用户信息应该有清晰的标签', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser();

    render(<UserInfoCard user={user} />);

    // 用户名应该有关联的标签
    expect(screen.getByText(/用户名|username/i)).toBeTruthy();
    // 邮箱应该有关联的标签
    expect(screen.getByText(/邮箱|email/i)).toBeTruthy();
  });
});

describe('UserInfoCard - 边界条件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应该正确处理长用户名', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const longUsername = 'a'.repeat(50);
    const user = createMockUser({ username: longUsername });

    render(<UserInfoCard user={user} />);

    expect(screen.getByText(longUsername)).toBeInTheDocument();
  });

  it('应该正确处理长邮箱地址', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const longEmail = 'very.long.email.address@subdomain.example.com';
    const user = createMockUser({ email: longEmail });

    render(<UserInfoCard user={user} />);

    expect(screen.getByText(longEmail)).toBeInTheDocument();
  });

  it('应该正确处理特殊字符用户名', () => {
    const { UserInfoCard } = require('../UserInfoCard');
    const user = createMockUser({ username: 'user_name-123' });

    render(<UserInfoCard user={user} />);

    expect(screen.getByText('user_name-123')).toBeInTheDocument();
  });
});