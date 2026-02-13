# Issue #53 测试清单

## 测试文件列表

- [x] `test_models_user.py` - User 模型测试
- [x] `test_models_query.py` - Query 模型测试
- [x] `test_models_content.py` - Content 模型测试
- [x] `test_models_search_result.py` - SearchResult 模型测试
- [x] `test_models_task.py` - Task 模型测试
- [x] `test_models_relationships.py` - 模型关系集成测试

## 测试覆盖验证

### User 模型
- [x] 字段存在性测试
  - [x] id, username, email, hashed_password, is_active, created_at, updated_at
- [x] 字段类型测试
  - [x] username: str
  - [x] email: str
  - [x] hashed_password: str
  - [x] is_active: bool
- [x] 字段约束测试
  - [x] username: max_length=50, nullable=False, unique=True
  - [x] email: max_length=255, nullable=False, unique=True
  - [x] hashed_password: max_length=255, nullable=False
  - [x] is_active: nullable=False, default=True
- [x] 索引测试
  - [x] idx_users_username
  - [x] idx_users_email
- [x] 关系测试
  - [x] queries: List[Query]
- [x] 方法测试
  - [x] `to_dict()` - 排除 hashed_password
  - [x] `__repr__()` - 包含 id, username, email

### Query 模型
- [x] 字段存在性测试
  - [x] id, user_id, query_text, query_params, created_at, updated_at
- [x] 字段类型测试
  - [x] user_id: str
  - [x] query_text: str
  - [x] query_params: dict | None
- [x] 字段约束测试
  - [x] user_id: nullable=False
  - [x] query_text: nullable=False
  - [x] query_params: nullable=True
- [x] 外键测试
  - [x] user_id → users.id
  - [x] ON DELETE CASCADE
- [x] 索引测试
  - [x] idx_queries_user_id
  - [x] idx_queries_created_at
  - [x] idx_queries_user_created (复合)
- [x] 关系测试
  - [x] user: User
  - [x] search_results: List[SearchResult]
- [x] 方法测试
  - [x] `to_dict()` - 包含所有字段
  - [x] `__repr__()` - 包含 id, user_id, 部分 query_text

### Content 模型
- [x] 字段存在性测试
  - [x] id, url, title, summary, content_hash, created_at, updated_at
- [x] 字段类型测试
  - [x] url: str
  - [x] title: str | None
  - [x] summary: str | None
  - [x] content_hash: str
- [x] 字段约束测试
  - [x] url: nullable=False
  - [x] title: nullable=True, max_length=500
  - [x] summary: nullable=True
  - [x] content_hash: nullable=False, unique=True, length=64
- [x] 索引测试
  - [x] idx_contents_content_hash (唯一)
  - [x] idx_contents_created_at
- [x] 关系测试
  - [x] search_results: List[SearchResult]
- [x] 方法测试
  - [x] `to_dict()` - 包含所有字段
  - [x] `__repr__()` - 包含 id, 部分 title, 部分 hash, N/A 处理

### SearchResult 模型
- [x] 字段存在性测试
  - [x] id, query_id, content_id, rank, score, created_at, updated_at
- [x] 字段类型测试
  - [x] query_id: str
  - [x] content_id: str
  - [x] rank: int
  - [x] score: float | None
- [x] 字段约束测试
  - [x] query_id: nullable=False
  - [x] content_id: nullable=False
  - [x] rank: nullable=False
  - [x] score: nullable=True
- [x] 外键测试
  - [x] query_id → queries.id, ON DELETE CASCADE
  - [x] content_id → contents.id, ON DELETE CASCADE
- [x] 索引测试
  - [x] idx_search_results_query_id
  - [x] idx_search_results_content_id
  - [x] idx_search_results_query_content (唯一复合)
  - [x] idx_search_results_rank (复合)
- [x] 关系测试
  - [x] query: Query
  - [x] content: Content
- [x] 方法测试
  - [x] `to_dict()` - 包含所有字段
  - [x] `__repr__()` - 包含 id, query_id, rank

