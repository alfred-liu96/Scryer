/**
 * Toast 组件单元测试
 *
 * 测试契约:
 * - 支持不同类型 (info, success, warning, error)
 * - 支持自动关闭和手动关闭
 * - 支持位置配置
 * - 支持多个 Toast 同时显示
 * - 支持自定义时长
 */

import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from '../Toast';
import { renderHook } from '@testing-library/react';
import { useToast } from '@/lib/hooks/useToast';

describe('Toast', () => {
  jest.useFakeTimers();

  beforeEach(() => {
    jest.clearAllTimers();
  });

  describe('基础渲染', () => {
    it('应该渲染默认提示', () => {
      render(
        <Toast
          id="1"
          message="这是一条提示"
          type="info"
        />
      );
      expect(screen.getByText('这是一条提示')).toBeInTheDocument();
    });

    it('应该渲染带标题的提示', () => {
      render(
        <Toast
          id="1"
          title="提示标题"
          message="提示内容"
          type="info"
        />
      );
      expect(screen.getByText('提示标题')).toBeInTheDocument();
      expect(screen.getByText('提示内容')).toBeInTheDocument();
    });
  });

  describe('类型变体', () => {
    it('应该渲染 info 类型', () => {
      const { container } = render(
        <Toast id="1" message="信息" type="info" />
      );
      expect(container.querySelector('.toast-info')).toBeInTheDocument();
    });

    it('应该渲染 success 类型', () => {
      const { container } = render(
        <Toast id="1" message="成功" type="success" />
      );
      expect(container.querySelector('.toast-success')).toBeInTheDocument();
    });

    it('应该渲染 warning 类型', () => {
      const { container } = render(
        <Toast id="1" message="警告" type="warning" />
      );
      expect(container.querySelector('.toast-warning')).toBeInTheDocument();
    });

    it('应该渲染 error 类型', () => {
      const { container } = render(
        <Toast id="1" message="错误" type="error" />
      );
      expect(container.querySelector('.toast-error')).toBeInTheDocument();
    });
  });

  describe('自动关闭', () => {
    it('应该在默认时间后自动关闭', () => {
      const handleClose = jest.fn();
      render(
        <Toast
          id="1"
          message="自动关闭"
          type="info"
          duration={3000}
          onClose={handleClose}
        />
      );

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(handleClose).toHaveBeenCalledWith('1');
    });

    it('duration=0 时不自动关闭', () => {
      const handleClose = jest.fn();
      render(
        <Toast
          id="1"
          message="不关闭"
          type="info"
          duration={0}
          onClose={handleClose}
        />
      );

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('鼠标悬停时暂停倒计时', () => {
      const handleClose = jest.fn();
      render(
        <Toast
          id="1"
          message="悬停暂停"
          type="info"
          duration={3000}
          onClose={handleClose}
        />
      );

      const toast = screen.getByText('悬停暂停').closest('.toast');

      // 鼠标进入，暂停倒计时
      fireEvent.mouseEnter(toast!);

      // 前进 3 秒，不应该触发关闭（因为暂停了）
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(handleClose).not.toHaveBeenCalled();

      // 鼠标离开，恢复倒计时
      fireEvent.mouseLeave(toast!);

      // 再前进 3 秒，应该触发关闭
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(handleClose).toHaveBeenCalledWith('1');
    });
  });

  describe('手动关闭', () => {
    it('点击关闭按钮应该触发 onClose', () => {
      const handleClose = jest.fn();
      render(
        <Toast
          id="1"
          message="可关闭"
          type="info"
          closable
          onClose={handleClose}
        />
      );

      const closeButton = screen.getByLabelText('关闭');
      fireEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalledWith('1');
    });
  });

  describe('位置配置', () => {
    it('应该支持 top 位置', () => {
      const { container } = render(
        <Toast id="1" message="顶部" type="info" position="top" />
      );
      expect(container.querySelector('.toast-top')).toBeInTheDocument();
    });

    it('应该支持 bottom 位置', () => {
      const { container } = render(
        <Toast id="1" message="底部" type="info" position="bottom" />
      );
      expect(container.querySelector('.toast-bottom')).toBeInTheDocument();
    });

    it('应该支持 top-left 位置', () => {
      const { container } = render(
        <Toast id="1" message="左上" type="info" position="top-left" />
      );
      expect(container.querySelector('.toast-top-left')).toBeInTheDocument();
    });

    it('应该支持 top-right 位置', () => {
      const { container } = render(
        <Toast id="1" message="右上" type="info" position="top-right" />
      );
      expect(container.querySelector('.toast-top-right')).toBeInTheDocument();
    });

    it('应该支持 bottom-left 位置', () => {
      const { container } = render(
        <Toast id="1" message="左下" type="info" position="bottom-left" />
      );
      expect(container.querySelector('.toast-bottom-left')).toBeInTheDocument();
    });

    it('应该支持 bottom-right 位置', () => {
      const { container } = render(
        <Toast id="1" message="右下" type="info" position="bottom-right" />
      );
      expect(container.querySelector('.toast-bottom-right')).toBeInTheDocument();
    });
  });

  describe('进入和退出动画', () => {
    it('应该有进入动画类', () => {
      const { container } = render(
        <Toast id="1" message="动画" type="info" />
      );
      const toast = container.querySelector('.toast');
      expect(toast).toHaveClass('toast-enter');
    });

    it('关闭时应该有退出动画类', () => {
      const { container, rerender } = render(
        <Toast id="1" message="退出" type="info" isClosing />
      );
      const toast = container.querySelector('.toast');
      expect(toast).toHaveClass('toast-exit');
    });
  });

  describe('可访问性', () => {
    it('应该有 role="alert"', () => {
      const { container } = render(
        <Toast id="1" message="提示" type="info" />
      );
      const toast = container.querySelector('.toast');
      expect(toast).toHaveAttribute('role', 'alert');
    });

    it('应该有 aria-live 属性', () => {
      const { container } = render(
        <Toast id="1" message="提示" type="info" />
      );
      const toast = container.querySelector('.toast');
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });

    it('关闭按钮应该有 aria-label', () => {
      render(
        <Toast id="1" message="提示" type="info" closable />
      );
      const closeButton = screen.getByRole('button');
      expect(closeButton).toHaveAttribute('aria-label', '关闭');
    });
  });

  describe('边界情况', () => {
    it('应该处理空消息', () => {
      const { container } = render(
        <Toast id="1" message="" type="info" />
      );
      expect(container.querySelector('.toast')).toBeInTheDocument();
    });

    it('应该处理非常长的消息', () => {
      const longMessage = '这是一条非常长的提示消息，用于测试提示组件对长文本的处理能力，确保文本能够正确换行和显示。'.repeat(5);
      render(
        <Toast id="1" message={longMessage} type="info" />
      );
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('应该处理特殊字符', () => {
      const specialMessage = '提示: <script>alert("test")</script>';
      render(
        <Toast id="1" message={specialMessage} type="info" />
      );
      // HTML 转义后显示为 &lt; 和 &gt;
      expect(screen.getByText(/提示:/)).toBeInTheDocument();
      // 或者使用 container 查询
      const { container } = render(
        <Toast id="2" message={specialMessage} type="info" />
      );
      expect(container.textContent).toContain('提示:');
    });
  });
});

describe('useToast Hook', () => {
  it('应该提供 toast 方法', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toast).toBeDefined();
    expect(typeof result.current.toast).toBe('function');
  });

  it('应该提供 success 方法', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.success).toBeDefined();
    expect(typeof result.current.success).toBe('function');
  });

  it('应该提供 error 方法', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.error).toBeDefined();
    expect(typeof result.current.error).toBe('function');
  });

  it('应该提供 warning 方法', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.warning).toBeDefined();
    expect(typeof result.current.warning).toBe('function');
  });

  it('应该提供 info 方法', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.info).toBeDefined();
    expect(typeof result.current.info).toBe('function');
  });
});
