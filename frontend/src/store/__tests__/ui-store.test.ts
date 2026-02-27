/**
 * UI Store 单元测试
 *
 * 测试覆盖：
 * - 初始状态验证
 * - 主题操作（setTheme）
 * - 侧边栏操作（toggleSidebar, setSidebarOpen）
 * - 移动端菜单操作（toggleMobileMenu, closeMobileMenu）
 * - 模态框操作（openModal, closeModal, closeAllModals）
 * - 加载状态（setLoading）
 * - 错误处理（setError）
 * - Toast 消息（addToast, removeToast, clearToasts）
 * - Store Interface（toJSON, fromJSON, reset）
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createUIStore } from '../ui-store';
import { DEFAULT_UI_STATE, MOCK_TOASTS, MOCK_UI_STATE, MOCK_TOAST_INPUT, MOCK_MODAL_IDS } from './fixtures';

// UIStore 类型是 createUIStore 返回的 Zustand store 对象
type UIStore = ReturnType<typeof createUIStore>;

describe('UI Store - Initial State', () => {
  let store: UIStore;

  beforeEach(() => {
    store = createUIStore();
  });

  it('should initialize with default state', () => {
    const state = store.getState();

    expect(state.theme).toBe('system');
    expect(state.resolvedTheme).toBe('light');
    expect(state.sidebarOpen).toBe(true);
    expect(state.mobileMenuOpen).toBe(false);
    expect(state.activeModals).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.globalError).toBeNull();
    expect(state.toasts).toEqual([]);
  });

  it('should have all actions defined', () => {
    const actions = store.getState();

    expect(typeof actions.setTheme).toBe('function');
    expect(typeof actions.toggleSidebar).toBe('function');
    expect(typeof actions.setSidebarOpen).toBe('function');
    expect(typeof actions.toggleMobileMenu).toBe('function');
    expect(typeof actions.closeMobileMenu).toBe('function');
    expect(typeof actions.openModal).toBe('function');
    expect(typeof actions.closeModal).toBe('function');
    expect(typeof actions.closeAllModals).toBe('function');
    expect(typeof actions.setLoading).toBe('function');
    expect(typeof actions.setError).toBe('function');
    expect(typeof actions.addToast).toBe('function');
    expect(typeof actions.removeToast).toBe('function');
    expect(typeof actions.clearToasts).toBe('function');
    expect(typeof actions.toJSON).toBe('function');
    expect(typeof actions.fromJSON).toBe('function');
    expect(typeof actions.reset).toBe('function');
  });
});

describe('UI Store - Theme Actions', () => {
  let store: UIStore;

  beforeEach(() => {
    store = createUIStore();
  });

  it('should set theme to light', () => {
    store.getState().setTheme('light');
    const state = store.getState();

    expect(state.theme).toBe('light');
  });

  it('should set theme to dark', () => {
    store.getState().setTheme('dark');
    const state = store.getState();

    expect(state.theme).toBe('dark');
  });

  it('should set theme to system', () => {
    store.getState().setTheme('system');
    const state = store.getState();

    expect(state.theme).toBe('system');
  });

  it('should update theme multiple times', () => {
    store.getState().setTheme('light');
    expect(store.getState().theme).toBe('light');

    store.getState().setTheme('dark');
    expect(store.getState().theme).toBe('dark');

    store.getState().setTheme('system');
    expect(store.getState().theme).toBe('system');
  });
});

describe('UI Store - Sidebar Actions', () => {
  let store: UIStore;

  beforeEach(() => {
    store = createUIStore();
  });

  it('should toggle sidebar from open to closed', () => {
    expect(store.getState().sidebarOpen).toBe(true);

    store.getState().toggleSidebar();
    expect(store.getState().sidebarOpen).toBe(false);
  });

  it('should toggle sidebar from closed to open', () => {
    store.getState().setSidebarOpen(false);
    expect(store.getState().sidebarOpen).toBe(false);

    store.getState().toggleSidebar();
    expect(store.getState().sidebarOpen).toBe(true);
  });

  it('should set sidebar to open explicitly', () => {
    store.getState().setSidebarOpen(false);
    expect(store.getState().sidebarOpen).toBe(false);

    store.getState().setSidebarOpen(true);
    expect(store.getState().sidebarOpen).toBe(true);
  });

  it('should set sidebar to closed explicitly', () => {
    store.getState().setSidebarOpen(true);
    expect(store.getState().sidebarOpen).toBe(true);

    store.getState().setSidebarOpen(false);
    expect(store.getState().sidebarOpen).toBe(false);
  });

  it('should handle multiple rapid toggles', () => {
    store.getState().toggleSidebar();
    expect(store.getState().sidebarOpen).toBe(false);

    store.getState().toggleSidebar();
    expect(store.getState().sidebarOpen).toBe(true);

    store.getState().toggleSidebar();
    expect(store.getState().sidebarOpen).toBe(false);
  });
});

describe('UI Store - Mobile Menu Actions', () => {
  let store: UIStore;

  beforeEach(() => {
    store = createUIStore();
  });

  it('should toggle mobile menu from closed to open', () => {
    expect(store.getState().mobileMenuOpen).toBe(false);

    store.getState().toggleMobileMenu();
    expect(store.getState().mobileMenuOpen).toBe(true);
  });

  it('should toggle mobile menu from open to closed', () => {
    store.getState().toggleMobileMenu();
    expect(store.getState().mobileMenuOpen).toBe(true);

    store.getState().toggleMobileMenu();
    expect(store.getState().mobileMenuOpen).toBe(false);
  });

  it('should close mobile menu explicitly', () => {
    store.getState().toggleMobileMenu();
    expect(store.getState().mobileMenuOpen).toBe(true);

    store.getState().closeMobileMenu();
    expect(store.getState().mobileMenuOpen).toBe(false);
  });

  it('should handle closing already closed menu', () => {
    expect(store.getState().mobileMenuOpen).toBe(false);

    store.getState().closeMobileMenu();
    expect(store.getState().mobileMenuOpen).toBe(false);
  });
});

describe('UI Store - Modal Actions', () => {
  let store: UIStore;

  beforeEach(() => {
    store = createUIStore();
  });

  it('should open a single modal', () => {
    store.getState().openModal('settings-modal');
    const state = store.getState();

    expect(state.activeModals).toContain('settings-modal');
    expect(state.activeModals).toHaveLength(1);
  });

  it('should open multiple modals', () => {
    store.getState().openModal('settings-modal');
    store.getState().openModal('confirm-modal');
    const state = store.getState();

    expect(state.activeModals).toContain('settings-modal');
    expect(state.activeModals).toContain('confirm-modal');
    expect(state.activeModals).toHaveLength(2);
  });

  it('should close a specific modal', () => {
    store.getState().openModal('settings-modal');
    store.getState().openModal('confirm-modal');
    expect(store.getState().activeModals).toHaveLength(2);

    store.getState().closeModal('settings-modal');
    const state = store.getState();

    expect(state.activeModals).not.toContain('settings-modal');
    expect(state.activeModals).toContain('confirm-modal');
    expect(state.activeModals).toHaveLength(1);
  });

  it('should handle closing non-existent modal gracefully', () => {
    store.getState().openModal('settings-modal');
    expect(store.getState().activeModals).toHaveLength(1);

    store.getState().closeModal('non-existent-modal');
    expect(store.getState().activeModals).toHaveLength(1);
  });

  it('should close all modals', () => {
    MOCK_MODAL_IDS.forEach(id => store.getState().openModal(id));
    expect(store.getState().activeModals).toHaveLength(3);

    store.getState().closeAllModals();
    const state = store.getState();

    expect(state.activeModals).toEqual([]);
  });

  it('should handle closing all modals when none are open', () => {
    expect(store.getState().activeModals).toEqual([]);

    store.getState().closeAllModals();
    expect(store.getState().activeModals).toEqual([]);
  });

  it('should prevent duplicate modal IDs', () => {
    store.getState().openModal('settings-modal');
    store.getState().openModal('settings-modal');
    store.getState().openModal('settings-modal');

    const state = store.getState();
    const count = state.activeModals.filter(id => id === 'settings-modal').length;

    expect(count).toBe(1);
  });
});

describe('UI Store - Loading State Actions', () => {
  let store: UIStore;

  beforeEach(() => {
    store = createUIStore();
  });

  it('should set loading to true', () => {
    store.getState().setLoading(true);
    expect(store.getState().isLoading).toBe(true);
  });

  it('should set loading to false', () => {
    store.getState().setLoading(true);
    expect(store.getState().isLoading).toBe(true);

    store.getState().setLoading(false);
    expect(store.getState().isLoading).toBe(false);
  });

  it('should handle multiple loading state changes', () => {
    store.getState().setLoading(true);
    expect(store.getState().isLoading).toBe(true);

    store.getState().setLoading(false);
    expect(store.getState().isLoading).toBe(false);

    store.getState().setLoading(true);
    expect(store.getState().isLoading).toBe(true);
  });
});

describe('UI Store - Error Actions', () => {
  let store: UIStore;

  beforeEach(() => {
    store = createUIStore();
  });

  it('should set error message', () => {
    store.getState().setError('Network error');
    expect(store.getState().globalError).toBe('Network error');
  });

  it('should clear error by setting to null', () => {
    store.getState().setError('Network error');
    expect(store.getState().globalError).toBe('Network error');

    store.getState().setError(null);
    expect(store.getState().globalError).toBeNull();
  });

  it('should handle empty string error', () => {
    store.getState().setError('');
    expect(store.getState().globalError).toBe('');
  });

  it('should update error message multiple times', () => {
    store.getState().setError('Error 1');
    expect(store.getState().globalError).toBe('Error 1');

    store.getState().setError('Error 2');
    expect(store.getState().globalError).toBe('Error 2');

    store.getState().setError(null);
    expect(store.getState().globalError).toBeNull();
  });
});

describe('UI Store - Toast Actions', () => {
  let store: UIStore;

  beforeEach(() => {
    store = createUIStore();
  });

  it('should add a toast and return ID', () => {
    const toastId = store.getState().addToast({
      message: 'Success!',
      type: 'success',
    });

    expect(typeof toastId).toBe('string');
    expect(store.getState().toasts).toHaveLength(1);

    const toast = store.getState().toasts[0];
    expect(toast.id).toBe(toastId);
    expect(toast.message).toBe('Success!');
    expect(toast.type).toBe('success');
    expect(toast.timestamp).toBeDefined();
  });

  it('should add multiple toasts', () => {
    store.getState().addToast({ message: 'Toast 1', type: 'info' });
    store.getState().addToast({ message: 'Toast 2', type: 'warning' });
    store.getState().addToast({ message: 'Toast 3', type: 'error' });

    expect(store.getState().toasts).toHaveLength(3);
  });

  it('should add toast with custom duration', () => {
    const toastId = store.getState().addToast({
      message: 'Custom duration',
      type: 'info',
      duration: 5000,
    });

    const toast = store.getState().toasts.find(t => t.id === toastId);
    expect(toast?.duration).toBe(5000);
  });

  it('should remove toast by ID', () => {
    const id1 = store.getState().addToast({ message: 'Toast 1', type: 'info' });
    const id2 = store.getState().addToast({ message: 'Toast 2', type: 'warning' });

    expect(store.getState().toasts).toHaveLength(2);

    store.getState().removeToast(id1);
    const state = store.getState();

    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].id).toBe(id2);
  });

  it('should handle removing non-existent toast', () => {
    store.getState().addToast({ message: 'Toast 1', type: 'info' });
    expect(store.getState().toasts).toHaveLength(1);

    store.getState().removeToast('non-existent-id');
    expect(store.getState().toasts).toHaveLength(1);
  });

  it('should clear all toasts', () => {
    store.getState().addToast({ message: 'Toast 1', type: 'info' });
    store.getState().addToast({ message: 'Toast 2', type: 'warning' });
    store.getState().addToast({ message: 'Toast 3', type: 'error' });

    expect(store.getState().toasts).toHaveLength(3);

    store.getState().clearToasts();
    expect(store.getState().toasts).toEqual([]);
  });

  it('should handle clearing toasts when none exist', () => {
    expect(store.getState().toasts).toEqual([]);

    store.getState().clearToasts();
    expect(store.getState().toasts).toEqual([]);
  });

  it('should generate unique IDs for toasts', () => {
    const id1 = store.getState().addToast({ message: 'Toast 1', type: 'info' });
    const id2 = store.getState().addToast({ message: 'Toast 2', type: 'info' });
    const id3 = store.getState().addToast({ message: 'Toast 3', type: 'info' });

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it('should set timestamp on toast creation', () => {
    const beforeTime = Date.now();
    const toastId = store.getState().addToast({ message: 'Test', type: 'info' });
    const afterTime = Date.now();

    const toast = store.getState().toasts.find(t => t.id === toastId);
    expect(toast?.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(toast?.timestamp).toBeLessThanOrEqual(afterTime);
  });
});

describe('UI Store - Store Interface', () => {
  let store: UIStore;

  beforeEach(() => {
    store = createUIStore();
  });

  describe('toJSON', () => {
    it('should serialize default state', () => {
      const json = store.getState().toJSON();

      expect(json).toEqual(DEFAULT_UI_STATE);
    });

    it('should serialize modified state', () => {
      store.getState().setTheme('dark');
      store.getState().setSidebarOpen(false);
      store.getState().setLoading(true);

      const json = store.getState().toJSON();

      expect(json.theme).toBe('dark');
      expect(json.sidebarOpen).toBe(false);
      expect(json.isLoading).toBe(true);
    });

    it('should include toasts in serialization', () => {
      store.getState().addToast({ message: 'Test', type: 'success' });
      store.getState().addToast({ message: 'Test 2', type: 'error' });

      const json = store.getState().toJSON();

      expect(json.toasts).toHaveLength(2);
      expect(json.toasts[0].message).toBe('Test');
      expect(json.toasts[1].message).toBe('Test 2');
    });

    it('should return immutable object', () => {
      const json1 = store.getState().toJSON();
      const json2 = store.getState().toJSON();

      expect(json1).toEqual(json2);
      expect(json1).not.toBe(json2);
    });
  });

  describe('fromJSON', () => {
    it('should restore state from JSON', () => {
      const partialState = {
        theme: 'dark' as const,
        sidebarOpen: false,
        isLoading: true,
      };

      store.getState().fromJSON(partialState);
      const state = store.getState();

      expect(state.theme).toBe('dark');
      expect(state.sidebarOpen).toBe(false);
      expect(state.isLoading).toBe(true);
    });

    it('should restore toasts from JSON', () => {
      const partialState = {
        toasts: MOCK_TOASTS,
      };

      store.getState().fromJSON(partialState);
      const state = store.getState();

      expect(state.toasts).toEqual(MOCK_TOASTS);
    });

    it('should handle empty state object', () => {
      store.getState().setTheme('dark');
      store.getState().fromJSON({});
      const state = store.getState();

      expect(state.theme).toBe('dark');
    });

    it('should handle partial state update', () => {
      store.getState().setTheme('dark');
      store.getState().setSidebarOpen(false);

      store.getState().fromJSON({ theme: 'light' });
      const state = store.getState();

      expect(state.theme).toBe('light');
      expect(state.sidebarOpen).toBe(false);
    });

    it('should restore modals from JSON', () => {
      const partialState = {
        activeModals: ['modal-1', 'modal-2'],
      };

      store.getState().fromJSON(partialState);
      const state = store.getState();

      expect(state.activeModals).toEqual(['modal-1', 'modal-2']);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      store.getState().setTheme('dark');
      store.getState().setSidebarOpen(false);
      store.getState().setLoading(true);
      store.getState().setError('Error');
      store.getState().addToast({ message: 'Test', type: 'info' });

      store.getState().reset();
      const state = store.getState();

      expect(state).toMatchObject(DEFAULT_UI_STATE);
    });

    it('should handle reset when already at initial state', () => {
      const beforeState = store.getState();

      store.getState().reset();
      const afterState = store.getState();

      expect(beforeState).toEqual(afterState);
    });

    it('should clear all modals on reset', () => {
      store.getState().openModal('modal-1');
      store.getState().openModal('modal-2');
      expect(store.getState().activeModals).toHaveLength(2);

      store.getState().reset();
      expect(store.getState().activeModals).toEqual([]);
    });

    it('should clear all toasts on reset', () => {
      store.getState().addToast({ message: 'Toast 1', type: 'info' });
      store.getState().addToast({ message: 'Toast 2', type: 'error' });
      expect(store.getState().toasts).toHaveLength(2);

      store.getState().reset();
      expect(store.getState().toasts).toEqual([]);
    });
  });
});

describe('UI Store - Edge Cases', () => {
  let store: UIStore;

  beforeEach(() => {
    store = createUIStore();
  });

  it('should handle rapid state changes', () => {
    for (let i = 0; i < 100; i++) {
      store.getState().setTheme(i % 2 === 0 ? 'light' : 'dark');
      store.getState().toggleSidebar();
      store.getState().setLoading(i % 2 === 0);
    }

    const state = store.getState();
    expect(state.theme).toBe('dark');
    expect(state.sidebarOpen).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('should handle many toasts', () => {
    const count = 50;
    for (let i = 0; i < count; i++) {
      store.getState().addToast({
        message: `Toast ${i}`,
        type: 'info',
      });
    }

    expect(store.getState().toasts).toHaveLength(count);

    store.getState().clearToasts();
    expect(store.getState().toasts).toHaveLength(0);
  });

  it('should handle many modals', () => {
    const count = 20;
    for (let i = 0; i < count; i++) {
      store.getState().openModal(`modal-${i}`);
    }

    expect(store.getState().activeModals).toHaveLength(count);

    store.getState().closeAllModals();
    expect(store.getState().activeModals).toHaveLength(0);
  });

  it('should handle special characters in toast messages', () => {
    const specialMessages = [
      'Hello <script>alert("XSS")</script>',
      'emoji: 🎉 🔥 👍',
      'Special chars: !@#$%^&*()_+-=[]{}|;:\'",.<>/?`~',
      'Unicode: 你好世界 🌍',
      'Newlines\nand\ttabs',
    ];

    specialMessages.forEach(msg => {
      store.getState().addToast({ message: msg, type: 'info' });
    });

    expect(store.getState().toasts).toHaveLength(specialMessages.length);
    store.getState().toasts.forEach((toast, index) => {
      expect(toast.message).toBe(specialMessages[index]);
    });
  });

  it('should handle very long error messages', () => {
    const longError = 'E'.repeat(10000);
    store.getState().setError(longError);

    expect(store.getState().globalError).toBe(longError);
  });
});
