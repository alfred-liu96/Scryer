/**
 * Footer 组件单元测试
 *
 * 测试范围:
 * - 组件渲染
 * - Props 传递 (copyright, links)
 * - CSS 类名正确性
 * - 快照测试
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { Footer } from '../Footer'

describe('Footer Component', () => {
  describe('Rendering', () => {
    it('should render footer element with correct class', () => {
      render(<Footer />)

      const footer = screen.getByRole('contentinfo')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('footer')
    })

    it('should render footer content wrapper', () => {
      const { container } = render(<Footer />)

      const content = container.querySelector('.footer-content')
      expect(content).toBeInTheDocument()
    })

    it('should render copyright section', () => {
      render(<Footer copyright="© 2025 Scryer" />)

      const copyright = screen.getByText('© 2025 Scryer')
      expect(copyright).toBeInTheDocument()
      expect(copyright.parentElement).toHaveClass('footer-copyright')
    })

    it('should render links section', () => {
      render(<Footer links={<nav>Links</nav>} />)

      const links = screen.getByText('Links')
      expect(links).toBeInTheDocument()
      expect(links.parentElement).toHaveClass('footer-links')
    })
  })

  describe('Props', () => {
    it('should render without any props', () => {
      const { container } = render(<Footer />)

      expect(container.querySelector('.footer')).toBeInTheDocument()
      expect(container.querySelector('.footer-copyright')).toBeEmptyDOMElement()
      expect(container.querySelector('.footer-links')).toBeEmptyDOMElement()
    })

    it('should render with copyright text', () => {
      render(<Footer copyright="© 2025 Scryer Inc." />)

      expect(screen.getByText('© 2025 Scryer Inc.')).toBeInTheDocument()
    })

    it('should render with links component', () => {
      const links = (
        <nav>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      )

      render(<Footer links={links} />)

      expect(screen.getByText('Privacy')).toBeInTheDocument()
      expect(screen.getByText('Terms')).toBeInTheDocument()
    })

    it('should render with both copyright and links', () => {
      const links = (
        <nav>
          <a href="/about">About</a>
        </nav>
      )

      render(
        <Footer copyright="© 2025 Scryer" links={links} />
      )

      expect(screen.getByText('© 2025 Scryer')).toBeInTheDocument()
      expect(screen.getByText('About')).toBeInTheDocument()
    })

    it('should render complex links component', () => {
      const LinksComponent = () => (
        <nav>
          <div className="link-group">
            <h3>Company</h3>
            <a href="/about">About Us</a>
            <a href="/careers">Careers</a>
          </div>
        </nav>
      )

      render(<Footer links={<LinksComponent />} />)

      expect(screen.getByText('Company')).toBeInTheDocument()
      expect(screen.getByText('About Us')).toBeInTheDocument()
      expect(screen.getByText('Careers')).toBeInTheDocument()
    })
  })

  describe('Structure', () => {
    it('should have correct DOM structure', () => {
      const { container } = render(
        <Footer
          copyright="© 2025"
          links={<nav>Links</nav>}
        />
      )

      const footer = container.querySelector('.footer')
      expect(footer).toBeInTheDocument()

      const content = footer?.querySelector('.footer-content')
      expect(content).toBeInTheDocument()

      expect(content?.children).toHaveLength(2)
      expect(content?.children[0]).toHaveClass('footer-copyright')
      expect(content?.children[1]).toHaveClass('footer-links')
    })

    it('should maintain correct order: copyright first, links second', () => {
      const { container } = render(
        <Footer
          copyright="Copyright Text"
          links={<nav>Links Text</nav>}
        />
      )

      const content = container.querySelector('.footer-content')
      const children = content?.children

      expect(children?.[0]).toHaveTextContent('Copyright Text')
      expect(children?.[1]).toHaveTextContent('Links Text')
    })
  })

  describe('Edge Cases', () => {
    it('should render with empty copyright string', () => {
      render(<Footer copyright="" />)

      const { container } = render(<Footer copyright="" />)
      const copyright = container.querySelector('.footer-copyright')

      expect(copyright).toBeInTheDocument()
      expect(copyright).toBeEmptyDOMElement()
    })

    it('should render with null links', () => {
      const { container } = render(<Footer links={null} />)

      const links = container.querySelector('.footer-links')
      expect(links).toBeInTheDocument()
      expect(links).toBeEmptyDOMElement()
    })

    it('should render with long copyright text', () => {
      const longText = '© 2025 Scryer Inc. All rights reserved. Privacy Policy | Terms of Service | Cookie Policy'

      render(<Footer copyright={longText} />)

      expect(screen.getByText(longText)).toBeInTheDocument()
    })
  })

  describe('Snapshot', () => {
    it('should match snapshot with all props', () => {
      const { container } = render(
        <Footer
          copyright="© 2025 Scryer"
          links={<nav>Links</nav>}
        />
      )

      expect(container.firstChild).toMatchSnapshot()
    })

    it('should match snapshot without props', () => {
      const { container } = render(<Footer />)

      expect(container.firstChild).toMatchSnapshot()
    })

    it('should match snapshot with complex content', () => {
      const complexLinks = (
        <nav>
          <div className="link-section">
            <h4>Product</h4>
            <a href="/features">Features</a>
            <a href="/pricing">Pricing</a>
          </div>
        </nav>
      )

      const { container } = render(
        <Footer
          copyright="© 2025 Scryer Inc. All rights reserved."
          links={complexLinks}
        />
      )

      expect(container.firstChild).toMatchSnapshot()
    })
  })
})
