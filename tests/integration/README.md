# 集成测试指南

## 概述

本目录包含 Scryer 项目的 Docker 容器化环境集成测试。这些测试验证服务间通信、数据持久化和各种集成场景。

## 前置要求

- Docker 和 Docker Compose 已安装
- `.env` 文件已配置（可从 `.env.example` 复制）

## 测试结构

```
tests/integration/
├── __init__.py           # 包初始化
├── conftest.py            # Pytest fixtures 和配置
├── helpers.py             # 测试辅助函数
├── test_database.py       # PostgreSQL 数据库集成测试
├── test_redis.py          # Redis 集成测试
├── test_alembic.py        # Alembic 迁移测试
├── test_health.py         # 健康检查集成测试
└── README.md              # 本文档
```

## 运行测试

### 方式一：使用 Docker Compose（推荐）

```bash
# 运行所有集成测试
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# 运行特定测试文件
docker-compose -f docker-compose.test.yml run integration-tests pytest tests/integration/test_database.py

# 运行带覆盖率报告的测试
PYTEST_ADDOPTS="--cov=src --cov-report=term" docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### 方式二：使用测试脚本

```bash
# 运行集成测试（自动启动容器）
./scripts/run-integration-tests.sh

# 详细输出
./scripts/run-integration-tests.sh --verbose

# 不生成覆盖率报告
./scripts/run-integration-tests.sh --no-coverage
```

### 方式三：手动运行

如果基础设施容器已在运行：

```bash
# 确保测试数据库和 Redis 容器在运行
docker-compose -f docker-compose.test.yml up -d postgres-test redis-test

# 设置环境变量
export DATABASE_URL="postgresql+asyncpg://scryer:scryer_dev_password_change_me@localhost:5433/scryer_test"
export REDIS_URL="redis://localhost:6380/1"

# 运行测试
pytest tests/integration/ -v
```

## 测试内容

### 1. 数据库集成测试 (`test_database.py`)

- PostgreSQL 容器连接测试
- 数据库连接池测试
- 基本 CRUD 操作
- 事务隔离和回滚

### 2. Redis 集成测试 (`test_redis.py`)

- Redis 容器连接测试
- 基本操作（GET, SET, DELETE）
- 数据过期和 TTL
- 列表和哈希操作
- 并发和管道操作

### 3. Alembic 迁移测试 (`test_alembic.py`)

- Alembic 配置验证
- 迁移执行测试
- 表创建和删除
- 数据完整性验证

### 4. 健康检查测试 (`test_health.py`)

- 数据库健康检查
- Redis 健康检查
- 延迟统计
- 错误处理

## Fixtures 说明

主要 fixtures 定义在 `conftest.py` 中：

### 容器可用性检查

- `check_postgres_container`: 验证 PostgreSQL 容器可用
- `check_redis_container`: 验证 Redis 容器可用

### 数据库 Fixtures

- `docker_db_engine`: 会话级数据库引擎
- `docker_db_session`: 函数级数据库会话（自动回滚）
- `clean_database`: 测试后清理数据

### Redis Fixtures

- `docker_redis_pool`: 会话级 Redis 连接池
- `docker_redis_client`: 函数级 Redis 客户端（自动清空）
- `flush_redis`: 测试后清空 Redis 数据

### Alembic Fixtures

- `run_alembic_migrations`: 运行所有迁移

### 健康检查 Fixtures

- `database_health_status`: 数据库健康状态
- `redis_health_status`: Redis 健康状态

### 服务等待

- `wait_for_services`: 等待所有服务就绪

## 环境变量

测试环境使用以下环境变量（可在 `.env` 中配置）：

```bash
# 数据库配置
POSTGRES_USER=scryer
POSTGRES_PASSWORD=scryer_dev_password_change_me
POSTGRES_DB=scryer_test

# 测试环境连接
DATABASE_URL=postgresql+asyncpg://scryer:password@postgres-test:5432/scryer_test
REDIS_URL=redis://redis-test:6379/1
```

## 测试标记

可以使用 pytest 标记来运行特定测试：

```bash
# 只运行数据库测试
pytest tests/integration/ -m postgres

# 只运行 Redis 测试
pytest tests/integration/ -m redis

# 跳过慢速测试
pytest tests/integration/ -m "not slow"
```

## 故障排查

### 容器无法启动

```bash
# 查看容器日志
docker-compose -f docker-compose.test.yml logs postgres-test
docker-compose -f docker-compose.test.yml logs redis-test

# 重启容器
docker-compose -f docker-compose.test.yml restart
```

### 测试超时

如果测试超时，可能是：

1. 容器健康检查未通过
2. 网络连接问题
3. 资源不足

查看容器状态：

```bash
docker-compose -f docker-compose.test.yml ps
```

### 清理测试环境

```bash
# 停止并删除容器
docker-compose -f docker-compose.test.yml down

# 删除容器和数据卷
docker-compose -f docker-compose.test.yml down -v
```

## 覆盖率报告

测试完成后，覆盖率报告会生成在：

- HTML 报告: `test-results/coverage/index.html`
- XML 报告: `test-results/coverage.xml`
- 终端输出: 运行时显示

## 最佳实践

1. **测试隔离**: 每个测试应该独立运行，不依赖其他测试
2. **数据清理**: 使用 fixtures 自动清理测试数据
3. **容器检查**: 使用容器可用性检查跳过不可用服务的测试
4. **异步测试**: 所有测试使用 `@pytest.mark.asyncio` 标记
5. **超时设置**: 为网络操作设置合理的超时时间

## 验收标准

Issue #63 的验收标准：

- [ ] 集成测试可通过 docker-compose up --abort-on-container-exit 运行
- [ ] 数据库连接测试通过
- [ ] Redis 连接测试通过
- [ ] Alembic 迁移测试通过
- [ ] 测试覆盖率 > 80%
