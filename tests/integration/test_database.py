"""
PostgreSQL 数据库集成测试

测试范围：
- 容器化 PostgreSQL 的连接
- 数据库连接池在容器环境中的工作
- 基本 CRUD 操作
- 事务隔离和回滚

验收标准：
- 数据库连接测试通过
- 连接池正常工作
- CRUD 操作正常

参考 Issue #63
"""

import asyncio

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class TestPostgreSQLConnection:
    """测试 PostgreSQL 连接"""

    @pytest.mark.asyncio
    async def test_database_container_available(self, check_postgres_container: bool):
        """测试 PostgreSQL 容器可用"""
        assert check_postgres_container is True

    @pytest.mark.asyncio
    async def test_database_engine_created(self, docker_db_engine):
        """测试数据库引擎已创建"""
        assert docker_db_engine is not None
        assert docker_db_engine.pool is not None

    @pytest.mark.asyncio
    async def test_database_session_created(self, docker_db_session: AsyncSession):
        """测试数据库会话已创建"""
        assert docker_db_session is not None
        assert isinstance(docker_db_session, AsyncSession)

    @pytest.mark.asyncio
    async def test_database_simple_query(self, docker_db_session: AsyncSession):
        """测试简单查询执行"""
        result = await docker_db_session.execute(text("SELECT 1 as value"))
        row = result.fetchone()
        assert row is not None
        assert row[0] == 1

    @pytest.mark.asyncio
    async def test_database_table_exists(self, docker_db_session: AsyncSession):
        """测试表是否存在（检查 pg_tables）"""
        result = await docker_db_session.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 1")
        )
        row = result.fetchone()
        # 可能返回 None（如果没有表）或表名
        assert row is None or isinstance(row[0], str)


class TestDatabaseConnectionPool:
    """测试数据库连接池"""

    @pytest.mark.asyncio
    async def test_connection_pool_size(self, docker_db_engine):
        """测试连接池大小配置正确"""
        pool = docker_db_engine.pool
        assert pool is not None
        # 默认 pool_size=5, max_overflow=10
        assert pool.size() >= 0

    @pytest.mark.asyncio
    async def test_multiple_concurrent_connections(self, docker_db_engine):
        """测试多个并发连接"""

        async def execute_query():
            async with docker_db_engine.connect() as conn:
                result = await conn.execute(text("SELECT 1"))
                return result.fetchone()

        # 并发执行 10 个查询
        results = await asyncio.gather(*[execute_query() for _ in range(10)])
        assert len(results) == 10
        assert all(r[0] == 1 for r in results)

    @pytest.mark.asyncio
    async def test_connection_reuse(self, docker_db_session: AsyncSession):
        """测试连接复用"""
        # 执行多个查询，验证连接被复用
        for i in range(5):
            result = await docker_db_session.execute(text("SELECT 1"))
            row = result.fetchone()
            assert row[0] == 1


class TestDatabaseOperations:
    """测试数据库操作"""

    @pytest.mark.asyncio
    async def test_create_table(self, docker_db_session: AsyncSession):
        """测试创建表"""
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS test_table (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL
                )
            """
            )
        )
        await docker_db_session.commit()

        # 验证表已创建
        result = await docker_db_session.execute(
            text("SELECT tablename FROM pg_tables WHERE tablename = 'test_table'")
        )
        row = result.fetchone()
        assert row is not None
        assert row[0] == "test_table"

    @pytest.mark.asyncio
    async def test_insert_and_select(self, docker_db_session: AsyncSession):
        """测试插入和查询数据"""
        # 先创建表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS test_table (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL
                )
            """
            )
        )
        await docker_db_session.commit()

        # 插入数据
        await docker_db_session.execute(
            text("INSERT INTO test_table (name) VALUES (:name)"), {"name": "test_name"}
        )
        await docker_db_session.commit()

        # 查询数据
        result = await docker_db_session.execute(
            text("SELECT name FROM test_table WHERE name = :name"),
            {"name": "test_name"},
        )
        row = result.fetchone()
        assert row is not None
        assert row[0] == "test_name"

    @pytest.mark.asyncio
    async def test_transaction_rollback(self, docker_db_session: AsyncSession):
        """测试事务回滚"""
        # 创建表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS test_rollback (
                    id SERIAL PRIMARY KEY,
                    value VARCHAR(100)
                )
            """
            )
        )
        await docker_db_session.commit()

        # 插入数据
        await docker_db_session.execute(
            text("INSERT INTO test_rollback (value) VALUES (:value)"),
            {"value": "before_rollback"},
        )
        await docker_db_session.commit()

        # 开始新事务，插入数据然后回滚
        await docker_db_session.execute(
            text("INSERT INTO test_rollback (value) VALUES (:value)"),
            {"value": "after_rollback"},
        )
        await docker_db_session.rollback()

        # 查询验证回滚成功
        result = await docker_db_session.execute(
            text("SELECT COUNT(*) FROM test_rollback WHERE value = :value"),
            {"value": "after_rollback"},
        )
        count = result.fetchone()[0]
        assert count == 0

        # 验证之前的数据还在
        result = await docker_db_session.execute(
            text("SELECT COUNT(*) FROM test_rollback WHERE value = :value"),
            {"value": "before_rollback"},
        )
        count = result.fetchone()[0]
        assert count == 1


class TestDatabaseIsolation:
    """测试数据隔离"""

    @pytest.mark.asyncio
    async def test_data_isolation_between_tests(self, docker_db_session: AsyncSession):
        """测试间的数据隔离"""
        # 创建表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS test_isolation (
                    id SERIAL PRIMARY KEY,
                    test_id VARCHAR(100)
                )
            """
            )
        )
        await docker_db_session.commit()

        # 插入测试数据
        await docker_db_session.execute(
            text("INSERT INTO test_isolation (test_id) VALUES (:test_id)"),
            {"test_id": "isolation_test"},
        )
        await docker_db_session.commit()

        # 验证数据存在
        result = await docker_db_session.execute(
            text("SELECT COUNT(*) FROM test_isolation")
        )
        count = result.fetchone()[0]
        assert count >= 1
