/**
 * 页面骨架屏组件
 */

import { clsx } from 'clsx';
import type { ReactNode, HTMLAttributes } from 'react';
import type {
  SkeletonVariant,
  SkeletonAnimation,
  SkeletonColor,
  SkeletonSize,
  AnimationSpeed,
} from '@/types/layout';

interface PageSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  animation?: SkeletonAnimation;
  animationSpeed?: AnimationSpeed;
  color?: SkeletonColor;
  size?: SkeletonSize;
  count?: number;
  lines?: number;
  showAvatar?: boolean;
  showFooter?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  width?: string | number;
  height?: string | number;
  ariaLabel?: string;
}

export function PageSkeleton({
  variant = 'default',
  animation = 'shimmer',
  animationSpeed = 'normal',
  color = 'slate',
  size = 'medium',
  count = 3,
  lines = 3,
  showAvatar = false,
  showFooter = false,
  header,
  footer,
  width,
  height,
  className = '',
  style,
  ariaLabel = 'Loading content...',
}: PageSkeletonProps) {
  const animationClass = animation === 'none' ? '' : `animate-${animation}`;

  const renderDefaultSkeleton = () => (
    <div className="skeleton-default-content">
      <div className="skeleton-title" />
      <div className="skeleton-description" />
      <div className="skeleton-content">
        <div className="skeleton-content-line" />
        <div className="skeleton-content-line" />
        <div className="skeleton-content-line" />
      </div>
    </div>
  );

  const renderListSkeleton = () => (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-list-item">
          {showAvatar && <div className="skeleton-avatar" />}
          <div className="skeleton-item-content">
            <div className="skeleton-item-title" />
            <div className="skeleton-item-description" />
          </div>
        </div>
      ))}
    </>
  );

  const renderCardSkeleton = () => (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-card">
          <div className="skeleton-card-header" />
          <div className="skeleton-card-body">
            <div className="skeleton-card-line" />
            <div className="skeleton-card-line" />
            <div className="skeleton-card-line" />
          </div>
          {showFooter && <div className="skeleton-card-footer" />}
        </div>
      ))}
    </>
  );

  const renderTextSkeleton = () => (
    <>
      {Array.from({ length: lines }).map((_, index) => {
        const widthClass = index === lines - 1 ? 'w-3/4' : index === 0 ? 'w-full' : 'w-1/2';
        return (
          <div
            key={index}
            className={clsx('skeleton-text-line', widthClass)}
          />
        );
      })}
    </>
  );

  const renderContent = () => {
    switch (variant) {
      case 'default':
        return renderDefaultSkeleton();
      case 'list':
        return renderListSkeleton();
      case 'card':
        return renderCardSkeleton();
      case 'text':
        return renderTextSkeleton();
      default:
        return renderDefaultSkeleton();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={clsx(
        'page-skeleton',
        'responsive',
        variant === 'card' && 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        variant !== 'card' && `skeleton-${variant}`,
        `skeleton-${color}`,
        `skeleton-${size}`,
        animationClass,
        `animation-${animationSpeed}`,
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
    >
      {/* Custom Header */}
      {header && <div className="skeleton-custom-header">{header}</div>}

      {/* Skeleton Content */}
      {variant === 'card' ? (
        <div className="contents">
          {renderContent()}
        </div>
      ) : (
        renderContent()
      )}

      {/* Custom Footer */}
      {footer && <div className="skeleton-custom-footer">{footer}</div>}
    </div>
  );
}
