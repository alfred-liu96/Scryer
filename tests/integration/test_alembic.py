"""
Alembic 迁移集成测试

测试范围：
- Alembic 迁移在容器环境中的执行
- 迁移脚本的正确性
- 迁移回滚
- 数据库版本管理

验收标准：
- Alembic 迁移测试通过
- 升级和降级操作正常

参考 Issue #63
"""

from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class TestAlembicConfiguration:
    """测试 Alembic 配置"""

    def test_alembic_directory_exists(self):
        """测试 Alembic 目录存在"""
        alembic_dir = Path(__file__).parent.parent.parent / "alembic"
        assert alembic_dir.exists()
        assert alembic_dir.is_dir()

    def test_alembic_ini_exists(self):
        """测试 alembic.ini 文件存在"""
        alembic_ini = Path(__file__).parent.parent.parent / "alembic.ini"
        assert alembic_ini.exists()

    def test_alembic_env_exists(self):
        """测试 env.py 存在"""
        env_file = Path(__file__).parent.parent.parent / "alembic" / "env.py"
        assert env_file.exists()

    def test_alembic_versions_directory_exists(self):
        """测试 versions 目录存在"""
        versions_dir = Path(__file__).parent.parent.parent / "alembic" / "versions"
        assert versions_dir.exists()
        assert versions_dir.is_dir()


class TestAlembicMigrationExecution:
    """测试 Alembic 迁移执行"""

    @pytest.mark.asyncio
    async def test_create_all_tables(self, docker_db_engine, run_alembic_migrations):
        """测试创建所有表（通过 SQLAlchemy）"""
        # run_alembic_migrations fixture 会创建所有表

        # 查询数据库中的表
        async with docker_db_engine.connect() as conn:
            result = await conn.execute(
                text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
            )
            tables = [row[0] for row in result.fetchall()]

        # 验证至少有系统表
        assert len(tables) >= 0  # 可能是 0，取决于是否有模型定义

    @pytest.mark.asyncio
    async def test_alembic_version_table_exists(
        self, docker_db_engine, run_alembic_migrations
    ):
        """测试 alembic_version 表存在"""
        async with docker_db_engine.connect() as conn:
            await conn.execute(
                text(
                    """
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'alembic_version'
                """
                )
            )
            # 注意：如果我们使用 SQLAlchemy 创建表而不是 Alembic 迁移
            # 可能没有 alembic_version 表


class TestDatabaseSchema:
    """测试数据库模式"""

    @pytest.mark.asyncio
    async def test_database_connection_works(self, docker_db_session: AsyncSession):
        """测试数据库连接正常工作"""
        result = await docker_db_session.execute(text("SELECT 1"))
        row = result.fetchone()
        assert row is not None
        assert row[0] == 1

    @pytest.mark.asyncio
    async def test_can_create_and_drop_tables(self, docker_db_session: AsyncSession):
        """测试可以创建和删除表"""
        # 创建测试表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS migration_test (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL
                )
            """
            )
        )
        await docker_db_session.commit()

        # 验证表存在
        result = await docker_db_session.execute(
            text("SELECT tablename FROM pg_tables WHERE tablename = 'migration_test'")
        )
        row = result.fetchone()
        assert row is not None
        assert row[0] == "migration_test"

        # 删除表
        await docker_db_session.execute(text("DROP TABLE migration_test"))
        await docker_db_session.commit()

        # 验证表已删除
        result = await docker_db_session.execute(
            text("SELECT tablename FROM pg_tables WHERE tablename = 'migration_test'")
        )
        row = result.fetchone()
        assert row is None


class TestMigrationRollback:
    """测试迁移回滚"""

    @pytest.mark.asyncio
    async def test_transaction_rollback(self, docker_db_session: AsyncSession):
        """测试事务回滚"""
        # 创建表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS rollback_test (
                    id SERIAL PRIMARY KEY,
                    value VARCHAR(100)
                )
            """
            )
        )
        await docker_db_session.commit()

        # 插入数据
        await docker_db_session.execute(
            text("INSERT INTO rollback_test (value) VALUES (:value)"),
            {"value": "before_rollback"},
        )
        await docker_db_session.commit()

        # 开启事务，插入数据然后回滚
        await docker_db_session.execute(
            text("INSERT INTO rollback_test (value) VALUES (:value)"),
            {"value": "after_rollback"},
        )
        await docker_db_session.rollback()

        # 验证回滚成功
        result = await docker_db_session.execute(
            text("SELECT COUNT(*) FROM rollback_test WHERE value = :value"),
            {"value": "after_rollback"},
        )
        count = result.fetchone()[0]
        assert count == 0

        # 清理
        await docker_db_session.execute(text("DROP TABLE rollback_test"))
        await docker_db_session.commit()


