# Issue #53 开发蓝图：数据库模型定义

## 蓝图版本
- **版本**: 1.0
- **创建日期**: 2026-02-12
- **目标 Issue**: #53
- **前置 Issue**: #52 (SQLAlchemy 异步基础设施)

---

## 目录

1. [总体架构](#总体架构)
2. [数据模型详细设计](#数据模型详细设计)
3. [文件结构](#文件结构)
4. [代码契约](#代码契约)
5. [测试策略](#测试策略)
6. [实施步骤](#实施步骤)
7. [验收标准](#验收标准)

---

## 总体架构

### 设计原则

1. **单一职责**: 每个模型代表一个清晰的业务实体
2. **声明式定义**: 使用 SQLAlchemy 2.0 的 Mapped 类型提示语法
3. **异步优先**: 所有数据库操作支持异步
4. **类型安全**: 完整的类型注解，支持 mypy 检查
5. **最小化依赖**: 模型层不依赖业务逻辑，仅依赖基础设施

### 技术栈

- **ORM**: SQLAlchemy 2.0+ (asyncio)
- **数据库**: PostgreSQL + asyncpg 驱动
- **基类**: 已有的 `Base` 类 (来自 `src/backend/app/models/base.py`)
- **Python 版本**: >= 3.12

### 命名规范

- **表名**: 小写复数形式 (users, queries, contents, search_results, tasks)
- **字段名**: 小写下划线分隔 (snake_case)
- **外键**: `{关联表}_{关联字段}` 格式 (如 user_id)
- **索引**: `idx_{表名}_{字段名}` 格式
- **唯一约束**: `uq_{表名}_{字段名}` 格式

---

## 数据模型详细设计

### 1. User 模型 (用户)

#### 职责
表示系统用户，存储认证和基本信息。

#### 表结构
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

#### 字段定义

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | str (UUID) | PK, NOT NULL | 主键，继承自 Base |
| username | str | NOT NULL, UNIQUE | 用户名，最多 50 字符 |
| email | str | NOT NULL, UNIQUE | 邮箱地址，最多 255 字符 |
| hashed_password | str | NOT NULL | 加密后的密码 (bcrypt) |
| is_active | bool | DEFAULT TRUE | 账户是否激活 |
| created_at | datetime | NOT NULL | 创建时间，继承自 Base |
| updated_at | datetime | NOT NULL | 更新时间，继承自 Base |

#### 索引设计

```python
__table_args__ = (
    Index('idx_users_username', 'username'),
    Index('idx_users_email', 'email'),
)
```

#### 关系定义

- **一对多**: User → Query (一个用户可以有多个查询记录)
  - `queries: Mapped[List["Query"]] = relationship(back_populates="user")`

#### 代码契约 (Python Stub)

```python
# File: src/backend/app/models/user.py

from typing import List, TYPE_CHECKING
from sqlalchemy import Index, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .query import Query


class User(Base):
    """用户模型

    职责：
    - 存储用户认证信息 (用户名, 邮箱, 密码哈希)
    - 管理用户状态 (激活/停用)
    - 提供用户查询历史的入口点

    约束：
    - username: 必填，唯一，最大 50 字符
    - email: 必填，唯一，符合邮箱格式
    - hashed_password: 必填，使用 bcrypt 加密
    - is_active: 默认 True
    """

    __tablename__ = "users"

    # 基础字段
    username: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        comment="用户名"
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        comment="邮箱地址"
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="加密后的密码"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="账户是否激活"
    )

    # 关系
    queries: Mapped[List["Query"]] = relationship(
        "Query",
        back_populates="user",
        lazy="selectin"
    )

    # 索引
    __table_args__ = (
        Index('idx_users_username', 'username'),
        Index('idx_users_email', 'email'),
    )

    def __repr__(self) -> str:
        """字符串表示"""
        return f"User(id={self.id}, username={self.username}, email={self.email})"

    def to_dict(self) -> dict[str, object]:
        """转换为字典 (排除敏感信息)"""
        data = super().to_dict()
        data.pop("hashed_password", None)  # 排除密码哈希
        return data
```

---

### 2. Query 模型 (查询记录)

#### 职责
记录用户的查询历史，包括查询文本和参数。

#### 表结构
```sql
CREATE TABLE queries (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    query_text TEXT NOT NULL,
    query_params JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 字段定义

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | str (UUID) | PK, NOT NULL | 主键，继承自 Base |
| user_id | str | FK, NOT NULL | 关联的用户 ID |
| query_text | str | NOT NULL, TEXT | 查询文本 |
| query_params | dict | JSONB | 查询参数 (可选) |
| created_at | datetime | NOT NULL | 创建时间，继承自 Base |
| updated_at | datetime | NOT NULL | 更新时间，继承自 Base |

#### 索引设计

```python
__table_args__ = (
    Index('idx_queries_user_id', 'user_id'),
    Index('idx_queries_created_at', 'created_at'),
    Index('idx_queries_user_created', 'user_id', 'created_at'),  # 复合索引
)
```

#### 关系定义

- **多对一**: Query → User (多个查询属于一个用户)
  - `user: Mapped["User"] = relationship(back_populates="queries")`
- **一对多**: Query → SearchResult (一个查询可以有多个结果)
  - `search_results: Mapped[List["SearchResult"]] = relationship(back_populates="query", cascade="all, delete-orphan")`

#### 代码契约 (Python Stub)

```python
# File: src/backend/app/models/query.py

from typing import List, TYPE_CHECKING, Any
from sqlalchemy import Index, Text, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .search_result import SearchResult


class Query(Base):
    """查询记录模型

    职责：
    - 记录用户的查询文本和参数
    - 维护与用户的多对一关系
    - 维护与搜索结果的一对多关系

    约束：
    - user_id: 必填，外键关联到 users.id
    - query_text: 必填，存储查询文本
    - query_params: 可选，JSONB 格式存储查询参数
    """

    __tablename__ = "queries"

    # 外键
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联的用户 ID"
    )

    # 业务字段
    query_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="查询文本"
    )
    query_params: Mapped[dict[str, Any] | None] = mapped_column(
        nullable=True,
        comment="查询参数 (JSONB 格式)"
    )

    # 关系
    user: Mapped["User"] = relationship(
        "User",
        back_populates="queries",
        lazy="selectin"
    )
    search_results: Mapped[List["SearchResult"]] = relationship(
        "SearchResult",
        back_populates="query",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # 索引
    __table_args__ = (
        Index('idx_queries_user_id', 'user_id'),
        Index('idx_queries_created_at', 'created_at'),
        Index('idx_queries_user_created', 'user_id', 'created_at'),
    )

    def __repr__(self) -> str:
        """字符串表示"""
        return f"Query(id={self.id}, user_id={self.user_id}, text={self.query_text[:30]}...)"
```

---

### 3. Content 模型 (内容)

#### 职责
存储爬取或搜索到的内容，通过哈希值去重。

#### 表结构
```sql
CREATE TABLE contents (
    id VARCHAR(36) PRIMARY KEY,
    url TEXT NOT NULL,
    title VARCHAR(500),
    summary TEXT,
    content_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

#### 字段定义

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | str (UUID) | PK, NOT NULL | 主键，继承自 Base |
| url | str | NOT NULL, TEXT | 内容 URL |
| title | str | VARCHAR(500) | 内容标题 (可选) |
| summary | str | TEXT | 内容摘要 (可选) |
| content_hash | str | NOT NULL, UNIQUE | 内容哈希值 (SHA-256)，用于去重 |
| created_at | datetime | NOT NULL | 创建时间，继承自 Base |
| updated_at | datetime | NOT NULL | 更新时间，继承自 Base |

#### 索引设计

```python
__table_args__ = (
    Index('idx_contents_content_hash', 'content_hash', unique=True),  # 唯一索引
    Index('idx_contents_created_at', 'created_at'),
)
```

#### 关系定义

- **一对多**: Content → SearchResult (一个内容可以出现在多个搜索结果中)
  - `search_results: Mapped[List["SearchResult"]] = relationship(back_populates="content")`

#### 代码契约 (Python Stub)

```python
# File: src/backend/app/models/content.py

from typing import List, TYPE_CHECKING
from sqlalchemy import Index, Text, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .search_result import SearchResult


class Content(Base):
    """内容模型

    职责：
    - 存储爬取或搜索到的内容
    - 通过 content_hash 实现内容去重
    - 提供搜索结果的关联点

    约束：
    - url: 必填，存储内容的原始 URL
    - content_hash: 必填，唯一，基于内容的 SHA-256 哈希
    - title: 可选，最多 500 字符
    - summary: 可选，存储内容摘要
    """

    __tablename__ = "contents"

    # 业务字段
    url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="内容 URL"
    )
    title: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="内容标题"
    )
    summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="内容摘要"
    )
    content_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        comment="内容哈希值 (SHA-256)"
    )

    # 关系
    search_results: Mapped[List["SearchResult"]] = relationship(
        "SearchResult",
        back_populates="content",
        lazy="selectin"
    )

    # 索引
    __table_args__ = (
        Index('idx_contents_content_hash', 'content_hash', unique=True),
        Index('idx_contents_created_at', 'created_at'),
    )

    def __repr__(self) -> str:
        """字符串表示"""
        title_str = self.title[:30] if self.title else "N/A"
        return f"Content(id={self.id}, title={title_str}, hash={self.content_hash[:8]}...)"
```

---

### 4. SearchResult 模型 (搜索结果)

#### 职责
记录查询与内容的关联关系，包含排名和评分。

#### 表结构
```sql
CREATE TABLE search_results (
    id VARCHAR(36) PRIMARY KEY,
    query_id VARCHAR(36) NOT NULL,
    content_id VARCHAR(36) NOT NULL,
    rank INTEGER NOT NULL,
    score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    FOREIGN KEY (query_id) REFERENCES queries(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);
```

#### 字段定义

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | str (UUID) | PK, NOT NULL | 主键，继承自 Base |
| query_id | str | FK, NOT NULL | 关联的查询 ID |
| content_id | str | FK, NOT NULL | 关联的内容 ID |
| rank | int | NOT NULL | 排名位置 (从 1 开始) |
| score | float | 可选 | 相关性评分 (0-1) |
| created_at | datetime | NOT NULL | 创建时间，继承自 Base |
| updated_at | datetime | NOT NULL | 更新时间，继承自 Base |

#### 索引设计

```python
__table_args__ = (
    Index('idx_search_results_query_id', 'query_id'),
    Index('idx_search_results_content_id', 'content_id'),
    Index('idx_search_results_query_content', 'query_id', 'content_id'),  # 复合唯一约束
    Index('idx_search_results_rank', 'query_id', 'rank'),  # 查询内排序
)
```

#### 关系定义

- **多对一**: SearchResult → Query (多个结果属于一个查询)
  - `query: Mapped["Query"] = relationship(back_populates="search_results")`
- **多对一**: SearchResult → Content (多个结果指向一个内容)
  - `content: Mapped["Content"] = relationship(back_populates="search_results")`

#### 代码契约 (Python Stub)

```python
# File: src/backend/app/models/search_result.py

from typing import TYPE_CHECKING
from sqlalchemy import Index, String, ForeignKey, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .query import Query
    from .content import Content


class SearchResult(Base):
    """搜索结果模型

    职责：
    - 记录查询与内容的关联关系
    - 存储排名和评分信息
    - 支持结果去重 (同一查询+内容组合)

    约束：
    - query_id: 必填，外键关联到 queries.id
    - content_id: 必填，外键关联到 contents.id
    - rank: 必填，排名位置 (从 1 开始)
    - score: 可选，相关性评分 (0-1)
    - 唯一约束: (query_id, content_id) 组合唯一
    """

    __tablename__ = "search_results"

    # 外键
    query_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("queries.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联的查询 ID"
    )
    content_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("contents.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联的内容 ID"
    )

    # 业务字段
    rank: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="排名位置 (从 1 开始)"
    )
    score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="相关性评分 (0-1)"
    )

    # 关系
    query: Mapped["Query"] = relationship(
        "Query",
        back_populates="search_results",
        lazy="selectin"
    )
    content: Mapped["Content"] = relationship(
        "Content",
        back_populates="search_results",
        lazy="selectin"
    )

    # 索引和约束
    __table_args__ = (
        Index('idx_search_results_query_id', 'query_id'),
        Index('idx_search_results_content_id', 'content_id'),
        Index('idx_search_results_query_content', 'query_id', 'content_id', unique=True),
        Index('idx_search_results_rank', 'query_id', 'rank'),
    )

    def __repr__(self) -> str:
        """字符串表示"""
        return f"SearchResult(id={self.id}, query_id={self.query_id}, rank={self.rank})"
```

---

### 5. Task 模型 (异步任务)

#### 职责
管理异步任务的生命周期，包括任务类型、状态、负载和结果。

#### 表结构
```sql
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    task_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    payload JSONB,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

#### 字段定义

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | str (UUID) | PK, NOT NULL | 主键，继承自 Base |
| task_type | str | NOT NULL, VARCHAR(50) | 任务类型 (如 "search", "crawl") |
| status | str | NOT NULL, VARCHAR(20) | 任务状态 |
| payload | dict | JSONB | 任务负载 (输入参数) |
| result | dict | JSONB | 任务结果 (输出数据) |
| error_message | str | TEXT | 错误信息 (失败时记录) |
| created_at | datetime | NOT NULL | 创建时间，继承自 Base |
| updated_at | datetime | NOT NULL | 更新时间，继承自 Base |

#### 枚举定义

```python
class TaskStatus(str, Enum):
    """任务状态枚举"""
    PENDING = "pending"      # 等待执行
    RUNNING = "running"      # 执行中
    COMPLETED = "completed"  # 已完成
    FAILED = "failed"        # 失败
    CANCELLED = "cancelled"  # 已取消

class TaskType(str, Enum):
    """任务类型枚举"""
    SEARCH = "search"        # 搜索任务
    CRAWL = "crawl"          # 爬取任务
    ANALYZE = "analyze"      # 分析任务
```

#### 索引设计

```python
__table_args__ = (
    Index('idx_tasks_status', 'status'),
    Index('idx_tasks_task_type', 'task_type'),
    Index('idx_tasks_created_at', 'created_at'),
    Index('idx_tasks_status_created', 'status', 'created_at'),  # 查询待处理任务
)
```

#### 关系定义

- 无外键关系 (独立模型)

#### 代码契约 (Python Stub)

```python
# File: src/backend/app/models/task.py

from enum import Enum
from typing import Any
from sqlalchemy import Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class TaskStatus(str, Enum):
    """任务状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskType(str, Enum):
    """任务类型枚举"""
    SEARCH = "search"
    CRAWL = "crawl"
    ANALYZE = "analyze"


class Task(Base):
    """异步任务模型

    职责：
    - 管理异步任务的生命周期
    - 存储任务输入 (payload) 和输出 (result)
    - 记录任务执行状态和错误信息

    约束：
    - task_type: 必填，任务类型
    - status: 必填，任务状态 (见 TaskStatus)
    - payload: 可选，JSONB 格式的任务输入
    - result: 可选，JSONB 格式的任务输出
    - error_message: 可选，失败时记录错误信息
    """

    __tablename__ = "tasks"

    # 业务字段
    task_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="任务类型"
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=TaskStatus.PENDING,
        comment="任务状态"
    )
    payload: Mapped[dict[str, Any] | None] = mapped_column(
        nullable=True,
        comment="任务负载 (输入参数)"
    )
    result: Mapped[dict[str, Any] | None] = mapped_column(
        nullable=True,
        comment="任务结果 (输出数据)"
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="错误信息"
    )

    # 索引
    __table_args__ = (
        Index('idx_tasks_status', 'status'),
        Index('idx_tasks_task_type', 'task_type'),
        Index('idx_tasks_created_at', 'created_at'),
        Index('idx_tasks_status_created', 'status', 'created_at'),
    )

    def __repr__(self) -> str:
        """字符串表示"""
        return f"Task(id={self.id}, type={self.task_type}, status={self.status})"

    def is_finished(self) -> bool:
        """判断任务是否已完成（成功或失败）"""
        return self.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED)

    def is_running(self) -> bool:
        """判断任务是否正在运行"""
        return self.status == TaskStatus.RUNNING
```

---

## 文件结构

### 目录布局

```
src/backend/app/models/
├── __init__.py           # 导出所有模型
├── base.py              # 基类 (已存在)
├── user.py              # User 模型
├── query.py             # Query 模型
├── content.py           # Content 模型
├── search_result.py     # SearchResult 模型
└── task.py              # Task 模型
```

### `__init__.py` 导出结构

```python
# File: src/backend/app/models/__init__.py

"""
Models Package

包含所有数据库模型定义
"""

from .base import Base
from .user import User
from .query import Query
from .content import Content
from .search_result import SearchResult
from .task import Task, TaskStatus, TaskType

__all__ = [
    # Base
    "Base",
    # Models
    "User",
    "Query",
    "Content",
    "SearchResult",
    "Task",
    # Enums
    "TaskStatus",
    "TaskType",
]
```

---

## 代码契约

### 1. 模型职责边界

#### User 模型
- **负责**: 存储用户认证信息和状态
- **不负责**: 密码加密逻辑 (应在 Service 层)
- **不负责**: 查询历史过滤 (应在 Service 层)

#### Query 模型
- **负责**: 记录查询文本和参数
- **不负责**: 查询结果排序 (应通过 rank 字段实现)
- **不负责**: 用户权限验证 (应在 Service 层)

#### Content 模型
- **负责**: 存储内容和去重
- **不负责**: 内容爬取 (应在 Service 层)
- **不负责**: 内容摘要生成 (应在 Service 层)

#### SearchResult 模型
- **负责**: 关联查询和内容
- **负责**: 存储排名和评分
- **不负责**: 相关性计算 (应在 Service 层)

#### Task 模型
- **负责**: 记录任务状态和结果
- **不负责**: 任务执行逻辑 (应在 Service 层)
- **不负责**: 任务调度 (应在 Service 层)

### 2. 模型交互规则

#### 级联删除规则
- `Query.user_id`: ON DELETE CASCADE (用户删除时删除其查询)
- `SearchResult.query_id`: ON DELETE CASCADE (查询删除时删除其结果)
- `SearchResult.content_id`: ON DELETE CASCADE (内容删除时删除关联结果)

#### 关系加载策略
- 一对多关系: 使用 `lazy="selectin"` (避免 N+1 查询)
- 多对一关系: 使用 `lazy="selectin"`
- 可选: 对于大数据量场景，可使用 `lazy="raised"` 强制显式加载

#### JSONB 字段处理
- `query_params`: 存储查询参数 (如 `{"limit": 10, "offset": 0}`)
- `payload`: 存储任务输入 (如 `{"url": "...", "depth": 2}`)
- `result`: 存储任务输出 (如 `{"total": 100, "items": [...]}`)

### 3. 数据验证规则

#### 字段长度限制
- `username`: 最多 50 字符
- `email`: 最多 255 字符
- `title`: 最多 500 字符
- `task_type`: 最多 50 字符
- `status`: 最多 20 字符

#### 哈希值规范
- `content_hash`: 固定 64 字符 (SHA-256 十六进制)
- `hashed_password`: 固定 60 字符 (bcrypt)

#### 枚举值约束
- `Task.status`: 必须是 TaskStatus 枚举值之一
- `Task.task_type`: 必须是 TaskType 枚举值之一

---

## 测试策略

### 1. 测试文件结构

```
tests/backend/
├── test_models_user.py         # User 模型测试
├── test_models_query.py        # Query 模型测试
├── test_models_content.py      # Content 模型测试
├── test_models_search_result.py # SearchResult 模型测试
├── test_models_task.py          # Task 模型测试
└── test_models_relationships.py # 模型关系测试
```

### 2. 测试用例建议

#### `test_models_user.py`

```python
class TestUserFields:
    """测试 User 模型字段"""
    def test_user_has_username_field()
    def test_user_has_email_field()
    def test_user_has_hashed_password_field()
    def test_user_has_is_active_field()
    def test_user_username_is_unique()
    def test_user_email_is_unique()

class TestUserValidation:
    """测试 User 模型验证"""
    def test_user_username_max_length()
    def test_user_email_format()
    def test_user_is_active_defaults_to_true()

class TestUserRelationships:
    """测试 User 关系"""
    def test_user_has_queries_relationship()
    def test_user_queries_is_list()
```

#### `test_models_query.py`

```python
class TestQueryFields:
    """测试 Query 模型字段"""
    def test_query_has_user_id_field()
    def test_query_has_query_text_field()
    def test_query_has_query_params_field()

class TestQueryValidation:
    """测试 Query 模型验证"""
    def test_query_user_id_is_foreign_key()
    def test_query_params_accepts_jsonb()
    def test_query_text_is_required()

class TestQueryRelationships:
    """测试 Query 关系"""
    def test_query_belongs_to_user()
    def test_query_has_search_results()
```

#### `test_models_content.py`

```python
class TestContentFields:
    """测试 Content 模型字段"""
    def test_content_has_url_field()
    def test_content_has_title_field()
    def test_content_has_summary_field()
    def test_content_has_content_hash_field()

class TestContentValidation:
    """测试 Content 模型验证"""
    def test_content_hash_is_unique()
    def test_content_hash_length_is_64()
    def test_content_title_max_length()
    def test_content_url_is_required()
```

#### `test_models_search_result.py`

```python
class TestSearchResultFields:
    """测试 SearchResult 模型字段"""
    def test_search_result_has_query_id_field()
    def test_search_result_has_content_id_field()
    def test_search_result_has_rank_field()
    def test_search_result_has_score_field()

class TestSearchResultValidation:
    """测试 SearchResult 模型验证"""
    def test_search_result_query_content_unique()
    def test_search_result_rank_is_required()
    def test_search_result_score_range()

class TestSearchResultRelationships:
    """测试 SearchResult 关系"""
    def test_search_result_belongs_to_query()
    def test_search_result_belongs_to_content()
```

#### `test_models_task.py`

```python
class TestTaskFields:
    """测试 Task 模型字段"""
    def test_task_has_task_type_field()
    def test_task_has_status_field()
    def test_task_has_payload_field()
    def test_task_has_result_field()
    def test_task_has_error_message_field()

class TestTaskValidation:
    """测试 Task 模型验证"""
    def test_task_status_defaults_to_pending()
    def test_task_status_is_valid_enum()
    def test_task_type_is_valid_enum()

class TestTaskMethods:
    """测试 Task 方法"""
    def test_task_is_finished_returns_true_when_completed()
    def test_task_is_finished_returns_true_when_failed()
    def test_task_is_running_returns_true_when_running()
```

#### `test_models_relationships.py`

```python
class TestModelRelationships:
    """测试模型之间的完整关系"""
    def test_user_query_cascade_delete()
    def test_query_search_result_cascade_delete()
    def test_content_search_result_cascade_delete()
    def test_query_loads_user_relationship()
    def test_search_result_loads_query_and_content()
```

### 3. 测试覆盖要点

- **字段测试**: 验证所有字段存在、类型正确、约束生效
- **关系测试**: 验证外键关系、级联删除、懒加载策略
- **索引测试**: 验证唯一索引、复合索引生效
- **方法测试**: 验证自定义方法 (如 `is_finished()`, `to_dict()`)
- **边界测试**: 验证 NULL 值、空字符串、超长字符串
- **集成测试**: 验证完整的 CRUD 操作

### 4. 测试运行命令

```bash
# 运行所有模型测试
pytest tests/backend/test_models_*.py -v

# 运行单个模型测试
pytest tests/backend/test_models_user.py -v

# 查看测试覆盖率
pytest tests/backend/test_models_*.py --cov=src/backend/app/models --cov-report=html
```

---

## 实施步骤

### Phase 1: 创建 User 模型
1. 创建 `src/backend/app/models/user.py`
2. 实现 User 类的字段、关系、索引
3. 更新 `__init__.py` 导出 User
4. 编写测试 `test_models_user.py`
5. 运行测试验证

### Phase 2: 创建 Query 模型
1. 创建 `src/backend/app/models/query.py`
2. 实现 Query 类的字段、关系、索引
3. 更新 `__init__.py` 导出 Query
4. 编写测试 `test_models_query.py`
5. 运行测试验证

### Phase 3: 创建 Content 模型
1. 创建 `src/backend/app/models/content.py`
2. 实现 Content 类的字段、关系、索引
3. 更新 `__init__.py` 导出 Content
4. 编写测试 `test_models_content.py`
5. 运行测试验证

### Phase 4: 创建 SearchResult 模型
1. 创建 `src/backend/app/models/search_result.py`
2. 实现 SearchResult 类的字段、关系、索引
3. 更新 `__init__.py` 导出 SearchResult
4. 编写测试 `test_models_search_result.py`
5. 运行测试验证

### Phase 5: 创建 Task 模型
1. 创建 `src/backend/app/models/task.py`
2. 实现 Task 类和枚举 (TaskStatus, TaskType)
3. 更新 `__init__.py` 导出 Task 和枚举
4. 编写测试 `test_models_task.py`
5. 运行测试验证

### Phase 6: 关系测试和集成
1. 编写 `test_models_relationships.py`
2. 验证所有关系配置正确
3. 验证级联删除生效
4. 运行完整测试套件

---

## 验收标准

### 代码质量
- [ ] 所有 5 个模型类已创建
- [ ] 字段定义符合蓝图规范
- [ ] 外键关系正确建立
- [ ] 索引配置正确 (包括唯一索引和复合索引)
- [ ] 枚举类定义完整
- [ ] 类型注解完整 (支持 mypy 检查)
- [ ] Docstring 注释完整

### 测试覆盖
- [ ] 每个模型有独立的测试文件
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试通过
- [ ] 关系测试验证级联删除
- [ ] 边界测试覆盖 NULL 值、超长字符串

### 功能验证
- [ ] 模型可以通过 ORM 正常使用
- [ ] 关系加载正常 (lazy="selectin")
- [ ] 级联删除生效
- [ ] JSONB 字段正常读写
- [ ] 唯一约束生效
- [ ] 复合索引生效

### 文档完整
- [ ] 所有字段有 comment 注释
- [ ] 所有类有 docstring 说明
- [ ] 所有方法有 docstring 说明
- [ ] 蓝图文档已创建

---

## 附录

### A. SQLAlchemy 2.0 语法参考

```python
# 类型提示语法
from sqlalchemy.orm import Mapped, mapped_column

# 字段定义
username: Mapped[str] = mapped_column(String(50), nullable=False)

# 可选字段
email: Mapped[str | None] = mapped_column(String(255), nullable=True)

# 外键
user_id: Mapped[str] = mapped_column(
    ForeignKey("users.id", ondelete="CASCADE"),
    nullable=False
)

# 关系定义
from sqlalchemy.orm import relationship

user: Mapped["User"] = relationship(
    "User",
    back_populates="queries",
    lazy="selectin"
)
```

### B. PostgreSQL JSONB 使用

```python
# JSONB 字段定义
from sqlalchemy.dialects.postgresql import JSONB

query_params: Mapped[dict[str, Any] | None] = mapped_column(
    JSONB,
    nullable=True
)

# 使用示例
query.query_params = {"limit": 10, "filters": {"status": "active"}}
```

### C. 索引命名规范

```python
# 单列索引
Index('idx_users_username', 'username')

# 唯一索引
Index('idx_contents_content_hash', 'content_hash', unique=True)

# 复合索引
Index('idx_queries_user_created', 'user_id', 'created_at')

# 复合唯一索引
Index('idx_search_results_query_content', 'query_id', 'content_id', unique=True)
```

### D. 关系加载策略

```python
# selectin: 使用 IN 查询预加载 (推荐)
relationship("User", back_populates="queries", lazy="selectin")

# joined: 使用 JOIN 预加载
relationship("User", back_populates="queries", lazy="joined")

# select: 懒加载 (默认)
relationship("User", back_populates="queries", lazy="select")

# raised: 禁止懒加载，强制显式加载
relationship("User", back_populates="queries", lazy="raised")
```

### E. 迁移命令 (未来使用)

```bash
# 生成迁移文件 (未来使用 Alembic)
alembic revision --autogenerate -m "Add user, query, content models"

# 执行迁移
alembic upgrade head

# 回滚迁移
alembic downgrade -1
```

---

**蓝图结束**

下一步: task-tester 根据此蓝图编写测试用例，task-developer 根据此蓝图实现模型代码。
