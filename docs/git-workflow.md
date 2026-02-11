# Git 工作流规范

## 分支策略

本项目采用简化的分支管理策略：

### 主要分支

- **main**: 主分支，始终保持稳定可发布状态
- **dev**: 开发分支，用于集成最新功能（可选）

### 功能分支

- 从 `main` 分支创建
- 命名规范: `feature/issue-描述` 或 `issue-number`
- 完成后通过 PR 合并回 `main`

### 修复分支

- 从 `main` 分支创建
- 命名规范: `fix/issue-描述` 或 `issue-number`
- 完成后通过 PR 合并回 `main`

## 工作流程

### 开发新功能

1. 在 GitHub 上创建 Issue
2. 从 `main` 创建功能分支
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature
   ```
3. 开发并提交代码
4. 推送到远程仓库
5. 创建 Pull Request
6. 代码审查通过后合并

### 提交规范

使用清晰的提交信息格式：

```
<type>: <subject>

[type] 可选值:
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- test: 测试相关
- chore: 构建/工具链相关
```

示例：
```
feat: 添加用户认证功能
fix: 修复登录超时问题
docs: 更新 API 文档
```

### Pull Request 规范

PR 标题格式：`[Issue #XX] 简短描述`

PR 描述应包含：
- 关联的 Issue 编号
- 变更说明
- 测试计划
- 截图（如适用）

## 代码审查

- 每个 PR 必须经过至少一人审查
- 所有 CI 检查必须通过
- 审查者关注代码质量、设计合理性、测试覆盖

## 发布流程

1. 更新版本号
2. 更新 CHANGELOG
3. 创建 Git tag
4. 推送到远程仓库
