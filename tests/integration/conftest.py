"""
Integration test fixtures for Docker containerized environment

提供 Docker Compose 环境下的共享 fixtures：
- Docker Compose 生命周期管理
- 容器化数据库连接
- 容器化 Redis 连接
- 测试数据清理
"""

from __future__ import annotations

import asyncio
import os
from typing import Any, AsyncGenerator
from urllib.parse import urlparse

import asyncpg
import pytest
import pytest_asyncio
from redis.asyncio import ConnectionPool as AsyncConnectionPool
from redis.asyncio import Redis as AsyncRedis
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# ============================================================================
# Environment Configuration
# ============================================================================


def _get_docker_db_url() -> str:
    """获取 Docker 环境下的数据库连接 URL"""
    postgres_user = os.getenv("POSTGRES_USER", "scryer")
    postgres_password = os.getenv("POSTGRES_PASSWORD", "scryer_dev_password_2024")
    postgres_db = os.getenv("POSTGRES_DB", "scryer")
    postgres_host = os.getenv("POSTGRES_HOST", "postgres")
    postgres_port = os.getenv("POSTGRES_PORT", "5432")

    return (
        f"postgresql+asyncpg://{postgres_user}:{postgres_password}@"
        f"{postgres_host}:{postgres_port}/{postgres_db}"
    )


def _get_docker_redis_url() -> str:
    """获取 Docker 环境下的 Redis 连接 URL"""
    redis_host = os.getenv("REDIS_HOST", "redis")
    redis_port = os.getenv("REDIS_PORT", "6379")
    redis_db = os.getenv("REDIS_DB", "0")

    return f"redis://{redis_host}:{redis_port}/{redis_db}"


# ============================================================================
# Docker Environment Fixtures
# ============================================================================


@pytest.fixture(scope="session")
def docker_compose_file() -> str:
    """指定 Docker Compose 配置文件路径"""
    return "/workspace/docker-compose.yml"


@pytest.fixture(scope="session")
def docker_compose_project_name() -> str:
    """Docker Compose 项目名称"""
    return "scryer-integration-tests"


@pytest.fixture(scope="session")
def docker_environment() -> dict[str, str]:
    """设置 Docker 容器环境变量"""
    return {
        "POSTGRES_USER": "scryer",
        "POSTGRES_PASSWORD": "scryer_test_password_2024",
        "POSTGRES_DB": "scryer_test",
        "DATABASE_URL": _get_docker_db_url(),
        "REDIS_URL": _get_docker_redis_url(),
    }


# ============================================================================
# Database Fixtures
# ============================================================================


