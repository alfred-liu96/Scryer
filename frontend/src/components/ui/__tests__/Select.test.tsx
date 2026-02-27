/**
 * Select 组件单元测试
 *
 * 测试契约:
 * - 支持单选和多选模式
 * - 支持搜索过滤功能
 * - 支持禁用选项
 * - 支持分组选项
 * - 支持自定义渲染
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../Select';

describe('Select', () => {
  const options = [
    { value: 'apple', label: '苹果' },
    { value: 'banana', label: '香蕉' },
    { value: 'orange', label: '橙子' },
  ];

  describe('基础渲染', () => {
    it('应该渲染默认选择器', () => {
      render(<Select options={options} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('应该显示占位符', () => {
      render(<Select options={options} placeholder="请选择水果" />);
      expect(screen.getByText('请选择水果')).toBeInTheDocument();
    });

    it('应该显示默认值', () => {
      render(<Select options={options} defaultValue="apple" />);
      expect(screen.getByText('苹果')).toBeInTheDocument();
    });
  });

  describe('下拉菜单', () => {
    it('点击选择器应该打开下拉菜单', async () => {
      render(<Select options={options} />);
      const trigger = screen.getByRole('combobox');

      await userEvent.click(trigger);

      expect(screen.getByText('苹果')).toBeInTheDocument();
      expect(screen.getByText('香蕉')).toBeInTheDocument();
      expect(screen.getByText('橙子')).toBeInTheDocument();
    });

    it('再次点击应该关闭下拉菜单', async () => {
      render(<Select options={options} />);
      const trigger = screen.getByRole('combobox');

      await userEvent.click(trigger);
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByText('苹果')).not.toBeInTheDocument();
      });
    });
  });

  describe('选项选择', () => {
    it('点击选项应该更新显示值', async () => {
      render(<Select options={options} />);
      const trigger = screen.getByRole('combobox');

      await userEvent.click(trigger);
      await userEvent.click(screen.getByText('香蕉'));

      expect(screen.getByText('香蕉')).toBeInTheDocument();
    });

    it('应该触发 onChange 回调', async () => {
      const handleChange = jest.fn();
      render(<Select options={options} onChange={handleChange} />);

      await userEvent.click(screen.getByRole('combobox'));
      await userEvent.click(screen.getByText('橙子'));

      expect(handleChange).toHaveBeenCalledWith('orange', expect.any(Object));
    });
  });

  describe('受控模式', () => {
    it('应该受 value 控制', () => {
      const { rerender } = render(<Select options={options} value="apple" />);
      expect(screen.getByText('苹果')).toBeInTheDocument();

      rerender(<Select options={options} value="banana" />);
      expect(screen.getByText('香蕉')).toBeInTheDocument();
    });
  });

  describe('禁用状态', () => {
    it('禁用选择器不可点击', async () => {
      render(<Select options={options} disabled />);
      const trigger = screen.getByRole('combobox');

      expect(trigger).toBeDisabled();
    });

    it('禁用选项不可选择', async () => {
      const optionsWithDisabled = [
        ...options,
        { value: 'grape', label: '葡萄', disabled: true },
      ];

      render(<Select options={optionsWithDisabled} />);

      await userEvent.click(screen.getByRole('combobox'));

      const grapeOption = screen.getByText('葡萄');
      expect(grapeOption).toHaveClass('option-disabled');
    });
  });

  describe('多选模式', () => {
    const handleChange = jest.fn();

    it('应该支持多选', async () => {
      render(
        <Select
          options={options}
          multiple
          onChange={handleChange}
        />
      );

      await userEvent.click(screen.getByRole('combobox'));
      await userEvent.click(screen.getByText('苹果'));
      await userEvent.click(screen.getByText('香蕉'));

      expect(handleChange).toHaveBeenCalledWith(['apple', 'banana'], expect.any(Object));
    });

    it('应该显示已选项的标签', async () => {
      render(
        <Select
          options={options}
          multiple
          defaultValue={['apple', 'banana']}
        />
      );

      expect(screen.getByText('苹果')).toBeInTheDocument();
      expect(screen.getByText('香蕉')).toBeInTheDocument();

      const closeButton = screen.getAllByRole('button');
      expect(closeButton.length).toBeGreaterThanOrEqual(2);
    });

    it('可以移除已选项', async () => {
      render(
        <Select
          options={options}
          multiple
          defaultValue={['apple']}
        />
      );

      const removeButtons = screen.getAllByRole('button');
      await userEvent.click(removeButtons[0]);

      expect(screen.queryByText('苹果')).not.toBeInTheDocument();
    });
  });

  describe('搜索功能', () => {
    it('应该支持搜索过滤', async () => {
      render(<Select options={options} searchable />);

      await userEvent.click(screen.getByRole('combobox'));

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, '苹果');

      expect(screen.getByText('苹果')).toBeInTheDocument();
      expect(screen.queryByText('香蕉')).not.toBeInTheDocument();
    });

    it('无搜索结果时显示提示', async () => {
      render(<Select options={options} searchable />);

      await userEvent.click(screen.getByRole('combobox'));

      const searchInput = screen.getByRole('searchbox');
      await userEvent.type(searchInput, '不存在的');

      expect(screen.getByText('无搜索结果')).toBeInTheDocument();
    });
  });

  describe('分组选项', () => {
    const groupedOptions = [
      {
        label: '水果',
        options: [
          { value: 'apple', label: '苹果' },
          { value: 'banana', label: '香蕉' },
        ],
      },
      {
        label: '蔬菜',
        options: [
          { value: 'carrot', label: '胡萝卜' },
          { value: 'tomato', label: '西红柿' },
        ],
      },
    ];

    it('应该显示分组标题', async () => {
      render(<Select options={groupedOptions} />);

      await userEvent.click(screen.getByRole('combobox'));

      expect(screen.getByText('水果')).toBeInTheDocument();
      expect(screen.getByText('蔬菜')).toBeInTheDocument();
    });
  });

  describe('自定义渲染', () => {
    it('应该支持自定义选项渲染', async () => {
      const renderOption = (option: any) => (
        <div>
          <span>{option.label}</span>
          <span className="price">{option.price}</span>
        </div>
      );

      const optionsWithPrice = [
        { value: 'apple', label: '苹果', price: '¥5' },
        { value: 'banana', label: '香蕉', price: '¥3' },
      ];

      render(<Select options={optionsWithPrice} renderOption={renderOption} />);

      await userEvent.click(screen.getByRole('combobox'));

      expect(screen.getByText('¥5')).toBeInTheDocument();
      expect(screen.getByText('¥3')).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('应该支持键盘导航', async () => {
      render(<Select options={options} />);

      await userEvent.click(screen.getByRole('combobox'));

      const combobox = screen.getByRole('combobox');
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');

      expect(screen.getByText('苹果')).toBeInTheDocument();
    });

    it('应该有正确的 aria 属性', () => {
      render(
        <Select
          options={options}
          label="选择水果"
        />
      );

      expect(screen.getByLabelText('选择水果')).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理空选项', () => {
      render(<Select options={[]} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('应该处理无效的默认值', () => {
      render(<Select options={options} defaultValue="invalid" />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });
});
