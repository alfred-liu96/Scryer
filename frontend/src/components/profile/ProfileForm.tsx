/**
 * 用户资料编辑表单组件
 *
 * 功能:
 * - 渲染用户名和邮箱输入框
 * - 实时表单验证
 * - 提交处理
 * - 加载状态显示
 * - 错误提示
 * - 取消编辑恢复原始数据
 *
 * @module frontend/src/components/profile/ProfileForm
 */

import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { Button, Input, Alert } from '@/components/ui';
import { ProfileValidator } from '@/lib/validation/profile-validation';
import type {
  UserResponse,
  ProfileFormData,
  ProfileFormErrors,
} from '@/types/auth';
import type { AuthApi } from '@/lib/api/auth-api';
import type { AuthStore } from '@/store/auth/auth-store-types';
import { authApi as defaultAuthApi } from '@/lib/api/endpoints';
import { authStore as defaultAuthStore } from '@/store/auth/auth-store';
import { cn } from '@/lib/utils';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 触碰状态 (字段是否被用户交互过)
 */
interface TouchedState {
  username: boolean;
  email: boolean;
}

/**
 * ProfileForm Props
 */
export interface ProfileFormProps {
  /** 当前用户信息 (用于初始化表单) */
  user: UserResponse;
  /** AuthApi 实例 (可选, 用于测试) */
  authApi?: AuthApi;
  /** AuthStore 实例 (可选, 用于测试) */
  authStore?: AuthStore;
  /** 更新成功回调 */
  onSuccess?: (user: UserResponse) => void;
  /** 更新失败回调 */
  onError?: (error: Error) => void;
  /** 取消编辑回调 */
  onCancel?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// 组件实现
// ============================================================================

/**
 * 用户资料编辑表单
 *
 * @example
 * ```tsx
 * <ProfileForm
 *   user={authStore.user}
 *   onSuccess={(user) => {
 *     console.log('更新成功:', user);
 *     setIsEditing(false);
 *   }}
 *   onCancel={() => setIsEditing(false)}
 * />
 * ```
 */
export function ProfileForm({
  user,
  authApi: injectedAuthApi,
  authStore: injectedAuthStore,
  onSuccess,
  onError,
  onCancel,
  className,
}: ProfileFormProps): JSX.Element {
  // ----------------------------------------------------------------------
  // 依赖注入
  // ----------------------------------------------------------------------
  const authApi = injectedAuthApi ?? defaultAuthApi;
  const store = injectedAuthStore ?? defaultAuthStore;

  // ----------------------------------------------------------------------
  // 状态管理
  // ----------------------------------------------------------------------

  /** 表单字段值 */
  const [formData, setFormData] = useState<ProfileFormData>({
    username: user.username,
    email: user.email,
  });

  /** 原始数据 (用于取消时恢复) */
  const [originalData] = useState<ProfileFormData>({
    username: user.username,
    email: user.email,
  });

  /** 字段级验证错误 */
  const [fieldErrors, setFieldErrors] = useState<ProfileFormErrors>({});

  /** 表单触碰状态 */
  const [touched, setTouched] = useState<TouchedState>({
    username: false,
    email: false,
  });

  /** 提交状态 */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 提交级别的错误 */
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // 验证逻辑
  // ----------------------------------------------------------------------

  /**
   * 验证单个字段
   */
  const validateField = useCallback(
    (field: keyof ProfileFormErrors, value: string) => {
      let result;

      if (field === 'username') {
        result = ProfileValidator.validateUsername(value);
      } else if (field === 'email') {
        result = ProfileValidator.validateEmail(value);
      } else {
        return;
      }

      setFieldErrors((prev) => {
        if (result.isValid) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [field]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [field]: result.error };
      });
    },
    []
  );

  /**
   * 验证整个表单
   */
  const validateForm = useCallback((): boolean => {
    const result = ProfileValidator.validateForm(formData);

    const errors: ProfileFormErrors = {};
    if (!result.username.isValid) {
      errors.username = result.username.error;
    }
    if (!result.email.isValid) {
      errors.email = result.email.error;
    }

    setFieldErrors(errors);
    return result.isValid;
  }, [formData]);

  // ----------------------------------------------------------------------
  // 事件处理
  // ----------------------------------------------------------------------

  /**
   * 字段变更处理
   */
  const handleFieldChange = (
    field: keyof typeof touched,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // 如果字段已被触碰，实时验证
    if (touched[field]) {
      validateField(field, value);
    }

    // 清除提交错误
    if (submitError) {
      setSubmitError(null);
    }
  };

