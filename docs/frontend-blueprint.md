# 前端项目基础设施蓝图 (Issue #69)

> **架构师设计文档** - 定义 Next.js 前端项目的骨架和规范
>
> **创建时间**: 2026-02-27
> **Issue**: #69 - feat: 前端项目基础设施搭建
> **父级 Issue**: #5 - feat: 前端框架搭建 - Next.js + TypeScript

---

## 1. 项目概览

### 1.1 技术栈

| 技术 | 版本要求 | 用途 |
|------|---------|------|
| Next.js | 14+ | React 框架 (App Router) |
| TypeScript | 5.0+ | 类型安全 (strict mode) |
| TailwindCSS | 3.4+ | 原子化 CSS |
| ESLint | Latest | 代码质量检查 |
| Prettier | 3.0+ | 代码格式化 |
| React | 18+ | UI 库 |

### 1.2 后端对接信息

- **API Base URL**: `http://localhost:8000`
- **API Prefix**: `/api`
- **健康检查端点**: `GET /api/health`
- **CORS 配置**: 支持 `http://localhost:3000`

---

## 2. 项目目录结构

```
/workspace/frontend/
├── public/                      # 静态资源
│   ├── images/                 # 图片资源
│   ├── fonts/                  # 字体文件
│   └── favicon.ico             # 网站图标
│
├── src/
│   ├── app/                    # Next.js App Router 目录
│   │   ├── layout.tsx         # 根布局 (必须)
│   │   ├── page.tsx           # 首页 (必须)
│   │   ├── globals.css        # 全局样式 (TailwindCSS 指令)
│   │   ├── loading.tsx        # 全局加载状态
│   │   ├── error.tsx          # 全局错误处理
│   │   │
│   │   ├── (auth)/            # 认证路由组 (共享 layout)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/       # 仪表板路由组
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── tasks/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/               # API 路由 (可选，用于 BFF)
│   │       └── health/
│   │           └── route.ts
│   │
│   ├── components/            # React 组件
│   │   ├── ui/               # 基础 UI 组件 (按钮、输入框等)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/           # 布局组件
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── features/         # 功能组件
│   │       ├── TaskList.tsx
│   │       └── UserCard.tsx
│   │
│   ├── lib/                  # 工具库和配置
│   │   ├── api/             # API 客户端
│   │   │   ├── client.ts    # 基础 HTTP 客户端
│   │   │   ├── types.ts     # API 类型定义
│   │   │   └── endpoints.ts # API 端点定义
│   │   │
│   │   ├── hooks/           # 自定义 React Hooks
│   │   │   ├── useApi.ts
│   │   │   └── useAuth.ts
│   │   │
│   │   ├── utils/           # 通用工具函数
│   │   │   ├── format.ts
│   │   │   ├── validation.ts
│   │   │   └── cn.ts        # className 合并工具
│   │   │
│   │   └── constants.ts     # 常量定义
│   │
│   ├── types/               # TypeScript 类型定义
│   │   ├── api.ts          # API 响应类型
│   │   ├── models.ts       # 业务模型类型
│   │   └── index.ts
│   │
│   └── styles/             # 样式文件 (除 globals.css 外)
│       └── components.css  # 组件特定样式
│
├── .env.local              # 本地环境变量 (不提交)
├── .env.example           # 环境变量模板
├── .eslintrc.json         # ESLint 配置
├── .prettierrc.json       # Prettier 配置
├── .editorconfig          # 编辑器配置
├── .gitignore             # Git 忽略规则
├── next.config.js         # Next.js 配置
├── tsconfig.json          # TypeScript 配置
├── tailwind.config.ts     # TailwindCSS 配置
├── postcss.config.js      # PostCSS 配置
├── package.json           # 项目依赖
├── package-lock.json      # 锁定文件
└── README.md              # 项目说明
```

---

## 3. 配置文件规范

### 3.1 TypeScript 配置 (`tsconfig.json`)

