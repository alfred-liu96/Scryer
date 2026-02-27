/**
 * Store 类型定义
 *
 * 这个文件定义了所有 Store 相关的 TypeScript 类型接口
 * 注意：这是为测试准备的类型定义，实际实现由 task-developer 完成
 */

/**
 * UI State 接口
 * 定义应用的所有 UI 状态
 */
export interface UIState {
  /** 主题设置：light, dark, 或 system（跟随系统） */
  theme: 'light' | 'dark' | 'system';
  /** 解析后的主题（light 或 dark） */
  resolvedTheme: 'light' | 'dark';
  /** 侧边栏是否打开 */
  sidebarOpen: boolean;
  /** 移动端菜单是否打开 */
  mobileMenuOpen: boolean;
  /** 当前激活的模态框 ID 列表 */
  activeModals: ReadonlyArray<string>;
  /** 全局加载状态 */
  isLoading: boolean;
  /** 全局错误信息 */
  globalError: string | null;
  /** Toast 消息队列 */
  toasts: ReadonlyArray<ToastMessage>;
}

/**
 * Toast 消息接口
 */
export interface ToastMessage {
  /** 唯一标识符 */
  id: string;
  /** 消息内容 */
  message: string;
  /** 消息类型 */
  type: 'success' | 'error' | 'warning' | 'info';
  /** 显示时长（毫秒），可选 */
  duration?: number;
  /** 创建时间戳 */
  timestamp: number;
}

/**
 * UI Actions 接口
 * 定义所有可以修改 UI State 的操作
 */
export interface UIActions {
  /** 设置主题 */
  setTheme: (theme: UIState['theme']) => void;
  /** 切换侧边栏开关状态 */
  toggleSidebar: () => void;
  /** 设置侧边栏开关状态 */
  setSidebarOpen: (open: boolean) => void;
  /** 切换移动端菜单开关状态 */
  toggleMobileMenu: () => void;
  /** 关闭移动端菜单 */
  closeMobileMenu: () => void;
  /** 打开模态框 */
  openModal: (modalId: string) => void;
  /** 关闭指定模态框 */
  closeModal: (modalId: string) => void;
  /** 关闭所有模态框 */
  closeAllModals: () => void;
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;
  /** 设置错误信息 */
  setError: (error: string | null) => void;
  /** 添加 Toast 消息，返回 Toast ID */
  addToast: (toast: Omit<ToastMessage, 'id' | 'timestamp'>) => string;
  /** 移除指定 Toast */
  removeToast: (toastId: string) => void;
  /** 清除所有 Toast */
  clearToasts: () => void;
  /** 序列化状态为 JSON */
  toJSON: () => Readonly<DeepPartial<UIState>>;
  /** 从 JSON 恢复状态 */
  fromJSON: (data: Readonly<DeepPartial<UIState>>) => void;
  /** 重置为初始状态 */
  reset: () => void;
}

/**
 * DeepPartial 类型
 * 将所有属性变为可选，包括嵌套对象
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

/**
 * UI Store 接口（Zustand Store API）
 */
export interface UIStoreApi {
  /** 获取当前状态 */
  getState: () => UIState & UIActions;
  /** 设置状态（内部使用） */
  setState: (partial: Partial<UIState & UIActions>) => void;
  /** 订阅状态变化 */
  subscribe: (listener: () => void) => () => void;
  /** 销毁 store */
  destroy: () => void;
}

/**
 * UI Store 类型（用于测试的简化类型）
 * 实际使用时返回 Zustand Store 对象
 */
export type UIStore = UIState & UIActions;
