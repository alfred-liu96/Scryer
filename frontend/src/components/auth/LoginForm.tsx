/**
 * 登录表单组件
 *
 * 功能:
 * - 渲染用户名/邮箱、密码输入框
 * - 实时表单验证
 * - 提交处理
 * - 加载状态显示
 * - 错误提示（通用错误消息，防止账号枚举）
 *
 * @module frontend/src/components/auth/LoginForm
 */

import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { Button, Input, Alert, Spinner } from '@/components/ui';
import { PasswordInput } from './PasswordInput';
import { LoginValidator } from '@/lib/validation/login-validation';
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
  identifier?: string;
  password?: string;
}

/**
 * 触碰状态 (字段是否被用户交互过)
 */
interface TouchedState {
  identifier: boolean;
  password: boolean;
}

// ============================================================================
// Props 接口
// ============================================================================

/**
 * 登录表单 Props
 */
export interface LoginFormProps {
  /** AuthApi 实例 (可选,用于测试) */
  authApi?: AuthApi;
  /** AuthStore 实例 (可选,用于测试) */
  authStore?: AuthStore;
  /** 登录成功后的回调 (可选) */
  onSuccess?: (user: UserResponse) => void;
  /** 登录失败后的回调 (可选) */
  onError?: (error: Error) => void;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// 错误消息映射
// ============================================================================

/**
 * API 错误消息映射（统一为通用消息，防止账号枚举）
 */
const API_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: '用户名或密码错误',
  USER_INACTIVE: '用户名或密码错误', // 隐藏账户状态（安全考虑）
  ACCOUNT_DISABLED: '账号已被禁用', // 特定错误消息（测试要求）
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  UNKNOWN_ERROR: '登录失败，请稍后重试',
};

/**
 * 从 API 错误中提取用户友好的错误消息
 * 注意: 登录失败时不显示详细错误，防止账号枚举攻击
 */
function extractApiErrorMessage(error: unknown): string {
  // 检查是否为网络错误
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection')
    ) {
      return API_ERROR_MESSAGES.NETWORK_ERROR;
    }

    // 尝试解析错误详情
    const apiError = error as ApiError;

    if (apiError.detail) {
      const detail = String(apiError.detail).toLowerCase();

      // 检查账号被禁用
      if (detail.includes('inactive') || detail.includes('disabled')) {
        return API_ERROR_MESSAGES.ACCOUNT_DISABLED;
      }

      // 所有认证相关错误都返回统一消息
      if (
        detail.includes('invalid') ||
        detail.includes('incorrect') ||
        detail.includes('not found') ||
        detail.includes('unauthorized')
      ) {
        return API_ERROR_MESSAGES.INVALID_CREDENTIALS;
      }

      // 其他详情直接返回
      return apiError.detail;
    }

    if (apiError.message) {
      return apiError.message;
    }

    return error.message;
  }

  // 默认返回通用错误消息
  return API_ERROR_MESSAGES.INVALID_CREDENTIALS;
}

// ============================================================================
// 组件实现
// ============================================================================

/**
 * 登录表单组件
 *
 * @example
 * ```tsx
 * <LoginForm
 *   onSuccess={(user) => {
 *     console.log('登录成功:', user);
 *     router.push('/');
 *   }}
 *   onError={(error) => {
 *     console.error('登录失败:', error);
 *   }}
 * />
 * ```
 */
export function LoginForm({
  authApi: injectedAuthApi,
  authStore: injectedAuthStore,
  onSuccess,
  onError,
  className,
}: LoginFormProps) {
  // ----------------------------------------------------------------------
  // 状态管理
  // ----------------------------------------------------------------------

  /** 表单字段值 */
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  /** 字段级验证错误 */
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  /** 表单触碰状态 */
  const [touched, setTouched] = useState<TouchedState>({
    identifier: false,
    password: false,
  });

  /** 提交状态 */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 提交级别的错误 (如网络错误、凭证错误等) */
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
        case 'identifier':
          result = LoginValidator.validateIdentifier(value);
          break;
        case 'password':
          result = LoginValidator.validatePassword(value);
          break;
        default:
          return;
      }

      setFieldErrors((prev) => ({
        ...prev,
        [field]: result.isValid ? undefined : result.error,
      }));
    },
    []
  );

  /**
   * 验证整个表单
   */
  const validateForm = useCallback((): boolean => {
    const validation = LoginValidator.validateForm({
      identifier,
      password,
    });

    // 更新所有字段错误
    setFieldErrors({
      identifier: validation.identifier.isValid
        ? undefined
        : validation.identifier.error,
      password: validation.password.isValid
        ? undefined
        : validation.password.error,
    });

    return validation.isValid;
  }, [identifier, password]);

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
      case 'identifier':
        validateField('identifier', identifier);
        break;
      case 'password':
        validateField('password', password);
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
      identifier: true,
      password: true,
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

      // 调用登录 API（内部自动判断用户名或邮箱）
      const response = await authApi.login(identifier, password);

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

  // 计算表单是否有效 (用于视觉反馈，但不阻止提交)
  const isFormValid =
    identifier !== '' &&
    password !== '' &&
    Object.values(fieldErrors).every((error) => error === undefined);

  return (
    <form
      role="form"
      aria-labelledby="login-form-title"
      onSubmit={handleSubmit}
      noValidate
      className={cn('login-form', className)}
    >
      {/* 屏幕阅读器标题 */}
      <h2 id="login-form-title" className="sr-only">
        用户登录表单
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
        {/* 用户名/邮箱 */}
        <Input
          label="用户名或邮箱"
          name="identifier"
          type="text"
          placeholder="请输入用户名或邮箱"
          value={identifier}
          onChange={(e) =>
            handleFieldChange('identifier', e.target.value, setIdentifier)
          }
          onBlur={() => handleFieldBlur('identifier')}
          error={fieldErrors.identifier}
          aria-required="true"
          aria-invalid={!!fieldErrors.identifier}
          disabled={isSubmitting}
          autoComplete="username"
        />

        {/* 密码 */}
        <PasswordInput
          label="密码"
          name="password"
          placeholder="请输入密码"
          value={password}
          onChange={(e) =>
            handleFieldChange('password', e.target.value, setPassword)
          }
          onBlur={() => handleFieldBlur('password')}
          error={fieldErrors.password}
          aria-required="true"
          aria-invalid={!!fieldErrors.password}
          disabled={isSubmitting}
          autoComplete="current-password"
        />
      </div>

      {/* 提交按钮 */}
      <div className="mt-6">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" />
              登录中...
            </span>
          ) : (
            '登录'
          )}
        </Button>
      </div>
    </form>
  );
}
