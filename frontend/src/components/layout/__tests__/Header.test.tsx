/**
 * Header 组件单元测试
 *
 * 测试范围:
 * - 组件渲染
 * - Props 传递 (logo, nav, actions)
 * - CSS 类名正确性
 * - 快照测试
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { Header } from '../Header'

describe('Header Component', () => {
  describe('Rendering', () => {
    it('should render header element with correct class', () => {
      render(<Header />)

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('header')
    })

    it('should render logo section', () => {
      render(<Header logo={<div>Logo</div>} />)

      const logo = screen.getByText('Logo')
      expect(logo).toBeInTheDocument()
      expect(logo.parentElement).toHaveClass('header-logo')
    })

    it('should render nav section', () => {
      render(<Header nav={<nav>Navigation</nav>} />)

      const nav = screen.getByText('Navigation')
      expect(nav).toBeInTheDocument()
      expect(nav.parentElement).toHaveClass('header-nav')
    })

    it('should render actions section', () => {
      render(<Header actions={<div>Actions</div>} />)

      const actions = screen.getByText('Actions')
      expect(actions).toBeInTheDocument()
      expect(actions.parentElement).toHaveClass('header-actions')
    })
  })

  describe('Props', () => {
    it('should render without any props', () => {
      const { container } = render(<Header />)

      expect(container.querySelector('.header')).toBeInTheDocument()
      expect(container.querySelector('.header-logo')).toBeEmptyDOMElement()
      expect(container.querySelector('.header-nav')).toBeEmptyDOMElement()
      expect(container.querySelector('.header-actions')).toBeEmptyDOMElement()
    })

    it('should render with all props provided', () => {
      const { container } = render(
        <Header
          logo={<div>Test Logo</div>}
          nav={<nav>Test Nav</nav>}
          actions={<div>Test Actions</div>}
        />
      )

      expect(screen.getByText('Test Logo')).toBeInTheDocument()
      expect(screen.getByText('Test Nav')).toBeInTheDocument()
      expect(screen.getByText('Test Actions')).toBeInTheDocument()
    })

    it('should render complex logo component', () => {
      const LogoComponent = () => (
        <div>
          <span>Icon</span>
          <span>Scryer</span>
        </div>
      )

      render(<Header logo={<LogoComponent />} />)

      expect(screen.getByText('Icon')).toBeInTheDocument()
      expect(screen.getByText('Scryer')).toBeInTheDocument()
    })

    it('should render navigation with links', () => {
      const nav = (
        <nav>
          <a href="/home">Home</a>
          <a href="/about">About</a>
        </nav>
      )

      render(<Header nav={nav} />)

      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('About')).toBeInTheDocument()
    })

    it('should render actions with buttons', () => {
      const actions = (
        <div>
          <button>Login</button>
          <button>Signup</button>
        </div>
      )

      render(<Header actions={actions} />)

      expect(screen.getByText('Login')).toBeInTheDocument()
      expect(screen.getByText('Signup')).toBeInTheDocument()
    })
  })

  describe('Structure', () => {
    it('should have correct DOM structure', () => {
      const { container } = render(
        <Header
          logo={<div>Logo</div>}
          nav={<nav>Nav</nav>}
          actions={<div>Actions</div>}
        />
      )

      const header = container.querySelector('.header')
      expect(header?.children).toHaveLength(3)

      expect(header?.children[0]).toHaveClass('header-logo')
      expect(header?.children[1]).toHaveClass('header-nav')
      expect(header?.children[2]).toHaveClass('header-actions')
    })
  })

  describe('Snapshot', () => {
    it('should match snapshot with all props', () => {
      const { container } = render(
        <Header
          logo={<div>Logo</div>}
          nav={<nav>Nav</nav>}
          actions={<div>Actions</div>}
        />
      )

      expect(container.firstChild).toMatchSnapshot()
    })

    it('should match snapshot without props', () => {
      const { container } = render(<Header />)

      expect(container.firstChild).toMatchSnapshot()
    })
  })
})
