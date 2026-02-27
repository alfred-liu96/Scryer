# Alembic Docker 迁移测试说明

## 概述

本测试套件用于验证 Alembic 数据库迁移在 Docker 容器环境中的完整流程。

## 测试文件结构

```
tests/integration/
├── helpers/
│   ├── __init__.py
│   └── migration_helpers.py    # AlembicTestHelper 类
├── conftest.py                  # 扩展的 fixtures
└── test_alembic_docker.py       # 测试用例
```

## AlembicTestHelper 辅助工具

`AlembicTestHelper` 类提供了以下功能：

### 版本管理
- `get_current_version()` - 获取当前数据库版本
- `get_latest_version()` - 获取最新迁移版本

### 迁移执行
- `upgrade(revision='head')` - 执行升级
- `downgrade(revision='base')` - 执行降级
- `upgrade_to_version(version)` - 升级到指定版本
- `downgrade_to_version(version)` - 降级到指定版本

### 表检查
- `table_exists(engine, table_name)` - 检查表是否存在
- `column_exists(engine, table_name, column_name)` - 检查列是否存在
- `index_exists(engine, index_name)` - 检查索引是否存在
- `get_table_count(engine)` - 获取表数量
- `get_table_names(engine)` - 获取所有表名

### 数据清理
- `clean_all_tables(engine)` - 清理所有表数据
- `drop_all_tables(engine)` - 删除所有表

### Schema 验证
- `validate_schema(engine, expected_tables)` - 验证数据库 Schema

## Pytest Fixtures

### alembic_test_helper
提供 `AlembicTestHelper` 实例：

```python
def test_something(alembic_test_helper: AlembicTestHelper):
    current = alembic_test_helper.get_current_version()
    assert current is not None
```

### clean_alembic_version
在测试前清理 alembic_version 表：

```python
async def test_something(clean_alembic_version):
    # alembic_version 表已被清理
    pass
```

### migrated_database
执行完整迁移的数据库引擎：

```python
async def test_something(migrated_database: AsyncEngine):
    # 数据库已执行所有迁移
    pass
```

## 测试类

### TestDockerAutoMigration
测试容器启动时的自动迁移：
- `test_container_auto_migration_on_startup` - 验证自动迁移执行
- `test_migration_idempotent` - 验证迁移幂等性

### TestMigrationUpgradeDowngrade
测试升级和降级操作：
- `test_upgrade_to_head` - 验证升级到最新版本
- `test_downgrade_to_base` - 验证降级到基础版本
- `test_version_tracking` - 验证版本跟踪

### TestMigrationSchemaValidation
测试 Schema 验证：
- `test_alembic_version_table_schema` - 验证版本表结构
- `test_table_names_correct` - 验证表名正确性
- `test_schema_validation_with_helper` - 验证辅助方法

### TestMigrationDataIntegrity
测试数据完整性：
- `test_foreign_key_constraints_enforced` - 验证外键约束
- `test_unique_constraints_enforced` - 验证唯一约束
- `test_not_null_constraints_enforced` - 验证非空约束

### TestMigrationErrorHandling
测试错误处理：
- `test_invalid_revision_raises_error` - 验证无效版本错误
- `test_downgrade_from_empty_database` - 验证空数据库降级

### TestMigrationWithRealModels
测试真实模型迁移：
- `test_users_table_schema_after_migration` - 验证 users 表结构
- `test_tasks_table_schema_after_migration` - 验证 tasks 表结构
- `test_can_insert_user_model` - 验证用户数据插入
- `test_can_insert_task_model` - 验证任务数据插入

### TestMigrationCommands
测试命令行工具：
- `test_alembic_current_command_exists` - 验证 current 命令
- `test_alembic_history_command_exists` - 验证 history 命令
- `test_alembic_config_file_exists` - 验证配置文件存在
- `test_alembic_directory_exists` - 验证目录结构

## 运行测试

### 运行所有 Alembic Docker 测试
```bash
pytest tests/integration/test_alembic_docker.py
```

### 运行特定测试类
```bash
pytest tests/integration/test_alembic_docker.py::TestDockerAutoMigration
```

### 运行特定测试方法
```bash
pytest tests/integration/test_alembic_docker.py::TestDockerAutoMigration::test_container_auto_migration_on_startup
```

### 显示详细输出
```bash
pytest tests/integration/test_alembic_docker.py -v
```

### 只运行标记的测试
```bash
pytest tests/integration/test_alembic_docker.py -m async
```

## 环境要求

1. **Docker 容器运行中**: PostgreSQL 和 Redis 容器需要通过 Docker Compose 启动
2. **环境变量设置**: 确保 `.env` 文件中配置了正确的数据库连接信息
3. **Alembic 配置**: `alembic.ini` 和 `alembic/` 目录需要存在

## 注意事项

1. **测试隔离**: 每个测试都会清理数据库，确保测试之间互不影响
2. **异步测试**: 大部分测试使用 `@pytest.mark.asyncio` 标记，需要异步支持
3. **同步 Alembic**: Alembic 的 API 是同步的，使用 `asyncio.run_in_executor` 在线程池中执行

## 验收标准

- [x] 所有 21 个测试用例被正确收集
- [x] 测试代码符合简洁性原则
- [x] 测试覆盖核心迁移场景
- [x] 使用 fixtures 和辅助工具减少重复代码
- [x] 测试用例独立运行，不依赖执行顺序
