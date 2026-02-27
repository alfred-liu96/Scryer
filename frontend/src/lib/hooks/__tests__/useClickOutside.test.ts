/**
 * useClickOutside Hook 单元测试
 *
 * 测试契约:
 * - 检测元素外部点击
 * - 支持多个 ref
 * - 支持自定义事件类型
 * - 组件卸载时清理监听器
 */

import { renderHook, act } from '@testing-library/react';
import { createRef, RefObject } from 'react';
import { useClickOutside } from '../useClickOutside';
import userEvent from '@testing-library/user-event';

describe('useClickOutside', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('基础功能', () => {
    it('应该在点击外部时触发回调', () => {
      const handleClick = jest.fn();
      const ref = createRef<HTMLDivElement>();

      const insideDiv = document.createElement('div');
      insideDiv.setAttribute('data-testid', 'inside');
      insideDiv.textContent = 'Inside';

      const outsideDiv = document.createElement('div');
      outsideDiv.setAttribute('data-testid', 'outside');
      outsideDiv.textContent = 'Outside';

      document.body.appendChild(insideDiv);
      document.body.appendChild(outsideDiv);

      ref.current = insideDiv;

      renderHook(() => useClickOutside(ref, handleClick));

      act(() => {
        outsideDiv.click();
      });

      expect(handleClick).toHaveBeenCalledTimes(1);

      // 清理
      document.body.removeChild(insideDiv);
      document.body.removeChild(outsideDiv);
    });

    it('不应该在点击内部时触发回调', () => {
      const handleClick = jest.fn();
      const ref = createRef<HTMLDivElement>();

      const insideDiv = document.createElement('div');
      insideDiv.setAttribute('data-testid', 'inside');
      insideDiv.textContent = 'Inside';

      document.body.appendChild(insideDiv);

      ref.current = insideDiv;

      renderHook(() => useClickOutside(ref, handleClick));

      act(() => {
        insideDiv.click();
      });

      expect(handleClick).not.toHaveBeenCalled();

      // 清理
      document.body.removeChild(insideDiv);
    });
  });

  describe('多个 Ref', () => {
    it('应该支持多个 ref（点击任何 ref 外部触发）', () => {
      const handleClick = jest.fn();
      const ref1 = createRef<HTMLDivElement>();
      const ref2 = createRef<HTMLDivElement>();

      const insideDiv1 = document.createElement('div');
      insideDiv1.setAttribute('data-testid', 'inside1');
      insideDiv1.textContent = 'Inside 1';

      const insideDiv2 = document.createElement('div');
      insideDiv2.setAttribute('data-testid', 'inside2');
      insideDiv2.textContent = 'Inside 2';

      const outsideDiv = document.createElement('div');
      outsideDiv.setAttribute('data-testid', 'outside');
      outsideDiv.textContent = 'Outside';

      document.body.appendChild(insideDiv1);
      document.body.appendChild(insideDiv2);
      document.body.appendChild(outsideDiv);

      ref1.current = insideDiv1;
      ref2.current = insideDiv2;

      renderHook(() => useClickOutside([ref1, ref2], handleClick));

      act(() => {
        outsideDiv.click();
      });

      expect(handleClick).toHaveBeenCalledTimes(1);

      // 清理
      document.body.removeChild(insideDiv1);
      document.body.removeChild(insideDiv2);
      document.body.removeChild(outsideDiv);
    });

    it('不应该在点击任何 ref 内部时触发回调', () => {
      const handleClick = jest.fn();
      const ref1 = createRef<HTMLDivElement>();
      const ref2 = createRef<HTMLDivElement>();

      const insideDiv1 = document.createElement('div');
      insideDiv1.setAttribute('data-testid', 'inside1');
      insideDiv1.textContent = 'Inside 1';

      const insideDiv2 = document.createElement('div');
      insideDiv2.setAttribute('data-testid', 'inside2');
      insideDiv2.textContent = 'Inside 2';

      document.body.appendChild(insideDiv1);
      document.body.appendChild(insideDiv2);

      ref1.current = insideDiv1;
      ref2.current = insideDiv2;

      renderHook(() => useClickOutside([ref1, ref2], handleClick));

      act(() => {
        insideDiv1.click();
      });

      expect(handleClick).not.toHaveBeenCalled();

      act(() => {
        insideDiv2.click();
      });

      expect(handleClick).not.toHaveBeenCalled();

      // 清理
      document.body.removeChild(insideDiv1);
      document.body.removeChild(insideDiv2);
    });
  });

  describe('嵌套元素', () => {
    it('不应该在点击子元素时触发回调', () => {
      const handleClick = jest.fn();
      const ref = createRef<HTMLDivElement>();

      const insideDiv = document.createElement('div');
      insideDiv.setAttribute('data-testid', 'inside');

      const childSpan = document.createElement('span');
      childSpan.setAttribute('data-testid', 'child');
      childSpan.textContent = 'Child';

      insideDiv.appendChild(childSpan);
      document.body.appendChild(insideDiv);

      ref.current = insideDiv;

      renderHook(() => useClickOutside(ref, handleClick));

      act(() => {
        childSpan.click();
      });

      expect(handleClick).not.toHaveBeenCalled();

      // 清理
      document.body.removeChild(insideDiv);
    });

    it('应该在点击父元素外部时触发回调', () => {
      const handleClick = jest.fn();
      const ref = createRef<HTMLDivElement>();

      const parentDiv = document.createElement('div');
      parentDiv.setAttribute('data-testid', 'parent');

      const insideDiv = document.createElement('div');
      insideDiv.setAttribute('data-testid', 'inside');

      const childSpan = document.createElement('span');
      childSpan.setAttribute('data-testid', 'child');
      childSpan.textContent = 'Child';

      insideDiv.appendChild(childSpan);
      parentDiv.appendChild(insideDiv);

      const outsideDiv = document.createElement('div');
      outsideDiv.setAttribute('data-testid', 'outside');
      outsideDiv.textContent = 'Outside';

      document.body.appendChild(parentDiv);
      document.body.appendChild(outsideDiv);

      ref.current = insideDiv;

      renderHook(() => useClickOutside(ref, handleClick));

      act(() => {
        outsideDiv.click();
      });

      expect(handleClick).toHaveBeenCalledTimes(1);

      // 清理
      document.body.removeChild(parentDiv);
      document.body.removeChild(outsideDiv);
    });
  });

  describe('自定义事件类型', () => {
    it('应该支持 mousedown 事件', () => {
      const handleMouseDown = jest.fn();
      const ref = createRef<HTMLDivElement>();

      const insideDiv = document.createElement('div');
      insideDiv.setAttribute('data-testid', 'inside');
      insideDiv.textContent = 'Inside';

      const outsideDiv = document.createElement('div');
      outsideDiv.setAttribute('data-testid', 'outside');
      outsideDiv.textContent = 'Outside';

      document.body.appendChild(insideDiv);
      document.body.appendChild(outsideDiv);

      ref.current = insideDiv;

      renderHook(() => useClickOutside(ref, handleMouseDown, { eventType: 'mousedown' }));

      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideDiv.dispatchEvent(event);
      });

      expect(handleMouseDown).toHaveBeenCalledTimes(1);

      // 清理
      document.body.removeChild(insideDiv);
      document.body.removeChild(outsideDiv);
    });

    it('应该支持 touchstart 事件', () => {
      const handleTouchStart = jest.fn();
      const ref = createRef<HTMLDivElement>();

      const insideDiv = document.createElement('div');
      insideDiv.setAttribute('data-testid', 'inside');
      insideDiv.textContent = 'Inside';

      const outsideDiv = document.createElement('div');
      outsideDiv.setAttribute('data-testid', 'outside');
      outsideDiv.textContent = 'Outside';

      document.body.appendChild(insideDiv);
      document.body.appendChild(outsideDiv);

      ref.current = insideDiv;

      renderHook(() => useClickOutside(ref, handleTouchStart, { eventType: 'touchstart' }));

      act(() => {
        const event = new TouchEvent('touchstart', { bubbles: true });
        outsideDiv.dispatchEvent(event);
      });

      expect(handleTouchStart).toHaveBeenCalledTimes(1);

      // 清理
      document.body.removeChild(insideDiv);
      document.body.removeChild(outsideDiv);
    });
  });

  describe('组件卸载', () => {
    it('应该在组件卸载时移除事件监听器', () => {
      const handleClick = jest.fn();
      const ref = createRef<HTMLDivElement>();

      const insideDiv = document.createElement('div');
      insideDiv.setAttribute('data-testid', 'inside');
      insideDiv.textContent = 'Inside';

      document.body.appendChild(insideDiv);
      ref.current = insideDiv;

      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useClickOutside(ref, handleClick));

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();

      // 清理
      document.body.removeChild(insideDiv);
    });
  });

  describe('边界情况', () => {
    it('应该处理 null ref', () => {
      const handleClick = jest.fn();
      const ref = createRef<HTMLDivElement>();

      renderHook(() => useClickOutside(ref, handleClick));

      const outsideDiv = document.createElement('div');
      outsideDiv.setAttribute('data-testid', 'outside');
      outsideDiv.textContent = 'Outside';

      document.body.appendChild(outsideDiv);

      act(() => {
        outsideDiv.click();
      });

      expect(handleClick).toHaveBeenCalledTimes(1);

      // 清理
      document.body.removeChild(outsideDiv);
    });

    it('应该处理 ref.current 为 null', () => {
      const handleClick = jest.fn();
      const ref: RefObject<HTMLDivElement> = { current: null };

      const { rerender } = renderHook(() => useClickOutside(ref, handleClick));

      const outsideDiv = document.createElement('div');
      outsideDiv.setAttribute('data-testid', 'outside');
      outsideDiv.textContent = 'Outside';

      document.body.appendChild(outsideDiv);

      act(() => {
        outsideDiv.click();
      });

      expect(handleClick).toHaveBeenCalledTimes(1);

      // 清理
      document.body.removeChild(outsideDiv);
    });

    it('应该处理 ref.current 变化', () => {
      const handleClick = jest.fn();
      const ref = createRef<HTMLDivElement>();

      const element1Div = document.createElement('div');
      element1Div.setAttribute('data-testid', 'element1');
      element1Div.textContent = 'Element 1';

      const element2Div = document.createElement('div');
      element2Div.setAttribute('data-testid', 'element2');
      element2Div.textContent = 'Element 2';

      const outsideDiv = document.createElement('div');
      outsideDiv.setAttribute('data-testid', 'outside');
      outsideDiv.textContent = 'Outside';

      document.body.appendChild(element1Div);
      document.body.appendChild(element2Div);
      document.body.appendChild(outsideDiv);

      ref.current = element1Div;

      renderHook(() => useClickOutside(ref, handleClick));

      act(() => {
        outsideDiv.click();
      });

      expect(handleClick).toHaveBeenCalledTimes(1);

      ref.current = element2Div;

      act(() => {
        outsideDiv.click();
      });

      expect(handleClick).toHaveBeenCalledTimes(2);

      // 清理
      document.body.removeChild(element1Div);
      document.body.removeChild(element2Div);
      document.body.removeChild(outsideDiv);
    });

    it('应该处理空数组 ref', () => {
      const handleClick = jest.fn();

      renderHook(() => useClickOutside([], handleClick));

      const outsideDiv = document.createElement('div');
      outsideDiv.setAttribute('data-testid', 'outside');
      outsideDiv.textContent = 'Outside';

      document.body.appendChild(outsideDiv);

      act(() => {
        outsideDiv.click();
      });

      expect(handleClick).toHaveBeenCalledTimes(1);

      // 清理
      document.body.removeChild(outsideDiv);
    });
  });

  describe('事件传播', () => {
    it('应该在捕获阶段监听', () => {
      const handleClick = jest.fn();
      const ref = createRef<HTMLDivElement>();

      const insideDiv = document.createElement('div');
      insideDiv.setAttribute('data-testid', 'inside');
      insideDiv.textContent = 'Inside';

      document.body.appendChild(insideDiv);
      ref.current = insideDiv;

      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderHook(() => useClickOutside(ref, handleClick));

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);

      addEventListenerSpy.mockRestore();

      // 清理
      document.body.removeChild(insideDiv);
    });

    it('应该处理停止传播的事件', () => {
      const handleClick = jest.fn();
      const ref = createRef<HTMLDivElement>();

      const insideDiv = document.createElement('div');
      insideDiv.setAttribute('data-testid', 'inside');
      insideDiv.textContent = 'Inside';

      const outsideDiv = document.createElement('div');
      outsideDiv.setAttribute('data-testid', 'outside');
      outsideDiv.textContent = 'Outside';

      document.body.appendChild(insideDiv);
      document.body.appendChild(outsideDiv);

      ref.current = insideDiv;

      renderHook(() => useClickOutside(ref, handleClick));

      act(() => {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        outsideDiv.dispatchEvent(event);
        event.stopPropagation();
      });

      expect(handleClick).toHaveBeenCalledTimes(1);

      // 清理
      document.body.removeChild(insideDiv);
      document.body.removeChild(outsideDiv);
    });
  });

  describe('实际应用场景', () => {
    it('应该关闭下拉菜单', () => {
      const handleClose = jest.fn();
      const dropdownRef = createRef<HTMLDivElement>();

      const dropdownDiv = document.createElement('div');
      dropdownDiv.setAttribute('data-testid', 'dropdown');
      dropdownDiv.textContent = 'Dropdown Menu';

      const outsideDiv = document.createElement('div');
      outsideDiv.setAttribute('data-testid', 'outside');
      outsideDiv.textContent = 'Outside';

      document.body.appendChild(dropdownDiv);
      document.body.appendChild(outsideDiv);

      dropdownRef.current = dropdownDiv;

      renderHook(() => useClickOutside(dropdownRef, handleClose));

      act(() => {
        outsideDiv.click();
      });

      expect(handleClose).toHaveBeenCalledTimes(1);

      // 清理
      document.body.removeChild(dropdownDiv);
      document.body.removeChild(outsideDiv);
    });

    it('应该关闭模态框', () => {
      const handleClose = jest.fn();
      const modalRef = createRef<HTMLDivElement>();

      const modalDiv = document.createElement('div');
      modalDiv.setAttribute('data-testid', 'modal');

      const modalContentDiv = document.createElement('div');
      modalContentDiv.setAttribute('data-testid', 'modal-content');
      modalContentDiv.textContent = 'Modal Content';

      modalDiv.appendChild(modalContentDiv);

      const overlayDiv = document.createElement('div');
      overlayDiv.setAttribute('data-testid', 'overlay');

      document.body.appendChild(modalDiv);
      document.body.appendChild(overlayDiv);

      modalRef.current = modalDiv;

      renderHook(() => useClickOutside(modalRef, handleClose));

      act(() => {
        overlayDiv.click();
      });

      expect(handleClose).toHaveBeenCalledTimes(1);

      // 清理
      document.body.removeChild(modalDiv);
      document.body.removeChild(overlayDiv);
    });
  });
});