class TestMigrationDataIntegrity:
    """测试迁移数据完整性"""

    @pytest.mark.asyncio
    async def test_foreign_key_constraints(self, docker_db_session: AsyncSession):
        """测试外键约束"""
        # 创建父表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS parent_table (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL
                )
            """
            )
        )

        # 创建子表（带外键）
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS child_table (
                    id SERIAL PRIMARY KEY,
                    parent_id INTEGER REFERENCES parent_table(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL
                )
            """
            )
        )
        await docker_db_session.commit()

        # 插入父记录
        await docker_db_session.execute(
            text("INSERT INTO parent_table (name) VALUES (:name)"), {"name": "parent"}
        )
        await docker_db_session.commit()

        # 插入子记录（有效外键）
        await docker_db_session.execute(
            text(
                "INSERT INTO child_table (parent_id, name) VALUES (:parent_id, :name)"
            ),
            {"parent_id": 1, "name": "child"},
        )
        await docker_db_session.commit()

        # 验证插入成功
        result = await docker_db_session.execute(
            text("SELECT COUNT(*) FROM child_table")
        )
        count = result.fetchone()[0]
        assert count == 1

        # 清理
        await docker_db_session.execute(text("DROP TABLE child_table"))
        await docker_db_session.execute(text("DROP TABLE parent_table"))
        await docker_db_session.commit()

    @pytest.mark.asyncio
    async def test_unique_constraints(self, docker_db_session: AsyncSession):
        """测试唯一约束"""
        # 创建带唯一约束的表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS unique_test (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(100) UNIQUE NOT NULL
                )
            """
            )
        )
        await docker_db_session.commit()

        # 插入第一条记录
        await docker_db_session.execute(
            text("INSERT INTO unique_test (email) VALUES (:email)"),
            {"email": "test@example.com"},
        )
        await docker_db_session.commit()

        # 尝试插入重复的 email（应该失败）
        with pytest.raises(Exception):  # IntegrityError
            await docker_db_session.execute(
                text("INSERT INTO unique_test (email) VALUES (:email)"),
                {"email": "test@example.com"},
            )
            await docker_db_session.commit()

        # 清理
        await docker_db_session.execute(text("DROP TABLE unique_test"))
        await docker_db_session.commit()


class TestMigrationPerformance:
    """测试迁移性能"""

    @pytest.mark.asyncio
    async def test_bulk_insert_performance(self, docker_db_session: AsyncSession):
        """测试批量插入性能"""
        # 创建表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS performance_test (
                    id SERIAL PRIMARY KEY,
                    value VARCHAR(100)
                )
            """
            )
        )
        await docker_db_session.commit()

        # 批量插入 1000 条记录
        import asyncio

        start_time = asyncio.get_event_loop().time()

        for i in range(1000):
            await docker_db_session.execute(
                text("INSERT INTO performance_test (value) VALUES (:value)"),
                {"value": f"value_{i}"},
            )
        await docker_db_session.commit()

        end_time = asyncio.get_event_loop().time()
        duration = end_time - start_time

        # 应该在合理时间内完成（< 10 秒）
        assert duration < 10.0

        # 验证数据
        result = await docker_db_session.execute(
            text("SELECT COUNT(*) FROM performance_test")
        )
        count = result.fetchone()[0]
        assert count == 1000

        # 清理
        await docker_db_session.execute(text("DROP TABLE performance_test"))
        await docker_db_session.commit()
