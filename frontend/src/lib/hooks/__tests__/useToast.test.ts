/**
 * useToast Hook 单元测试
 *
 * 测试契约:
 * - 显示不同类型的 toast
 * - 支持自定义配置
 * - 支持同时显示多个 toast
 * - 支持手动关闭
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast', () => {
  jest.useFakeTimers();

  beforeEach(() => {
    jest.clearAllTimers();
  });

  describe('基础功能', () => {
    it('应该提供 toast 方法', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toast).toBeDefined();
      expect(typeof result.current.toast).toBe('function');
    });

    it('应该显示成功 toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('操作成功');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('操作成功');
      expect(result.current.toasts[0].type).toBe('success');
    });

    it('应该显示错误 toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('操作失败');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('操作失败');
      expect(result.current.toasts[0].type).toBe('error');
    });

    it('应该显示警告 toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.warning('警告信息');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('警告信息');
      expect(result.current.toasts[0].type).toBe('warning');
    });

    it('应该显示信息 toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.info('提示信息');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('提示信息');
      expect(result.current.toasts[0].type).toBe('info');
    });
  });

  describe('通用 toast 方法', () => {
    it('应该支持自定义配置', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          message: '自定义消息',
          type: 'success',
          duration: 5000,
          position: 'bottom-right',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('自定义消息');
      expect(result.current.toasts[0].duration).toBe(5000);
      expect(result.current.toasts[0].position).toBe('bottom-right');
    });

    it('应该支持带标题的 toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: '标题',
          message: '内容',
          type: 'info',
        });
      });

      expect(result.current.toasts[0].title).toBe('标题');
      expect(result.current.toasts[0].message).toBe('内容');
    });
  });

  describe('多个 Toast', () => {
    it('应该支持同时显示多个 toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Toast 1');
        result.current.error('Toast 2');
        result.current.warning('Toast 3');
      });

      expect(result.current.toasts).toHaveLength(3);
    });

    it('应该按顺序显示 toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('First');
        result.current.error('Second');
        result.current.warning('Third');
      });

      expect(result.current.toasts[0].message).toBe('First');
      expect(result.current.toasts[1].message).toBe('Second');
      expect(result.current.toasts[2].message).toBe('Third');
    });
  });

  describe('自动关闭', () => {
    it('应该在默认时间后自动关闭', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('自动关闭');
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('应该支持自定义关闭时间', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          message: '5秒后关闭',
          type: 'info',
          duration: 5000,
        });
      });

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('duration=0 时不自动关闭', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          message: '不关闭',
          type: 'info',
          duration: 0,
        });
      });

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('手动关闭', () => {
    it('应该支持手动关闭指定 toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Toast 1');
        result.current.error('Toast 2');
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
        result.current.dismiss(toastId);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Toast 2');
    });

    it('应该支持关闭所有 toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Toast 1');
        result.current.error('Toast 2');
        result.current.warning('Toast 3');
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.dismissAll();
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('Promise 处理', () => {
    it('应该支持 Promise loading 状态', async () => {
      const { result } = renderHook(() => useToast());

      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('成功'), 1000);
      });

      act(() => {
        result.current.promise(promise, {
          loading: '加载中...',
          success: '加载成功',
          error: '加载失败',
        });
      });

      expect(result.current.toasts[0].message).toBe('加载中...');
      expect(result.current.toasts[0].type).toBe('info');

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.toasts[0].message).toBe('加载成功');
        expect(result.current.toasts[0].type).toBe('success');
      });
    });

    it('Promise 失败时应该显示错误', async () => {
      const { result } = renderHook(() => useToast());

      const promise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('出错了')), 1000);
      });

      act(() => {
        result.current.promise(promise, {
          loading: '加载中...',
          success: '加载成功',
          error: '加载失败',
        });
      });

      expect(result.current.toasts[0].message).toBe('加载中...');

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.toasts[0].message).toBe('加载失败');
        expect(result.current.toasts[0].type).toBe('error');
      });
    });
  });

  describe('位置配置', () => {
    it('应该支持不同位置的 toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          message: '顶部',
          type: 'info',
          position: 'top',
        });
        result.current.toast({
          message: '底部',
          type: 'info',
          position: 'bottom',
        });
        result.current.toast({
          message: '右上',
          type: 'info',
          position: 'top-right',
        });
      });

      expect(result.current.toasts[0].position).toBe('top');
      expect(result.current.toasts[1].position).toBe('bottom');
      expect(result.current.toasts[2].position).toBe('top-right');
    });
  });

  describe('更新 Toast', () => {
    it('应该支持更新已有 toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('初始消息');
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
        result.current.toast({
          id: toastId,
          message: '更新后的消息',
          type: 'success',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('更新后的消息');
    });
  });

  describe('边界情况', () => {
    it('应该处理空消息', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          message: '',
          type: 'info',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
    });

    it('应该处理非常长的消息', () => {
      const { result } = renderHook(() => useToast());

      const longMessage = '这是一条非常长的消息，'.repeat(100);

      act(() => {
        result.current.toast({
          message: longMessage,
          type: 'info',
        });
      });

      expect(result.current.toasts[0].message).toBe(longMessage);
    });

    it('应该处理特殊字符', () => {
      const { result } = renderHook(() => useToast());

      const specialMessage = '提示: <script>alert("test")</script>';

      act(() => {
        result.current.toast({
          message: specialMessage,
          type: 'info',
        });
      });

      expect(result.current.toasts[0].message).toBe(specialMessage);
    });
  });

  describe('可访问性', () => {
    it('应该为每个 toast 生成唯一 ID', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('Toast 1');
        result.current.error('Toast 2');
      });

      const ids = result.current.toasts.map((toast) => toast.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('应该支持自定义 aria 属性', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          message: '可访问提示',
          type: 'info',
          ariaLabel: '自定义标签',
        });
      });

      expect(result.current.toasts[0].ariaLabel).toBe('自定义标签');
    });
  });

  describe('实际应用场景', () => {
    it('应该实现表单提交反馈', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('表单提交成功');
      });

      expect(result.current.toasts[0].message).toBe('表单提交成功');
      expect(result.current.toasts[0].type).toBe('success');

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('应该实现错误提示', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('网络请求失败，请稍后重试');
      });

      expect(result.current.toasts[0].message).toBe('网络请求失败，请稍后重试');
      expect(result.current.toasts[0].type).toBe('error');
    });

    it('应该实现操作确认', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          message: '删除成功',
          type: 'success',
          duration: 2000,
        });
      });

      expect(result.current.toasts[0].duration).toBe(2000);
    });
  });

  describe('快捷方法', () => {
    it('success 方法应该设置正确的类型', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.success('成功');
      });

      expect(result.current.toasts[0].type).toBe('success');
    });

    it('error 方法应该设置正确的类型', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.error('错误');
      });

      expect(result.current.toasts[0].type).toBe('error');
    });

    it('warning 方法应该设置正确的类型', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.warning('警告');
      });

      expect(result.current.toasts[0].type).toBe('warning');
    });

    it('info 方法应该设置正确的类型', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.info('信息');
      });

      expect(result.current.toasts[0].type).toBe('info');
    });
  });
});
