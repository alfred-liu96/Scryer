/**
 * 头部组件
 */

import type { ReactNode } from 'react';

interface HeaderProps {
  logo?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
}

export function Header({ logo, nav, actions }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-logo">{logo}</div>
      <nav className="header-nav">{nav}</nav>
      <div className="header-actions">{actions}</div>
    </header>
  );
}
