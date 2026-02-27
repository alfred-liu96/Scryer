/**
 * 底部组件
 */

import type { ReactNode } from 'react';

interface FooterProps {
  copyright?: string;
  links?: ReactNode;
}

export function Footer({ copyright, links }: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-copyright">{copyright}</div>
        <div className="footer-links">{links}</div>
      </div>
    </footer>
  );
}
