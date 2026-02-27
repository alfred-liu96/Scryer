/**
 * Spinner 组件单元测试
 *
 * 测试契约:
 * - 支持不同尺寸 (xs, sm, md, lg, xl)
 * - 支持不同颜色变体
 * - 可配置加载文本
 * - 支持全屏覆盖模式
 */

import { render, screen } from '@testing-library/react';
import { Spinner } from '../Spinner';

describe('Spinner', () => {
  describe('基础渲染', () => {
    it('应该渲染默认加载器', () => {
      const { container } = render(<Spinner />);
      expect(container.querySelector('.spinner')).toBeInTheDocument();
    });

    it('应该渲染带文本的加载器', () => {
      render(<Spinner text="加载中..." />);
      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });
  });

  describe('尺寸', () => {
    it('应该渲染 xs 尺寸', () => {
      const { container } = render(<Spinner size="xs" />);
      expect(container.querySelector('.spinner-xs')).toBeInTheDocument();
    });

    it('应该渲染 sm 尺寸', () => {
      const { container } = render(<Spinner size="sm" />);
      expect(container.querySelector('.spinner-sm')).toBeInTheDocument();
    });

    it('应该渲染 md 尺寸（默认）', () => {
      const { container } = render(<Spinner size="md" />);
      expect(container.querySelector('.spinner-md')).toBeInTheDocument();
    });

    it('应该渲染 lg 尺寸', () => {
      const { container } = render(<Spinner size="lg" />);
      expect(container.querySelector('.spinner-lg')).toBeInTheDocument();
    });

    it('应该渲染 xl 尺寸', () => {
      const { container } = render(<Spinner size="xl" />);
      expect(container.querySelector('.spinner-xl')).toBeInTheDocument();
    });
  });

  describe('颜色变体', () => {
    it('应该渲染 primary 颜色', () => {
      const { container } = render(<Spinner color="primary" />);
      expect(container.querySelector('.spinner-primary')).toBeInTheDocument();
    });

    it('应该渲染 secondary 颜色', () => {
      const { container } = render(<Spinner color="secondary" />);
      expect(container.querySelector('.spinner-secondary')).toBeInTheDocument();
    });

    it('应该渲染 success 颜色', () => {
      const { container } = render(<Spinner color="success" />);
      expect(container.querySelector('.spinner-success')).toBeInTheDocument();
    });

    it('应该渲染 warning 颜色', () => {
      const { container } = render(<Spinner color="warning" />);
      expect(container.querySelector('.spinner-warning')).toBeInTheDocument();
    });

    it('应该渲染 error 颜色', () => {
      const { container } = render(<Spinner color="error" />);
      expect(container.querySelector('.spinner-error')).toBeInTheDocument();
    });
  });

  describe('全屏模式', () => {
    it('应该渲染全屏加载器', () => {
      const { container } = render(<Spinner fullscreen />);
      expect(container.querySelector('.spinner-fullscreen')).toBeInTheDocument();
    });

    it('全屏模式应该有固定定位', () => {
      const { container } = render(<Spinner fullscreen />);
      const spinner = container.querySelector('.spinner-fullscreen');
      expect(spinner).toHaveStyle({ position: 'fixed' });
    });
  });

  describe('自定义属性', () => {
    it('应该应用自定义 className', () => {
      const { container } = render(<Spinner className="custom-spinner" />);
      expect(container.querySelector('.custom-spinner')).toBeInTheDocument();
    });

    it('应该传递 data-testid', () => {
      const { container } = render(<Spinner data-testid="loading-spinner" />);
      expect(container.querySelector('[data-testid="loading-spinner"]')).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('应该有 aria-live 属性', () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector('.spinner');
      expect(spinner).toHaveAttribute('aria-live', 'polite');
    });

    it('应该有 aria-busy 属性', () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector('.spinner');
      expect(spinner).toHaveAttribute('aria-busy', 'true');
    });

    it('应该有 role="status"', () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector('.spinner');
      expect(spinner).toHaveAttribute('role', 'status');
    });
  });

  describe('边界情况', () => {
    it('应该处理空文本', () => {
      const { container } = render(<Spinner text="" />);
      expect(container.querySelector('.spinner')).toBeInTheDocument();
    });

    it('应该处理长文本', () => {
      const longText = '这是一个非常长的加载文本，用于测试加载器的文本显示能力';
      render(<Spinner text={longText} />);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });
});