  /**
   * 字段失焦处理
   */
  const handleFieldBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  /**
   * 表单提交处理
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 清除提交错误
    setSubmitError(null);

    // 标记所有字段为已触碰
    setTouched({ username: true, email: true });

    // 验证表单
    if (!validateForm()) {
      return;
    }

    // 检查是否有变更
    if (!ProfileValidator.hasChanges(originalData, formData)) {
      setSubmitError('没有检测到任何变更');
      return;
    }

    // 设置提交状态
    setIsSubmitting(true);

    try {
      // 构建更新请求（只包含有变更的字段）
      const updateData: { username?: string; email?: string } = {};
      if (formData.username !== originalData.username) {
        updateData.username = formData.username;
      }
      if (formData.email !== originalData.email) {
        updateData.email = formData.email;
      }

      // 调用 API
      const updatedUser = await authApi.updateProfile(updateData);

      // 更新 authStore.user
      const state = store.getState();
      if (state.accessToken && state.refreshToken) {
        store.setAuthUser(
          updatedUser,
          state.accessToken,
          state.refreshToken,
          Math.floor((state.tokenExpiresAt ?? Date.now()) / 1000) - Math.floor(Date.now() / 1000)
        );
      }

      // 触发成功回调
      onSuccess?.(updatedUser);
    } catch (error) {
      // 解析错误并生成友好的错误消息
      let errorMessage: string;

      if (error instanceof Error) {
        const err = error as Error & { status?: number; field?: string };
        const status = err.status;
        const field = err.field;

        if (status === 409) {
          // 冲突错误 - 用户名或邮箱已存在
          if (field === 'username') {
            errorMessage = '该用户名已被使用';
          } else if (field === 'email') {
            errorMessage = '该邮箱已被注册';
          } else {
            errorMessage = '用户名或邮箱已存在';
          }
        } else if (status === 401) {
          // 未认证
          errorMessage = '请先登录后再试';
        } else if (status === 400) {
          // 验证错误
          errorMessage = '输入信息格式不正确，请检查后重试';
        } else if (err.name === 'NetworkError' || err.message.includes('network') || err.message.includes('Network')) {
          // 网络错误
          errorMessage = '网络连接失败，请稍后重试';
        } else {
          // 其他错误
          errorMessage = err.message || '更新失败，请稍后重试';
        }
      } else {
        errorMessage = '更新失败，请稍后重试';
      }

      setSubmitError(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 取消编辑处理
   */
  const handleCancel = () => {
    // 恢复原始数据
    setFormData(originalData);
    // 清除错误
    setFieldErrors({});
    setTouched({ username: false, email: false });
    setSubmitError(null);
    // 触发取消回调
    onCancel?.();
  };

  // ----------------------------------------------------------------------
  // 渲染
  // ----------------------------------------------------------------------

  /** 计算是否有变更 */
  const hasChanges = ProfileValidator.hasChanges(originalData, formData);

  /** 计算表单是否有效 */
  const isFormValid =
    formData.username !== '' &&
    formData.email !== '' &&
    Object.keys(fieldErrors).length === 0 &&
    hasChanges;

  return (
    <form
      role="form"
      aria-labelledby="profile-form-title"
      onSubmit={handleSubmit}
      noValidate
      className={cn('profile-form', className)}
    >
      {/* 表单标题 */}
      <h2 id="profile-form-title" className="profile-form-title">
        编辑资料
      </h2>

      {/* 用户名输入框 */}
      <Input
        id="profile-username"
        label="用户名"
        type="text"
        value={formData.username}
        onChange={(e) => handleFieldChange('username', e.target.value)}
        onBlur={() => handleFieldBlur('username')}
        error={touched.username ? fieldErrors.username : undefined}
        disabled={isSubmitting}
        autoComplete="username"
        data-testid="profile-username-input"
      />

      {/* 邮箱输入框 */}
      <Input
        id="profile-email"
        label="邮箱"
        type="email"
        value={formData.email}
        onChange={(e) => handleFieldChange('email', e.target.value)}
        onBlur={() => handleFieldBlur('email')}
        error={touched.email ? fieldErrors.email : undefined}
        disabled={isSubmitting}
        autoComplete="email"
        data-testid="profile-email-input"
      />

      {/* 提交错误提示 */}
      {submitError && (
        <Alert type="error" showIcon closable onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {/* 操作按钮 */}
      <div className="profile-form-actions">
        <Button
          type="submit"
          variant="primary"
          disabled={!isFormValid || isSubmitting}
          data-testid="profile-submit-btn"
        >
          {isSubmitting ? '保存中...' : '保存'}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={isSubmitting}
          data-testid="profile-cancel-btn"
        >
          取消
        </Button>
      </div>
    </form>
  );
}