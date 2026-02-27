# Issue #116 开发蓝图摘要

## 核心目标

为 Auth API 客户端编写集成测试，验证 **Token 刷新失败后正确调用登出逻辑**。

## 关键发现

### 🔴 **配置缺失**（必须修复）

当前 `client.ts` 中的 `onRefreshFailure` 回调**未配置**调用 `authClient.logout()`：

```typescript
// ❌ 当前实现 (client.ts:282-286)
this.onRefreshFailure = (error) => {
  console.error('Token refresh failed:', error);
  this.tokenStorage?.clearTokens();
  // 缺失：authClient.logout() → authStore.clearAuth()
};
```

**修复方案**：在 `client.ts` 文件末尾配置 `apiClient.onRefreshFailure` 回调：

```typescript
// ✅ 修复后 (client.ts)
const setupRefreshFailureCallback = () => {
  const { authClient } = require('./auth-client');  // 动态导入避免循环依赖
  apiClient.onRefreshFailure = (error) => {
    console.error('Token refresh failed:', error);
    authClient.logout({ silent: true, clearLocalState: true });
  };
};
setupRefreshFailureCallback();
```

## 测试设计

### 测试文件结构

```
frontend/src/lib/api/__tests__/auth-client.integration.test.ts  (新增)
```

**推荐方案**：创建独立的集成测试文件（而非扩展现有的 `auth-client.test.ts`）

### 核心测试场景（4 个）

#### 场景 1：刷新失败后调用登出逻辑（核心）
```typescript
it('应在刷新失败后调用 authClient.logout({ silent: true })', async () => {
  // Given: 配置 Mock 环境
  // When: 原始请求 401 → 刷新请求 401
  // Then:
  //   - authClient.logout 被调用
  //   - tokenStorage.clearTokens 被调用
  //   - authStore.clearAuth 被调用
});
```

#### 场景 2：并发请求刷新失败后全部拒绝
```typescript
it('应在刷新失败后拒绝所有排队的请求', async () => {
  // Given: 配置 3 个并发请求
  // When: 所有请求返回 401 → 刷新失败
  // Then: 所有请求被拒绝，logout 只调用一次
});
```

#### 场景 3：刷新失败后清除状态并阻止后续请求
```typescript
it('应在刷新失败后清除 Token 并阻止后续请求', async () => {
  // Given: 刷新失败场景
  // When: 发起第二个请求
  // Then: 第二个请求没有 Authorization header
});
```

#### 场景 4：刷新网络错误后正确登出
```typescript
it('应在刷新网络错误后调用登出逻辑', async () => {
  // Given: 刷新请求抛出 Network Error
  // When: 触发 onRefreshFailure
  // Then: authClient.logout 被调用
});
```

### Mock 策略

| 组件 | Mock 策略 | 验证目标 |
|------|----------|----------|
| `fetch` | `global.fetch` Mock | 模拟 401 响应和刷新失败 |
| `TokenStorage` | Jest Mock | 验证 `clearTokens()` 调用 |
| `AuthStore` | Jest Mock | 验证 `clearAuth()` 调用 |
| `AuthClient` | Jest Mock | 验证 `logout()` 调用 |
| `HttpClient` | 真实实例 | 验证 `onRefreshFailure` 回调 |

## 验收标准

### 功能验收
- [x] 创建集成测试文件 `auth-client.integration.test.ts`
- [ ] 实现 4 个核心测试场景
- [ ] 修复 `client.ts` 配置（添加 onRefreshFailure 回调）
- [ ] 所有测试通过（`npm test`）

### 覆盖率目标
| 组件 | 当前覆盖率 | 目标覆盖率 | 差距 |
|------|-----------|-----------|------|
| `auth-client.ts` | ~85% (单元) | > 90% | +5% |
| `client.ts` | ~88% | > 90% | +2% |

## 实施计划（估时：5h）

```
阶段 1：测试基础设施（1.5h）
  ├─ 创建集成测试文件模板
  ├─ 实现 Mock 工厂函数
  └─ 修复 client.ts 配置

阶段 2：核心测试场景（1h）
  └─ 实现场景 1 测试用例

阶段 3：扩展测试场景（1.5h）
  ├─ 场景 2：并发请求
  ├─ 场景 3：状态清除
  └─ 场景 4：网络错误

阶段 4：验证与优化（1h）
  └─ 验证测试覆盖率
```

## 架构设计

### 调用链路（修复后）

```
API 请求返回 401
  └─> HttpClient.afterResponse()
       └─> tokenRefresher.refreshAccessToken()
            └─> 刷新失败（401/Network Error）
                 └─> onRefreshFailure(error)
                      └─> authClient.logout({ silent: true })
                           ├─> tokenStorage.clearTokens()
                           └─> authStore.clearAuth()
```

### 模块关系

```
┌────────────────────────────────────┐
│         集成测试环境                │
│                                     │
│  Mock Fetch → HttpClient ────────┐ │
│                    │             │ │
│                    ▼             │ │
│             onRefreshFailure ◄────┘ │
│                    │                │
│                    ▼                │
│            AuthClient.logout       │
│                    │                │
│         ┌──────────┴──────────┐     │
│         ▼                     ▼     │
│  TokenStorage.clear    AuthStore.clear
└────────────────────────────────────┘
```

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 循环依赖导致配置失败 | 使用动态导入 `require()` |
| Mock Fetch 行为不一致 | 参考现有 `client.test.ts` |
| 测试隔离问题 | 使用 `beforeEach` 清理状态 |

## 相关文档

- **详细蓝图**: `docs/blueprint-issue-116.md`（完整技术规范）
- **单元测试**: `frontend/src/lib/api/__tests__/auth-client.test.ts`（866 行）
- **HttpClient 测试**: `frontend/src/lib/api/__tests__/client.test.ts`（1369 行）

## 依赖关系

```
#116 (本 Issue)
  └─ #115 Auth API 客户端实现 ✅
       ├─ #111 401 响应拦截器 ✅
       ├─ #110 Token Refresh API ✅
       └─ #97 认证状态管理 ✅
```

---

**下一步行动**：确认蓝图后，移交给 task-developer 实施集成测试和配置修复。
