/**
 * 登录页面
 *
 * 路由: /login
 *
 * 页面结构:
 * - 居中的卡片容器
 * - 标题和描述
 * - LoginForm 组件
 * - "没有账号?注册"链接
 *
 * @module frontend/src/app/login/page
 */

'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { Card } from '@/components/ui';
import type { UserResponse } from '@/types/auth';
import { useRouter } from 'next/navigation';
import type { AuthApi } from '@/lib/api/auth-api';
import type { AuthStore } from '@/store/auth/auth-store-types';

// ============================================================================
// Props 接口 (主要用于测试)
// ============================================================================

/**
 * 登录页面 Props (测试用)
 */
export interface LoginPageProps {
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
 * 登录页面组件
 *
 * @example
 * 访问 /login 即可看到此页面
 */
export function LoginPage(props: LoginPageProps = {}) {
  // 运行时使用 useRouter,测试时可以使用传入的 mock router
  const router = props.router || useRouter();

  /**
   * 登录成功处理
   */
  const handleSuccess = (user: UserResponse) => {
    // 登录成功后跳转到首页
    router.push('/');
  };

  /**
   * 登录失败处理
   */
  const handleError = (error: Error) => {
    // 错误已在 LoginForm 组件中处理并显示
    // 这里可以添加额外的错误追踪或日志
    console.error('登录失败:', error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full">
        <Card className="p-8">
          {/* 标题区域 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">欢迎回来</h1>
            <p className="text-gray-600 mt-2">登录您的账号</p>
          </div>

          {/* 登录表单 */}
          <LoginForm
            authApi={props.authApi}
            authStore={props.authStore}
            onSuccess={handleSuccess}
            onError={handleError}
          />

          {/* 底部链接 */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              没有账号？{' '}
              <a
                href="/register"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                立即注册
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
export { LoginPage };

// 默认导出 (Next.js App Router 约定)
export default LoginPage;
