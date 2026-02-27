/**
 * Dropdown 组件单元测试
 *
 * 测试契约:
 * - 支持触发器自定义渲染
 * - 支持不同触发方式（点击、悬停）
 * - 支持菜单项分组
 * - 支持禁用菜单项
 * - 支持图标和快捷键显示
 * - 支持多级菜单
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown } from '../Dropdown';

describe('Dropdown', () => {
  const defaultMenu = [
    { key: 'item1', label: '选项1' },
    { key: 'item2', label: '选项2' },
    { key: 'item3', label: '选项3' },
  ];

  describe('基础渲染', () => {
    it('应该渲染默认下拉菜单', () => {
      render(
        <Dropdown menu={defaultMenu}>
          <button>点击打开</button>
        </Dropdown>
      );
      expect(screen.getByRole('button', { name: '点击打开' })).toBeInTheDocument();
    });

    it('点击触发器应该打开菜单', async () => {
      render(
        <Dropdown menu={defaultMenu}>
          <button>打开菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '打开菜单' }));

      expect(screen.getByText('选项1')).toBeInTheDocument();
      expect(screen.getByText('选项2')).toBeInTheDocument();
      expect(screen.getByText('选项3')).toBeInTheDocument();
    });

    it('再次点击应该关闭菜单', async () => {
      render(
        <Dropdown menu={defaultMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      const trigger = screen.getByRole('button', { name: '菜单' });

      await userEvent.click(trigger);
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByText('选项1')).not.toBeInTheDocument();
      });
    });
  });

  describe('触发方式', () => {
    it('click 触发（默认）', async () => {
      render(
        <Dropdown menu={defaultMenu} trigger="click">
          <button>点击</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '点击' }));

      expect(screen.getByText('选项1')).toBeInTheDocument();
    });

    it('hover 触发', async () => {
      render(
        <Dropdown menu={defaultMenu} trigger="hover">
          <button>悬停</button>
        </Dropdown>
      );

      const trigger = screen.getByRole('button', { name: '悬停' });
      await userEvent.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText('选项1')).toBeInTheDocument();
      });
    });

    it('contextMenu 触发（右键）', async () => {
      render(
        <Dropdown menu={defaultMenu} trigger="contextMenu">
          <button>右键</button>
        </Dropdown>
      );

      const trigger = screen.getByRole('button', { name: '右键' });
      await userEvent.contextMenu(trigger);

      expect(screen.getByText('选项1')).toBeInTheDocument();
    });
  });

  describe('菜单项交互', () => {
    it('点击菜单项应该触发 onSelect', async () => {
      const handleSelect = jest.fn();
      render(
        <Dropdown menu={defaultMenu} onSelect={handleSelect}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));
      await userEvent.click(screen.getByText('选项2'));

      expect(handleSelect).toHaveBeenCalledWith('item2', expect.any(Object));
    });

    it('选择后应该关闭菜单', async () => {
      render(
        <Dropdown menu={defaultMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));
      await userEvent.click(screen.getByText('选项1'));

      await waitFor(() => {
        expect(screen.queryByText('选项1')).not.toBeInTheDocument();
      });
    });

    it('禁用的菜单项不可点击', async () => {
      const menuWithDisabled = [
        ...defaultMenu,
        { key: 'item4', label: '选项4', disabled: true },
      ];

      const handleSelect = jest.fn();
      render(
        <Dropdown menu={menuWithDisabled} onSelect={handleSelect}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      const item4 = screen.getByText('选项4');
      expect(item4).toHaveClass('menu-item-disabled');

      await userEvent.click(item4);

      expect(handleSelect).not.toHaveBeenCalled();
    });
  });

  describe('菜单项分组', () => {
    const groupedMenu = [
      {
        type: 'group',
        label: '分组1',
        children: [
          { key: 'item1', label: '选项1' },
          { key: 'item2', label: '选项2' },
        ],
      },
      {
        type: 'group',
        label: '分组2',
        children: [
          { key: 'item3', label: '选项3' },
          { key: 'item4', label: '选项4' },
        ],
      },
    ];

    it('应该显示分组标题', async () => {
      render(
        <Dropdown menu={groupedMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(screen.getByText('分组1')).toBeInTheDocument();
      expect(screen.getByText('分组2')).toBeInTheDocument();
    });

    it('应该渲染分组内选项', async () => {
      render(
        <Dropdown menu={groupedMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(screen.getByText('选项1')).toBeInTheDocument();
      expect(screen.getByText('选项3')).toBeInTheDocument();
    });
  });

  describe('菜单项样式', () => {
    it('应该支持带图标的菜单项', async () => {
      const menuWithIcon = [
        {
          key: 'item1',
          label: '新建',
          icon: <span data-icon="new">➕</span>,
        },
      ];

      render(
        <Dropdown menu={menuWithIcon}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(screen.getByText('➕')).toBeInTheDocument();
    });

    it('应该支持带快捷键的菜单项', async () => {
      const menuWithShortcut = [
        {
          key: 'item1',
          label: '保存',
          shortcut: '⌘S',
        },
      ];

      render(
        <Dropdown menu={menuWithShortcut}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(screen.getByText('⌘S')).toBeInTheDocument();
    });

    it('应该支持危险菜单项', async () => {
      const menuWithDanger = [
        {
          key: 'item1',
          label: '删除',
          danger: true,
        },
      ];

      render(
        <Dropdown menu={menuWithDanger}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(screen.getByText('删除')).toHaveClass('menu-item-danger');
    });
  });

  describe('分隔线', () => {
    const menuWithDivider = [
      { key: 'item1', label: '选项1' },
      { type: 'divider' },
      { key: 'item2', label: '选项2' },
    ];

    it('应该渲染分隔线', async () => {
      render(
        <Dropdown menu={menuWithDivider}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      const { container } = render(
        <Dropdown menu={menuWithDivider}>
          <button>菜单</button>
        </Dropdown>
      );
      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(container.querySelector('.menu-item-divider')).toBeInTheDocument();
    });
  });

  describe('多级菜单', () => {
    const nestedMenu = [
      {
        key: 'item1',
        label: '文件',
        children: [
          { key: 'new', label: '新建' },
          { key: 'open', label: '打开' },
        ],
      },
      {
        key: 'item2',
        label: '编辑',
        children: [
          { key: 'copy', label: '复制' },
          { key: 'paste', label: '粘贴' },
        ],
      },
    ];

    it('应该渲染子菜单', async () => {
      render(
        <Dropdown menu={nestedMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));
      await userEvent.hover(screen.getByText('文件'));

      await waitFor(() => {
        expect(screen.getByText('新建')).toBeInTheDocument();
        expect(screen.getByText('打开')).toBeInTheDocument();
      });
    });

    it('悬停应该展开子菜单', async () => {
      render(
        <Dropdown menu={nestedMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      const parentItem = screen.getByText('文件');
      await userEvent.hover(parentItem);

      await waitFor(() => {
        expect(screen.getByText('新建')).toBeInTheDocument();
      });
    });
  });

  describe('位置配置', () => {
    it('应该支持 bottomLeft 位置（默认）', async () => {
      const { container } = render(
        <Dropdown menu={defaultMenu} placement="bottomLeft">
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(container.querySelector('.dropdown-bottom-left')).toBeInTheDocument();
    });

    it('应该支持 bottomRight 位置', async () => {
      const { container } = render(
        <Dropdown menu={defaultMenu} placement="bottomRight">
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(container.querySelector('.dropdown-bottom-right')).toBeInTheDocument();
    });

    it('应该支持 topLeft 位置', async () => {
      const { container } = render(
        <Dropdown menu={defaultMenu} placement="topLeft">
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(container.querySelector('.dropdown-top-left')).toBeInTheDocument();
    });
  });

  describe('受控模式', () => {
    it('应该受 open 属性控制', async () => {
      const { rerender } = render(
        <Dropdown menu={defaultMenu} open={false}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(screen.queryByText('选项1')).not.toBeInTheDocument();

      rerender(
        <Dropdown menu={defaultMenu} open={true}>
          <button>菜单</button>
        </Dropdown>
      );

      expect(screen.getByText('选项1')).toBeInTheDocument();
    });

    it('应该触发 onOpenChange', async () => {
      const handleOpenChange = jest.fn();
      render(
        <Dropdown menu={defaultMenu} onOpenChange={handleOpenChange}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe('可访问性', () => {
    it('应该支持键盘导航', async () => {
      render(
        <Dropdown menu={defaultMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      const trigger = screen.getByRole('button', { name: '菜单' });
      trigger.focus();

      await userEvent.keyboard('{Enter}');

      expect(screen.getByText('选项1')).toBeInTheDocument();

      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');

      expect(screen.getByText('选项2')).toBeInTheDocument();
    });

    it('ESC 键应该关闭菜单', async () => {
      render(
        <Dropdown menu={defaultMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));
      await userEvent.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('选项1')).not.toBeInTheDocument();
      });
    });

    it('菜单应该有 role="menu"', async () => {
      const { container } = render(
        <Dropdown menu={defaultMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(container.querySelector('[role="menu"]')).toBeInTheDocument();
    });

    it('菜单项应该有 role="menuitem"', async () => {
      render(
        <Dropdown menu={defaultMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBe(3);
    });
  });

  describe('自定义渲染', () => {
    it('应该支持自定义菜单项渲染', async () => {
      const customMenu = [
        {
          key: 'item1',
          label: '选项1',
          renderItem: (item: any) => (
            <div className="custom-item">
              <span>{item.label}</span>
              <span className="suffix">后缀</span>
            </div>
          ),
        },
      ];

      render(
        <Dropdown menu={customMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(screen.getByText('后缀')).toBeInTheDocument();
    });

    it('应该支持自定义触发器', () => {
      render(
        <Dropdown menu={defaultMenu}>
          <Dropdown.Trigger>
            <button>自定义触发器</button>
          </Dropdown.Trigger>
        </Dropdown>
      );

      expect(screen.getByRole('button', { name: '自定义触发器' })).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理空菜单', async () => {
      render(
        <Dropdown menu={[]}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('应该处理只有分隔符的菜单', async () => {
      const menuWithOnlyDivider = [{ type: 'divider' }];

      render(
        <Dropdown menu={menuWithOnlyDivider}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('点击外部应该关闭菜单', async () => {
      render(
        <div>
          <Dropdown menu={defaultMenu}>
            <button>菜单</button>
          </Dropdown>
          <button>外部按钮</button>
        </div>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));
      await userEvent.click(screen.getByRole('button', { name: '外部按钮' }));

      await waitFor(() => {
        expect(screen.queryByText('选项1')).not.toBeInTheDocument();
      });
    });
  });

  describe('动画效果', () => {
    it('打开时应该有进入动画', async () => {
      const { container } = render(
        <Dropdown menu={defaultMenu}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      const dropdown = container.querySelector('.dropdown');
      expect(dropdown).toHaveClass('dropdown-enter');
    });

    it('关闭时应该有退出动画', async () => {
      const { container } = render(
        <Dropdown menu={defaultMenu} isClosing>
          <button>菜单</button>
        </Dropdown>
      );

      const dropdown = container.querySelector('.dropdown');
      expect(dropdown).toHaveClass('dropdown-exit');
    });
  });

  describe('附加属性', () => {
    it('应该传递自定义 className', async () => {
      const { container } = render(
        <Dropdown menu={defaultMenu} dropdownClassName="custom-dropdown">
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      expect(container.querySelector('.custom-dropdown')).toBeInTheDocument();
    });

    it('应该传递自定义样式', async () => {
      const { container } = render(
        <Dropdown menu={defaultMenu} dropdownStyle={{ zIndex: 9999 }}>
          <button>菜单</button>
        </Dropdown>
      );

      await userEvent.click(screen.getByRole('button', { name: '菜单' }));

      const dropdown = container.querySelector('.dropdown');
      expect(dropdown).toHaveStyle({ zIndex: 9999 });
    });
  });
});
