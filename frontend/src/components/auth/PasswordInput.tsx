/**
 * 密码输入框组件
 *
 * 功能:
 * - 密码显示/隐藏切换
 * - 继承 Input 组件的 label 和 error 功能
 * - 支持密码强度指示器 (可选)
 *
 * @module frontend/src/components/auth/PasswordInput
 */

import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// 类型定义
// ============================================================================

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** 标签文本 */
  label?: string;
  /** 错误消息 */
  error?: string;
  /** 是否显示密码强度指示器 */
  showStrength?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// 密码强度计算
// ============================================================================

/**
 * 密码强度级别
 */
type PasswordStrength = 'weak' | 'medium' | 'strong';

/**
 * 计算密码强度
 *
 * 规则:
 * - weak: 长度 < 8
 * - medium: 长度 >= 8 且只包含一种字符类型
 * - strong: 长度 >= 8 且包含多种字符类型
 *
 * @param password - 密码
 * @returns 密码强度
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password || password.length < 8) {
    return 'weak';
  }

  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const typeCount = [hasLowerCase, hasUpperCase, hasNumber, hasSpecial].filter(Boolean).length;

  if (typeCount >= 3) {
    return 'strong';
  } else if (typeCount >= 2) {
    return 'medium';
  } else {
    return 'weak';
  }
}

/**
 * 获取密码强度文本
 */
function getStrengthText(strength: PasswordStrength): string {
  const texts = {
    weak: '弱',
    medium: '中',
    strong: '强',
  };
  return texts[strength];
}

/**
 * 获取密码强度颜色
 */
function getStrengthColor(strength: PasswordStrength): string {
  const colors = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };
  return colors[strength];
}

// ============================================================================
// 组件实现
// ============================================================================

/**
 * 密码输入框组件
 *
 * @example
 * ```tsx
 * <PasswordInput
 *   label="密码"
 *   name="password"
 *   placeholder="至少 8 个字符"
 *   error={errors.password}
 *   showStrength
 *   value={password}
 *   onChange={(e) => setPassword(e.target.value)}
 * />
 * ```
 */
export function PasswordInput({
  label,
  error,
  showStrength = false,
  className,
  value,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  // 计算密码强度
  const strength = value ? calculatePasswordStrength(String(value)) : null;

  // 切换显示/隐藏
  const toggleVisibility = () => {
    setIsVisible((prev) => !prev);
  };

  return (
    <div className="password-input-wrapper">
      <div className="relative">
        <Input
          label={label}
          error={error}
          type={isVisible ? 'text' : 'password'}
          value={value}
          className={cn('pr-10', className)}
          {...props}
        />

        {/* 显示/隐藏按钮 */}
        <button
          type="button"
          onClick={toggleVisibility}
          disabled={props.disabled}
          className={cn(
            'absolute right-3 top-[1.625rem] text-gray-400 hover:text-gray-600',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 rounded',
            'transition-colors',
            props.disabled && 'cursor-not-allowed opacity-50'
          )}
          aria-label={isVisible ? '隐藏密码' : '显示密码'}
          tabIndex={-1}
        >
          {isVisible ? (
            // 隐藏图标 (眼睛斜杠)
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            // 显示图标 (眼睛)
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>

      {/* 密码强度指示器 */}
      {showStrength && strength && value && (
        <div className="mt-2 space-y-1">
          {/* 强度条 */}
          <div className="flex gap-1">
            <div
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                strength === 'weak' ? 'bg-red-500' : 'bg-gray-200'
              )}
            />
            <div
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                strength === 'medium' ? 'bg-yellow-500' : strength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
              )}
            />
            <div
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                strength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
              )}
            />
          </div>

          {/* 强度文本 */}
          <p className="text-xs text-gray-500">
            密码强度: {getStrengthText(strength)}
          </p>
        </div>
      )}
    </div>
  );
}
