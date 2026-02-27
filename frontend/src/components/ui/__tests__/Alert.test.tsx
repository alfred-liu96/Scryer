/**
 * Alert 组件单元测试
 *
 * 测试契约:
 * - 支持不同类型 (info, success, warning, error)
 * - 支持可关闭功能
 * - 支持标题和内容
 * - 支持图标显示
 * - 支持自动关闭（可选）
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from '../Alert';
import userEvent from '@testing-library/user-event';

describe('Alert', () => {
  describe('基础渲染', () => {
    it('应该渲染默认提示框', () => {
      render(<Alert>这是一条提示信息</Alert>);
      expect(screen.getByText('这是一条提示信息')).toBeInTheDocument();
    });

    it('应该渲染带标题的提示框', () => {
      render(
        <Alert title="提示标题">
          这是提示内容
        </Alert>
      );
      expect(screen.getByText('提示标题')).toBeInTheDocument();
      expect(screen.getByText('这是提示内容')).toBeInTheDocument();
    });
  });

  describe('类型变体', () => {
    it('应该渲染 info 类型', () => {
      const { container } = render(<Alert type="info">信息提示</Alert>);
      expect(container.querySelector('.alert-info')).toBeInTheDocument();
    });

    it('应该渲染 success 类型', () => {
      const { container } = render(<Alert type="success">操作成功</Alert>);
      expect(container.querySelector('.alert-success')).toBeInTheDocument();
    });

    it('应该渲染 warning 类型', () => {
      const { container } = render(<Alert type="warning">警告信息</Alert>);
      expect(container.querySelector('.alert-warning')).toBeInTheDocument();
    });

    it('应该渲染 error 类型', () => {
      const { container } = render(<Alert type="error">错误提示</Alert>);
      expect(container.querySelector('.alert-error')).toBeInTheDocument();
    });
  });

  describe('关闭功能', () => {
    it('默认不显示关闭按钮', () => {
      render(<Alert>不可关闭</Alert>);
      expect(screen.queryByRole('button', { name: /关闭/ })).not.toBeInTheDocument();
    });

    it('closable=true 时显示关闭按钮', () => {
      render(<Alert closable>可关闭</Alert>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('点击关闭按钮应该隐藏提示框', () => {
      const handleClose = jest.fn();
      render(
        <Alert closable onClose={handleClose}>
          可关闭提示
        </Alert>
      );

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('图标显示', () => {
    it('默认显示对应类型的图标', () => {
      const { container } = render(<Alert type="success">成功</Alert>);
      expect(container.querySelector('.alert-icon')).toBeInTheDocument();
    });

    it('showIcon=false 时隐藏图标', () => {
      const { container } = render(
        <Alert type="success" showIcon={false}>
          成功
        </Alert>
      );
      expect(container.querySelector('.alert-icon')).not.toBeInTheDocument();
    });
  });

  describe('自动关闭', () => {
    jest.useFakeTimers();

    afterEach(() => {
      jest.clearAllTimers();
    });

    it('应该在指定时间后自动关闭', () => {
      const handleClose = jest.fn();
      render(<Alert autoClose={3000} onClose={handleClose}>自动关闭</Alert>);

      jest.advanceTimersByTime(3000);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('autoClose=0 时不自动关闭', () => {
      const handleClose = jest.fn();
      render(<Alert autoClose={0} onClose={handleClose}>不自动关闭</Alert>);

      jest.advanceTimersByTime(10000);

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('鼠标悬停时暂停自动关闭', () => {
      const handleClose = jest.fn();
      render(<Alert autoClose={3000} onClose={handleClose}>悬停暂停</Alert>);

      const alert = screen.getByText('悬停暂停').closest('.alert');
      fireEvent.mouseEnter(alert!);

      jest.advanceTimersByTime(3000);

      expect(handleClose).not.toHaveBeenCalled();

      fireEvent.mouseLeave(alert!);
      jest.advanceTimersByTime(3000);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('自定义属性', () => {
    it('应该应用自定义 className', () => {
      const { container } = render(<Alert className="custom-alert">自定义</Alert>);
      expect(container.querySelector('.custom-alert')).toBeInTheDocument();
    });

    it('应该传递额外属性', () => {
      render(<Alert data-testid="test-alert" role="alert">测试</Alert>);
      expect(screen.getByTestId('test-alert')).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('应该有 role="alert"', () => {
      const { container } = render(<Alert>可访问性提示</Alert>);
      const alert = container.querySelector('.alert');
      expect(alert).toHaveAttribute('role', 'alert');
    });

    it('error 类型应该有 aria-live="assertive"', () => {
      const { container } = render(<Alert type="error">错误</Alert>);
      const alert = container.querySelector('.alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('其他类型应该有 aria-live="polite"', () => {
      const { container } = render(<Alert type="info">信息</Alert>);
      const alert = container.querySelector('.alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('边界情况', () => {
    it('应该处理空内容', () => {
      const { container } = render(<Alert>{''}</Alert>);
      expect(container.querySelector('.alert')).toBeInTheDocument();
    });

    it('应该处理长文本内容', () => {
      const longText = '这是一段非常长的提示文本，用于测试提示框对长文本的处理能力，确保文本能够正确换行和显示。';
      render(<Alert>{longText}</Alert>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('应该处理只有标题没有内容', () => {
      render(<Alert title="只有标题" />);
      expect(screen.getByText('只有标题')).toBeInTheDocument();
    });
  });
});
