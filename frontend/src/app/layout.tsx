/**
 * 根布局组件
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header, Footer, HeaderAuth } from '@/components/layout';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Scryer',
  description: 'Scryer Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const header = (
    <Header
      actions={<HeaderAuth />}
    />
  );
  const footer = <Footer />;

  return (
    <html lang="zh-CN">
      <body className={inter.variable}>
        <div className="min-h-screen flex flex-col">
          {header}
          <div className="flex-1">{children}</div>
          {footer}
        </div>
      </body>
    </html>
  );
}
