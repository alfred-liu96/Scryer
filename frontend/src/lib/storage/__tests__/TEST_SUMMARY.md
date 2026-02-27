# Token Storage 单元测试摘要

## 测试文件

**文件**: `/workspace/frontend/src/lib/storage/__tests__/token-storage.test.ts`

**测试数量**: 41 个测试用例

---

## 测试覆盖范围

### 1. Token 基本操作

#### setTokens (5 个测试)
- ✅ 保存 tokens 到 localStorage
- ✅ 正确计算过期时间戳
- ✅ 返回 true 表示成功
- ✅ 处理零过期时间
- ✅ 处理超长过期时间（1年）

#### getTokens (6 个测试)
- ✅ 无 tokens 时返回 null
- ✅ 返回已保存的 tokens
- ✅ 过期 tokens 返回 null
- ✅ 优雅处理格式错误的 JSON
- ✅ 处理空字符串
- ✅ 边界情况：精确过期时刻

#### getAccessToken (3 个测试)
- ✅ 返回访问令牌
- ✅ 无 tokens 时返回 null
- ✅ 过期 tokens 返回 null

#### getRefreshToken (3 个测试)
- ✅ 返回刷新令牌
- ✅ 无 tokens 时返回 null
- ✅ 过期 tokens 返回 null

#### isTokenExpired (5 个测试)
- ✅ 过期 tokens 返回 true
- ✅ 有效 tokens 返回 false
- ✅ 无 tokens 时返回 true
- ✅ 精确过期时刻返回 true
- ✅ 未来过期返回 false

#### clearTokens (3 个测试)
- ✅ 从 localStorage 移除 tokens
- ✅ 无 tokens 时处理清除
- ✅ 清除后 getTokens 返回 null

#### hasValidTokens (4 个测试)
- ✅ 有效 tokens 返回 true
- ✅ 过期 tokens 返回 false
- ✅ 无 tokens 返回 false
- ✅ 清除后返回 false

---

### 2. SSR 安全性 (4 个测试)

- ✅ 缺失 localStorage 时优雅失败
- ✅ getTokens 在 SSR 返回 null
- ✅ isTokenExpired 在 SSR 返回 true
- ✅ clearTokens 在 SSR 不抛异常

---

### 3. 边界情况 (6 个测试)

- ✅ 特殊字符 in tokens
- ✅ 超长 tokens (10000 字符)
- ✅ Unicode/国际化 tokens
- ✅ 缺失字段的格式错误数据
- ✅ localStorage 配额超限错误
- ✅ 多次 setTokens 调用

---

### 4. 自定义配置 (2 个测试)

- ✅ 使用自定义 storage key
- ✅ 不同实例隔离

---

## 测试数据

### Mock TokenResponse 示例

```typescript
{
  access_token: 'mock_access_token_123456',
  refresh_token: 'mock_refresh_token_789012',
  token_type: 'Bearer',
  expires_in: 3600,  // 1小时
}
```

### 边界测试数据

- **零过期**: `expires_in: 0`
- **已过期**: `expires_in: -1`
- **超长过期**: `expires_in: 365 * 24 * 60 * 60` (1年)
- **超长 Token**: 10000 个字符
- **Unicode Token**: 包含中文、阿拉伯文、emoji
- **特殊字符**: `!@#$%^&*()_+-=[]{}|;:'",.<>/?\``~`

---

## 运行测试

```bash
# 运行 Token Storage 测试
npm test -- --testPathPattern="token-storage"

# 运行并显示详细信息
npm test -- --testPathPattern="token-storage" --verbose

# 运行并生成覆盖率
npm run test:coverage -- --testPathPattern="token-storage"
```

---

## 当前状态

### RED 状态（预期）✗

**41/41 测试失败** - 这是 TDD 的正确第一步！

**失败原因**: `Not implemented: createTokenStorage`

这是预期行为，因为实现代码 (`src/lib/storage/token-storage.ts`) 仅包含占位实现：

```typescript
export function createTokenStorage(
  storageKey: string = TOKEN_STORAGE_KEY
): TokenStorage {
  // 占位实现 - 抛出错误以便测试显示 RED 状态
  throw new Error('Not implemented: createTokenStorage');
}
```

---

## 待实现接口

task-developer 需要实现以下 `TokenStorage` 接口：

```typescript
interface TokenStorage {
  setTokens(tokens: TokenResponse): boolean;
  getTokens(): StoredTokens | null;
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  isTokenExpired(): boolean;
  clearTokens(): void;
  hasValidTokens(): boolean;
}
```

---

## 测试特点

### 简洁性
- ✅ 每个测试只验证一个行为
- ✅ 使用字面量作为期望值
- ✅ 线性执行，无复杂逻辑

### 可靠性
- ✅ 每个 `beforeEach` 重置 localStorage mock
- ✅ 每个测试独立，不依赖执行顺序
- ✅ 使用 Map 模拟 localStorage，真实模拟存储行为

### 完整性
- ✅ 覆盖所有公共方法
- ✅ 覆盖边界情况
- ✅ 覆盖错误场景
- ✅ 覆盖 SSR 场景

---

## 参考文档

- 蓝图: `/workspace/BLUEPRINT_ISSUE97.md`
- Issue: #97 - [Frontend] 认证状态管理基础层
- 相关测试: `src/store/auth/__tests__/auth-store.test.ts`
- 相关 Fixtures: `src/store/auth/__tests__/fixtures.ts`