### Task 模型
- [x] 枚举测试
  - [x] TaskStatus: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
  - [x] TaskType: SEARCH, CRAWL, ANALYZE
- [x] 字段存在性测试
  - [x] id, task_type, status, payload, result, error_message, created_at, updated_at
- [x] 字段类型测试
  - [x] task_type: str
  - [x] status: str
  - [x] payload: dict | None
  - [x] result: dict | None
  - [x] error_message: str | None
- [x] 字段约束测试
  - [x] task_type: nullable=False, max_length=50
  - [x] status: nullable=False, max_length=20, default=PENDING
  - [x] payload: nullable=True
  - [x] result: nullable=True
  - [x] error_message: nullable=True
- [x] 索引测试
  - [x] idx_tasks_status
  - [x] idx_tasks_task_type
  - [x] idx_tasks_created_at
  - [x] idx_tasks_status_created (复合)
- [x] 自定义方法测试
  - [x] `is_finished()` - COMPLETED/FAILED/CANCELLED → True
  - [x] `is_running()` - RUNNING → True
- [x] 方法测试
  - [x] `to_dict()` - 包含所有字段
  - [x] `__repr__()` - 包含 id, task_type, status

### 模型关系测试
- [x] User ↔ Query
  - [x] User.queries 关系
  - [x] Query.user 关系
  - [x] back_populates 配置
  - [x] 一对多关系
- [x] Query ↔ SearchResult
  - [x] Query.search_results 关系
  - [x] SearchResult.query 关系
  - [x] back_populates 配置
  - [x] cascade='all, delete-orphan'
  - [x] 一对多关系
- [x] Content ↔ SearchResult
  - [x] Content.search_results 关系
  - [x] SearchResult.content 关系
  - [x] back_populates 配置
  - [x] 一对多关系
- [x] 级联删除配置
  - [x] Query.user_id ON DELETE CASCADE
  - [x] SearchResult.query_id ON DELETE CASCADE
  - [x] SearchResult.content_id ON DELETE CASCADE
- [x] 关系加载策略
  - [x] 所有关系使用 lazy="selectin"

### 集成测试
- [x] 表名验证
  - [x] users, queries, contents, search_results, tasks
- [x] 继承验证
  - [x] 所有模型继承自 Base
- [x] Base 字段验证
  - [x] 所有模型都有 id, created_at, updated_at
- [x] Base 方法验证
  - [x] 所有模型都有 to_dict(), __repr__()
- [x] 索引存在性验证
  - [x] 所有模型的索引都存在
- [x] 模型导出验证
  - [x] 所有模型可以从 models 包导入
- [x] Task 独立性验证
  - [x] Task 没有关系定义
- [x] 字段数量验证
  - [x] 每个模型的字段数量正确

## 测试统计

- **总测试文件数**: 6
- **总测试用例数**: 299
- **覆盖的模型**: 5
- **测试的类**: 70+
- **测试的关系**: 6 个双向关系

## 运行测试

### 所有模型测试
```bash
pytest tests/backend/test_models*.py -v
```

### 单个模型测试
```bash
pytest tests/backend/test_models_user.py -v
pytest tests/backend/test_models_query.py -v
pytest tests/backend/test_models_content.py -v
pytest tests/backend/test_models_search_result.py -v
pytest tests/backend/test_models_task.py -v
pytest tests/backend/test_models_relationships.py -v
```

### 带覆盖率的测试
```bash
pytest tests/backend/test_models*.py --cov=src/backend/app/models --cov-report=html
```

## 验收标准

- [ ] 所有 299 个测试通过
- [ ] 测试覆盖率 > 80%
- [ ] 无导入错误
- [ ] 无运行时错误
- [ ] 所有模型可以正常创建和使用
- [ ] 所有关系配置正确
- [ ] 所有索引生效
- [ ] 所有约束生效
- [ ] 级联删除生效

---

**清单创建时间**: 2026-02-13
**目标 Issue**: #53
**测试策略**: TDD Red First
