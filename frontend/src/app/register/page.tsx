/**
 * 注册页面
 *
 * 路由: /register
 *
 * 页面结构:
 * - 居中的卡片容器
 * - 标题和描述
 * - RegisterForm 组件
 * - "已有账号?登录"链接
 *
 * @module frontend/src/app/register/page
 */

'use client';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { Card } from '@/components/ui';
import type { UserResponse } from '@/types/auth';
import { useRouter } from 'next/navigation';
import type { AuthApi } from '@/lib/api/auth-api';
import type { AuthStore } from '@/store/auth/auth-store-types';

// ============================================================================
// Props 接口 (主要用于测试)
// ============================================================================

/**
 * 注册页面 Props (测试用)
 */
export interface RegisterPageProps {
  /** AuthApi 实例 (可选,用于测试) */
  authApi?: AuthApi;
  /** AuthStore 实例 (可选,用于测试) */
  authStore?: AuthStore;
  /** Router 实例 (可选,用于测试) */
  router?: ReturnType<typeof useRouter>;
}

// ============================================================================
// 组件实现
// ============================================================================

/**
 * 注册页面组件
 *
 * @example
 * 访问 /register 即可看到此页面
 */
export function RegisterPage(props: RegisterPageProps = {}) {
  // 运行时使用 useRouter,测试时可以使用传入的 mock router
  const router = props.router || useRouter();

  /**
   * 注册成功处理
   */
  const handleSuccess = (user: UserResponse) => {
    // TODO: 可以显示欢迎消息或跳转到欢迎页
    // 目前直接跳转到首页
    router.push('/');
  };

  /**
   * 注册失败处理
   */
  const handleError = (error: Error) => {
    // 错误已在 RegisterForm 组件中处理并显示
    // 这里可以添加额外的错误追踪或日志
    console.error('注册失败:', error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full">
        <Card className="p-8">
          {/* 标题区域 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">创建账号</h1>
            <p className="text-gray-600 mt-2">填写信息开始使用</p>
          </div>

          {/* 注册表单 */}
          <RegisterForm
            authApi={props.authApi}
            authStore={props.authStore}
            onSuccess={handleSuccess}
            onError={handleError}
          />

          {/* 底部链接 */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              已有账号?{' '}
              <a
                href="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                立即登录
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

// 命名导出 (供测试使用)
export { RegisterPage };

// 默认导出 (Next.js App Router 约定)
export default RegisterPage;
