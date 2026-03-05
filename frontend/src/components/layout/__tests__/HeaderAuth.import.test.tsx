/**
 * HeaderAuth 组件导入验证测试
 *
 * 此测试仅验证组件可以正确导入，不验证功能
 */

import { HeaderAuth } from '../HeaderAuth';

describe('HeaderAuth - 导入验证', () => {
  it('should import HeaderAuth component', () => {
    expect(HeaderAuth).toBeDefined();
    expect(typeof HeaderAuth).toBe('function');
  });

  it('should have component name', () => {
    expect(HeaderAuth.name).toBe('HeaderAuth');
  });
});
