/**
 * Modal 组件单元测试
 *
 * 测试契约:
 * - 支持不同尺寸 (sm, md, lg, xl, full)
 * - 支持自定义头部、内容、底部
 * - 支持点击遮罩关闭
 * - 支持 ESC 键关闭
 * - 支持嵌套模态框
 * - 支持禁用滚动
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

describe('Modal', () => {
  describe('基础渲染', () => {
    it('open=false 时不应渲染', () => {
      const { container } = render(
        <Modal open={false} onClose={jest.fn()}>
          内容
        </Modal>
      );
      expect(container.querySelector('.modal')).not.toBeInTheDocument();
    });

    it('open=true 时应该渲染', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()}>
          模态框内容
        </Modal>
      );
      expect(container.querySelector('.modal')).toBeInTheDocument();
      expect(screen.getByText('模态框内容')).toBeInTheDocument();
    });

    it('应该渲染遮罩层', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()}>
          内容
        </Modal>
      );
      expect(container.querySelector('.modal-overlay')).toBeInTheDocument();
    });

    it('应该渲染模态框容器', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()}>
          内容
        </Modal>
      );
      expect(container.querySelector('.modal-container')).toBeInTheDocument();
    });
  });

  describe('标题和内容', () => {
    it('应该渲染标题', () => {
      render(
        <Modal open={true} onClose={jest.fn()} title="模态框标题">
          内容
        </Modal>
      );
      expect(screen.getByText('模态框标题')).toBeInTheDocument();
    });

    it('应该渲染自定义头部', () => {
      render(
        <Modal
          open={true}
          onClose={jest.fn()}
          header={<div className="custom-header">自定义头部</div>}
        >
          内容
        </Modal>
      );
      expect(screen.getByText('自定义头部')).toBeInTheDocument();
    });

    it('应该渲染自定义底部', () => {
      render(
        <Modal
          open={true}
          onClose={jest.fn()}
          footer={<button>确认</button>}
        >
          内容
        </Modal>
      );
      expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument();
    });
  });

  describe('关闭功能', () => {
    it('应该渲染关闭按钮', () => {
      render(
        <Modal open={true} onClose={jest.fn()} closable>
          内容
        </Modal>
      );
      expect(screen.getByRole('button', { name: /关闭/ })).toBeInTheDocument();
    });

    it('closable=false 时不显示关闭按钮', () => {
      render(
        <Modal open={true} onClose={jest.fn()} closable={false}>
          内容
        </Modal>
      );
      expect(screen.queryByRole('button', { name: /关闭/ })).not.toBeInTheDocument();
    });

    it('点击关闭按钮应该触发 onClose', async () => {
      const handleClose = jest.fn();
      render(
        <Modal open={true} onClose={handleClose} closable>
          内容
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: /关闭/ });
      await userEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('点击遮罩层应该关闭（默认行为）', async () => {
      const handleClose = jest.fn();
      const { container } = render(
        <Modal open={true} onClose={handleClose}>
          内容
        </Modal>
      );

      const overlay = container.querySelector('.modal-overlay');
      await userEvent.click(overlay!);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('maskClosable=false 时点击遮罩不关闭', async () => {
      const handleClose = jest.fn();
      const { container } = render(
        <Modal open={true} onClose={handleClose} maskClosable={false}>
          内容
        </Modal>
      );

      const overlay = container.querySelector('.modal-overlay');
      await userEvent.click(overlay!);

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('按 ESC 键应该关闭', async () => {
      const handleClose = jest.fn();
      render(
        <Modal open={true} onClose={handleClose}>
          内容
        </Modal>
      );

      await userEvent.keyboard('{Escape}');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('keyboard=false 时 ESC 键不关闭', async () => {
      const handleClose = jest.fn();
      render(
        <Modal open={true} onClose={handleClose} keyboard={false}>
          内容
        </Modal>
      );

      await userEvent.keyboard('{Escape}');

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('尺寸配置', () => {
    it('应该渲染小尺寸', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()} size="sm">
          内容
        </Modal>
      );
      expect(container.querySelector('.modal-sm')).toBeInTheDocument();
    });

    it('应该渲染中等尺寸（默认）', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()} size="md">
          内容
        </Modal>
      );
      expect(container.querySelector('.modal-md')).toBeInTheDocument();
    });

    it('应该渲染大尺寸', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()} size="lg">
          内容
        </Modal>
      );
      expect(container.querySelector('.modal-lg')).toBeInTheDocument();
    });

    it('应该渲染超大尺寸', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()} size="xl">
          内容
        </Modal>
      );
      expect(container.querySelector('.modal-xl')).toBeInTheDocument();
    });

    it('应该渲染全屏尺寸', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()} size="full">
          内容
        </Modal>
      );
      expect(container.querySelector('.modal-full')).toBeInTheDocument();
    });
  });

  describe('滚动行为', () => {
    it('打开模态框时应该禁用背景滚动', () => {
      const { rerender } = render(
        <Modal open={false} onClose={jest.fn()}>
          内容
        </Modal>
      );

      expect(document.body).not.toHaveStyle({ overflow: 'hidden' });

      rerender(
        <Modal open={true} onClose={jest.fn()}>
          内容
        </Modal>
      );

      expect(document.body).toHaveStyle({ overflow: 'hidden' });
    });

    it('关闭模态框时应该恢复背景滚动', () => {
      const { rerender } = render(
        <Modal open={true} onClose={jest.fn()}>
          内容
        </Modal>
      );

      expect(document.body).toHaveStyle({ overflow: 'hidden' });

      rerender(
        <Modal open={false} onClose={jest.fn()}>
          内容
        </Modal>
      );

      expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
    });
  });

  describe('嵌套模态框', () => {
    it('应该支持嵌套模态框', () => {
      render(
        <Modal open={true} onClose={jest.fn()} title="外层">
          <Modal open={true} onClose={jest.fn()} title="内层">
            内容
          </Modal>
        </Modal>
      );

      expect(screen.getByText('外层')).toBeInTheDocument();
      expect(screen.getByText('内层')).toBeInTheDocument();
    });

    it('内层模态框的 z-index 应该更高', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()} title="外层">
          <Modal open={true} onClose={jest.fn()} title="内层">
            内容
          </Modal>
        </Modal>
      );

      const modals = container.querySelectorAll('.modal');
      const outerModal = modals[0];
      const innerModal = modals[1];

      const outerZIndex = parseInt(window.getComputedStyle(outerModal).zIndex);
      const innerZIndex = parseInt(window.getComputedStyle(innerModal).zIndex);

      expect(innerZIndex).toBeGreaterThan(outerZIndex);
    });
  });

  describe('进入和退出动画', () => {
    it('打开时应该有进入动画', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()}>
          内容
        </Modal>
      );
      const modalContainer = container.querySelector('.modal-container');
      expect(modalContainer).toHaveClass('modal-enter');
    });

    it('关闭时应该有退出动画', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()} isClosing>
          内容
        </Modal>
      );
      const modalContainer = container.querySelector('.modal-container');
      expect(modalContainer).toHaveClass('modal-exit');
    });
  });

  describe('可访问性', () => {
    it('应该有 role="dialog"', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()}>
          内容
        </Modal>
      );
      const modal = container.querySelector('.modal-container');
      expect(modal).toHaveAttribute('role', 'dialog');
    });

    it('应该有 aria-modal="true"', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()}>
          内容
        </Modal>
      );
      const modal = container.querySelector('.modal-container');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    it('应该有 aria-labelledby', () => {
      render(
        <Modal open={true} onClose={jest.fn()} title="标题">
          内容
        </Modal>
      );

      const titleId = screen.getByText('标题').id;
      const { container } = render(
        <Modal open={true} onClose={jest.fn()} title="标题">
          内容
        </Modal>
      );
      const modal = container.querySelector('.modal-container');
      expect(modal).toHaveAttribute('aria-labelledby', titleId);
    });

    it('打开时应该聚焦到模态框', () => {
      render(
        <Modal open={true} onClose={jest.fn()} autoFocus>
          内容
        </Modal>
      );

      const { container } = render(
        <Modal open={true} onClose={jest.fn()} autoFocus>
          内容
        </Modal>
      );
      const modal = container.querySelector('.modal-container');
      expect(modal).toHaveFocus();
    });

    it('应该捕获焦点在模态框内', async () => {
      render(
        <Modal open={true} onClose={jest.fn()}>
          <input type="text" placeholder="输入1" />
          <input type="text" placeholder="输入2" />
        </Modal>
      );

      const input1 = screen.getByPlaceholderText('输入1');
      const input2 = screen.getByPlaceholderText('输入2');

      await userEvent.tab();
      expect(input1).toHaveFocus();

      await userEvent.tab();
      expect(input2).toHaveFocus();
    });
  });

  describe('自定义样式', () => {
    it('应该应用自定义 className', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()} className="custom-modal">
          内容
        </Modal>
      );
      expect(container.querySelector('.custom-modal')).toBeInTheDocument();
    });

    it('应该应用自定义样式', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()} style={{ zIndex: 9999 }}>
          内容
        </Modal>
      );
      const modal = container.querySelector('.modal-container');
      expect(modal).toHaveStyle({ zIndex: 9999 });
    });
  });

  describe('回调函数', () => {
    it('应该在打开后触发 afterOpen 回调', () => {
      const handleAfterOpen = jest.fn();
      render(
        <Modal open={true} onClose={jest.fn()} afterOpen={handleAfterOpen}>
          内容
        </Modal>
      );

      expect(handleAfterOpen).toHaveBeenCalledTimes(1);
    });

    it('应该在关闭前触发 beforeClose 回调', async () => {
      const handleBeforeClose = jest.fn();
      const handleClose = jest.fn();
      const { container } = render(
        <Modal
          open={true}
          onClose={handleClose}
          beforeClose={handleBeforeClose}
        >
          内容
        </Modal>
      );

      const overlay = container.querySelector('.modal-overlay');
      await userEvent.click(overlay!);

      expect(handleBeforeClose).toHaveBeenCalledTimes(1);
    });

    it('beforeClose 返回 false 时不应关闭', async () => {
      const handleBeforeClose = jest.fn(() => false);
      const handleClose = jest.fn();
      const { container } = render(
        <Modal
          open={true}
          onClose={handleClose}
          beforeClose={handleBeforeClose}
        >
          内容
        </Modal>
      );

      const overlay = container.querySelector('.modal-overlay');
      await userEvent.click(overlay!);

      expect(handleBeforeClose).toHaveBeenCalledTimes(1);
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('应该处理空内容', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()}>
          {''}
        </Modal>
      );
      expect(container.querySelector('.modal')).toBeInTheDocument();
    });

    it('应该处理没有标题的情况', () => {
      const { container } = render(
        <Modal open={true} onClose={jest.fn()}>
          内容
        </Modal>
      );
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('应该处理非常长的内容', () => {
      const longContent = '这是一段非常长的内容，'.repeat(100);
      render(
        <Modal open={true} onClose={jest.fn()}>
          {longContent}
        </Modal>
      );
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });
  });
});
