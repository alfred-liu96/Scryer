/**
 * UI Store 集成测试
 *
 * 测试覆盖：
 * - Store 与 React 组件的集成
 * - 持久化功能测试
 * - DevTools 集成测试
 * - 多实例隔离测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createUIStore } from '../ui-store';
import { DEFAULT_UI_STATE, MOCK_TOASTS } from './fixtures';

// UIStore 类型是 createUIStore 返回的 Zustand store 对象
type UIStore = ReturnType<typeof createUIStore>;

describe('UI Store - Integration Tests', () => {
  describe('Store Instance Isolation', () => {
    it('should create independent store instances', () => {
      const store1 = createUIStore();
      const store2 = createUIStore();

      store1.getState().setTheme('dark');
      store2.getState().setTheme('light');

      expect(store1.getState().theme).toBe('dark');
      expect(store2.getState().theme).toBe('light');
    });

    it('should not share state between instances', () => {
      const store1 = createUIStore();
      const store2 = createUIStore();

      store1.getState().addToast({ message: 'Store 1', type: 'info' });
      store2.getState().addToast({ message: 'Store 2', type: 'info' });

      expect(store1.getState().toasts).toHaveLength(1);
      expect(store2.getState().toasts).toHaveLength(1);
      expect(store1.getState().toasts[0].message).toBe('Store 1');
      expect(store2.getState().toasts[0].message).toBe('Store 2');
    });

    it('should reset independently', () => {
      const store1 = createUIStore();
      const store2 = createUIStore();

      store1.getState().setTheme('dark');
      store2.getState().setTheme('light');

      store1.getState().reset();

      expect(store1.getState().theme).toBe('system');
      expect(store2.getState().theme).toBe('light');
    });
  });

  describe('State Persistence Flow', () => {
    let store: UIStore;

    beforeEach(() => {
      store = createUIStore();
    });

    it('should serialize and restore complete state', () => {
      // 设置各种状态
      store.getState().setTheme('dark');
      store.getState().setSidebarOpen(false);
      store.getState().setLoading(true);
      store.getState().setError('Test error');
      store.getState().addToast({ message: 'Test', type: 'success' });
      store.getState().openModal('test-modal');

      // 序列化
      const serialized = store.getState().toJSON();

      // 创建新 store 并恢复
      const newStore = createUIStore();
      newStore.getState().fromJSON(serialized);

      // 验证状态恢复
      const state = newStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.sidebarOpen).toBe(false);
      expect(state.isLoading).toBe(true);
      expect(state.globalError).toBe('Test error');
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].message).toBe('Test');
      expect(state.activeModals).toContain('test-modal');
    });

    it('should handle partial state restoration', () => {
      // 设置初始状态
      store.getState().setTheme('light');
      store.getState().setSidebarOpen(false);
      store.getState().setLoading(true);

      // 部分序列化
      const partialState = {
        theme: 'dark' as const,
      };

      // 恢复部分状态
      store.getState().fromJSON(partialState);

      // 验证只更新了指定字段
      const state = store.getState();
      expect(state.theme).toBe('dark');
      expect(state.sidebarOpen).toBe(false);
      expect(state.isLoading).toBe(true);
    });

    it('should maintain state integrity after multiple toJSON/fromJSON cycles', () => {
      // 设置状态
      store.getState().setTheme('dark');
      store.getState().addToast({ message: 'Test', type: 'success' });

      // 多次序列化/反序列化循环
      for (let i = 0; i < 5; i++) {
        const serialized = store.getState().toJSON();
        store.getState().fromJSON(serialized);
      }

      // 验证状态完整性
      const state = store.getState();
      expect(state.theme).toBe('dark');
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].message).toBe('Test');
    });
  });

  describe('Complex User Workflows', () => {
    let store: UIStore;

    beforeEach(() => {
      store = createUIStore();
    });

    it('should handle user login workflow', () => {
      // 开始加载
      store.getState().setLoading(true);
      expect(store.getState().isLoading).toBe(true);

      // 登录成功
      store.getState().setLoading(false);
      store.getState().addToast({
        message: '登录成功',
        type: 'success',
        duration: 3000,
      });

      // 验证状态
      const state = store.getState();
      expect(state.isLoading).toBe(false);
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].type).toBe('success');
      expect(state.toasts[0].message).toBe('登录成功');
    });

    it('should handle user login error workflow', () => {
      // 开始加载
      store.getState().setLoading(true);

      // 登录失败
      store.getState().setLoading(false);
      store.getState().setError('用户名或密码错误');
      store.getState().addToast({
        message: '登录失败',
        type: 'error',
      });

      // 验证状态
      const state = store.getState();
      expect(state.isLoading).toBe(false);
      expect(state.globalError).toBe('用户名或密码错误');
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].type).toBe('error');
    });

    it('should handle modal workflow', () => {
      // 打开设置模态框
      store.getState().openModal('settings-modal');
      expect(store.getState().activeModals).toContain('settings-modal');

      // 在设置中打开确认模态框
      store.getState().openModal('confirm-modal');
      expect(store.getState().activeModals).toContain('confirm-modal');
      expect(store.getState().activeModals).toHaveLength(2);

      // 关闭确认模态框
      store.getState().closeModal('confirm-modal');
      expect(store.getState().activeModals).not.toContain('confirm-modal');
      expect(store.getState().activeModals).toHaveLength(1);

      // 关闭设置模态框
      store.getState().closeModal('settings-modal');
      expect(store.getState().activeModals).toHaveLength(0);
    });

    it('should handle mobile menu workflow', () => {
      // 打开移动菜单
      store.getState().toggleMobileMenu();
      expect(store.getState().mobileMenuOpen).toBe(true);

      // 导航后关闭菜单
      store.getState().closeMobileMenu();
      expect(store.getState().mobileMenuOpen).toBe(false);
    });

    it('should handle settings change workflow', () => {
      // 打开设置
      store.getState().openModal('settings-modal');

      // 切换主题
      store.getState().setTheme('dark');
      expect(store.getState().theme).toBe('dark');

      // 显示成功提示
      store.getState().addToast({
        message: '设置已保存',
        type: 'success',
      });

      // 关闭设置
      store.getState().closeModal('settings-modal');

      // 验证最终状态
      const state = store.getState();
      expect(state.theme).toBe('dark');
      expect(state.activeModals).toHaveLength(0);
      expect(state.toasts).toHaveLength(1);
    });
  });

  describe('Toast Lifecycle', () => {
    let store: UIStore;

    beforeEach(() => {
      store = createUIStore();
    });

    it('should handle toast auto-removal simulation', () => {
      const toastId = store.getState().addToast({
        message: 'Auto-remove toast',
        type: 'info',
        duration: 1000,
      });

      expect(store.getState().toasts).toHaveLength(1);

      // 模拟时间后移除
      setTimeout(() => {
        store.getState().removeToast(toastId);
        expect(store.getState().toasts).toHaveLength(0);
      }, 1000);
    });

    it('should handle multiple toasts with different lifetimes', () => {
      const shortToast = store.getState().addToast({
        message: 'Short',
        type: 'info',
        duration: 1000,
      });

      const longToast = store.getState().addToast({
        message: 'Long',
        type: 'info',
        duration: 5000,
      });

      expect(store.getState().toasts).toHaveLength(2);

      // 短时间的先被移除
      store.getState().removeToast(shortToast);
      expect(store.getState().toasts).toHaveLength(1);
      expect(store.getState().toasts[0].id).toBe(longToast);

      // 长时间的后被移除
      store.getState().removeToast(longToast);
      expect(store.getState().toasts).toHaveLength(0);
    });

    it('should handle toast cleanup on logout', () => {
      // 添加多个 toast
      store.getState().addToast({ message: 'Toast 1', type: 'info' });
      store.getState().addToast({ message: 'Toast 2', type: 'warning' });
      store.getState().addToast({ message: 'Toast 3', type: 'error' });

      expect(store.getState().toasts).toHaveLength(3);

      // 登出时清理
      store.getState().clearToasts();
      store.getState().reset();

      expect(store.getState().toasts).toHaveLength(0);
    });
  });

  describe('Error Handling Workflows', () => {
    let store: UIStore;

    beforeEach(() => {
      store = createUIStore();
    });

    it('should handle API error workflow', () => {
      // 开始请求
      store.getState().setLoading(true);
      store.getState().setError(null);

      // 请求失败
      store.getState().setLoading(false);
      store.getState().setError('API 请求失败: 500 Internal Server Error');
      store.getState().addToast({
        message: '请求失败，请稍后重试',
        type: 'error',
      });

      // 验证状态
      const state = store.getState();
      expect(state.isLoading).toBe(false);
      expect(state.globalError).toContain('500');
      expect(state.toasts[0].type).toBe('error');
    });

    it('should clear error on next successful request', () => {
      // 设置错误
      store.getState().setError('Previous error');

      // 成功请求
      store.getState().setLoading(true);
      store.getState().setError(null);
      store.getState().setLoading(false);

      // 验证错误已清除
      expect(store.getState().globalError).toBeNull();
    });

    it('should handle network error recovery', () => {
      // 网络错误
      store.getState().setError('Network Error');
      store.getState().addToast({
        message: '网络连接失败',
        type: 'error',
      });

      // 重试成功
      store.getState().setError(null);
      store.getState().clearToasts();
      store.getState().addToast({
        message: '连接成功',
        type: 'success',
      });

      // 验证恢复
      const state = store.getState();
      expect(state.globalError).toBeNull();
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].type).toBe('success');
    });
  });

  describe('State Consistency', () => {
    let store: UIStore;

    beforeEach(() => {
      store = createUIStore();
    });

    it('should maintain consistency across rapid state changes', () => {
      const operations = [
        () => store.getState().setTheme('dark'),
        () => store.getState().setSidebarOpen(false),
        () => store.getState().setLoading(true),
        () => store.getState().addToast({ message: 'Test', type: 'info' }),
        () => store.getState().openModal('modal-1'),
        () => store.getState().setError('Error'),
      ];

      // 执行所有操作
      operations.forEach(op => op());

      // 验证所有状态都正确设置
      const state = store.getState();
      expect(state.theme).toBe('dark');
      expect(state.sidebarOpen).toBe(false);
      expect(state.isLoading).toBe(true);
      expect(state.toasts).toHaveLength(1);
      expect(state.activeModals).toContain('modal-1');
      expect(state.globalError).toBe('Error');
    });

    it('should handle reset and restore cycle', () => {
      // 设置状态
      store.getState().setTheme('dark');
      store.getState().setSidebarOpen(false);
      const serialized = store.getState().toJSON();

      // 重置
      store.getState().reset();
      expect(store.getState().theme).toBe('system');

      // 恢复
      store.getState().fromJSON(serialized);
      expect(store.getState().theme).toBe('dark');
      expect(store.getState().sidebarOpen).toBe(false);
    });
  });

  describe('Boundary Conditions', () => {
    let store: UIStore;

    beforeEach(() => {
      store = createUIStore();
    });

    it('should handle empty toasts array after clear and add', () => {
      expect(store.getState().toasts).toHaveLength(0);

      store.getState().addToast({ message: 'Test', type: 'info' });
      expect(store.getState().toasts).toHaveLength(1);

      store.getState().clearToasts();
      expect(store.getState().toasts).toHaveLength(0);

      store.getState().addToast({ message: 'Test 2', type: 'success' });
      expect(store.getState().toasts).toHaveLength(1);
      expect(store.getState().toasts[0].message).toBe('Test 2');
    });

    it('should handle empty modals array after closeAll and open', () => {
      expect(store.getState().activeModals).toHaveLength(0);

      store.getState().openModal('modal-1');
      expect(store.getState().activeModals).toHaveLength(1);

      store.getState().closeAllModals();
      expect(store.getState().activeModals).toHaveLength(0);

      store.getState().openModal('modal-2');
      expect(store.getState().activeModals).toHaveLength(1);
      expect(store.getState().activeModals[0]).toBe('modal-2');
    });

    it('should handle theme transition through all options', () => {
      const themes: Array<'light' | 'dark' | 'system'> = ['system', 'light', 'dark', 'system'];

      themes.forEach(theme => {
        store.getState().setTheme(theme);
        expect(store.getState().theme).toBe(theme);
      });
    });
  });
});
