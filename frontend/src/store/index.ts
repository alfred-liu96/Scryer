/**
 * Store 统一导出入口
 *
 * 导出所有 Store 相关的类型、函数和常量
 */

// 导出类型
export type { UIState, UIActions, UIStore, ToastMessage, DeepPartial } from './types';

// 导出 Store 创建函数
export { createUIStore, INITIAL_UI_STATE } from './ui-store';
