# UI 组件库测试总结 (Issue #72)

## 概述
本文档记录了为 Issue #72 (基础组件库与类型定义) 编写的单元测试。所有测试遵循 TDD 原则，在组件实现前定义了清晰的契约和行为规范。

## 测试状态: 🔴 RED

所有测试当前为 **FAILING** 状态，因为组件尚未实现。这是 TDD 的正确起点。

## 已创建的测试文件

### UI 组件测试

#### 1. Badge 组件测试
**文件**: `/workspace/frontend/src/components/ui/__tests__/Badge.test.tsx`

**测试覆盖**:
- ✅ 基础渲染 (默认徽章、圆点样式)
- ✅ 变体样式 (default, primary, success, warning, error)
- ✅ 尺寸配置 (sm, md, lg)
- ✅ 数值徽章 (count, max count, zero value)
- ✅ 自定义属性 (className, data-testid)
- ✅ 边界情况 (空内容、负数、非数字 children)

**组件契约**:
```typescript
interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  count?: number;
  max?: number;
  dot?: boolean;
  className?: string;
  children?: ReactNode;
}
```

---

#### 2. Spinner 组件测试
**文件**: `/workspace/frontend/src/components/ui/__tests__/Spinner.test.tsx`

**测试覆盖**:
- ✅ 基础渲染 (默认加载器、带文本)
- ✅ 尺寸配置 (xs, sm, md, lg, xl)
- ✅ 颜色变体 (primary, secondary, success, warning, error)
- ✅ 全屏模式
- ✅ 可访问性 (aria-live, aria-busy, role)
- ✅ 边界情况 (空文本、长文本)

**组件契约**:
```typescript
interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  text?: string;
  fullscreen?: boolean;
  className?: string;
}
```

---

#### 3. Alert 组件测试
**文件**: `/workspace/frontend/src/components/ui/__tests__/Alert.test.tsx`

**测试覆盖**:
- ✅ 基础渲染 (默认提示、带标题)
- ✅ 类型变体 (info, success, warning, error)
- ✅ 关闭功能 (closable, onClose)
- ✅ 图标显示 (showIcon)
- ✅ 自动关闭 (duration, 悬停暂停)
- ✅ 可访问性 (role, aria-live)
- ✅ 边界情况

**组件契约**:
```typescript
interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  closable?: boolean;
  showIcon?: boolean;
  autoClose?: number;
  onClose?: () => void;
  className?: string;
  children: ReactNode;
}
```

---

#### 4. Select 组件测试
**文件**: `/workspace/frontend/src/components/ui/__tests__/Select.test.tsx`

**测试覆盖**:
- ✅ 基础渲染 (默认选择器、占位符、默认值)
- ✅ 下拉菜单 (打开/关闭)
- ✅ 选项选择 (点击更新、onChange)
- ✅ 受控模式 (value 控制)
- ✅ 禁用状态 (disabled, disabled 选项)
- ✅ 多选模式 (multiple, 已选标签, 移除)
- ✅ 搜索功能 (searchable, 过滤, 无结果)
- ✅ 分组选项
- ✅ 自定义渲染
- ✅ 可访问性 (键盘导航, aria 属性)

**组件契约**:
```typescript
interface SelectProps<T = string> {
  options: Option[] | GroupedOption[];
  value?: T | T[];
  defaultValue?: T | T[];
  onChange?: (value: T | T[], option: Option) => void;
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  renderOption?: (option: Option) => ReactNode;
}

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
  [key: string]: any;
}
```

---

#### 5. Toast 组件测试
**文件**: `/workspace/frontend/src/components/ui/__tests__/Toast.test.tsx`

**测试覆盖**:
- ✅ 基础渲染 (默认提示、带标题)
- ✅ 类型变体 (info, success, warning, error)
- ✅ 自动关闭 (duration, 悬停暂停)
- ✅ 手动关闭 (closable, onClose)
- ✅ 位置配置 (top, bottom, left, right 组合)
- ✅ 进入/退出动画
- ✅ 可访问性
- ✅ 边界情况

**组件契约**:
```typescript
interface ToastProps {
  id: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
  position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  closable?: boolean;
  isClosing?: boolean;
  onClose?: (id: string) => void;
}
```

---

#### 6. Modal 组件测试
**文件**: `/workspace/frontend/src/components/ui/__tests__/Modal.test.tsx`

**测试覆盖**:
- ✅ 基础渲染 (open 控制, 遮罩层, 容器)
- ✅ 标题和内容 (title, header, footer)
- ✅ 关闭功能 (closable, 遮罩点击, ESC 键)
- ✅ 尺寸配置 (sm, md, lg, xl, full)
- ✅ 滚动行为 (禁用背景滚动)
- ✅ 嵌套模态框 (z-index 管理)
- ✅ 进入/退出动画
- ✅ 可访问性 (role, aria-modal, focus trap)
- ✅ 回调函数 (afterOpen, beforeClose)
- ✅ 边界情况

