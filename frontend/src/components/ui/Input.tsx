/**
 * 输入框组件
 */

import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <input
        className={cn('input', error && 'input-error', className)}
        {...props}
      />
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}
