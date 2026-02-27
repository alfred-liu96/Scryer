# Alembic 数据库迁移工作流

本文档介绍 Scryer 项目的 Alembic 数据库迁移流程和最佳实践。

## 目录

- [概述](#概述)
- [环境准备](#环境准备)
- [创建迁移](#创建迁移)
- [执行迁移](#执行迁移)
- [降级数据库](#降级数据库)
- [Docker 环境迁移](#docker-环境迁移)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)

## 概述

Alembic 是 SQLAlchemy 作者开发的数据库迁移工具，提供：

- **版本控制**: 跟踪数据库 Schema 变更
- **自动生成**: 根据模型自动生成迁移脚本
- **升级降级**: 支持数据库版本的前进和回退
- **多环境**: 支持开发、测试、生产环境

### 项目结构

```
scryer/
├── alembic.ini                 # Alembic 配置文件
├── alembic/
│   ├── env.py                  # 迁移运行环境
│   ├── script.py.mako          # 迁移脚本模板
│   └── versions/               # 迁移脚本目录
│       ├── 001_initial.py
│       └── 002_add_users_table.py
└── src/backend/app/models/     # SQLAlchemy 模型定义
```

## 环境准备

### 本地开发环境

确保已配置数据库连接：

```bash
# 检查 .env 文件
cat .env

# 确认 DATABASE_URL 正确配置
# 示例：postgresql+asyncpg://scryer:password@localhost:5432/scryer
```

### Docker 环境

Docker 环境会自动处理数据库连接，无需额外配置。

## 创建迁移

### 1. 修改模型

首先在 `src/backend/app/models/` 中修改或创建 SQLAlchemy 模型：

```python
# src/backend/app/models/user.py
from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID

from src.backend.app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
```

### 2. 生成迁移脚本

#### 方法 A: 自动生成（推荐）

```bash
# 本地环境
alembic revision --autogenerate -m "add users table"

# Docker 环境
docker-compose exec scryer-dev alembic revision --autogenerate -m "add users table"
```

#### 方法 B: 手动创建

```bash
# 创建空白迁移脚本
alembic revision -m "custom migration"
```

然后手动编辑生成的迁移脚本。

### 3. 检查迁移脚本

在 `alembic/versions/` 中查看生成的脚本：

```python
"""add users table

Revision ID: 001_add_users_table
Revises:
Create Date: 2024-02-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )

def downgrade():
    op.drop_table('users')
```

**关键检查点：**
- `upgrade()` 函数是否正确
- `downgrade()` 函数是否可回滚
- 索引、约束是否完整
- 默认值是否合理

## 执行迁移

### 本地环境

```bash
# 升级到最新版本
alembic upgrade head

# 升级到指定版本
alembic upgrade <revision_id>

# 查看当前版本
alembic current

# 查看迁移历史
alembic history
```

### Docker 环境

#### 自动迁移（推荐）

容器启动时自动执行迁移：

```bash
docker-compose up -d
```

查看迁移日志：

```bash
docker-compose logs scryer-dev | grep -i migration
```

#### 手动迁移

```bash
# 进入容器
docker-compose exec scryer-dev /bin/bash

# 执行迁移
alembic upgrade head

# 查看版本
alembic current
```

#### 跳过自动迁移

如果需要手动控制迁移时机：

```bash
# 设置环境变量跳过自动迁移
SKIP_MIGRATION=true docker-compose up -d

# 稍后手动执行
docker-compose exec scryer-dev alembic upgrade head
```

## 降级数据库

### 降级到基础版本

```bash
# 删除所有表（慎用！）
alembic downgrade base
```

### 降级到指定版本

```bash
# 查看历史版本
alembic history

# 降级到指定版本
alembic downgrade 002_add_tasks_table
```

### Docker 环境降级

```bash
# 进入容器
docker-compose exec scryer-dev /bin/bash

# 执行降级
alembic downgrade base
```

## Docker 环境迁移

### 容器启动流程

容器启动时的迁移流程：

1. **等待 PostgreSQL 就绪**
   - 使用 `pg_isready` 检测数据库连接
   - 最多等待 60 秒
   - 每 2 秒重试一次

2. **执行数据库迁移**
   - 运行 `alembic upgrade head`
   - 自动应用所有未执行的迁移
   - 迁移失败时容器退出

3. **启动应用服务**
   - 迁移成功后启动应用
   - 如果迁移失败，容器停止运行

### 环境变量配置

```yaml
# docker-compose.yml
environment:
  # PostgreSQL 连接信息
  - POSTGRES_HOST=postgres
  - POSTGRES_PORT=5432
  - POSTGRES_USER=scryer
  - POSTGRES_DB=scryer

  # 跳过自动迁移（可选）
  - SKIP_MIGRATION=false
```

### 健康检查

容器健康检查会验证：

- PostgreSQL 连接状态
- 数据库 Schema 完整性
- 应用服务响应

```bash
# 查看容器健康状态
docker-compose ps

# 查看健康检查日志
docker-compose inspect scryer-dev | grep -A 10 Health
```

## 最佳实践

### 1. 迁移命名规范

使用清晰、描述性的迁移消息：

```bash
# 好的命名
alembic revision -m "add users table with email constraint"
alembic revision -m "add index on tasks.created_at"

# 不好的命名
alembic revision -m "update"
alembic revision -m "fix"
```

### 2. 保持迁移幂等性

确保 `upgrade()` 可以安全地重复执行：

```python
def upgrade():
    # 检查表是否存在
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
                -- 创建表
            END IF;
        END $$;
    """)
```

### 3. 确保可回滚

`downgrade()` 必须完全回滚 `upgrade()` 的变更：

```python
def upgrade():
    op.create_table('users', ...)
    op.create_index('idx_users_email', 'users', ['email'])

def downgrade():
    op.drop_index('idx_users_email', table_name='users')
    op.drop_table('users')
```

### 4. 避免数据丢失

谨慎使用可能删除数据的迁移：

```python
def upgrade():
    # 先备份数据
    op.execute("CREATE TABLE users_backup AS SELECT * FROM users")

    # 执行变更
    # ...

def downgrade():
    # 恢复数据
    op.execute("INSERT INTO users SELECT * FROM users_backup")
    op.execute("DROP TABLE users_backup")
```

### 5. 测试迁移

在生产环境应用前，先在测试环境验证：

```bash
# 1. 在测试环境升级
alembic upgrade head

# 2. 验证应用正常工作
pytest tests/

# 3. 测试降级
alembic downgrade base

# 4. 再次升级
alembic upgrade head
```

### 6. 版本控制

**必须提交的内容：**
- 迁移脚本文件
- SQLAlchemy 模型定义
- `alembic.ini` 配置变更

**不应提交的内容：**
- `alembic_version` 表数据（由数据库管理）
- 本地测试数据库数据

## 故障排查

### 迁移失败

**症状：**
```
ERROR: [ALEMBIC] Migration failed: relation "users" already exists
```

**解决方法：**

```bash
# 1. 查看当前版本
alembic current

# 2. 查看数据库状态
docker-compose exec postgres psql -U scryer -d scryer -c "\dt"

# 3. 手动标记版本（如果表已存在）
alembic stamp head

# 4. 重新尝试迁移
alembic upgrade head
```

### 数据库未就绪

**症状：**
```
ERROR: PostgreSQL is not ready
```

**解决方法：**

```bash
# 检查 PostgreSQL 容器状态
docker-compose ps postgres

# 查看 PostgreSQL 日志
docker-compose logs postgres

# 手动检测数据库连接
docker-compose exec scryer-dev wait-for-postgres.sh postgres 5432
```

### 版本冲突

**症状：**
```
ERROR: Multiple heads detected
```

**解决方法：**

```bash
# 1. 查看分支情况
alembic heads

# 2. 合并分支
alembic merge -m "merge branches" <revision1> <revision2>

# 3. 继续升级
alembic upgrade head
```

### 自动生成不准确

**症状：**
自动生成的迁移脚本缺少某些变更。

**解决方法：**

1. 手动编辑迁移脚本，补充缺失的变更
2. 使用 `--sql` 参数预览 SQL 语句

```bash
alembic upgrade head --sql
```

### 权限问题

**症状：**
```
ERROR: permission denied for table users
```

**解决方法：**

```bash
# 检查数据库用户权限
docker-compose exec postgres psql -U scryer -d scryer -c "\du"

# 授予必要权限
docker-compose exec postgres psql -U postgres -c \
  "GRANT ALL PRIVILEGES ON DATABASE scryer TO scryer;"
```

## 参考资料

- [Alembic 官方文档](https://alembic.sqlalchemy.org/)
- [SQLAlchemy 文档](https://docs.sqlalchemy.org/)
- [Docker 集成指南](./docker-setup.md)

---

**相关 Issue**: #64
