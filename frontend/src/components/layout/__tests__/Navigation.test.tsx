/**
 * Navigation 组件契约测试 (TDD)
 *
 * 契约定义:
 * - Navigation 组件应接受导航项数组
 * - 应支持当前活动状态指示
 * - 应支持点击事件处理
 * - 应支持水平/垂直布局模式
 * - 应支持响应式显示
 *
 * 注意: 此测试为契约测试，组件实现尚不存在
 * 预期: 这些测试在实现前会失败 (RED)
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Navigation } from '../Navigation'

// 定义导航项类型（契约）
interface NavItem {
  id: string
  label: string
  href: string
  icon?: React.ReactNode
  disabled?: boolean
}

describe('Navigation Component (Contract)', () => {
  const mockItems: NavItem[] = [
    { id: '1', label: 'Home', href: '/' },
    { id: '2', label: 'Tasks', href: '/tasks' },
    { id: '3', label: 'Settings', href: '/settings' },
  ]

  describe('Rendering Contract', () => {
    it('should render navigation container', () => {
      // 这个测试会在组件不存在时失败
      render(<Navigation items={mockItems} />)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should render all navigation items', () => {
      render(<Navigation items={mockItems} />)

      mockItems.forEach((item) => {
        const link = screen.getByText(item.label)
        expect(link).toBeInTheDocument()
      })
    })

    it('should render links with correct href attributes', () => {
      render(<Navigation items={mockItems} />)

      mockItems.forEach((item) => {
        const link = screen.getByRole('link', { name: item.label })
        expect(link).toHaveAttribute('href', item.href)
      })
    })

    it('should render icons when provided', () => {
      const itemsWithIcons: NavItem[] = [
        { id: '1', label: 'Home', href: '/', icon: <span data-testid="icon-home">H</span> },
        { id: '2', label: 'Tasks', href: '/tasks', icon: <span data-testid="icon-tasks">T</span> },
      ]

      render(<Navigation items={itemsWithIcons} />)

      expect(screen.getByTestId('icon-home')).toBeInTheDocument()
      expect(screen.getByTestId('icon-tasks')).toBeInTheDocument()
    })
  })

  describe('Active State Contract', () => {
    it('should accept activeItemId prop', () => {
      render(<Navigation items={mockItems} activeItemId="2" />)

      const tasksLink = screen.getByText('Tasks')
      expect(tasksLink.parentElement).toHaveClass('active')
    })

    it('should highlight only the active item', () => {
      render(<Navigation items={mockItems} activeItemId="1" />)

      const homeLink = screen.getByText('Home')
      const tasksLink = screen.getByText('Tasks')

      expect(homeLink.parentElement).toHaveClass('active')
      expect(tasksLink.parentElement).not.toHaveClass('active')
    })

    it('should not highlight any item when activeItemId is null', () => {
      render(<Navigation items={mockItems} activeItemId={null} />)

      mockItems.forEach((item) => {
        const link = screen.getByText(item.label)
        expect(link.parentElement).not.toHaveClass('active')
      })
    })
  })

  describe('Click Handler Contract', () => {
    it('should call onItemClick when item is clicked', () => {
      const handleClick = jest.fn()

      render(
        <Navigation
          items={mockItems}
          onItemClick={handleClick}
        />
      )

      const tasksLink = screen.getByText('Tasks')
      fireEvent.click(tasksLink)

      expect(handleClick).toHaveBeenCalledTimes(1)
      expect(handleClick).toHaveBeenCalledWith(mockItems[1])
    })

    it('should not call onItemClick for disabled items', () => {
      const handleClick = jest.fn()
      const itemsWithDisabled: NavItem[] = [
        ...mockItems,
        { id: '4', label: 'Disabled', href: '/disabled', disabled: true },
      ]

      render(
        <Navigation
          items={itemsWithDisabled}
          onItemClick={handleClick}
        />
      )

      const disabledLink = screen.getByText('Disabled')
      fireEvent.click(disabledLink)

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should add disabled class to disabled items', () => {
      const itemsWithDisabled: NavItem[] = [
        { id: '1', label: 'Home', href: '/' },
        { id: '2', label: 'Disabled', href: '/disabled', disabled: true },
      ]

      render(<Navigation items={itemsWithDisabled} />)

      const disabledLink = screen.getByText('Disabled')
      expect(disabledLink.parentElement).toHaveClass('disabled')
    })
  })

  describe('Layout Mode Contract', () => {
    it('should support horizontal layout mode', () => {
      const { container } = render(
        <Navigation items={mockItems} orientation="horizontal" />
      )

      const nav = container.querySelector('.navigation')
      expect(nav).toHaveClass('navigation-horizontal')
    })

    it('should support vertical layout mode', () => {
      const { container } = render(
        <Navigation items={mockItems} orientation="vertical" />
      )

      const nav = container.querySelector('.navigation')
      expect(nav).toHaveClass('navigation-vertical')
    })

    it('should default to horizontal orientation', () => {
      const { container } = render(<Navigation items={mockItems} />)

      const nav = container.querySelector('.navigation')
      expect(nav).toHaveClass('navigation-horizontal')
    })
  })

  describe('Responsive Behavior Contract', () => {
    it('should accept className prop for custom styling', () => {
      const { container } = render(
        <Navigation items={mockItems} className="custom-nav" />
      )

      const nav = container.querySelector('.navigation')
      expect(nav).toHaveClass('custom-nav')
    })

    it('should render correctly on mobile viewport', () => {
      // 模拟移动端视口
      global.innerWidth = 375
      global.dispatchEvent(new Event('resize'))

      const { container } = render(<Navigation items={mockItems} />)

      const nav = container.querySelector('.navigation')
      expect(nav).toBeInTheDocument()
    })
  })

  describe('Accessibility Contract', () => {
    it('should have navigation role', () => {
      render(<Navigation items={mockItems} />)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should accept aria-label for accessibility', () => {
      render(<Navigation items={mockItems} ariaLabel="Main navigation" />)

      const nav = screen.getByRole('navigation', { name: 'Main navigation' })
      expect(nav).toBeInTheDocument()
    })

    it('should render links as accessible elements', () => {
      render(<Navigation items={mockItems} />)

      mockItems.forEach((item) => {
        const link = screen.getByRole('link', { name: item.label })
        expect(link).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases Contract', () => {
    it('should render empty navigation when items array is empty', () => {
      render(<Navigation items={[]} />)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
      expect(nav).toBeEmptyDOMElement()
    })

    it('should render with single item', () => {
      const singleItem: NavItem[] = [
        { id: '1', label: 'Only Item', href: '/only' },
      ]

      render(<Navigation items={singleItem} />)

      expect(screen.getByText('Only Item')).toBeInTheDocument()
    })

    it('should handle special characters in labels', () => {
      const specialItems: NavItem[] = [
        { id: '1', label: 'Café & Restaurant', href: '/cafe' },
        { id: '2', label: '日本語', href: '/jp' },
      ]

      render(<Navigation items={specialItems} />)

      expect(screen.getByText('Café & Restaurant')).toBeInTheDocument()
      expect(screen.getByText('日本語')).toBeInTheDocument()
    })
  })

  describe('Snapshot Contract', () => {
    it('should match snapshot with default props', () => {
      const { container } = render(<Navigation items={mockItems} />)

      expect(container.firstChild).toMatchSnapshot()
    })

    it('should match snapshot with active item', () => {
      const { container } = render(
        <Navigation items={mockItems} activeItemId="2" />
      )

      expect(container.firstChild).toMatchSnapshot()
    })

    it('should match snapshot with icons', () => {
      const itemsWithIcons: NavItem[] = [
        { id: '1', label: 'Home', href: '/', icon: <span>H</span> },
        { id: '2', label: 'Tasks', href: '/tasks', icon: <span>T</span> },
      ]

      const { container } = render(<Navigation items={itemsWithIcons} />)

      expect(container.firstChild).toMatchSnapshot()
    })
  })
})