**组件契约**:
```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  header?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  maskClosable?: boolean;
  keyboard?: boolean;
  autoFocus?: boolean;
  afterOpen?: () => void;
  beforeClose?: () => boolean | void;
  isClosing?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}
```

---

#### 7. Tabs 组件测试
**文件**: `/workspace/frontend/src/components/ui/__tests__/Tabs.test.tsx`

**测试覆盖**:
- ✅ 基础渲染 (默认标签页, 默认激活)
- ✅ 标签切换 (点击切换, onChange)
- ✅ 受控模式 (activeKey 控制)
- ✅ 位置配置 (top, bottom, left, right)
- ✅ 标签样式 (图标, 徽章)
- ✅ 可关闭标签 (closeable, onTabClose)
- ✅ 可访问性 (role, 键盘导航, aria 属性)
- ✅ 自定义渲染 (renderLabel, renderContent)
- ✅ 边界情况
- ✅ 动画效果
- ✅ 附加功能 (tabBarExtraContent)
- ✅ 尺寸配置 (sm, md, lg)
- ✅ 类型变体 (line, card, segmented)

**组件契约**:
```typescript
interface TabsProps {
  items: TabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  tabPosition?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  type?: 'line' | 'card' | 'segmented';
  onTabClose?: (key: string) => void;
  tabBarExtraContent?: ReactNode | { left?: ReactNode; right?: ReactNode };
}

interface TabItem {
  key: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  badge?: number | ReactNode;
  closeable?: boolean;
  renderLabel?: (item: TabItem) => ReactNode;
  renderContent?: (item: TabItem) => ReactNode;
}
```

---

#### 8. Dropdown 组件测试
**文件**: `/workspace/frontend/src/components/ui/__tests__/Dropdown.test.tsx`

**测试覆盖**:
- ✅ 基础渲染 (默认下拉菜单, 打开/关闭)
- ✅ 触发方式 (click, hover, contextMenu)
- ✅ 菜单项交互 (onSelect, 禁用项)
- ✅ 菜单项分组
- ✅ 菜单项样式 (图标, 快捷键, danger)
- ✅ 分隔线
- ✅ 多级菜单 (子菜单, 悬停展开)
- ✅ 位置配置 (bottomLeft, topRight 等)
- ✅ 受控模式 (open 控制)
- ✅ 可访问性 (键盘导航, role, aria)
- ✅ 自定义渲染 (renderItem, Trigger)
- ✅ 边界情况
- ✅ 动画效果
- ✅ 附加属性 (className, style)

**组件契约**:
```typescript
interface DropdownProps {
  menu: MenuItem[];
  trigger?: 'click' | 'hover' | 'contextMenu';
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (key: string, item: MenuItem) => void;
  dropdownClassName?: string;
  dropdownStyle?: React.CSSProperties;
  children: ReactNode;
}

interface MenuItem {
  key: string;
  label: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  icon?: ReactNode;
  shortcut?: string;
  divider?: boolean;
  children?: MenuItem[];
  renderItem?: (item: MenuItem) => ReactNode;
}
```

---

### Hooks 测试

#### 1. useDebounce Hook 测试
**文件**: `/workspace/frontend/src/hooks/__tests__/useDebounce.test.ts`

**测试覆盖**:
- ✅ 基础功能 (初始值, 延迟更新, 默认延迟)
- ✅ 快速连续更新 (重置计时器, 最后更新触发)
- ✅ 不同类型的值 (字符串, 数字, 对象, 数组, null, undefined)
- ✅ 组件卸载 (清除定时器)
- ✅ 边界情况 (零延迟, 长延迟, 相同值)
- ✅ 实际应用场景 (搜索输入)

**Hook 契约**:
```typescript
function useDebounce<T>(value: T, delay?: number): T;
```

---

#### 2. useLocalStorage Hook 测试
**文件**: `/workspace/frontend/src/hooks/__tests__/useLocalStorage.test.ts`

**测试覆盖**:
- ✅ 基础功能 (初始值, 读取已有值, 更新, 函数式更新)
- ✅ 不同类型的值 (字符串, 数字, 布尔, 对象, 数组, null, undefined)
- ✅ 删除功能 (removeValue)
- ✅ 自定义序列化 (serializer, deserializer)
- ✅ 跨标签页同步 (storage 事件)
- ✅ 边界情况 (无效数据, localStorage 不可用, sessionStorage)
- ✅ 组件卸载 (移除事件监听)
- ✅ 实际应用场景 (主题切换, 用户偏好, 待办事项)

**Hook 契约**:
```typescript
function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    serializer?: (value: T) => string;
    deserializer?: (value: string) => T;
    storage?: Storage;
  }
): [T, (value: T | ((prev: T) => T)) => void, () => void];
```

---

#### 3. useMediaQuery Hook 测试
**文件**: `/workspace/frontend/src/hooks/__tests__/useMediaQuery.test.ts`

