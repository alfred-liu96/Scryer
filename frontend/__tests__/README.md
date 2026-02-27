# 前端测试配置说明

## 概述

本目录包含前端项目的单元测试和契约测试。

## 测试框架

- **Jest**: 测试运行器
- **React Testing Library**: React 组件测试工具
- **@testing-library/jest-dom**: Jest DOM 匹配器

## 配置文件

- `jest.config.js`: Jest 配置文件
- `jest.setup.js`: 测试环境设置
- `__mocks__/fileMock.js`: 静态资源 mock

## 测试命令

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage

# CI 环境运行测试
npm run test:ci
```

## 测试目录结构

```
src/
├── components/
│   └── layout/
│       ├── __tests__/
│       │   ├── Header.test.tsx       # Header 组件单元测试
│       │   ├── Footer.test.tsx       # Footer 组件单元测试
│       │   ├── Navigation.test.tsx   # Navigation 组件契约测试 (TDD)
│       │   ├── MobileMenu.test.tsx   # MobileMenu 组件契约测试 (TDD)
│       │   ├── MainLayout.test.tsx   # MainLayout 组件契约测试 (TDD)
│       │   └── PageSkeleton.test.tsx # PageSkeleton 组件契约测试 (TDD)
│       ├── Header.tsx                # 已实现
│       ├── Footer.tsx                # 已实现
│       ├── Navigation.tsx            # 待实现
│       ├── MobileMenu.tsx            # 待实现
│       ├── MainLayout.tsx            # 待实现
│       └── PageSkeleton.tsx          # 待实现
```

## 测试类型说明

### 1. 单元测试 (Unit Tests)
针对已实现的组件（Header、Footer）的测试。这些测试应该通过。

**运行方式**:
```bash
npm test Header
npm test Footer
```

### 2. 契约测试 (Contract Tests / TDD)
针对尚未实现的组件（Navigation、MobileMenu、MainLayout、PageSkeleton）的契约测试。

这些测试定义了组件的接口和行为规范，用于 TDD 开发流程。

**当前状态**: 🔴 RED (因为组件尚未实现)

**预期开发流程**:
1. ✅ 编写测试（契约先行）
2. 🔴 运行测试（失败 - RED）
3. 🟢 实现组件（测试通过 - GREEN）
4. 🔵 重构优化（保持测试通过）

## 测试编写规范

### 命名规范

- 测试文件: `*.test.tsx`
- 测试描述组: `describe('ComponentName', () => {})`
- 测试用例: `it('should do something', () => {})`

### 测试结构

```typescript
describe('ComponentName', () => {
  describe('Rendering', () => {
    it('should render component', () => {
      // 测试渲染逻辑
    })
  })

  describe('Props', () => {
    it('should handle prop changes', () => {
      // 测试 props 传递
    })
  })

  describe('User Interactions', () => {
    it('should respond to user actions', () => {
      // 测试用户交互
    })
  })

  describe('Edge Cases', () => {
    it('should handle edge cases', () => {
      // 测试边界情况
    })
  })

  describe('Snapshot', () => {
    it('should match snapshot', () => {
      // 快照测试
    })
  })
})
```

### 最佳实践

1. **测试用户行为，而非实现细节**
   ```tsx
   // ✅ Good
   expect(screen.getByText('Submit')).toBeInTheDocument()

   // ❌ Bad
   expect(button.state).toBe('enabled')
   ```

2. **使用 data-testid 选择器作为最后手段**
   ```tsx
   // 优先使用可访问的查询
   screen.getByRole('button')
   screen.getByLabelText('Email')
   screen.getByText('Submit')

   // 最后才用
   screen.getByTestId('submit-button')
   ```

3. **保持测试简单直接**
   ```tsx
   // ✅ Good
   expect(container).toHaveClass('active')

   // ❌ Bad
   const isActive = container.classList.contains('active')
   expect(isActive).toBe(true)
   ```

## 依赖安装

在运行测试前，确保已安装以下依赖：

```bash
# 安装测试相关依赖
npm install --save-dev \
  jest \
  @jest/globals \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @swc/jest \
  jest-environment-jsdom \
  identity-obj-proxy
```

## 故障排除

### 问题: Cannot find module 'xxx'

**解决方案**:
```bash
npm install --save-dev @types/xxx
```

### 问题: Jest 配置错误

**解决方案**:
清除 Jest 缓存：
```bash
npm test -- --clearCache
```

### 问题: 测试运行超时

**解决方案**:
增加测试超时时间：
```bash
npm test -- --testTimeout=10000
```

## 覆盖率目标

- **语句覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 75%
- **函数覆盖率**: ≥ 80%
- **行覆盖率**: ≥ 80%

## 参考资料

- [Jest 官方文档](https://jestjs.io/)
- [React Testing Library 官方文档](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
