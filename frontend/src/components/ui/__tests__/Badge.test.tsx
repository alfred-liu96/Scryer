/**
 * Badge 组件单元测试
 *
 * 测试契约:
 * - 支持不同颜色变体 (default, primary, success, warning, error)
 * - 支持不同尺寸 (sm, md, lg)
 * - 可选显示数量（带数值徽章）
 * - 支持圆点样式
 */

import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  describe('基础渲染', () => {
    it('应该渲染默认徽章', () => {
      render(<Badge>新消息</Badge>);
      expect(screen.getByText('新消息')).toBeInTheDocument();
    });

    it('应该渲染圆点样式徽章', () => {
      const { container } = render(<Badge dot />);
      expect(container.querySelector('.badge-dot')).toBeInTheDocument();
    });
  });

  describe('变体样式', () => {
    it('应该渲染 primary 变体', () => {
      const { container } = render(<Badge variant="primary">3</Badge>);
      expect(container.querySelector('.badge-primary')).toBeInTheDocument();
    });

    it('应该渲染 success 变体', () => {
      const { container } = render(<Badge variant="success">成功</Badge>);
      expect(container.querySelector('.badge-success')).toBeInTheDocument();
    });

    it('应该渲染 warning 变体', () => {
      const { container } = render(<Badge variant="warning">警告</Badge>);
      expect(container.querySelector('.badge-warning')).toBeInTheDocument();
    });

    it('应该渲染 error 变体', () => {
      const { container } = render(<Badge variant="error">错误</Badge>);
      expect(container.querySelector('.badge-error')).toBeInTheDocument();
    });
  });

  describe('尺寸', () => {
    it('应该渲染小尺寸徽章', () => {
      const { container } = render(<Badge size="sm">小</Badge>);
      expect(container.querySelector('.badge-sm')).toBeInTheDocument();
    });

    it('应该渲染中等尺寸徽章', () => {
      const { container } = render(<Badge size="md">中</Badge>);
      expect(container.querySelector('.badge-md')).toBeInTheDocument();
    });

    it('应该渲染大尺寸徽章', () => {
      const { container } = render(<Badge size="lg">大</Badge>);
      expect(container.querySelector('.badge-lg')).toBeInTheDocument();
    });
  });

  describe('数值徽章', () => {
    it('应该显示数值', () => {
      render(<Badge count={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('应该支持最大值限制', () => {
      render(<Badge count={999} max={99} />);
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('应该显示零值', () => {
      render(<Badge count={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('自定义属性', () => {
    it('应该应用自定义 className', () => {
      const { container } = render(
        <Badge className="custom-badge">自定义</Badge>
      );
      expect(container.querySelector('.custom-badge')).toBeInTheDocument();
    });

    it('应该传递额外属性', () => {
      render(
        <Badge data-testid="test-badge" aria-label="通知徽章">
          通知
        </Badge>
      );
      const badge = screen.getByLabelText('通知徽章');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理空内容', () => {
      const { container } = render(<Badge>{''}</Badge>);
      expect(container.querySelector('.badge')).toBeInTheDocument();
    });

    it('应该处理负数数值', () => {
      render(<Badge count={-1} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('应该处理非数字 children', () => {
      render(<Badge>文本徽章</Badge>);
      expect(screen.getByText('文本徽章')).toBeInTheDocument();
    });
  });
});
