# Store 状态管理文档

## 概述

本目录包含应用的状态管理实现，基于 Zustand 构建。

## 文件结构

```
store/
├── index.ts                 # Store 统一导出入口
├── types.ts                 # Store 类型定义
├── ui-store.ts             # UI Store 实现
├── __tests__/              # Store 测试目录
│   ├── fixtures.ts        # 测试数据 fixtures
│   ├── ui-store.test.ts   # UI Store 单元测试
│   └── integration.test.ts # Store 集成测试
└── README.md              # 本文档
```

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- ui-store.test.ts

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式（开发时使用）
npm run test:watch
```

## 测试覆盖率目标

- **单元测试覆盖率**: >= 90%
- **集成测试覆盖率**: >= 80%

## 核心概念

### UI State

UI State 管理应用的界面状态，包括：

- **theme**: 主题设置（'light' | 'dark' | 'system'）
- **sidebarOpen**: 侧边栏开关状态
- **mobileMenuOpen**: 移动端菜单开关状态
- **activeModals**: 当前激活的模态框列表
- **isLoading**: 全局加载状态
- **globalError**: 全局错误信息
- **toasts**: Toast 消息队列

### Toast 消息系统

Toast 消息用于显示临时通知：

```typescript
// 添加 Toast
const toastId = addToast({
  message: '操作成功',
  type: 'success',
  duration: 3000,
});

// 移除 Toast
removeToast(toastId);

// 清除所有 Toast
clearToasts();
```

### 状态持久化

Store 支持序列化和反序列化：

```typescript
// 序列化状态
const json = store.getState().toJSON();

// 恢复状态
store.getState().fromJSON(json);

// 重置为初始状态
store.getState().reset();
```

## 开发指南

### 添加新的 State

1. 在 `types.ts` 中定义类型
2. 在 `ui-store.ts` 中添加初始状态
3. 实现对应的 Actions
4. 在 `__tests__/fixtures.ts` 中添加测试数据
5. 在 `__tests__/ui-store.test.ts` 中添加测试用例

### 测试最佳实践

1. **保持简单**: 测试代码应该比业务代码更简单
2. **独立性**: 每个测试应该独立运行，不依赖其他测试
3. **清晰命名**: 测试名称应该清楚描述测试意图
4. **覆盖边界**: 测试正常流程和边界情况

## 参考文档

- [Zustand 官方文档](https://zustand-demo.pmnd.rs/)
- [Testing Library 文档](https://testing-library.com/)
- [Jest 文档](https://jestjs.io/)
