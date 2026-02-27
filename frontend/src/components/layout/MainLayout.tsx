/**
 * 主布局容器组件
 */

import { clsx } from 'clsx';
import type { ReactNode, HTMLAttributes } from 'react';
import type { LayoutVariant, SidebarPosition, SidebarBreakpoint } from '@/types/layout';

interface MainLayoutProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
  variant?: LayoutVariant;
  sidebarPosition?: SidebarPosition;
  sidebarBreakpoint?: SidebarBreakpoint;
  children?: ReactNode;
}

export function MainLayout({
  header,
  footer,
  sidebar,
  variant = 'default',
  sidebarPosition = 'left',
  sidebarBreakpoint = 'md',
  children,
  className = '',
  style,
  id,
  ...rest
}: MainLayoutProps) {
  return (
    <div
      id={id}
      className={clsx(
        'main-layout',
        'responsive',
        `layout-${variant}`,
        sidebar && 'layout-with-sidebar',
        sidebar && `sidebar-${sidebarPosition}`,
        sidebar && `sidebar-breakpoint-${sidebarBreakpoint}`,
        sidebar && 'sidebar-hide-mobile',
        className
      )}
      style={style}
      {...rest}
    >
      {/* Header */}
      {header && (
        <div className="main-layout-header">
          {header}
        </div>
      )}

      {/* Main Content Area */}
      <div className="main-layout-body">
        {/* Sidebar */}
        {sidebar && (
          <aside className="main-layout-sidebar">
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <main className="main-layout-content">
          {children}
        </main>
      </div>

      {/* Footer */}
      {footer && (
        <div className="main-layout-footer">
          {footer}
        </div>
      )}
    </div>
  );
}
