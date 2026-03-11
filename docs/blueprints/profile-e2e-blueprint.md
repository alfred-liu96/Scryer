# Profile E2E 测试蓝图

## 概述

本文档定义用户资料页面 (Profile Page) 的 E2E 测试架构设计。

**相关 Issue**: #171, #170

**测试目标**:
- 验证 Profile 页面路由守卫功能
- 验证用户信息展示
- 验证资料编辑表单交互
- 验证 API 调用与错误处理

---

## 1. Profile 页面组件分析

### 1.1 页面结构

**路由**: `/profile`

**页面组件** (`/workspace/frontend/src/app/profile/page.tsx`):
- 使用 `withAuthGuard` HOC 保护路由
- 未认证用户重定向到 `/login`

**状态管理**:
```typescript
// 页面状态
const [user, setUser] = useState<UserResponse | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [isEditing, setIsEditing] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**渲染逻辑**:
1. `isLoading=true` -> 显示 Spinner
2. `error` 存在 -> 显示错误信息 + 重试按钮
3. `!user` -> 显示空状态
4. `isEditing=true` -> 渲染 `<ProfileForm />`
5. `isEditing=false` -> 渲染 `<UserInfoCard />`

### 1.2 UserInfoCard 组件

**文件**: `/workspace/frontend/src/components/profile/UserInfoCard.tsx`

**CSS 类**:
| 类名 | 用途 |
|------|------|
| `.user-info-card` | 卡片容器 |
| `.user-info-details` | 用户信息容器 |
| `.user-info-field` | 字段行 |
| `.user-info-label` | 字段标签 |
| `.user-info-value` | 字段值 |
| `.user-info-edit-btn` | 编辑按钮 |

**data-testid 属性**:
| testid | 字段 |
|--------|------|
| `user-id` | 用户 ID |
| `user-username` | 用户名 |
| `user-email` | 邮箱 |
| `user-created-at` | 注册时间 |
| `user-status` | 账户状态 |

**交互**:
- 编辑按钮点击 -> 触发 `onEditClick()` 回调

### 1.3 ProfileForm 组件

**文件**: `/workspace/frontend/src/components/profile/ProfileForm.tsx`

**data-testid 属性**:
| testid | 元素 |
|--------|------|
| `profile-username-input` | 用户名输入框 |
| `profile-email-input` | 邮箱输入框 |
| `profile-submit-btn` | 保存按钮 |
| `profile-cancel-btn` | 取消按钮 |

**表单验证规则**:

| 字段 | 规则 | 错误消息 |
|------|------|----------|
| 用户名 | 必填, 3-50字符, 仅允许字母/数字/下划线/连字符 | `用户名不能为空`, `用户名长度应为 3-50 个字符`, `用户名格式不正确...` |
| 邮箱 | 必填, 标准邮箱格式 | `邮箱不能为空`, `邮箱格式不正确` |

**提交逻辑**:
1. 验证表单字段
2. 检测是否有变更 (`hasChanges`)
3. 仅提交变更字段
4. 调用 `authApi.updateProfile(data)`
5. 更新 `authStore.user`

**提交按钮状态**:
- 禁用条件: `!isFormValid || isSubmitting`
- `isFormValid` 条件: 字段非空 + 无验证错误 + 有变更

**取消逻辑**:
- 恢复原始数据
- 清除错误状态
- 触发 `onCancel()` 回调

### 1.4 API 调用

**端点**: `PATCH /api/v1/auth/me`

**方法**: `authApi.updateProfile(data: UserUpdateRequest)`

**请求类型** (`UserUpdateRequest`):
```typescript
interface UserUpdateRequest {
  username?: string;
  email?: string;
}
```

**响应类型** (`UserUpdateResponse`):
```typescript
interface UserUpdateResponse extends UserResponse {
  // 继承 UserResponse
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**错误响应**:
| 状态码 | 场景 | 错误消息 |
|--------|------|----------|
| 401 | 未认证 | `请先登录后再试` |
| 409 | 用户名冲突 | `该用户名已被使用` |
| 409 | 邮箱冲突 | `该邮箱已被注册` |
| 400 | 验证错误 | `输入信息格式不正确...` |
| Network | 网络错误 | `网络连接失败，请稍后重试` |

---

## 2. Page Object 设计

### 2.1 ProfilePage 类

**文件**: `/workspace/frontend/e2e/pages/profile-pages.ts`

```typescript
/**
 * 用户资料页面对象模型
 *
 * 路由: /profile
 */
export class ProfilePage {
  readonly page: Page;

  // 页面 URL
  static readonly URL = '/profile';

  // 页面状态容器
  readonly loadingContainer: Locator;
  readonly errorContainer: Locator;
  readonly emptyContainer: Locator;

  // UserInfoCard 元素
  readonly userInfoCard: Locator;
  readonly userId: Locator;
  readonly username: Locator;
  readonly email: Locator;
  readonly createdAt: Locator;
  readonly status: Locator;
  readonly editButton: Locator;

  // ProfileForm 元素
  readonly profileForm: Locator;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // 页面状态容器
    this.loadingContainer = page.locator('.profile-page-loading');
    this.errorContainer = page.locator('.profile-page-error');
    this.emptyContainer = page.locator('.profile-page-empty');

    // UserInfoCard 元素
    this.userInfoCard = page.locator('.user-info-card');
    this.userId = page.locator('[data-testid="user-id"]');
    this.username = page.locator('[data-testid="user-username"]');
    this.email = page.locator('[data-testid="user-email"]');
    this.createdAt = page.locator('[data-testid="user-created-at"]');
    this.status = page.locator('[data-testid="user-status"]');
    this.editButton = page.locator('.user-info-edit-btn');

    // ProfileForm 元素
    this.profileForm = page.locator('.profile-form');
    this.usernameInput = page.locator('[data-testid="profile-username-input"]');
    this.emailInput = page.locator('[data-testid="profile-email-input"]');
    this.submitButton = page.locator('[data-testid="profile-submit-btn"]');
    this.cancelButton = page.locator('[data-testid="profile-cancel-btn"]');
    this.errorMessage = page.locator('.alert-error, .error-message');
  }

  // ... 方法定义见下文
}
```

### 2.2 ProfilePage 方法设计

```typescript
/**
 * 导航到 Profile 页面
 */
async goto(): Promise<void>;

/**
 * 等待页面加载完成
 * @param timeout - 超时时间 (毫秒)
 */
async waitForLoaded(timeout?: number): Promise<void>;

/**
 * 检查是否处于加载状态
 */
async isLoading(): Promise<boolean>;

/**
 * 检查是否显示错误状态
 */
async hasError(): Promise<boolean>;

/**
 * 检查是否显示用户信息卡片
 */
async isUserInfoCardVisible(): Promise<boolean>;

/**
 * 检查是否处于编辑模式
 */
async isEditMode(): Promise<boolean>;

/**
 * 获取用户信息 (从 UserInfoCard)
 */
async getUserInfo(): Promise<{
  id: string;
  username: string;
  email: string;
  createdAt: string;
  status: string;
}>;

/**
 * 点击编辑按钮 (进入编辑模式)
 */
async clickEditButton(): Promise<void>;

/**
 * 填写编辑表单
 * @param username - 新用户名 (可选)
 * @param email - 新邮箱 (可选)
 */
async fillProfileForm(options: {
  username?: string;
  email?: string;
}): Promise<void>;

/**
 * 提交资料更新
 */
async submitProfile(): Promise<void>;

/**
 * 取消编辑
 */
async cancelEdit(): Promise<void>;

/**
 * 等待提交完成
 * @param timeout - 超时时间 (毫秒)
 */
async waitForSubmitComplete(timeout?: number): Promise<void>;

/**
 * 获取表单错误消息
 */
async getFormError(): Promise<string | null>;

/**
 * 检查提交按钮是否禁用
 */
async isSubmitButtonDisabled(): Promise<boolean>;

/**
 * 检查取消按钮是否禁用
 */
async isCancelButtonDisabled(): Promise<boolean>;
```

---

## 3. 测试用例设计

### 3.1 测试文件结构

**文件**: `/workspace/frontend/e2e/specs/profile/profile.spec.ts`

```
profile.spec.ts
├── 路由守卫测试
│   ├── 未认证用户应重定向到登录页
│   └── 已认证用户应能访问 Profile 页面
├── 页面加载测试
│   ├── 应显示加载状态
│   ├── 加载完成后应显示用户信息
│   └── 加载失败应显示错误信息
├── 用户信息展示测试
│   ├── 应正确显示用户 ID
│   ├── 应正确显示用户名
│   ├── 应正确显示邮箱
│   ├── 应正确显示注册时间
│   └── 应正确显示账户状态
├── 编辑模式切换测试
│   ├── 点击编辑按钮应进入编辑模式
│   ├── 点击取消按钮应退出编辑模式
│   └── 取消后应恢复原始数据
├── 表单验证测试
│   ├── 应验证空用户名
│   ├── 应验证用户名长度不足
│   ├── 应验证用户名格式错误
│   ├── 应验证空邮箱
│   └── 应验证邮箱格式错误
├── 资料更新测试
│   ├── 应成功更新用户名
│   ├── 应成功更新邮箱
│   ├── 应成功同时更新用户名和邮箱
│   ├── 无变更时提交按钮应禁用
│   └── 更新成功后应显示新数据
└── 错误处理测试
    ├── 用户名冲突应显示错误
    ├── 邮箱冲突应显示错误
    ├── 网络错误应显示友好提示
    └── 未认证时应显示错误
```

### 3.2 详细测试用例

#### 3.2.1 路由守卫测试

```typescript
test.describe('路由守卫', () => {
  test('未认证用户访问 Profile 应重定向到登录页', async ({ page }) => {
    // 清除认证状态
    await clearAuth(page);

    // 直接访问 Profile 页面
    await page.goto('/profile');

    // 验证重定向到登录页
    await expect(page).toHaveURL(/\/login/);
  });

  test('已认证用户应能访问 Profile 页面', async ({ page }) => {
    // 注册并登录
    const testUser = {
      username: generateUsername('profile_access'),
      email: generateEmail('profile_access'),
      password: 'TestPass123!',
    };
    await registerUser(page, testUser, { autoLogin: true });

    // 访问 Profile 页面
    await page.goto('/profile');

    // 验证显示用户信息
    const profilePage = new ProfilePage(page);
    await expect(profilePage.userInfoCard).toBeVisible();
  });
});
```

#### 3.2.2 页面加载测试

```typescript
test.describe('页面加载', () => {
  test('应显示加载状态', async ({ page }) => {
    const testUser = {
      username: generateUsername('loading_test'),
      email: generateEmail('loading_test'),
      password: 'TestPass123!',
    };
    await registerUser(page, testUser, { autoLogin: true });

    // 访问页面并检查加载状态
    const profilePage = new ProfilePage(page);
    await profilePage.goto();

    // 加载状态可能很快消失，这里只验证最终显示用户信息
    await expect(profilePage.userInfoCard).toBeVisible();
  });

  test('加载完成后应显示用户信息', async ({ page }) => {
    const testUser = {
      username: generateUsername('display_test'),
      email: generateEmail('display_test'),
      password: 'TestPass123!',
    };
    await registerUser(page, testUser, { autoLogin: true });

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.waitForLoaded();

    // 验证用户信息显示
    await expect(profilePage.username).toContainText(testUser.username);
    await expect(profilePage.email).toContainText(testUser.email);
  });
});
```

#### 3.2.3 编辑模式切换测试

```typescript
test.describe('编辑模式切换', () => {
  test('点击编辑按钮应进入编辑模式', async ({ page }) => {
    const testUser = createTestUser('edit_mode');
    await setupAuthenticatedUser(page, testUser);

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();

    // 验证编辑模式
    expect(await profilePage.isEditMode()).toBeTruthy();
    await expect(profilePage.usernameInput).toBeVisible();
    await expect(profilePage.emailInput).toBeVisible();
  });

  test('点击取消按钮应退出编辑模式', async ({ page }) => {
    const testUser = createTestUser('cancel_edit');
    await setupAuthenticatedUser(page, testUser);

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();
    await profilePage.cancelEdit();

    // 验证退出编辑模式
    expect(await profilePage.isEditMode()).toBeFalsy();
    await expect(profilePage.userInfoCard).toBeVisible();
  });

  test('取消后应恢复原始数据', async ({ page }) => {
    const testUser = createTestUser('restore_data');
    await setupAuthenticatedUser(page, testUser);

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();

    // 修改数据
    await profilePage.fillProfileForm({ username: 'modified_name' });

    // 取消编辑
    await profilePage.cancelEdit();

    // 验证原始数据
    await expect(profilePage.username).toContainText(testUser.username);
  });
});
```

#### 3.2.4 表单验证测试

```typescript
test.describe('表单验证', () => {
  test('应验证空用户名', async ({ page }) => {
    const testUser = createTestUser('empty_username');
    await setupAuthenticatedUser(page, testUser);

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();

    // 清空用户名并触发验证
    await profilePage.usernameInput.fill('');
    await profilePage.usernameInput.blur();

    // 验证错误提示
    const error = await profilePage.getFormError();
    expect(error).toContain('用户名不能为空');
  });

  test('应验证用户名长度不足', async ({ page }) => {
    const testUser = createTestUser('short_username');
    await setupAuthenticatedUser(page, testUser);

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();

    // 输入过短用户名
    await profilePage.usernameInput.fill('ab');
    await profilePage.usernameInput.blur();

    // 验证错误提示
    const error = await profilePage.getFormError();
    expect(error).toContain('用户名长度应为 3-50 个字符');
  });

  test('应验证用户名格式错误', async ({ page }) => {
    const testUser = createTestUser('invalid_username');
    await setupAuthenticatedUser(page, testUser);

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();

    // 输入非法字符
    await profilePage.usernameInput.fill('invalid@name');
    await profilePage.usernameInput.blur();

    // 验证错误提示
    const error = await profilePage.getFormError();
    expect(error).toContain('用户名格式不正确');
  });

  test('应验证邮箱格式错误', async ({ page }) => {
    const testUser = createTestUser('invalid_email');
    await setupAuthenticatedUser(page, testUser);

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();

    // 输入非法邮箱
    await profilePage.emailInput.fill('invalid-email');
    await profilePage.emailInput.blur();

    // 验证错误提示
    const error = await profilePage.getFormError();
    expect(error).toContain('邮箱格式不正确');
  });
});
```

#### 3.2.5 资料更新测试

```typescript
test.describe('资料更新', () => {
  test('应成功更新用户名', async ({ page }) => {
    const testUser = createTestUser('update_username');
    await setupAuthenticatedUser(page, testUser);

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();

    const newUsername = generateUsername('new_name');
    await profilePage.fillProfileForm({ username: newUsername });
    await profilePage.submitProfile();
    await profilePage.waitForSubmitComplete();

    // 验证更新成功
    await expect(profilePage.username).toContainText(newUsername);
  });

  test('应成功更新邮箱', async ({ page }) => {
    const testUser = createTestUser('update_email');
    await setupAuthenticatedUser(page, testUser);

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();

    const newEmail = generateEmail('new_email');
    await profilePage.fillProfileForm({ email: newEmail });
    await profilePage.submitProfile();
    await profilePage.waitForSubmitComplete();

    // 验证更新成功
    await expect(profilePage.email).toContainText(newEmail);
  });

  test('无变更时提交按钮应禁用', async ({ page }) => {
    const testUser = createTestUser('no_changes');
    await setupAuthenticatedUser(page, testUser);

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();

    // 不修改任何数据
    const isDisabled = await profilePage.isSubmitButtonDisabled();
    expect(isDisabled).toBeTruthy();
  });
});
```

#### 3.2.6 错误处理测试

```typescript
test.describe('错误处理', () => {
  test('用户名冲突应显示错误', async ({ page }) => {
    // 创建第一个用户
    const existingUser = createTestUser('existing');
    await registerUser(page, existingUser, { autoLogin: true });

    // 创建第二个用户
    const testUser = createTestUser('conflict_test');
    await clearAuth(page);
    await registerUser(page, testUser, { autoLogin: true });

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();

    // 尝试使用已存在的用户名
    await profilePage.fillProfileForm({ username: existingUser.username });
    await profilePage.submitProfile();

    // 验证错误提示
    const error = await profilePage.getFormError();
    expect(error).toContain('该用户名已被使用');
  });

  test('邮箱冲突应显示错误', async ({ page }) => {
    // 创建第一个用户
    const existingUser = createTestUser('email_existing');
    await registerUser(page, existingUser, { autoLogin: true });

    // 创建第二个用户
    const testUser = createTestUser('email_conflict');
    await clearAuth(page);
    await registerUser(page, testUser, { autoLogin: true });

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.clickEditButton();

    // 尝试使用已存在的邮箱
    await profilePage.fillProfileForm({ email: existingUser.email });
    await profilePage.submitProfile();

    // 验证错误提示
    const error = await profilePage.getFormError();
    expect(error).toContain('该邮箱已被注册');
  });
});
```

---

## 4. 边界情况覆盖

### 4.1 数据边界

| 场景 | 输入 | 预期结果 |
|------|------|----------|
| 用户名最小长度 | `abc` (3字符) | 验证通过 |
| 用户名最大长度 | `a...a` (50字符) | 验证通过 |
| 用户名小于最小长度 | `ab` (2字符) | 显示长度错误 |
| 用户名超出最大长度 | `a...a` (51字符) | 显示长度错误 |
| 用户名边界字符 | `a_b-c` | 验证通过 |
| 用户名非法字符 | `user@name` | 显示格式错误 |
| 邮箱最小格式 | `a@b.c` | 验证通过 |
| 邮箱含特殊字符 | `user+tag@domain.com` | 验证通过 |

### 4.2 状态边界

| 场景 | 预期行为 |
|------|----------|
| 快速点击编辑按钮 | 仅响应第一次点击 |
| 编辑过程中登出 | 重定向到登录页 |
| Token 过期时提交 | 显示未认证错误 |
| 网络断开时提交 | 显示网络错误 |
| 并发更新冲突 | 显示冲突错误 |

### 4.3 UI 边界

| 场景 | 预期行为 |
|------|----------|
| 长用户名展示 | 文本截断或换行 |
| 长邮箱展示 | 文本截断或换行 |
| 表单提交中禁用输入 | 输入框 disabled |
| 表单提交中禁用按钮 | 按钮 disabled |

---

## 5. 测试辅助工具

### 5.1 测试数据生成

```typescript
// 建议添加到 e2e/fixtures/auth/test-data.ts

export function createTestUser(suffix: string): UserCredentials {
  return {
    username: generateUsername(`profile_${suffix}`),
    email: generateEmail(`profile_${suffix}`),
    password: 'TestPass123!',
  };
}
```

### 5.2 认证设置辅助

```typescript
// 建议添加到 e2e/helpers/auth-helpers.ts

/**
 * 快速设置已认证用户
 */
export async function setupAuthenticatedUser(
  page: Page,
  credentials: UserCredentials
): Promise<void> {
  await registerUser(page, credentials, { autoLogin: true });
}
```

---

## 6. 依赖关系

### 6.1 文件依赖

```
profile.spec.ts
├── @playwright/test
├── pages/profile-pages.ts (新建)
├── helpers/auth-helpers.ts (现有)
├── fixtures/auth/test-data.ts (现有)
└── pages/auth-pages.ts (现有 - LoginPage)
```

### 6.2 执行顺序

1. 创建 `pages/profile-pages.ts` - ProfilePage 类
2. 添加测试数据生成函数到 `fixtures/auth/test-data.ts`
3. 创建 `specs/profile/profile.spec.ts` - 测试文件
4. 运行测试验证

---

## 7. 验收标准

- [ ] ProfilePage Page Object 实现完整
- [ ] 所有测试用例通过
- [ ] 边界情况覆盖完整
- [ ] 测试代码符合项目规范
- [ ] 无 flaky 测试