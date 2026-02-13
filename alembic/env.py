"""
Alembic 迁移环境配置

职责：
- 配置迁移引擎和会话
- 导入所有模型以生成迁移
- 支持在线/离线模式
"""

import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# 导入配置和模型
import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root / "src"))

try:
    from backend.app.core.config import get_settings
    from backend.app.core.database import get_engine
    from backend.app.models import Base
except ImportError:
    # 在开发环境中，配置可能还不存在
    # 使用默认配置
    Base = None
    get_settings = None

# Alembic Config 对象
config = context.config

# 解释配置文件中的 Python 日志配置
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 设置数据库 URL（从配置读取）
if get_settings:
    settings = get_settings()
    database_url = settings.database_url
    config.set_main_option("sqlalchemy.url", str(database_url))

# 目标元数据（用于自动生成迁移）
target_metadata = Base.metadata if Base else None


def run_migrations_offline() -> None:
    """离线模式运行迁移

    仅生成 SQL 脚本，不连接数据库
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """执行迁移的核心逻辑"""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """异步模式运行迁移"""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = config.get_main_option("sqlalchemy.url")

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """在线模式运行迁移

    使用数据库连接执行迁移
    """
    asyncio.run(run_async_migrations())


# 路由到正确的迁移模式
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
