/**
 * 导航配置
 *
 * 集中管理应用中的导航数据
 */

import { HomeIcon, ChartBarIcon, CogIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import type { NavItem } from '@/types/layout';

/**
 * 主导航菜单配置
 */
export const mainNavigation: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: <HomeIcon className="w-5 h-5" />,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/tasks',
    icon: <DocumentTextIcon className="w-5 h-5" />,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: <ChartBarIcon className="w-5 h-5" />,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: <CogIcon className="w-5 h-5" />,
  },
];

/**
 * 移动端导航菜单配置
 */
export const mobileNavigation: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: <HomeIcon className="w-5 h-5" />,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/tasks',
    icon: <DocumentTextIcon className="w-5 h-5" />,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: <ChartBarIcon className="w-5 h-5" />,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: <CogIcon className="w-5 h-5" />,
  },
];

/**
 * 底部链接配置
 */
export const footerLinks = {
  product: [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Documentation', href: '/docs' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '/careers' },
  ],
  legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'License', href: '/license' },
  ],
};

/**
 * 默认版权信息
 */
export const defaultCopyright = `© ${new Date().getFullYear()} Scryer. All rights reserved.`;

/**
 * 社交媒体链接配置
 */
export const socialLinks = [
  { name: 'GitHub', href: 'https://github.com/alfred-liu96/Scryer' },
  { name: 'Twitter', href: 'https://twitter.com' },
];
