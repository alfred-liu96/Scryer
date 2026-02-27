"""
Alembic Migration Test Helpers

提供 Alembic 迁移测试的辅助工具类：

AlembicTestHelper:
    - 封装 Alembic 迁移操作
    - 提供版本查询、表检查、迁移执行等方法
    - 支持测试环境的数据库清理
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from alembic.config import Config

if TYPE_CHECKING:
    from alembic import command  # type: ignore[attr-defined]


class AlembicTestHelper:
    """Alembic 测试辅助工具类

    职责：
    - 封装 Alembic 迁移操作
    - 查询当前数据库版本
    - 检查表和字段是否存在
    - 执行迁移升级和降级
    - 清理测试数据

    约束：
    - 需要有效的数据库连接
    - 需要 alembic.ini 配置文件
    - 需要正确的数据库连接 URL
    """

    def __init__(
        self,
        db_url: str,
        alembic_ini_path: str | Path = "/workspace/alembic.ini",
    ):
        """初始化 Alembic 测试辅助工具

        Args:
            db_url: 数据库连接 URL
            alembic_ini_path: alembic.ini 配置文件路径
        """
        self.db_url = db_url
        self.alembic_ini_path = Path(alembic_ini_path)

        # 验证配置文件存在
        if not self.alembic_ini_path.exists():
            raise FileNotFoundError(
                f"Alembic config not found: {self.alembic_ini_path}"
            )

    def _create_config(self) -> Config:
        """创建 Alembic 配置对象

        Returns:
            Config: Alembic 配置对象
        """
        config = Config(str(self.alembic_ini_path))
        config.set_main_option("sqlalchemy.url", self.db_url)
        return config

    # ========================================================================
    # 版本管理
    # ========================================================================

    def get_current_version(self) -> str | None:
        """获取当前数据库版本

        Returns:
            str | None: 当前版本号，如果未初始化则返回 None

        Note:
            此方法是同步的，因为 Alembic 的 API 是同步的
        """
        # 创建 Alembic 配置
        self._create_config()

        # 查询当前数据库版本
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        engine = create_engine(self.db_url.replace("+asyncpg", ""))
        Session = sessionmaker(bind=engine)

        with Session() as session:
            result = session.execute(
                text("SELECT version_num FROM alembic_version")
            ).fetchone()

            if result is None:
                return None

            return str(result[0])  # type: ignore[no-any-return]

    def get_latest_version(self) -> str:
        """获取最新的迁移版本

        Returns:
            str: 最新版本号
        """
        from alembic.script import ScriptDirectory

        config = self._create_config()
        script = ScriptDirectory.from_config(config)

        # 获取最新版本
        head = script.get_current_head()
        return head if head is not None else ""  # type: ignore[no-any-return]

    # ========================================================================
    # 迁移执行
    # ========================================================================

    def upgrade(self, revision: str = "head") -> None:
        """执行数据库升级

        Args:
            revision: 目标版本，默认为 'head'（最新版本）
        """
        config = self._create_config()
        command.upgrade(config, revision)

    def downgrade(self, revision: str = "base") -> None:
        """执行数据库降级

        Args:
            revision: 目标版本，默认为 'base'（空数据库）
        """
        config = self._create_config()
        command.downgrade(config, revision)

    def upgrade_to_version(self, version: str) -> None:
        """升级到指定版本

        Args:
            version: 目标版本号
        """
        self.upgrade(version)

    def downgrade_to_version(self, version: str) -> None:
        """降级到指定版本

        Args:
            version: 目标版本号
        """
        self.downgrade(version)

    # ========================================================================
    # 表检查
    # ========================================================================

    async def table_exists(self, engine: AsyncEngine, table_name: str) -> bool:
        """检查表是否存在

        Args:
            engine: 异步数据库引擎
            table_name: 表名

        Returns:
            bool: 表存在返回 True
        """
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                        AND table_name = :table_name
                    )
                """
                ),
                {"table_name": table_name},
            )
            return result.scalar()  # type: ignore[no-any-return]

    async def column_exists(
        self,
        engine: AsyncEngine,
        table_name: str,
        column_name: str,
    ) -> bool:
        """检查列是否存在

        Args:
            engine: 异步数据库引擎
            table_name: 表名
            column_name: 列名

        Returns:
            bool: 列存在返回 True
        """
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                        AND table_name = :table_name
                        AND column_name = :column_name
                    )
                """
                ),
                {"table_name": table_name, "column_name": column_name},
            )
            return result.scalar()  # type: ignore[no-any-return]

    async def index_exists(
        self,
        engine: AsyncEngine,
        index_name: str,
    ) -> bool:
        """检查索引是否存在

        Args:
            engine: 异步数据库引擎
            index_name: 索引名

        Returns:
            bool: 索引存在返回 True
        """
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT EXISTS (
                        SELECT 1
                        FROM pg_indexes
                        WHERE schemaname = 'public'
                        AND indexname = :index_name
                    )
                """
                ),
                {"index_name": index_name},
            )
            return result.scalar()  # type: ignore[no-any-return]

    async def get_table_count(self, engine: AsyncEngine) -> int:
        """获取数据库中的表数量

        Args:
            engine: 异步数据库引擎

        Returns:
            int: 表数量
        """
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                """
                )
            )
            return result.scalar()  # type: ignore[no-any-return]

    async def get_table_names(self, engine: AsyncEngine) -> list[str]:
        """获取所有表名

        Args:
            engine: 异步数据库引擎

        Returns:
            list[str]: 表名列表
        """
        async with engine.connect() as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT tablename
                    FROM pg_tables
                    WHERE schemaname = 'public'
                    ORDER BY tablename
                """
                )
            )
            return [row[0] for row in result.fetchall()]

    # ========================================================================
    # 数据清理
    # ========================================================================

    async def clean_all_tables(self, engine: AsyncEngine) -> None:
        """清理所有表的数据（保留表结构）

        Args:
            engine: 异步数据库引擎
        """
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    """
                    DO $$
                    DECLARE
                        tbl RECORD;
                    BEGIN
                        FOR tbl IN (
                            SELECT tablename
                            FROM pg_tables
                            WHERE schemaname = 'public'
                        )
                        LOOP
                            EXECUTE (
                                'TRUNCATE TABLE ' ||
                                quote_ident(tbl.tablename) ||
                                ' CASCADE'
                            );
                        END LOOP;
                    END $$;
                """
                )
            )

    async def drop_all_tables(self, engine: AsyncEngine) -> None:
        """删除所有表（包括表结构）

        Args:
            engine: 异步数据库引擎
        """
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    """
                    DO $$
                    DECLARE
                        tbl RECORD;
                    BEGIN
                        FOR tbl IN (
                            SELECT tablename
                            FROM pg_tables
                            WHERE schemaname = 'public'
                        )
                        LOOP
                            EXECUTE (
                                'DROP TABLE IF EXISTS ' ||
                                quote_ident(tbl.tablename) ||
                                ' CASCADE'
                            );
                        END LOOP;
                    END $$;
                """
                )
            )

    # ========================================================================
    # Schema 验证
    # ========================================================================

    async def validate_schema(
        self,
        engine: AsyncEngine,
        expected_tables: dict[str, list[str]],
    ) -> dict[str, Any]:
        """验证数据库 Schema

        Args:
            engine: 异步数据库引擎
            expected_tables: 期望的表结构，格式为 {表名: [列名列表]}

        Returns:
            dict: 验证结果，包含：
                - is_valid: bool，整体是否通过
                - missing_tables: list[str]，缺失的表
                - missing_columns: dict[str, list[str]]，缺失的列
                - extra_tables: list[str]，多余的表
        """
        result: dict[str, Any] = {
            "is_valid": True,
            "missing_tables": [],
            "missing_columns": {},
            "extra_tables": [],
        }

        # 获取实际表名
        actual_tables = await self.get_table_names(engine)

        # 检查缺失的表
        for table_name in expected_tables:
            if table_name not in actual_tables:
                result["missing_tables"].append(table_name)
                result["is_valid"] = False

        # 检查多余的表
        for table_name in actual_tables:
            if table_name not in expected_tables:
                result["extra_tables"].append(table_name)

        # 检查列
        for table_name, expected_columns in expected_tables.items():
            if table_name not in actual_tables:
                continue

            result["missing_columns"][table_name] = []

            for column_name in expected_columns:
                if not await self.column_exists(engine, table_name, column_name):
                    result["missing_columns"][table_name].append(column_name)
                    result["is_valid"] = False

        # 清理空的 missing_columns 条目
        result["missing_columns"] = {
            k: v for k, v in result["missing_columns"].items() if v
        }

        return result

    # ========================================================================
    # 数据库初始化
    # ========================================================================

    async def stamp_database(self, engine: AsyncEngine, version: str = "head") -> None:
        """标记数据库版本（不执行迁移）

        Args:
            engine: 异步数据库引擎
            version: 版本号，默认为 'head'

        Note:
            此方法用于测试场景，当表已经通过其他方式创建时，
            可以直接标记版本而不执行迁移
        """
        # 使用同步方式执行 stamp
        config = self._create_config()
        command.stamp(config, version)