**测试覆盖**:
- ✅ 基础功能 (初始匹配状态, 不匹配)
- ✅ 媒体查询变化 (响应变化, 多次变化)
- ✅ 常见媒体查询 (暗色模式, 减少动画, 最小/最大宽度, 方向)
- ✅ 组件卸载 (移除事件监听)
- ✅ 边界情况 (无效查询, 空字符串, 复杂查询)
- ✅ SSR 兼容性
- ✅ 实际应用场景 (响应式布局, 主题切换, 打印样式)

**Hook 契约**:
```typescript
function useMediaQuery(query: string): boolean;
```

---

#### 4. useClickOutside Hook 测试
**文件**: `/workspace/frontend/src/hooks/__tests__/useClickOutside.test.ts`

**测试覆盖**:
- ✅ 基础功能 (点击外部触发, 点击内部不触发)
- ✅ 多个 Ref (多个 ref, 任何 ref 外部触发)
- ✅ 嵌套元素 (子元素不触发, 父元素外部触发)
- ✅ 自定义事件类型 (mousedown, touchstart)
- ✅ 组件卸载 (移除事件监听)
- ✅ 边界情况 (null ref, ref 变化, 空数组 ref)
- ✅ 事件传播 (捕获阶段, 停止传播)
- ✅ 实际应用场景 (下拉菜单, 模态框, 排除特定元素)

**Hook 契约**:
```typescript
function useClickOutside(
  ref: RefObject<HTMLElement> | RefObject<HTMLElement>[],
  handler: (event: Event) => void,
  eventType?: string,
  excludeRefs?: RefObject<HTMLElement>[]
): void;
```

---

#### 5. useToast Hook 测试
**文件**: `/workspace/frontend/src/hooks/__tests__/useToast.test.ts`

**测试覆盖**:
- ✅ 基础功能 (toast 方法, success/error/warning/info 快捷方法)
- ✅ 通用 toast 方法 (自定义配置, 带标题)
- ✅ 多个 Toast (同时显示, 按顺序)
- ✅ 自动关闭 (默认时间, 自定义时间, duration=0)
- ✅ 手动关闭 (dismiss, dismissAll)
- ✅ Promise 处理 (loading 状态, 成功/失败)
- ✅ 位置配置 (不同位置)
- ✅ 更新 Toast
- ✅ 边界情况
- ✅ 可访问性 (唯一 ID, aria 属性)
- ✅ 实际应用场景 (表单提交, 错误提示, 操作确认)

**Hook 契约**:
```typescript
function useToast() {
  return {
    toasts: ToastItem[];
    toast: (config: ToastConfig) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
    dismiss: (id: string) => void;
    dismissAll: () => void;
    promise: <T>(promise: Promise<T>, messages: PromiseMessages) => void;
  };
}
```

---

## 测试框架配置

**使用工具**:
- Jest - 测试运行器
- React Testing Library - React 组件测试
- @testing-library/react-hooks - Hooks 测试
- @testing-library/jest-dom - DOM 匹配器
- @testing-library/user-event - 用户交互模拟

**测试命令**:
```bash
# 运行所有 UI 组件测试
npm test Badge
npm test Spinner
npm test Alert
npm test Select
npm test Toast
npm test Modal
npm test Tabs
npm test Dropdown

# 运行所有 Hooks 测试
npm test useDebounce
npm test useLocalStorage
npm test useMediaQuery
npm test useClickOutside
npm test useToast

# 运行所有测试
npm test

# 生成覆盖率报告
npm run test:coverage
```

---

## TDD 开发流程

1. ✅ **Red**: 编写测试（已完成）
   - 当前状态: 🔴 所有测试失败（组件未实现）

2. 🔴 **Green**: 实现组件（待开发）
   - 按照测试契约实现组件
   - 确保所有测试通过

3. 🔵 **Refactor**: 重构优化（待完成）
   - 优化代码结构
   - 保持测试通过

---

## 测试覆盖目标

- **语句覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 75%
- **函数覆盖率**: ≥ 80%
- **行覆盖率**: ≥ 80%

---

## 下一步行动

### 实现组件（按优先级）

**简单组件** (快速实现):
1. Badge - 数值徽章、圆点样式
2. Spinner - 加载指示器
3. Alert - 提示消息

**中等复杂度**:
4. Select - 下拉选择器
5. Toast - 通知提示

**复杂组件**:
6. Modal - 模态对话框
7. Tabs - 标签页
8. Dropdown - 下拉菜单

### 实现 Hooks

1. useDebounce - 防抖
2. useLocalStorage - 本地存储
3. useMediaQuery - 媒体查询
4. useClickOutside - 外部点击检测
5. useToast - Toast 管理

---

## 测试编写原则

1. **测试用户行为，而非实现细节**
2. **使用可访问的查询方法**
3. **保持测试简单直接**
4. **遵循 Arrange-Act-Assert 模式**
5. **覆盖正常流程和边界情况**
6. **确保测试独立性和可重复性**

---

## 参考资料

- [Jest 官方文档](https://jestjs.io/)
- [React Testing Library 官方文档](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [前端测试配置说明](/workspace/frontend/__tests__/README.md)
