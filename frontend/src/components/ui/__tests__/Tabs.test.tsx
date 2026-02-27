/**
 * Tabs 组件单元测试
 *
 * 测试契约:
 * - 支持受控和非受控模式
 * - 支持垂直和水平方向
 * - 支持禁用标签页
 * - 支持图标和徽章
 * - 支持可关闭标签页
 * - 支持标签栏位置
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from '../Tabs';

describe('Tabs', () => {
  const defaultTabs = [
    { key: 'tab1', label: '标签1', content: '内容1' },
    { key: 'tab2', label: '标签2', content: '内容2' },
    { key: 'tab3', label: '标签3', content: '内容3' },
  ];

  describe('基础渲染', () => {
    it('应该渲染默认标签页', () => {
      render(<Tabs items={defaultTabs} />);
      expect(screen.getByText('标签1')).toBeInTheDocument();
      expect(screen.getByText('标签2')).toBeInTheDocument();
      expect(screen.getByText('标签3')).toBeInTheDocument();
    });

    it('应该渲染第一个标签内容', () => {
      render(<Tabs items={defaultTabs} />);
      expect(screen.getByText('内容1')).toBeInTheDocument();
    });

    it('应该渲染指定默认值的标签内容', () => {
      render(<Tabs items={defaultTabs} defaultActiveKey="tab2" />);
      expect(screen.getByText('内容2')).toBeInTheDocument();
    });
  });

  describe('标签切换', () => {
    it('点击标签应该切换内容', async () => {
      render(<Tabs items={defaultTabs} />);

      expect(screen.getByText('内容1')).toBeInTheDocument();

      await userEvent.click(screen.getByText('标签2'));

      expect(screen.queryByText('内容1')).not.toBeInTheDocument();
      expect(screen.getByText('内容2')).toBeInTheDocument();
    });

    it('应该触发 onChange 回调', async () => {
      const handleChange = jest.fn();
      render(<Tabs items={defaultTabs} onChange={handleChange} />);

      await userEvent.click(screen.getByText('标签2'));

      expect(handleChange).toHaveBeenCalledWith('tab2');
    });

    it('禁用的标签不可点击', async () => {
      const tabsWithDisabled = [
        ...defaultTabs,
        { key: 'tab4', label: '标签4', content: '内容4', disabled: true },
      ];

      render(<Tabs items={tabsWithDisabled} />);

      const tab4 = screen.getByText('标签4');
      expect(tab4).toHaveClass('tab-disabled');

      await userEvent.click(tab4);

      expect(screen.queryByText('内容4')).not.toBeInTheDocument();
    });
  });

  describe('受控模式', () => {
    it('应该受 activeKey 控制', () => {
      const { rerender } = render(<Tabs items={defaultTabs} activeKey="tab1" />);
      expect(screen.getByText('内容1')).toBeInTheDocument();

      rerender(<Tabs items={defaultTabs} activeKey="tab2" />);
      expect(screen.getByText('内容2')).toBeInTheDocument();
    });

    it('点击时不应自动切换（受控模式）', async () => {
      const handleChange = jest.fn();
      render(<Tabs items={defaultTabs} activeKey="tab1" onChange={handleChange} />);

      await userEvent.click(screen.getByText('标签2'));

      expect(handleChange).toHaveBeenCalledWith('tab2');
      expect(screen.getByText('内容1')).toBeInTheDocument();
    });
  });

  describe('位置配置', () => {
    it('应该渲染顶部标签栏（默认）', () => {
      const { container } = render(<Tabs items={defaultTabs} tabPosition="top" />);
      expect(container.querySelector('.tabs-top')).toBeInTheDocument();
    });

    it('应该渲染底部标签栏', () => {
      const { container } = render(<Tabs items={defaultTabs} tabPosition="bottom" />);
      expect(container.querySelector('.tabs-bottom')).toBeInTheDocument();
    });

    it('应该渲染左侧标签栏', () => {
      const { container } = render(<Tabs items={defaultTabs} tabPosition="left" />);
      expect(container.querySelector('.tabs-left')).toBeInTheDocument();
    });

    it('应该渲染右侧标签栏', () => {
      const { container } = render(<Tabs items={defaultTabs} tabPosition="right" />);
      expect(container.querySelector('.tabs-right')).toBeInTheDocument();
    });
  });

  describe('标签样式', () => {
    it('应该支持带图标的标签', () => {
      const tabsWithIcon = [
        {
          key: 'tab1',
          label: '首页',
          icon: <span data-icon="home">🏠</span>,
          content: '首页内容',
        },
      ];

      render(<Tabs items={tabsWithIcon} />);
      expect(screen.getByText('🏠')).toBeInTheDocument();
    });

    it('应该支持带徽章的标签', () => {
      const tabsWithBadge = [
        {
          key: 'tab1',
          label: '消息',
          badge: 5,
          content: '消息内容',
        },
      ];

      render(<Tabs items={tabsWithBadge} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('应该支持带自定义徽章的标签', () => {
      const tabsWithBadge = [
        {
          key: 'tab1',
          label: '通知',
          badge: <span className="custom-badge">NEW</span>,
          content: '通知内容',
        },
      ];

      render(<Tabs items={tabsWithBadge} />);
      expect(screen.getByText('NEW')).toBeInTheDocument();
    });
  });

  describe('可关闭标签', () => {
    it('closeable=true 时应该显示关闭按钮', () => {
      const tabsWithCloseable = [
        { key: 'tab1', label: '标签1', content: '内容1', closeable: true },
      ];

      render(<Tabs items={tabsWithCloseable} />);
      expect(screen.getByRole('button', { name: /关闭/ })).toBeInTheDocument();
    });

    it('点击关闭按钮应该触发 onClose', async () => {
      const handleClose = jest.fn();
      const tabsWithCloseable = [
        { key: 'tab1', label: '标签1', content: '内容1', closeable: true },
        { key: 'tab2', label: '标签2', content: '内容2' },
      ];

      render(<Tabs items={tabsWithCloseable} onTabClose={handleClose} />);

      const closeButton = screen.getByRole('button', { name: /关闭/ });
      await userEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalledWith('tab1');
    });

    it('关闭当前激活标签应该切换到下一个', async () => {
      const tabsWithCloseable = [
        { key: 'tab1', label: '标签1', content: '内容1', closeable: true },
        { key: 'tab2', label: '标签2', content: '内容2' },
      ];

      const { rerender } = render(
        <Tabs items={tabsWithCloseable} activeKey="tab1" />
      );

      const closeButton = screen.getByRole('button', { name: /关闭/ });
      await userEvent.click(closeButton);

      const remainingTabs = tabsWithCloseable.slice(1);
      rerender(<Tabs items={remainingTabs} activeKey="tab2" />);

      expect(screen.getByText('内容2')).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('应该有 role="tablist"', () => {
      const { container } = render(<Tabs items={defaultTabs} />);
      expect(container.querySelector('[role="tablist"]')).toBeInTheDocument();
    });

    it('每个标签应该有 role="tab"', () => {
      render(<Tabs items={defaultTabs} />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(3);
    });

    it('每个面板应该有 role="tabpanel"', () => {
      const { container } = render(<Tabs items={defaultTabs} />);
      expect(container.querySelector('[role="tabpanel"]')).toBeInTheDocument();
    });

    it('应该支持键盘导航', async () => {
      render(<Tabs items={defaultTabs} />);

      const tabs = screen.getAllByRole('tab');
      tabs[0].focus();

      await userEvent.keyboard('{ArrowRight}');

      expect(tabs[1]).toHaveFocus();
    });

    it('应该有正确的 aria-selected', () => {
      render(<Tabs items={defaultTabs} defaultActiveKey="tab1" />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('应该有正确的 aria-controls', () => {
      render(<Tabs items={defaultTabs} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('aria-controls');
      });
    });
  });

  describe('自定义渲染', () => {
    it('应该支持自定义标签渲染', () => {
      const tabs = [
        {
          key: 'tab1',
          label: '标签1',
          content: '内容1',
          renderLabel: (item: any) => <span>【{item.label}】</span>,
        },
      ];

      render(<Tabs items={tabs} />);
      expect(screen.getByText('【标签1】')).toBeInTheDocument();
    });

    it('应该支持自定义内容渲染', () => {
      const tabs = [
        {
          key: 'tab1',
          label: '标签1',
          content: '内容1',
          renderContent: (item: any) => <div className="custom">{item.content}</div>,
        },
      ];

      render(<Tabs items={tabs} />);
      expect(screen.getByText('内容1').closest('.custom')).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理空标签数组', () => {
      const { container } = render(<Tabs items={[]} />);
      expect(container.querySelector('.tabs')).toBeInTheDocument();
    });

    it('应该处理单个标签', () => {
      render(<Tabs items={[defaultTabs[0]]} />);
      expect(screen.getByText('标签1')).toBeInTheDocument();
      expect(screen.getByText('内容1')).toBeInTheDocument();
    });

    it('应该处理所有标签都禁用的情况', async () => {
      const allDisabled = defaultTabs.map((tab) => ({ ...tab, disabled: true }));

      render(<Tabs items={allDisabled} />);

      await userEvent.click(screen.getByText('标签1'));

      expect(screen.getByText('内容1')).toBeInTheDocument();
    });
  });

  describe('动画效果', () => {
    it('切换时应该有过渡动画', async () => {
      const { container } = render(<Tabs items={defaultTabs} />);

      const panel1 = container.querySelector('[role="tabpanel"]');
      expect(panel1).toHaveClass('tab-panel-enter');

      await userEvent.click(screen.getByText('标签2'));

      const panel2 = container.querySelector('[role="tabpanel"]');
      expect(panel2).toHaveClass('tab-panel-enter');
    });
  });

  describe('附加功能', () => {
    it('应该支持标签栏额外内容', () => {
      render(
        <Tabs
          items={defaultTabs}
          tabBarExtraContent={<button>操作按钮</button>}
        />
      );
      expect(screen.getByRole('button', { name: '操作按钮' })).toBeInTheDocument();
    });

    it('应该支持标签栏内容位置', () => {
      render(
        <Tabs
          items={defaultTabs}
          tabBarExtraContent={{ left: <span>左侧</span>, right: <span>右侧</span> }}
        />
      );
      expect(screen.getByText('左侧')).toBeInTheDocument();
      expect(screen.getByText('右侧')).toBeInTheDocument();
    });
  });

  describe('尺寸配置', () => {
    it('应该渲染小尺寸标签', () => {
      const { container } = render(<Tabs items={defaultTabs} size="sm" />);
      expect(container.querySelector('.tabs-sm')).toBeInTheDocument();
    });

    it('应该渲染中等尺寸标签（默认）', () => {
      const { container } = render(<Tabs items={defaultTabs} size="md" />);
      expect(container.querySelector('.tabs-md')).toBeInTheDocument();
    });

    it('应该渲染大尺寸标签', () => {
      const { container } = render(<Tabs items={defaultTabs} size="lg" />);
      expect(container.querySelector('.tabs-lg')).toBeInTheDocument();
    });
  });

  describe('类型变体', () => {
    it('应该渲染 line 类型（默认）', () => {
      const { container } = render(<Tabs items={defaultTabs} type="line" />);
      expect(container.querySelector('.tabs-line')).toBeInTheDocument();
    });

    it('应该渲染 card 类型', () => {
      const { container } = render(<Tabs items={defaultTabs} type="card" />);
      expect(container.querySelector('.tabs-card')).toBeInTheDocument();
    });

    it('应该渲染 segmented 类型', () => {
      const { container } = render(<Tabs items={defaultTabs} type="segmented" />);
      expect(container.querySelector('.tabs-segmented')).toBeInTheDocument();
    });
  });
});
