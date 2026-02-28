/**
 * 注册表单组件
 *
 * 功能:
 * - 渲染用户名、邮箱、密码、确认密码输入框
 * - 实时表单验证
 * - 提交处理
 * - 加载状态显示
 * - 错误提示
 *
 * @module frontend/src/components/auth/RegisterForm
 */

import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { Button, Input, Alert, Spinner } from '@/components/ui';
import { PasswordInput } from './PasswordInput';
import { RegisterValidator } from '@/lib/validation/register-validation';
import type { UserResponse } from '@/types/auth';
import type { AuthApi } from '@/lib/api/auth-api';
import type { AuthStore } from '@/store/auth/auth-store-types';
import { cn } from '@/lib/utils';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * API 错误响应类型 (简化版)
 */
interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * 表单错误状态
 */
interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

/**
 * 触碰状态 (字段是否被用户交互过)
 */
interface TouchedState {
  username: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

// ============================================================================
// Props 接口
// ============================================================================

/**
 * 注册表单 Props
 */
export interface RegisterFormProps {
  /** AuthApi 实例 (可选,用于测试) */
  authApi?: AuthApi;
  /** AuthStore 实例 (可选,用于测试) */
  authStore?: AuthStore;
  /** 注册成功后的回调 (可选) */
  onSuccess?: (user: UserResponse) => void;
  /** 注册失败后的回调 (可选) */
  onError?: (error: Error) => void;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// 错误消息映射
// ============================================================================

/**
 * API 错误消息映射
 */
const API_ERROR_MESSAGES: Record<string, string> = {
  USERNAME_EXISTS: '用户名已被注册',
  EMAIL_EXISTS: '邮箱已被注册',
  INVALID_EMAIL: '邮箱格式不正确',
  WEAK_PASSWORD: '密码强度不足',
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  UNKNOWN_ERROR: '注册失败，请稍后重试',
};

/**
 * 从 API 错误中提取用户友好的错误消息
 */
function extractApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // 尝试解析错误详情
    const apiError = error as ApiError;

    // 检查常见的错误字段
    if (apiError.detail) {
      const detail = String(apiError.detail).toLowerCase();

      if (detail.includes('username') && detail.includes('exist')) {
        return API_ERROR_MESSAGES.USERNAME_EXISTS;
      }
      if (detail.includes('email') && detail.includes('exist')) {
        return API_ERROR_MESSAGES.EMAIL_EXISTS;
      }

      return apiError.detail;
    }

    if (apiError.message) {
      return apiError.message;
    }

    return error.message;
  }

  return API_ERROR_MESSAGES.UNKNOWN_ERROR;
}

// ============================================================================
// 组件实现
// ============================================================================

/**
 * 注册表单组件
 *
 * @example
 * ```tsx
 * <RegisterForm
 *   onSuccess={(user) => {
 *     console.log('注册成功:', user);
 *     router.push('/');
 *   }}
 *   onError={(error) => {
 *     console.error('注册失败:', error);
 *   }}
 * />
 * ```
 */