```json
{
  "compilerOptions": {
    // 严格模式配置
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    // 模块解析
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,

    // JSX 配置
    "jsx": "preserve",
    "incremental": true,
    "noEmit": true,

    // 路径别名
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/app/*": ["./src/app/*"]
    },

    // 其他
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "esModuleInterop": true
  },
  "include": [
    "src/**/*",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "out",
    "dist",
    "build"
  ]
}
```

### 3.2 Next.js 配置 (`next.config.js`)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // React 严格模式
  reactStrictMode: true,

  // 实验性功能 (按需启用)
  // experimental: {
  //   typedRoutes: true,
  // },

  // 环境变量 (客户端可访问)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // 重写规则 (API 代理)
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },

  // 图片优化配置
  images: {
    domains: [], // 配置允许的图片域名
  },

  // 输出配置
  output: 'standalone', // Docker 部署推荐

  // 日志配置
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

module.exports = nextConfig;
```

### 3.3 TailwindCSS 配置 (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  // 使用 Tailwind CSS 类名扫描器
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  // 主题定制
  theme: {
    extend: {
      // 颜色扩展 (Scryer 品牌色)
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },

      // 字体配置
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },

      // 断点扩展
      screens: {
        'xs': '475px',
      },

      // 动画扩展
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-in',
      },
    },
  },

  // 插件
  plugins: [
    // 按需添加插件
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],

  // 前缀 (避免类名冲突)
  // prefix: 'sc-',

  // 重要策略
  important: false, // 设为 true 时需谨慎
};

export default config;
```

### 3.4 ESLint 配置 (`.eslintrc.json`)

