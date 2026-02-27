/**
 * UI Store 测试数据 Fixtures
 *
 * 提供测试所需的 mock 数据和初始状态
 */

import type { UIState, ToastMessage } from '../types';

/**
 * 默认 UI 状态（符合 INITIAL_UI_STATE 定义）
 */
export const DEFAULT_UI_STATE: UIState = {
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
 * Mock Toast 消息数据
 */
export const MOCK_TOASTS: ToastMessage[] = [
  {
    id: 'toast-1',
    message: '操作成功',
    type: 'success',
    duration: 3000,
    timestamp: 1709047200000,
  },
  {
    id: 'toast-2',
    message: '发生错误',
    type: 'error',
    duration: 5000,
    timestamp: 1709047260000,
  },
  {
    id: 'toast-3',
    message: '警告信息',
    type: 'warning',
    timestamp: 1709047320000,
  },
];

/**
 * Mock UI 状态（包含非默认值）
 */
export const MOCK_UI_STATE: UIState = {
  theme: 'dark',
  resolvedTheme: 'dark',
  sidebarOpen: false,
  mobileMenuOpen: true,
  activeModals: ['modal-1', 'modal-2'],
  isLoading: true,
  globalError: '系统错误',
  toasts: MOCK_TOASTS,
};

/**
 * 部分 UI 状态（用于 fromJSON 测试）
 */
export const PARTIAL_UI_STATE: Partial<UIState> = {
  theme: 'dark',
  sidebarOpen: false,
  toasts: [MOCK_TOASTS[0]],
};

/**
 * Mock Toast 输入（不含 id 和 timestamp）
 */
export const MOCK_TOAST_INPUT = {
  message: '新消息',
  type: 'info' as const,
  duration: 2000,
};

/**
 * Mock Modal IDs
 */
export const MOCK_MODAL_IDS = ['settings-modal', 'confirm-modal', 'help-modal'];
