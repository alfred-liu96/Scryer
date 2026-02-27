/**
 * MobileMenu 组件契约测试 (TDD)
 *
 * 契约定义:
 * - MobileMenu 应支持打开/关闭状态切换
 * - 应支持菜单项数组渲染
 * - 应支持汉堡菜单图标
 * - 应支持点击外部关闭
 * - 应支持过渡动画
 * - 应支持无障碍访问
 *
 * 注意: 此测试为契约测试，组件实现尚不存在
 * 预期: 这些测试在实现前会失败 (RED)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MobileMenu } from '../MobileMenu'

// 定义菜单项类型（契约）
interface MenuItem {
  id: string
  label: string
  href: string
  icon?: React.ReactNode
}

describe('MobileMenu Component (Contract)', () => {
  const mockMenuItems: MenuItem[] = [
    { id: '1', label: 'Home', href: '/' },
    { id: '2', label: 'Tasks', href: '/tasks' },
    { id: '3', label: 'Settings', href: '/settings' },
  ]

  describe('Rendering Contract', () => {
    it('should render menu toggle button', () => {
      render(<MobileMenu items={mockMenuItems} />)

      const toggleButton = screen.getByRole('button', { name: /menu/i })
      expect(toggleButton).toBeInTheDocument()
    })

    it('should render hamburger icon by default', () => {
      render(<MobileMenu items={mockMenuItems} />)

      const icon = screen.getByTestId('hamburger-icon')
      expect(icon).toBeInTheDocument()
    })

    it('should not render menu items when closed', () => {
      render(<MobileMenu items={mockMenuItems} isOpen={false} />)

      expect(screen.queryByText('Home')).not.toBeInTheDocument()
      expect(screen.queryByText('Tasks')).not.toBeInTheDocument()
    })

    it('should render menu items when open', () => {
      render(<MobileMenu items={mockMenuItems} isOpen={true} />)

      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Tasks')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should render close icon when menu is open', () => {
      render(<MobileMenu items={mockMenuItems} isOpen={true} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })
  })

  describe('Open/Close State Contract', () => {
    it('should accept isOpen prop', () => {
      const { container } = render(
        <MobileMenu items={mockMenuItems} isOpen={true} />
      )

      const menu = container.querySelector('.mobile-menu')
      expect(menu).toHaveClass('open')
    })

    it('should call onToggle when toggle button is clicked', () => {
      const handleToggle = jest.fn()

      render(<MobileMenu items={mockMenuItems} onToggle={handleToggle} />)

      const toggleButton = screen.getByRole('button', { name: /menu/i })
      fireEvent.click(toggleButton)

      expect(handleToggle).toHaveBeenCalledTimes(1)
    })

    it('should call onToggle with correct state when opening', () => {
      const handleToggle = jest.fn()

      render(<MobileMenu items={mockMenuItems} isOpen={false} onToggle={handleToggle} />)

      const toggleButton = screen.getByRole('button', { name: /menu/i })
      fireEvent.click(toggleButton)

      expect(handleToggle).toHaveBeenCalledWith(true)
    })

    it('should call onToggle with correct state when closing', () => {
      const handleToggle = jest.fn()

      render(<MobileMenu items={mockMenuItems} isOpen={true} onToggle={handleToggle} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)

      expect(handleToggle).toHaveBeenCalledWith(false)
    })
  })

  describe('Menu Items Contract', () => {
    it('should render all menu items when open', () => {
      render(<MobileMenu items={mockMenuItems} isOpen={true} />)

      mockMenuItems.forEach((item) => {
        const link = screen.getByText(item.label)
        expect(link).toBeInTheDocument()
      })
    })

    it('should render links with correct href attributes', () => {
      render(<MobileMenu items={mockMenuItems} isOpen={true} />)

      mockMenuItems.forEach((item) => {
        const link = screen.getByRole('link', { name: item.label })
        expect(link).toHaveAttribute('href', item.href)
      })
    })

    it('should call onItemClick when menu item is clicked', () => {
      const handleItemClick = jest.fn()

      render(
        <MobileMenu
          items={mockMenuItems}
          isOpen={true}
          onItemClick={handleItemClick}
        />
      )

      const tasksLink = screen.getByText('Tasks')
      fireEvent.click(tasksLink)

      expect(handleItemClick).toHaveBeenCalledWith(mockMenuItems[1])
    })

    it('should close menu after item click when closeOnSelect is true', () => {
      const handleToggle = jest.fn()

      render(
        <MobileMenu
          items={mockMenuItems}
          isOpen={true}
          onToggle={handleToggle}
          closeOnSelect={true}
        />
      )

      const tasksLink = screen.getByText('Tasks')
      fireEvent.click(tasksLink)

      expect(handleToggle).toHaveBeenCalledWith(false)
    })

    it('should not close menu after item click when closeOnSelect is false', () => {
      const handleToggle = jest.fn()

      render(
        <MobileMenu
          items={mockMenuItems}
          isOpen={true}
          onToggle={handleToggle}
          closeOnSelect={false}
        />
      )

      const tasksLink = screen.getByText('Tasks')
      fireEvent.click(tasksLink)

      expect(handleToggle).not.toHaveBeenCalled()
    })
  })

  describe('Click Outside Contract', () => {
    it('should close when clicking outside the menu', async () => {
      const handleToggle = jest.fn()

      render(
        <div>
          <MobileMenu items={mockMenuItems} isOpen={true} onToggle={handleToggle} />
          <div data-testid="outside">Outside content</div>
        </div>
      )

      const outside = screen.getByTestId('outside')
      fireEvent.mouseDown(outside)

      await waitFor(() => {
        expect(handleToggle).toHaveBeenCalledWith(false)
      })
    })

    it('should not close when clicking inside the menu', () => {
      const handleToggle = jest.fn()

      render(
        <MobileMenu items={mockMenuItems} isOpen={true} onToggle={handleToggle} />
      )

      const menu = screen.getByRole('navigation')
      fireEvent.mouseDown(menu)

      expect(handleToggle).not.toHaveBeenCalled()
    })
  })

  describe('Animation Contract', () => {
    it('should apply animation class when opening', () => {
      const { container } = render(
        <MobileMenu items={mockMenuItems} isOpen={true} />
      )

      const menu = container.querySelector('.mobile-menu')
      expect(menu).toHaveClass('animate-in')
    })

    it('should apply animation class when closing', () => {
      const { container } = render(
        <MobileMenu items={mockMenuItems} isOpen={false} />
      )

      const menu = container.querySelector('.mobile-menu')
      expect(menu).toHaveClass('animate-out')
    })

    it('should accept custom animation duration', () => {
      const { container } = render(
        <MobileMenu items={mockMenuItems} isOpen={true} animationDuration={300} />
      )

      const menu = container.querySelector('.mobile-menu')
      expect(menu).toHaveStyle({ transitionDuration: '300ms' })
    })
  })

  describe('Accessibility Contract', () => {
    it('should have navigation role', () => {
      render(<MobileMenu items={mockMenuItems} isOpen={true} />)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should accept aria-label for accessibility', () => {
      render(
        <MobileMenu items={mockMenuItems} isOpen={true} ariaLabel="Mobile menu" />
      )

      const nav = screen.getByRole('navigation', { name: 'Mobile menu' })
      expect(nav).toBeInTheDocument()
    })

    it('should add aria-expanded to toggle button', () => {
      render(<MobileMenu items={mockMenuItems} isOpen={true} />)

      const toggleButton = screen.getByRole('button', { name: /close/i })
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have aria-expanded false when closed', () => {
      render(<MobileMenu items={mockMenuItems} isOpen={false} />)

      const toggleButton = screen.getByRole('button', { name: /menu/i })
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('should trap focus within menu when open', () => {
      render(<MobileMenu items={mockMenuItems} isOpen={true} />)

      const menu = screen.getByRole('navigation')
      expect(menu).toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('Positioning Contract', () => {
    it('should support left position', () => {
      const { container } = render(
        <MobileMenu items={mockMenuItems} isOpen={true} position="left" />
      )

      const menu = container.querySelector('.mobile-menu')
      expect(menu).toHaveClass('position-left')
    })

    it('should support right position', () => {
      const { container } = render(
        <MobileMenu items={mockMenuItems} isOpen={true} position="right" />
      )

      const menu = container.querySelector('.mobile-menu')
      expect(menu).toHaveClass('position-right')
    })

    it('should default to left position', () => {
      const { container } = render(
        <MobileMenu items={mockMenuItems} isOpen={true} />
      )

      const menu = container.querySelector('.mobile-menu')
      expect(menu).toHaveClass('position-left')
    })
  })

  describe('Customization Contract', () => {
    it('should accept custom toggle button', () => {
      const customToggle = <button data-testid="custom-toggle">Menu</button>

      render(<MobileMenu items={mockMenuItems} toggleButton={customToggle} />)

      expect(screen.getByTestId('custom-toggle')).toBeInTheDocument()
    })

    it('should accept custom className', () => {
      const { container } = render(
        <MobileMenu items={mockMenuItems} isOpen={true} className="custom-menu" />
      )

      const menu = container.querySelector('.mobile-menu')
      expect(menu).toHaveClass('custom-menu')
    })

    it('should accept custom menu items renderer', () => {
      const renderItem = (item: MenuItem) => (
        <a key={item.id} href={item.href} data-testid={`custom-${item.id}`}>
          {item.label}
        </a>
      )

      render(
        <MobileMenu
          items={mockMenuItems}
          isOpen={true}
          renderItem={renderItem}
        />
      )

      expect(screen.getByTestId('custom-1')).toBeInTheDocument()
      expect(screen.getByTestId('custom-2')).toBeInTheDocument()
    })
  })

  describe('Edge Cases Contract', () => {
    it('should render empty menu when items array is empty', () => {
      render(<MobileMenu items={[]} isOpen={true} />)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
      expect(nav).toBeEmptyDOMElement()
    })

    it('should render with single menu item', () => {
      const singleItem: MenuItem[] = [
        { id: '1', label: 'Only Item', href: '/only' },
      ]

      render(<MobileMenu items={singleItem} isOpen={true} />)

      expect(screen.getByText('Only Item')).toBeInTheDocument()
    })

    it('should handle rapid open/close clicks', () => {
      const handleToggle = jest.fn()

      render(<MobileMenu items={mockMenuItems} onToggle={handleToggle} />)

      const toggleButton = screen.getByRole('button')

      fireEvent.click(toggleButton)
      fireEvent.click(toggleButton)
      fireEvent.click(toggleButton)

      expect(handleToggle).toHaveBeenCalledTimes(3)
    })
  })

  describe('Snapshot Contract', () => {
    it('should match snapshot when closed', () => {
      const { container } = render(<MobileMenu items={mockMenuItems} isOpen={false} />)

      expect(container.firstChild).toMatchSnapshot()
    })

    it('should match snapshot when open', () => {
      const { container } = render(<MobileMenu items={mockMenuItems} isOpen={true} />)

      expect(container.firstChild).toMatchSnapshot()
    })

    it('should match snapshot with custom position', () => {
      const { container } = render(
        <MobileMenu items={mockMenuItems} isOpen={true} position="right" />
      )

      expect(container.firstChild).toMatchSnapshot()
    })
  })
})
