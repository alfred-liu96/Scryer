/**
 * 输入框组件
 */

import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  // 生成或使用提供的 id 来关联 label 和 input
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn('input', error && 'input-error', className)}
        aria-invalid={!!error}
        {...props}
      />
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}
