/**
 * Store 统一导出入口
 *
 * 导出所有 Store 相关的类型、函数和常量
 */

// 导出 UI Store 类型
export type { UIState, UIActions, UIStore, ToastMessage, DeepPartial } from './types';

// 导出 UI Store 创建函数
export { createUIStore, INITIAL_UI_STATE } from './ui-store';

// 导出 Auth Store 类型和创建函数
export * from './auth';
