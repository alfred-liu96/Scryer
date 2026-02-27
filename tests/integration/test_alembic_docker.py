"""
Alembic Docker 迁移集成测试

测试范围：
- Docker 容器启动时的自动迁移
- Alembic 升级和降级操作
- Schema 验证
- 数据完整性验证
- 错误处理
- 真实模型迁移
- 命令行工具测试

验收标准：
- 所有迁移测试通过
- 升级和降级操作正常
- 数据库 Schema 正确
- 数据完整性得到保障

参考 Issue #64
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

# =============================================================================
# TestDockerAutoMigration - 容器启动自动迁移测试
# =============================================================================


class TestDockerAutoMigration:
    """测试 Docker 容器启动时的自动迁移

    验收标准：
    - 容器启动时自动执行迁移
    - 数据库 Schema 正确创建
    - 应用可以正常启动
    """

    @pytest.mark.asyncio
    async def test_container_auto_migration_on_startup(
        self,
        docker_db_engine: AsyncEngine,
        alembic_test_helper: Any,
    ):
        """测试容器启动时自动执行迁移

        Given:
            - 数据库为空
            - Alembic 配置正确
        When:
            - 容器启动时触发迁移
        Then:
            - 数据库 Schema 创建成功
            - alembic_version 表存在
        """
        # 清理数据库
        await alembic_test_helper.drop_all_tables(docker_db_engine)

        # 执行迁移（模拟容器启动）
        import asyncio

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, alembic_test_helper.upgrade, "head")

        # 验证 alembic_version 表存在
        assert await alembic_test_helper.table_exists(
            docker_db_engine, "alembic_version"
        )

    @pytest.mark.asyncio
    async def test_migration_idempotent(
        self,
        docker_db_engine: AsyncEngine,
        alembic_test_helper: Any,
    ):
        """测试迁移幂等性

        Given:
            - 数据库已经执行过迁移
        When:
            - 再次执行迁移
        Then:
            - 不会报错
            - Schema 保持不变
        """
        # 第一次迁移
        import asyncio

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, alembic_test_helper.upgrade, "head")

        # 获取表数量
        table_count_1 = await alembic_test_helper.get_table_count(docker_db_engine)

        # 第二次迁移（幂等）
        await loop.run_in_executor(None, alembic_test_helper.upgrade, "head")

        # 验证表数量未变
        table_count_2 = await alembic_test_helper.get_table_count(docker_db_engine)
        assert table_count_1 == table_count_2


# =============================================================================
# TestMigrationUpgradeDowngrade - 升级降级测试
# =============================================================================


class TestMigrationUpgradeDowngrade:
    """测试迁移升级和降级

    验收标准：
    - upgrade 成功执行
    - downgrade 成功执行
    - 版本号正确更新
    """

    @pytest.mark.asyncio
    async def test_upgrade_to_head(
        self,
        docker_db_engine: AsyncEngine,
        alembic_test_helper: Any,
    ):
        """测试升级到最新版本

        Given:
            - 数据库为空
        When:
            - 执行 upgrade head
        Then:
            - 数据库升级到最新版本
            - 所有表创建成功
        """
        # 清理并升级
        await alembic_test_helper.drop_all_tables(docker_db_engine)

        import asyncio

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, alembic_test_helper.upgrade, "head")

        # 验证至少有 alembic_version 表
        assert await alembic_test_helper.table_exists(
            docker_db_engine, "alembic_version"
        )

    @pytest.mark.asyncio
    async def test_downgrade_to_base(
        self,
        docker_db_engine: AsyncEngine,
        alembic_test_helper: Any,
    ):
        """测试降级到基础版本

        Given:
            - 数据库已升级
        When:
            - 执行 downgrade base
        Then:
            - 数据库降级到初始状态
            - 所有表被删除
        """
        # 先升级
        import asyncio

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, alembic_test_helper.upgrade, "head")

        # 再降级
        await loop.run_in_executor(None, alembic_test_helper.downgrade, "base")

        # 验证所有表已删除（包括 alembic_version）
        table_count = await alembic_test_helper.get_table_count(docker_db_engine)
        assert table_count == 0

    @pytest.mark.asyncio
    async def test_version_tracking(
        self,
        docker_db_engine: AsyncEngine,
        alembic_test_helper: Any,
    ):
        """测试版本跟踪

        Given:
            - 数据库执行迁移
        When:
            - 查询当前版本
        Then:
            - 版本号正确返回
        """
        import asyncio

        loop = asyncio.get_event_loop()

        # 清理并升级
        await alembic_test_helper.drop_all_tables(docker_db_engine)
        await loop.run_in_executor(None, alembic_test_helper.upgrade, "head")

        # 获取当前版本
        current_version = alembic_test_helper.get_current_version()
        assert current_version is not None

        # 获取最新版本
        latest_version = alembic_test_helper.get_latest_version()
        assert latest_version is not None

        # 验证版本一致
        assert current_version == latest_version


# =============================================================================
# TestMigrationSchemaValidation - Schema 验证测试
# =============================================================================


class TestMigrationSchemaValidation:
    """测试 Schema 验证

    验收标准：
    - 表结构正确
    - 字段存在且类型正确
    - 索引创建成功
    - 约束正确设置
    """

    @pytest.mark.asyncio
    async def test_alembic_version_table_schema(
        self,
        docker_db_engine: AsyncEngine,
        alembic_test_helper: Any,
    ):
        """测试 alembic_version 表结构

        Given:
            - 执行了迁移
        When:
            - 检查 alembic_version 表
        Then:
            - 表存在
            - version_num 字段存在
        """
        import asyncio

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, alembic_test_helper.upgrade, "head")

        # 验证表存在
        assert await alembic_test_helper.table_exists(
            docker_db_engine, "alembic_version"
        )

        # 验证字段存在
        assert await alembic_test_helper.column_exists(
            docker_db_engine, "alembic_version", "version_num"
        )

    @pytest.mark.asyncio
    async def test_table_names_correct(
        self,
        docker_db_engine: AsyncEngine,
        alembic_test_helper: Any,
    ):
        """测试表名正确

        Given:
            - 执行了迁移
        When:
            - 查询所有表名
        Then:
            - 表名符合命名约定
        """
        import asyncio

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, alembic_test_helper.upgrade, "head")

        # 获取所有表名
        table_names = await alembic_test_helper.get_table_names(docker_db_engine)

        # 验证 alembic_version 表存在
        assert "alembic_version" in table_names

        # 验证表名都是小写
        for name in table_names:
            assert name == name.lower(), f"Table name {name} is not lowercase"

    @pytest.mark.asyncio
    async def test_schema_validation_with_helper(
        self,
        docker_db_engine: AsyncEngine,
        alembic_test_helper: Any,
    ):
        """测试 Schema 验证辅助方法

        Given:
            - 执行了迁移
        When:
            - 使用 validate_schema 验证
        Then:
            - 验证结果正确
        """
        import asyncio

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, alembic_test_helper.upgrade, "head")

        # 验证 alembic_version 表
        result = await alembic_test_helper.validate_schema(
            docker_db_engine,
            {"alembic_version": ["version_num"]},
        )

        assert result["is_valid"]
        assert len(result["missing_tables"]) == 0
        assert len(result["missing_columns"]) == 0


# =============================================================================
# TestMigrationDataIntegrity - 数据完整性测试
# =============================================================================


class TestMigrationDataIntegrity:
    """测试数据完整性

    验收标准：
    - 外键约束有效
    - 唯一约束有效
    - 非空约束有效
    - 数据迁移不丢失
    """

    @pytest.mark.asyncio
    async def test_foreign_key_constraints_enforced(
        self,
        docker_db_session: AsyncSession,
    ):
        """测试外键约束

        Given:
            - 创建带外键的表
        When:
            - 插入违反外键约束的数据
        Then:
            - 插入失败
        """
        # 创建父表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE parent_test (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL
                )
            """
            )
        )

        # 创建子表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE child_test (
                    id SERIAL PRIMARY KEY,
                    parent_id INTEGER REFERENCES parent_test(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL
                )
            """
            )
        )
        await docker_db_session.commit()

        # 尝试插入无效外键
        with pytest.raises(Exception):  # IntegrityError
            await docker_db_session.execute(
                text("INSERT INTO child_test (parent_id, name) VALUES (:pid, :name)"),
                {"pid": 999, "name": "orphan"},
            )
            await docker_db_session.commit()

        # 清理
        await docker_db_session.execute(text("DROP TABLE child_test"))
        await docker_db_session.execute(text("DROP TABLE parent_test"))
        await docker_db_session.commit()

    @pytest.mark.asyncio
    async def test_unique_constraints_enforced(
        self,
        docker_db_session: AsyncSession,
    ):
        """测试唯一约束

        Given:
            - 创建带唯一约束的表
        When:
            - 插入重复数据
        Then:
            - 插入失败
        """
        # 创建表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE unique_test (
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

        # 尝试插入重复数据
        with pytest.raises(Exception):  # IntegrityError
            await docker_db_session.execute(
                text("INSERT INTO unique_test (email) VALUES (:email)"),
                {"email": "test@example.com"},
            )
            await docker_db_session.commit()

        # 清理
        await docker_db_session.execute(text("DROP TABLE unique_test"))
        await docker_db_session.commit()

    @pytest.mark.asyncio
    async def test_not_null_constraints_enforced(
        self,
        docker_db_session: AsyncSession,
    ):
        """测试非空约束

        Given:
            - 创建带非空约束的表
        When:
            - 插入 NULL 值
        Then:
            - 插入失败
        """
        # 创建表
        await docker_db_session.execute(
            text(
                """
                CREATE TABLE notnull_test (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL
                )
            """
            )
        )
        await docker_db_session.commit()

        # 尝试插入 NULL
        with pytest.raises(Exception):  # IntegrityError
            await docker_db_session.execute(
                text("INSERT INTO notnull_test (name) VALUES (NULL)")
            )
            await docker_db_session.commit()

        # 清理
        await docker_db_session.execute(text("DROP TABLE notnull_test"))
        await docker_db_session.commit()


# =============================================================================
# TestMigrationErrorHandling - 错误处理测试
# =============================================================================


class TestMigrationErrorHandling:
    """测试错误处理

    验收标准：
    - 迁移失败时有明确错误信息
    - 支持回滚操作
    - 部分失败时状态一致
    """

    @pytest.mark.asyncio
    async def test_invalid_revision_raises_error(
        self,
        alembic_test_helper: Any,
    ):
        """测试无效版本号引发错误

        Given:
            - 数据库已初始化
        When:
            - 尝试升级到不存在的版本
        Then:
            - 抛出异常
        """
        import asyncio

        loop = asyncio.get_event_loop()

        with pytest.raises(Exception):
            await loop.run_in_executor(
                None, alembic_test_helper.upgrade_to_version, "invalid_revision_999"
            )

    @pytest.mark.asyncio
    async def test_downgrade_from_empty_database(
        self,
        docker_db_engine: AsyncEngine,
        alembic_test_helper: Any,
    ):
        """测试从空数据库降级

        Given:
            - 数据库为空
        When:
            - 执行降级
        Then:
            - 不报错（幂等）
        """
        # 清理数据库
        await alembic_test_helper.drop_all_tables(docker_db_engine)

        # 执行降级（应该不报错）
        import asyncio

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, alembic_test_helper.downgrade, "base")

        # 验证数据库仍为空
        table_count = await alembic_test_helper.get_table_count(docker_db_engine)
        assert table_count == 0


# =============================================================================
# TestMigrationWithRealModels - 真实模型测试
# =============================================================================


class TestMigrationWithRealModels:
    """测试真实模型的迁移

    验收标准：
    - User 模型正确迁移
    - Task 模型正确迁移
    - 其他模型正确迁移
    - 模型关系正确
    """

    @pytest.mark.asyncio
    async def test_users_table_schema_after_migration(
        self,
        migrated_database: AsyncEngine,
        alembic_test_helper: Any,
    ):
        """测试迁移后的 users 表结构

        Given:
            - 执行了迁移
        When:
            - 检查 users 表结构
        Then:
            - 表存在
            - 必需字段存在
        """
        # 验证表存在
        assert await alembic_test_helper.table_exists(migrated_database, "users")

        # 验证字段存在
        required_fields = ["id", "username", "email", "hashed_password", "is_active"]
        for field in required_fields:
            assert await alembic_test_helper.column_exists(
                migrated_database, "users", field
            )

    @pytest.mark.asyncio
    async def test_tasks_table_schema_after_migration(
        self,
        migrated_database: AsyncEngine,
        alembic_test_helper: Any,
    ):
        """测试迁移后的 tasks 表结构

        Given:
            - 执行了迁移
        When:
            - 检查 tasks 表结构
        Then:
            - 表存在
            - 必需字段存在
        """
        # 验证表存在
        assert await alembic_test_helper.table_exists(migrated_database, "tasks")

        # 验证字段存在
        required_fields = ["id", "task_type", "status", "payload", "result"]
        for field in required_fields:
            assert await alembic_test_helper.column_exists(
                migrated_database, "tasks", field
            )

    @pytest.mark.asyncio
    async def test_can_insert_user_model(
        self,
        migrated_database: AsyncEngine,
        docker_db_session: AsyncSession,
    ):
        """测试可以插入 User 模型

        Given:
            - 执行了迁移
        When:
            - 插入用户数据
        Then:
            - 插入成功
            - 可以查询数据
        """
        # 插入用户（使用原始 SQL，避免 ORM 依赖）
        await docker_db_session.execute(
            text(
                """
                INSERT INTO users (id, username, email, hashed_password, is_active)
                VALUES (:id, :username, :email, :password, :is_active)
            """
            ),
            {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "username": "testuser",
                "email": "test@example.com",
                "password": "hashed_password_here",
                "is_active": True,
            },
        )
        await docker_db_session.commit()

        # 查询验证
        result = await docker_db_session.execute(
            text("SELECT username FROM users WHERE username = :username"),
            {"username": "testuser"},
        )
        row = result.fetchone()
        assert row is not None
        assert row[0] == "testuser"

    @pytest.mark.asyncio
    async def test_can_insert_task_model(
        self,
        migrated_database: AsyncEngine,
        docker_db_session: AsyncSession,
    ):
        """测试可以插入 Task 模型

        Given:
            - 执行了迁移
        When:
            - 插入任务数据
        Then:
            - 插入成功
            - 可以查询数据
        """
        # 插入任务
        await docker_db_session.execute(
            text(
                """
                INSERT INTO tasks (id, task_type, status, payload)
                VALUES (:id, :task_type, :status, :payload)
            """
            ),
            {
                "id": "223e4567-e89b-12d3-a456-426614174000",
                "task_type": "search",
                "status": "pending",
                "payload": '{"query": "test"}',
            },
        )
        await docker_db_session.commit()

        # 查询验证
        result = await docker_db_session.execute(
            text("SELECT task_type FROM tasks WHERE task_type = :task_type"),
            {"task_type": "search"},
        )
        row = result.fetchone()
        assert row is not None
        assert row[0] == "search"


# =============================================================================
# TestMigrationCommands - 命令行工具测试
# =============================================================================


class TestMigrationCommands:
    """测试 Alembic 命令行工具

    验收标准：
    - alembic upgrade 命令可用
    - alembic downgrade 命令可用
    - alembic current 命令可用
    - alembic history 命令可用
    """

    def test_alembic_current_command_exists(self):
        """测试 alembic current 命令存在

        Given:
            - Alembic 已安装
        When:
            - 执行 alembic current
        Then:
            - 命令可执行
        """
        result = subprocess.run(
            ["alembic", "--help"],
            capture_output=True,
            text=True,
            timeout=10,
        )

        assert result.returncode == 0
        assert "current" in result.stdout

    def test_alembic_history_command_exists(self):
        """测试 alembic history 命令存在

        Given:
            - Alembic 已安装
        When:
            - 执行 alembic history
        Then:
            - 命令可执行
        """
        result = subprocess.run(
            ["alembic", "history"],
            capture_output=True,
            text=True,
            timeout=10,
            cwd="/workspace",
        )

        # 即使没有迁移历史，命令本身应该成功
        assert result.returncode == 0

    def test_alembic_config_file_exists(self):
        """测试 alembic.ini 配置文件存在

        Given:
            - 项目已初始化
        When:
            - 检查配置文件
        Then:
            - alembic.ini 存在
        """
        config_path = Path("/workspace/alembic.ini")
        assert config_path.exists()

    def test_alembic_directory_exists(self):
        """测试 alembic 目录存在

        Given:
            - 项目已初始化
        When:
            - 检查 alembic 目录
        Then:
            - alembic/ 目录存在
            - alembic/versions/ 目录存在
        """
        alembic_dir = Path("/workspace/alembic")
        assert alembic_dir.exists()
        assert (alembic_dir / "versions").exists()
        assert (alembic_dir / "env.py").exists()