export function RegisterForm({
  authApi: injectedAuthApi,
  authStore: injectedAuthStore,
  onSuccess,
  onError,
  className,
}: RegisterFormProps) {
  // ----------------------------------------------------------------------
  // 状态管理
  // ----------------------------------------------------------------------

  /** 表单字段值 */
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /** 字段级验证错误 */
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  /** 表单触碰状态 */
  const [touched, setTouched] = useState<TouchedState>({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  /** 提交状态 */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 提交级别的错误 (如网络错误、用户已存在等) */
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // 验证逻辑
  // ----------------------------------------------------------------------

  /**
   * 验证单个字段
   */
  const validateField = useCallback(
    (field: keyof FormErrors, value: string) => {
      let result;

      switch (field) {
        case 'username':
          result = RegisterValidator.validateUsername(value);
          break;
        case 'email':
          result = RegisterValidator.validateEmail(value);
          break;
        case 'password':
          result = RegisterValidator.validatePassword(value);
          break;
        case 'confirmPassword':
          result = RegisterValidator.validateConfirmPassword(password, value);
          break;
        default:
          return;
      }

      setFieldErrors((prev) => ({
        ...prev,
        [field]: result.isValid ? undefined : result.error,
      }));
    },
    [password]
  );

  /**
   * 验证整个表单
   */
  const validateForm = useCallback((): boolean => {
    const validation = RegisterValidator.validateForm({
      username,
      email,
      password,
      confirmPassword,
    });

    // 更新所有字段错误
    setFieldErrors({
      username: validation.username.isValid ? undefined : validation.username.error,
      email: validation.email.isValid ? undefined : validation.email.error,
      password: validation.password.isValid ? undefined : validation.password.error,
      confirmPassword: validation.confirmPassword.isValid
        ? undefined
        : validation.confirmPassword.error,
    });

    return validation.isValid;
  }, [username, email, password, confirmPassword]);

  // ----------------------------------------------------------------------
  // 事件处理
  // ----------------------------------------------------------------------

  /**
   * 字段变更处理
   */
  const handleFieldChange = (
    field: keyof typeof touched,
    value: string,
    setter: (v: string) => void
  ) => {
    setter(value);

    // 如果字段已被触碰,立即验证
    if (touched[field]) {
      validateField(field, value);
    }
  };

  /**
   * 字段失焦处理
   */
  const handleFieldBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // 触发验证
    switch (field) {
      case 'username':
        validateField('username', username);
        break;
      case 'email':
        validateField('email', email);
        break;
      case 'password':
        validateField('password', password);
        break;
      case 'confirmPassword':
        validateField('confirmPassword', confirmPassword);
        break;
    }
  };

  /**
   * 表单提交处理
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 清除提交错误
    setSubmitError(null);

    // 标记所有字段为已触碰
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    // 验证表单
    if (!validateForm()) {
      return;
    }

    // 开始提交
    setIsSubmitting(true);

    try {
      // 使用注入的实例 (测试) 或动态导入全局单例 (运行时)
      let authApi: AuthApi;
      let authStore: AuthStore;

      if (injectedAuthApi && injectedAuthStore) {
        // 测试环境: 使用注入的 mock 实例
        authApi = injectedAuthApi;
        authStore = injectedAuthStore;
      } else {
        // 运行时: 动态导入全局单例
        const endpoints = await import('@/lib/api/endpoints');
        const store = await import('@/store');
        authApi = endpoints.authApi;
        authStore = store.authStore;
      }

      // 调用注册 API
      const response = await authApi.register(username, email, password);

      // 更新 Store 状态
      authStore.setAuthUser(
        response.user,
        response.tokens.access_token,
        response.tokens.refresh_token,
        response.tokens.expires_in
      );

      // 触发成功回调
      onSuccess?.(response.user);
    } catch (error) {
      // 提取错误消息
      const errorMessage = extractApiErrorMessage(error);
      setSubmitError(errorMessage);

      // 触发失败回调
      if (error instanceof Error) {
        onError?.(error);
      } else {
        onError?.(new Error(errorMessage));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // 渲染
  // ----------------------------------------------------------------------

  /** 计算表单是否有效 (用于禁用提交按钮) */
  const isFormValid =
    username !== '' &&
    email !== '' &&
    password !== '' &&
    confirmPassword !== '' &&
    Object.keys(fieldErrors).length === 0;

  return (
    <form
      role="form"
      aria-labelledby="register-form-title"
      onSubmit={handleSubmit}
      noValidate
      className={cn('register-form', className)}
    >
      {/* 屏幕阅读器标题 */}
      <h2 id="register-form-title" className="sr-only">
        用户注册表单
      </h2>

      {/* 提交错误提示 */}
      {submitError && (
        <Alert
          type="error"
          className="mb-4"
          onClose={() => setSubmitError(null)}
        >
          {submitError}
        </Alert>
      )}

      {/* 表单字段 */}
      <div className="space-y-4">
        {/* 用户名 */}
        <Input
          label="用户名"
          name="username"
          type="text"
          placeholder="请输入用户名"
          value={username}
          onChange={(e) =>
            handleFieldChange('username', e.target.value, setUsername)
          }
          onBlur={() => handleFieldBlur('username')}
          error={fieldErrors.username}
          aria-required="true"
          aria-invalid={!!fieldErrors.username}
          disabled={isSubmitting}
          autoComplete="username"
        />

        {/* 邮箱 */}
        <Input
          label="邮箱地址"
          name="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => handleFieldChange('email', e.target.value, setEmail)}
          onBlur={() => handleFieldBlur('email')}
          error={fieldErrors.email}
          aria-required="true"
          aria-invalid={!!fieldErrors.email}
          disabled={isSubmitting}
          autoComplete="email"
        />

        {/* 密码 */}
        <PasswordInput
          label="密码"
          name="password"
          placeholder="至少 8 个字符"
          value={password}
          onChange={(e) =>
            handleFieldChange('password', e.target.value, setPassword)
          }
          onBlur={() => handleFieldBlur('password')}
          error={fieldErrors.password}
          showStrength
          aria-required="true"
          aria-invalid={!!fieldErrors.password}
          disabled={isSubmitting}
          autoComplete="new-password"
        />

        {/* 确认密码 */}
        <PasswordInput
          label="确认密码"
          name="confirmPassword"
          placeholder="再次输入密码"
          value={confirmPassword}
          onChange={(e) =>
            handleFieldChange(
              'confirmPassword',
              e.target.value,
              setConfirmPassword
            )
          }
          onBlur={() => handleFieldBlur('confirmPassword')}
          error={fieldErrors.confirmPassword}
          aria-required="true"
          aria-invalid={!!fieldErrors.confirmPassword}
          disabled={isSubmitting}
          autoComplete="new-password"
        />
      </div>

      {/* 提交按钮 */}
      <div className="mt-6">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting || !isFormValid}
          className="w-full"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" />
              注册中...
            </span>
          ) : (
            '注册'
          )}
        </Button>
      </div>
    </form>
  );
}