```json
{
  "extends": [
    "next/core-web-vitals",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "@typescript-eslint",
    "react",
    "react-hooks"
  ],
  "rules": {
    // TypeScript 规则
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        "prefer": "type-imports",
        "disallowTypeAnnotations": false
      }
    ],

    // React 规则
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // 通用规则
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

### 3.5 Prettier 配置 (`.prettierrc.json`)

> **注意**: 与后端项目保持一致的格式化配置

```json
{
  "printWidth": 88,
  "tabWidth": 2,
  "useTabs": false,
  "semi": false,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "trailingComma": "all",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### 3.6 PostCSS 配置 (`postcss.config.js`)

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 3.7 `.editorconfig`

> **注意**: 与后端项目保持一致

```ini
# EditorConfig is awesome: https://EditorConfig.org

# top-most EditorConfig file
root = true

# Unix-style newlines with a newline ending every file
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

# TypeScript / JavaScript / JSX / TSX
[*.{js,jsx,ts,tsx,json}]
indent_style = space
indent_size = 2

# HTML
[*.{html,htm}]
indent_style = space
indent_size = 2

# CSS / SCSS / LESS
[*.{css,scss,less}]
indent_style = space
indent_size = 2

# YAML
[*.{yml,yaml}]
indent_style = space
indent_size = 2

# Markdown
[*.md]
trim_trailing_whitespace = false

# Makefile
[Makefile]
indent_style = tab
```

---

## 4. 核心类型定义 (Type Definitions)

### 4.1 API 类型 (`src/types/api.ts`)

```typescript
/**
 * API 通用类型定义
 */

// HTTP 方法
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// 通用 API 响应结构
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

// 分页参数
export interface PaginationParams {
  page: number;
  page_size: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// API 错误响应
export interface ApiError {
  detail: string;
  status: number;
  error_code?: string;
}

// 健康检查响应 (对应后端 HealthCheckResponse)
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  database: {
    status: 'healthy' | 'unhealthy';
    message?: string;
  };
  redis: {
    status: 'healthy' | 'unhealthy';
    message?: string;
  };
}
```

### 4.2 业务模型类型 (`src/types/models.ts`)

```typescript
/**
 * 业务实体类型定义
 */

// 用户模型 (对应后端 User)
export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 任务模型 (对应后端 Task)
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
  user_id: number;
}

// 内容模型 (对应后端 Content)
export interface Content {
  id: number;
  title: string;
  body: string;
  summary?: string;
  source_url?: string;
  author?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}
```

### 4.3 类型导出 (`src/types/index.ts`)

```typescript
/**
 * 类型定义统一导出
 */

// API 类型
export * from './api';

// 业务模型
export * from './models';

// 常用联合类型
export type Status = 'pending' | 'in_progress' | 'completed';
export type Priority = 'low' | 'medium' | 'high';
```

---

## 5. 环境变量管理

### 5.1 环境变量规范

**命名约定**:
- 客户端可访问: `NEXT_PUBLIC_*`
- 服务端专用: `SECRET_*` (Next.js 中不直接使用，通过 API 路由)
- 布尔值: 使用 `"true"` / `"false"` 字符串
- 数值: 使用字符串，使用时转换

### 5.2 环境变量模板 (`.env.example`)

```bash
# =============================================================================
# Scryer 前端环境变量配置模板
# =============================================================================
# 使用说明：
# 1. 复制本文件为 .env.local: cp .env.example .env.local
# 2. 根据实际环境修改配置值
# 3. .env.local 文件已加入 .gitignore，不会被提交到版本控制
# =============================================================================

# -----------------------------------------------------------------------------
# 应用基础配置
# -----------------------------------------------------------------------------
# 应用名称
NEXT_PUBLIC_APP_NAME=Scryer

# 应用版本
NEXT_PUBLIC_APP_VERSION=0.1.0

# 运行环境: development, production, testing
NEXT_PUBLIC_ENVIRONMENT=development

# -----------------------------------------------------------------------------
# API 配置
# -----------------------------------------------------------------------------
# 后端 API 基础 URL (客户端可访问)
NEXT_PUBLIC_API_URL=http://localhost:8000

# API 超时时间 (毫秒)
NEXT_PUBLIC_API_TIMEOUT=30000

# 是否启用 API 重试
NEXT_PUBLIC_API_RETRY_ENABLED=true

# API 重试次数
NEXT_PUBLIC_API_RETRY_COUNT=3

# -----------------------------------------------------------------------------
# 功能开关
# -----------------------------------------------------------------------------
# 是否启用调试模式
NEXT_PUBLIC_DEBUG_ENABLED=true

# 是否启用 Sentry 错误追踪 (production 启用)
NEXT_PUBLIC_SENTRY_ENABLED=false

# Sentry DSN (production 配置)
# NEXT_PUBLIC_SENTRY_DSN=

# -----------------------------------------------------------------------------
# UI 配置
# -----------------------------------------------------------------------------
# 默认主题: light, dark, system
NEXT_PUBLIC_DEFAULT_THEME=system

# 是否启用动画
NEXT_PUBLIC_ANIMATIONS_ENABLED=true

# =============================================================================
# 配置说明
# =============================================================================
#
# 环境变量加载优先级 (高到低):
# 1. .env.local (本地开发，不提交)
# 2. .env.production / .env.development (构建时特定环境)
# 3. .env (默认配置)
#
# 安全注意事项:
# - 不要在 NEXT_PUBLIC_* 变量中存储敏感信息 (密钥、Token)
# - 敏感配置应通过 Next.js API 路由代理访问
# - .env.local 永远不要提交到版本控制
#
# =============================================================================
```

### 5.3 环境变量验证 (`src/lib/config.ts`)

```typescript
/**
 * 环境变量验证和类型安全访问
 */

// 环境变量验证函数
function validateEnv(requiredVars: Record<string, string>) {
  const missing: string[] = [];

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// 公共配置 (客户端可访问)
export const publicConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Scryer',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
  environment: (process.env.NEXT_PUBLIC_ENVIRONMENT as 'development' | 'production' | 'testing') || 'development',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  apiTimeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,
  debugEnabled: process.env.NEXT_PUBLIC_DEBUG_ENABLED === 'true',
  defaultTheme: (process.env.NEXT_PUBLIC_DEFAULT_THEME as 'light' | 'dark' | 'system') || 'system',
};

// 验证配置
if (typeof window === 'undefined') {
  // 服务端验证 (仅在构建时)
  validateEnv({
    NEXT_PUBLIC_API_URL: publicConfig.apiUrl,
  });
}

// 配置类型导出
export type PublicConfig = typeof publicConfig;
```

---

## 6. 代码契约与编码规范

### 6.1 命名约定

| 类别 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase, `.tsx` | `UserCard.tsx`, `Header.tsx` |
| 工具文件 | camelCase, `.ts` | `formatDate.ts`, `apiClient.ts` |
| 类型文件 | camelCase, `.ts` | `api.ts`, `models.ts` |
| React 组件 | PascalCase | `function UserProfile() {}` |
| 自定义 Hook | camelCase, `use` 前缀 | `function useUserData() {}` |
| 常量 | UPPER_SNAKE_CASE | `const API_BASE_URL = '...'` |
| 接口/类型 | PascalCase | `interface UserData {}`, `type Status = ...` |
| 枚举 | PascalCase, 成员 UPPER_SNAKE_CASE | `enum Role { ADMIN = 'admin' }` |

### 6.2 文件组织规范

```typescript
/**
 * 文件内导入顺序规范
 *
 * 1. React/Next.js 核心
 * 2. 第三方库
 * 3. 项目内部模块 (使用 @/ 别名)
 * 4. 类型导入 (type 关键字)
 * 5. 相对路径导入
 */

// 1. React/Next.js
import { useState, useEffect } from 'react';
import Image from 'next/image';

// 2. 第三方库
import axios from 'axios';
import { clsx } from 'clsx';

// 3. 项目内部模块
import { Button } from '@/components/ui';
import { useApi } from '@/lib/hooks';

// 4. 类型导入
import type { User, ApiResponse } from '@/types';

// 5. 相对路径 (同级目录)
import { formatLocalDate } from './utils';
```

### 6.3 组件设计契约

```typescript
/**
 * 组件设计规范
 *
 * 1. 使用函数式组件 + Hooks
 * 2. Props 使用 interface 定义
 * 3. 使用 TypeScript 类型注解
 * 4. 导入时使用 type 关键字
 * 5. 组件文件包含相关类型定义
 */

// ✅ 正确示例
import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
  variant?: 'default' | 'outlined';
}

export function Card({ title, children, variant = 'default' }: CardProps) {
  return (
    <div className={`card card-${variant}`}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

// ❌ 错误示例
// - 缺少类型注解
// - 使用 any 类型
// - 缺少 Props 接口定义
```

### 6.4 API 客户端契约

```typescript
/**
 * API 客户端设计规范
 *
 * 1. 使用类型化的 fetch wrapper 或 axios
 * 2. 统一错误处理
 * 3. 支持请求/响应拦截
 * 4. 类型安全的端点定义
 */

// 基础客户端定义
interface ApiClient {
  get<T>(url: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(url: string, data: unknown): Promise<T>;
  put<T>(url: string, data: unknown): Promise<T>;
  patch<T>(url: string, data: unknown): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

// API 端点定义
interface ApiEndpoints {
  health: {
    get: () => Promise<HealthCheckResponse>;
  };
  users: {
    list: (params: PaginationParams) => Promise<PaginatedResponse<User>>;
    get: (id: number) => Promise<User>;
  };
}
```

### 6.5 Git 提交规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type)**:
- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式 (不影响代码运行)
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链更新

**示例**:
```
feat(frontend): initialize Next.js project with TypeScript

- Set up Next.js 14 with App Router
- Configure TypeScript strict mode
- Integrate TailwindCSS
- Configure ESLint and Prettier

Closes #69
```

---

## 7. 初始化清单

### 7.1 项目创建命令

```bash
# 在 /workspace 目录下执行
cd /workspace

# 创建 Next.js 项目 (使用 --yes 跳过交互)
npx create-next-app@14 frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git

# 进入项目目录
cd /workspace/frontend

# 安装额外依赖
npm install --save-dev @types/node

# 安装 UI 相关依赖 (按需)
# npm install clsx tailwind-merge
# npm install @radix-ui/react-icons
```

### 7.2 配置文件部署

按本文档第 3 节的配置规范，创建以下文件:

- [ ] `tsconfig.json`
- [ ] `next.config.js`
- [ ] `tailwind.config.ts`
- [ ] `postcss.config.js`
- [ ] `.eslintrc.json`
- [ ] `.prettierrc.json`
- [ ] `.editorconfig`
- [ ] `.env.example`
- [ ] `.gitignore`

### 7.3 目录结构创建

```bash
# 创建核心目录
mkdir -p /workspace/frontend/src/{components/{ui,layout,features},lib/{api,hooks,utils},types,styles}

# 创建 public 子目录
mkdir -p /workspace/frontend/public/{images,fonts}
```

### 7.4 基础文件创建

创建以下骨架文件 (内容按第 4、5 节定义):

- [ ] `src/types/api.ts`
- [ ] `src/types/models.ts`
- [ ] `src/types/index.ts`
- [ ] `src/lib/config.ts`
- [ ] `src/lib/utils/cn.ts` (className 合并工具)
- [ ] `src/app/globals.css`
- [ ] `.env.local` (从 .env.example 复制)

---

## 8. 开发工作流

### 8.1 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 8.2 代码质量检查

```bash
# TypeScript 类型检查
npx tsc --noEmit

# ESLint 检查
npm run lint

# Prettier 格式化
npm run format

# 修复所有可自动修复的问题
npm run lint -- --fix
```

### 8.3 生产构建

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 或使用 standalone 模式 (Docker 推荐)
# next start
```

---

## 9. 后续扩展建议

### 9.1 状态管理 (Issue #5 后续任务)

推荐方案:
- **Zustand**: 轻量级、类型安全
- **React Context + useReducer**: 简单场景
- **TanStack Query (React Query)**: 服务器状态管理

### 9.2 UI 组件库 (按需集成)

推荐方案:
- **Radix UI**: 无样式可访问组件
- **Headless UI**: Tailwind 官方组件
- **shadcn/ui**: 基于 Radix UI 的精美组件

### 9.3 表单处理

推荐方案:
- **React Hook Form**: 性能优化、类型安全
- **Zod**: Schema 验证

### 9.4 数据获取

推荐方案:
- **TanStack Query (React Query)**: 缓存、重试、实时更新
- **SWR**: 轻量级替代方案

### 9.5 测试 (后续 Issue)

- **Vitest**: 单元测试
- **Testing Library**: 组件测试
- **Playwright**: E2E 测试

---

## 10. 依赖版本锁定

### 10.1 核心依赖 (推荐版本)

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "prettier": "^3.2.0"
  }
}
```

### 10.2 可选依赖 (按需安装)

```json
{
  "dependencies": {
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "axios": "^1.6.0"
  }
}
```

---

## 11. Docker 集成 (参考后端配置)

### 11.1 Dockerfile 示例

```dockerfile
# /workspace/frontend/Dockerfile
FROM node:20-alpine AS base

# 依赖安装阶段
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 运行阶段
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

## 12. 附录

### 12.1 VSCode 推荐配置

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### 12.2 常见问题

**Q: TypeScript 报错 "Cannot find module"**
A: 确保 `tsconfig.json` 中的 `baseUrl` 和 `paths` 配置正确，重启 TypeScript 服务器 (Cmd+Shift+P -> "Restart TypeScript Server")

**Q: TailwindCSS 样式不生效**
A: 检查 `src/app/globals.css` 中是否包含 Tailwind 指令 (`@tailwind base;` 等)

**Q: ESLint 与 Prettier 冲突**
A: 确保 `.eslintrc.json` 中禁用了与 Prettier 冲突的规则，或安装 `eslint-config-prettier`

---

## 13. 参考资料

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)

---

**文档状态**: ✅ 已完成
**维护者**: Claude (架构师)
**审核状态**: 待实施
