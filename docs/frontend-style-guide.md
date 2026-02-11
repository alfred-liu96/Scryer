# 前端代码规范指南

> **版本**: v1.0.0
> **最后更新**: 2026-02-11
> **适用范围**: Next.js 14+ TypeScript 项目

## 概述

本指南定义了 Scryer 项目的前端代码规范，确保团队代码风格一致性和可维护性。我们使用 ESLint、Prettier 和 EditorConfig 三大工具来实现自动化代码质量保障。

## 工具链

### 1. ESLint - 代码质量检查

ESLint 负责检查代码质量和潜在错误，配置文件位于 `.eslintrc.json`。

#### 核心规则

- **Next.js 最佳实践**: 继承 `next/core-web-vitals`
- **TypeScript 严格模式**: 使用 `@typescript-eslint/recommended`
- **现代 JavaScript**: 支持 ES2020+ 语法
- **关键规则**:
  - 禁止使用 `var`（使用 `const`/`let`）
  - 未使用变量报错（可通过 `_` 前缀忽略）
  - `any` 类型警告（鼓励明确类型）
  - 限制 `console` 使用（仅允许 `warn` 和 `error`）

#### 使用方式

```bash
# 检查所有文件
npx eslint .

# 检查特定文件
npx eslint src/app/page.tsx

# 自动修复可修复的问题
npx eslint . --fix
```

### 2. Prettier - 代码格式化

Prettier 负责统一的代码格式化，配置文件位于 `.prettierrc.json`。

#### 核心配置

- **行宽**: 88 字符（与 Python black 保持一致）
- **缩进**: 2 空格
- **引号**: 单引号（`'`）
- **分号**: 无分号（`semi: false`）
- **尾随逗号**: 所有地方都添加（`trailingComma: "all"`）
- **箭头函数参数**: 单参数时省略括号（`arrowParens: "avoid"`）
- **换行符**: LF（Unix 风格）

#### 使用方式

```bash
# 格式化所有文件
npx prettier --write .

# 格式化特定文件
npx prettier --write src/app/page.tsx

# 检查格式（不修改文件）
npx prettier --check .
```

#### 与 ESLint 集成

推荐安装 `eslint-config-prettier` 禁用 ESLint 中与 Prettier 冲突的格式规则：

```json
{
  "extends": ["next/core-web-vitals", "prettier"]
}
```

### 3. EditorConfig - 编辑器统一配置

EditorConfig 确保不同编辑器和 IDE 的一致性，配置文件位于 `.editorconfig`。

#### 核心配置

- **字符编码**: UTF-8
- **换行符**: LF（所有文件）
- **末尾换行**: 所有文件强制添加
- **去除尾随空格**: 自动去除
- **缩进风格**: 空格（Python 为 4 空格，前端文件为 2 空格）

#### 支持的编辑器

- VS Code（推荐安装 [EditorConfig 插件](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)）
- WebStorm（内置支持）
- Sublime Text（需安装插件）
- Vim/Neovim（需安装插件）

## 代码风格规范

### TypeScript / JavaScript

#### 命名规范

```typescript
// 组件: PascalCase
function UserProfile() {}

// 常量: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// 变量和函数: camelCase
const userName = 'Alice'
function getUserData() {}

// 接口/类型: PascalCase
interface UserData {}
type AsyncReturnType = Promise<string>

// 私有成员: _camelCase
class UserService {
  private _cache: Map<string, any>
}
```

#### 组件定义

```typescript
// ✅ 推荐: 函数组件 + Hooks
export default function Component({ prop1, prop2 }: Props) {
  // Hooks 在顶部
  const [state, setState] = useState()
  useEffect(() => {}, [])

  // 渲染逻辑
  return <div>...</div>
}

// ❌ 避免: 类组件（除非有特殊需求）
class LegacyComponent extends React.Component {
  // ...
}
```

#### 导入顺序

```typescript
// 1. React/Next.js 核心
import { useState, useEffect } from 'react'
import Link from 'next/link'

// 2. 第三方库
import { Button } from '@mui/material'

// 3. 组件相对导入
import { UserData } from '@/types/user'
import { Button } from '@/components/ui/button'
```

### JSX / TSX

```tsx
// ✅ 单行: 无括号
<div>Hello</div>

// ✅ 多行: 使用括号
<div>
  <h1>Title</h1>
  <p>Content</p>
</div>

// ✅ 属性对齐（Prettier 自动处理）
<Component
  prop1="value1"
  prop2="value2"
  prop3="value3"
/>

// ❌ 避免内联样式（除非必要）
<div style={{ color: 'red' }} />

// ✅ 推荐: 使用 className 和 Tailwind
<div className="text-red-500" />
```

## Git Hooks 集成

推荐使用 lint-staged 在提交前自动检查和格式化：

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

## 常见问题

### Q: 为什么行宽是 88 而不是 80 或 100？

A: 88 是 Python black 工具的默认值。为保持前后端风格一致性，我们采用了相同的配置。

### Q: 为什么不使用分号？

A: JavaScript ASI（自动分号插入）机制已经很成熟，现代前端社区趋向于无分号风格，减少视觉噪音。

### Q: 如何处理 Prettier 和 ESLint 冲突？

A: 确保 `.eslintrc.json` 的 `extends` 数组最后一个是 `"prettier"`，它会禁用所有冲突的 ESLint 格式规则。

### Q: 必须使用 EditorConfig 吗？

A: 强烈推荐。它能确保团队成员使用不同编辑器时的缩进、换行等基础配置一致。

## 参考资源

- [ESLint 官方文档](https://eslint.org/)
- [Prettier 官方文档](https://prettier.io/)
- [EditorConfig 官方文档](https://editorconfig.org/)
- [Next.js 文档](https://nextjs.org/docs)
- [TypeScript 风格指南](https://typescript-eslint.io/rules/)

## 更新日志

- **v1.0.0** (2026-02-11): 初始版本，定义基础前端代码规范
