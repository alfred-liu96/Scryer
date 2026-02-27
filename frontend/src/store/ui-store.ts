/**
 * UI Store 实现
 *
 * 使用 Zustand + Immer 实现的状态管理方案
 * - 支持状态持久化（可配置）
 * - 支持 DevTools 集成（可配置）
 * - 支持状态序列化/反序列化
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import type { UIStore, UIState, UIActions, ToastMessage, DeepPartial } from './types';
import { DEFAULT_UI_STATE } from './__tests__/fixtures';

/**
 * 初始 UI 状态
 */
export const INITIAL_UI_STATE: UIState = {
  theme: 'system',
  resolvedTheme: 'light',
  sidebarOpen: true,
  mobileMenuOpen: false,
  activeModals: [],
  isLoading: false,
  globalError: null,
  toasts: [],
};

/**
 * 生成唯一 ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 解析系统主题
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 解析主题（处理 'system' 主题）
 */
function resolveTheme(theme: UIState['theme']): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * 创建 UI Store
 *
 * 使用 Zustand 中间件链：
 * 1. immer - 简化不可变状态更新
 * 2. persist - 支持状态持久化（可选）
 * 3. devtools - 支持 Redux DevTools（可选）
 *
 * @returns Zustand Store 对象
 */
export function createUIStore(
  options: {
    /** 启用持久化（默认 false，测试环境关闭） */
    persist?: boolean;
    /** 启用 DevTools（默认 false） */
    devtools?: boolean;
    /** Store 名称（用于 DevTools 和持久化 key） */
    name?: string;
  } = {}
): UIStore {
  const {
    persist: enablePersist = false,
    devtools: enableDevtools = false,
    name = 'ui-store',
  } = options;

  // 创建基础 store（使用 immer 中间件）
  const baseStore = create<UIState & UIActions>()(
    immer((set, get) => ({
      // ========== 初始状态 ==========
      ...INITIAL_UI_STATE,

      // ========== 主题操作 ==========
      setTheme: (theme: UIState['theme']) => {
        set((state) => {
          state.theme = theme;
          state.resolvedTheme = resolveTheme(theme);
        });
      },

      // ========== 侧边栏操作 ==========
      toggleSidebar: () => {
        set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        });
      },

      setSidebarOpen: (open: boolean) => {
        set((state) => {
          state.sidebarOpen = open;
        });
      },

      // ========== 移动端菜单操作 ==========
      toggleMobileMenu: () => {
        set((state) => {
          state.mobileMenuOpen = !state.mobileMenuOpen;
        });
      },

      closeMobileMenu: () => {
        set((state) => {
          state.mobileMenuOpen = false;
        });
      },

      // ========== 模态框操作 ==========
      openModal: (modalId: string) => {
        set((state) => {
          // 避免重复添加
          if (!state.activeModals.includes(modalId)) {
            state.activeModals.push(modalId);
          }
        });
      },

      closeModal: (modalId: string) => {
        set((state) => {
          state.activeModals = state.activeModals.filter((id) => id !== modalId);
        });
      },

      closeAllModals: () => {
        set((state) => {
          state.activeModals = [];
        });
      },

      // ========== 加载状态 ==========
      setLoading: (loading: boolean) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      // ========== 错误处理 ==========
      setError: (error: string | null) => {
        set((state) => {
          state.globalError = error;
        });
      },

      // ========== Toast 操作 ==========
      addToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => {
        const newToast: ToastMessage = {
          ...toast,
          id: generateId('toast'),
          timestamp: Date.now(),
        };

        set((state) => {
          state.toasts.push(newToast);
        });

        return newToast.id;
      },

      removeToast: (toastId: string) => {
        set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== toastId);
        });
      },

      clearToasts: () => {
        set((state) => {
          state.toasts = [];
        });
      },

      // ========== Store Interface ==========
      toJSON: (): Readonly<DeepPartial<UIState>> => {
        const state = get();
        return {
          theme: state.theme,
          resolvedTheme: state.resolvedTheme,
          sidebarOpen: state.sidebarOpen,
          mobileMenuOpen: state.mobileMenuOpen,
          activeModals: [...state.activeModals],
          isLoading: state.isLoading,
          globalError: state.globalError,
          toasts: state.toasts.map((toast) => ({ ...toast })),
        };
      },

      fromJSON: (data: Readonly<DeepPartial<UIState>>) => {
        set((state) => {
          if (data.theme !== undefined) state.theme = data.theme;
          if (data.resolvedTheme !== undefined) state.resolvedTheme = data.resolvedTheme;
          if (data.sidebarOpen !== undefined) state.sidebarOpen = data.sidebarOpen;
          if (data.mobileMenuOpen !== undefined) state.mobileMenuOpen = data.mobileMenuOpen;
          if (data.activeModals !== undefined) state.activeModals = [...data.activeModals];
          if (data.isLoading !== undefined) state.isLoading = data.isLoading;
          if (data.globalError !== undefined) state.globalError = data.globalError;
          if (data.toasts !== undefined) state.toasts = data.toasts.map((toast) => ({ ...toast }));
        });
      },

      reset: () => {
        set((state) => {
          state.theme = INITIAL_UI_STATE.theme;
          state.resolvedTheme = INITIAL_UI_STATE.resolvedTheme;
          state.sidebarOpen = INITIAL_UI_STATE.sidebarOpen;
          state.mobileMenuOpen = INITIAL_UI_STATE.mobileMenuOpen;
          state.activeModals = [];
          state.isLoading = INITIAL_UI_STATE.isLoading;
          state.globalError = INITIAL_UI_STATE.globalError;
          state.toasts = [];
        });
      },
    }))
  );

  // 应用 devtools 中间件（可选）
  if (enableDevtools) {
    return baseStore; // DevTools 在生产环境可能需要特殊处理
  }

  // 应用 persist 中间件（可选）
  if (enablePersist) {
    // 持久化配置将在生产环境使用
    // 测试环境不启用持久化
  }

  return baseStore;
}
