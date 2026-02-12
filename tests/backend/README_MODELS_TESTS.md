# Issue #53 数据库模型测试套件

## 概述

本测试套件为 Issue #53（数据库模型定义）创建，采用 TDD（测试驱动开发）方法，遵循 "Red First" 原则。

## 测试文件

| 文件 | 描述 | 测试用例数 |
|------|------|-----------|
| `test_models_user.py` | User 模型测试 | 36 |
| `test_models_query.py` | Query 模型测试 | 40 |
| `test_models_content.py` | Content 模型测试 | 39 |
| `test_models_search_result.py` | SearchResult 模型测试 | 45 |
| `test_models_task.py` | Task 模型测试 | 75 |
| `test_models_relationships.py` | 模型关系集成测试 | 64 |

**总计：299 个测试用例**

## 快速开始

### 安装依赖

```bash
pip install -e ".[dev]"
```

### 运行所有测试

```bash
pytest tests/backend/test_models*.py -v
```

### 运行单个测试文件

```bash
# User 模型
pytest tests/backend/test_models_user.py -v

# Query 模型
pytest tests/backend/test_models_query.py -v

# Content 模型
pytest tests/backend/test_models_content.py -v

# SearchResult 模型
pytest tests/backend/test_models_search_result.py -v

# Task 模型
pytest tests/backend/test_models_task.py -v

# 关系集成测试
pytest tests/backend/test_models_relationships.py -v
```

### 查看测试覆盖率

```bash
pytest tests/backend/test_models*.py --cov=src/backend/app/models --cov-report=html
```

## 测试结构

每个测试文件包含以下测试类别：

### 1. 字段测试
- 字段存在性
- 字段类型
- 字段约束（可空性、唯一性、长度限制）

### 2. 关系测试
- 外键配置
- 关系定义
- back_populates 配置
- 级联删除配置

### 3. 索引测试
- 单列索引
- 唯一索引
- 复合索引

### 4. 方法测试
- `to_dict()` 序列化方法
- `__repr__()` 字符串表示
- 自定义方法（如 Task.is_finished()）

### 5. 边界测试
- 字段长度限制
- NULL 值处理
- 枚举值验证
- JSONB 字段支持

## 开发流程

### 1. Red（当前阶段）

运行测试会失败，因为模型代码尚未实现：

```bash
pytest tests/backend/test_models_user.py -v
# ImportError: No module named 'src.backend.app.models.user'
```

这是预期行为，符合 TDD 的 "Red First" 原则。

### 2. Green（实现阶段）

按照 `BLUEPRINT_ISSUE53.md` 实现模型代码：

1. 创建 `src/backend/app/models/user.py`
2. 实现 User 类
3. 运行测试验证：`pytest tests/backend/test_models_user.py -v`
4. 重复上述步骤直到所有测试通过

### 3. Refactor（重构阶段）

测试通过后，可以安全地重构代码，因为测试会捕获任何破坏性变更。

## 参考文档

- **蓝图**: `BLUEPRINT_ISSUE53.md` - 详细的模型设计规范
- **测试总结**: `TEST_SUMMARY_ISSUE53.md` - 完整的测试覆盖分析
- **测试清单**: `TEST_CHECKLIST_ISSUE53.md` - 验收标准清单

## 测试原则

### 简单性
- 每个测试只验证一个方面
- 使用硬编码期望值
- 避免复杂的测试逻辑

### 可靠性
- 测试之间相互独立
- 不依赖执行顺序
- 不依赖共享状态

### 可读性
- 测试名称清晰表达意图
- 测试分组合理
- Docstring 注释完整

### 可维护性
- 遵循现有测试模式
- 易于扩展和修改
- 使用 SQLAlchemy inspect API

## 故障排除

### 导入错误

如果遇到 `ModuleNotFoundError`，确保：
1. 已安装项目依赖：`pip install -e ".[dev]"`
2. 在项目根目录运行测试
3. PYTHONPATH 包含 `src` 目录

### 测试发现错误

如果 pytest 无法发现测试：
1. 检查 `pyproject.toml` 中的 pytest 配置
2. 确保测试文件名以 `test_` 开头
3. 确保测试类以 `Test` 开头

## 验收标准

- ✅ 所有 299 个测试通过
- ✅ 测试覆盖率 > 80%
- ✅ 无导入错误
- ✅ 无运行时错误
- ✅ 所有模型可以正常使用
- ✅ 所有关系配置正确
- ✅ 所有索引生效
- ✅ 所有约束生效

---

**创建时间**: 2026-02-13
**创建者**: Claude Code (QA/Test Engineer)
**目标 Issue**: #53
**测试框架**: pytest + pytest-asyncio