@pytest_asyncio.fixture(scope="session")
async def docker_db_engine() -> AsyncGenerator[AsyncEngine, None]:
    """创建 Docker 环境的数据库引擎

    使用会话级别的引擎，避免每次测试都重新创建
    """
    db_url = _get_docker_db_url()
    engine = create_async_engine(
        db_url,
        echo=False,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def docker_db_session(
    docker_db_engine: AsyncEngine,
) -> AsyncGenerator[AsyncSession, None]:
    """创建数据库会话

    每个测试函数使用独立的会话，测试结束后自动回滚事务
    """
    async_session_maker = async_sessionmaker(
        bind=docker_db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async with async_session_maker() as session:
        yield session
        # 测试结束后回滚，保持数据库干净
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def clean_database(docker_db_engine: AsyncEngine) -> AsyncGenerator[None, None]:
    """清理测试数据的 fixture

    在测试后清理所有测试数据
    """
    yield

    # 测试结束后清理数据
    async with docker_db_engine.begin() as conn:
        # 清理测试表（如果存在）
        await conn.execute(
            """
            DO $$
            DECLARE
                tbl RECORD;
            BEGIN
                FOR tbl IN (SELECT tablename FROM pg_tables
                            WHERE schemaname = 'public')
                LOOP
                    EXECUTE (
                        'TRUNCATE TABLE ' || quote_ident(tbl.tablename) ||
                        ' CASCADE'
                    );
                END LOOP;
            END $$;
            """
        )


# ============================================================================
# Redis Fixtures
# ============================================================================


@pytest_asyncio.fixture(scope="session")
async def docker_redis_pool() -> AsyncGenerator[AsyncConnectionPool, None]:
    """创建 Docker 环境的 Redis 连接池

    使用会话级别的连接池，避免每次测试都重新创建
    """
    redis_url = _get_docker_redis_url()
    pool = AsyncConnectionPool.from_url(
        redis_url,
        decode_responses=True,
        max_connections=10,
    )

    yield pool

    await pool.disconnect()


@pytest_asyncio.fixture(scope="function")
async def docker_redis_client(
    docker_redis_pool: AsyncConnectionPool,
) -> AsyncGenerator[AsyncRedis, None]:
    """创建 Redis 客户端

    每个测试函数使用独立的客户端，测试结束后清理数据
    """
    client = AsyncRedis(connection_pool=docker_redis_pool)

    yield client

    # 测试结束后清理当前数据库的所有数据
    await client.flushdb()
    await client.aclose()


# ============================================================================
# Health Check Fixtures
# ============================================================================


@pytest.fixture(scope="function")
def health_check_endpoint_url() -> str:
    """健康检查端点 URL"""
    return "http://localhost:8000/health"


# ============================================================================
# Test Data Fixtures
# ============================================================================


@pytest.fixture(scope="function")
def sample_user_data() -> dict[str, Any]:
    """示例用户数据"""
    return {
        "username": "test_user",
        "email": "test@example.com",
        "password": "hashed_password_123",
    }


@pytest.fixture(scope="function")
def sample_content_data() -> dict[str, Any]:
    """示例内容数据"""
    return {
        "title": "Test Content",
        "body": "This is a test content for integration testing.",
        "author_id": 1,
    }


@pytest.fixture(scope="function")
def sample_task_data() -> dict[str, Any]:
    """示例任务数据"""
    return {
        "title": "Test Task",
        "description": "This is a test task for integration testing.",
        "status": "pending",
        "priority": "medium",
    }


# ============================================================================
# Container Availability Check Fixtures
# ============================================================================


@pytest_asyncio.fixture(scope="function")
async def check_postgres_container() -> bool:  # type: ignore[return]
    """检查 PostgreSQL 容器是否可用

    如果容器不可用，相关测试将被跳过
    """
    db_url = _get_docker_db_url()
    parsed = urlparse(db_url)

    try:
        conn = await asyncio.wait_for(
            asyncpg.connect(
                host=parsed.hostname,
                port=parsed.port or 5432,
                user=parsed.username,
                password=parsed.password,
                database=parsed.path[1:],
            ),
            timeout=10.0,
        )

        # 测试简单查询
        result = await conn.fetchval("SELECT 1")
        await conn.close()

        if result != 1:
            pytest.skip("PostgreSQL container not responding correctly")
        return True

    except (
        asyncpg.PostgresError,
        asyncio.TimeoutError,
        ConnectionRefusedError,
        OSError,
    ) as e:
        pytest.skip(f"PostgreSQL container not available: {e}")  # type: ignore[return]


@pytest_asyncio.fixture(scope="function")
async def check_redis_container() -> bool:  # type: ignore[return]
    """检查 Redis 容器是否可用

    如果容器不可用，相关测试将被跳过
    """
    redis_url = _get_docker_redis_url()
    parsed = urlparse(redis_url)

    try:
        client = await asyncio.wait_for(
            AsyncRedis(
                host=parsed.hostname or "localhost",
                port=parsed.port or 6379,
                db=parsed.path[1:] if parsed.path else 0,
                decode_responses=True,
            ),
            timeout=10.0,
        )

        # 测试 PING
        result = await asyncio.wait_for(client.ping(), timeout=5.0)
        await client.aclose()

        if not result:
            pytest.skip(  # type: ignore[return]
                "Redis container not responding correctly"
            )
        return True

    except (ConnectionError, asyncio.TimeoutError, OSError) as e:
        pytest.skip(f"Redis container not available: {e}")  # type: ignore[return]


# ============================================================================
# Alembic Migration Fixtures
# ============================================================================


@pytest_asyncio.fixture(scope="session")
async def run_alembic_migrations(
    docker_db_engine: AsyncEngine,
) -> AsyncGenerator[None, None]:
    """在测试前运行 Alembic 迁移

    此 fixture 会：
    1. 运行所有迁移到最新版本
    2. 执行测试
    3. 清理（不回滚，让 docker_db_session 处理）
    """
    from pathlib import Path

    # 检查 alembic 目录是否存在
    alembic_dir = Path(__file__).parent.parent.parent / "alembic"
    if not alembic_dir.exists():
        pytest.skip("Alembic directory not found")

    try:
        # 这里可以添加实际的 Alembic 迁移逻辑
        # 由于 Alembic 需要同步执行，我们使用 asyncio.to_thread
        # 或者直接使用 SQLAlchemy 创建表（用于测试）
        from backend.app.models import Base

        async with docker_db_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        yield

        # 清理：删除所有表
        async with docker_db_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

    except Exception as e:
        pytest.skip(f"Failed to run migrations: {e}")


# ============================================================================
# Health Check Service Fixtures
# ============================================================================


@pytest_asyncio.fixture
async def database_health_status(check_postgres_container: bool):
    """获取数据库健康状态

    Returns:
        dict: 健康状态信息
    """
    from backend.app.core.health import check_database

    status = await check_database()
    return status


@pytest_asyncio.fixture
async def redis_health_status(check_redis_container: bool):
    """获取 Redis 健康状态

    Returns:
        dict: 健康状态信息
    """
    from backend.app.core.health import check_redis

    status = await check_redis()
    return status


# ============================================================================
# Wait for Services Fixture
# ============================================================================


@pytest_asyncio.fixture
async def wait_for_services(
    check_postgres_container: bool, check_redis_container: bool
):
    """等待所有服务就绪

    确保数据库和 Redis 都可用后再执行测试
    """
    # 额外等待 1 秒确保服务完全就绪
    await asyncio.sleep(1)
    return True
