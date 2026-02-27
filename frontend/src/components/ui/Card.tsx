/**
 * 卡片组件
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outlined' | 'elevated';
}

export function Card({ title, children, className, variant = 'default' }: CardProps) {
  return (
    <div className={cn('card', `card-${variant}`, className)}>
      {title && <h3 className="card-title">{title}</h3>}
      <div className="card-content">{children}</div>
    </div>
  );
}
