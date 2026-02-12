"""
数据库引擎和会话管理模块

提供 SQLAlchemy 异步数据库引擎、会话工厂和依赖注入功能
"""

import re
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import get_settings

__all__ = [
    "get_engine",
    "get_session_factory",
    "init_db",
    "close_db",
    "get_db_session",
    "_mask_password",
]

# 全局数据库引擎和会话工厂
_engine = None
_session_factory = None


def get_engine():
    """获取数据库引擎实例

    Returns:
        AsyncEngine | None: 数据库引擎实例，未初始化时返回 None
    """
    return _engine


def get_session_factory():
    """获取会话工厂实例

    Returns:
        async_sessionmaker | None: 会话工厂实例，未初始化时返回 None
    """
    return _session_factory


def init_db():
    """初始化数据库引擎和会话工厂

    从配置中读取数据库连接信息，创建异步引擎和会话工厂
    使用单例模式，多次调用不会重复创建

    Note:
        此函数应该在应用启动时调用
    """
    global _engine, _session_factory

    # 如果已经初始化，直接返回
    if _engine is not None:
        return

    settings = get_settings()

    # 记录数据库 URL（隐藏密码）
    masked_url = _mask_password(settings.database_url)

    from .logger import get_logger
    logger = get_logger(__name__)
    logger.info(f"Initializing database engine: {masked_url}")

    # 创建异步引擎
    _engine = create_async_engine(
        settings.database_url,
        echo=settings.db_echo,
        echo_pool=settings.db_echo_pool,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_recycle=settings.db_pool_recycle,
        pool_pre_ping=True,  # 连接前检测连接有效性
    )

    # 创建会话工厂
    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    logger.info("Database engine initialized successfully")


async def close_db():
    """关闭数据库引擎

    释放所有数据库连接

    Note:
        此函数应该在应用关闭时调用
    """
    global _engine, _session_factory

    engine = get_engine()
    if engine is None:
        return

    from .logger import get_logger
    logger = get_logger(__name__)
    logger.info("Closing database engine...")

    await engine.dispose()

    # 重置全局变量
    _engine = None
    _session_factory = None

    logger.info("Database engine closed")


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话依赖注入函数

    为 FastAPI 路由提供数据库会话，使用后自动关闭

    Yields:
        AsyncSession: 数据库会话实例

    Example:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db_session)):
            result = await db.execute(select(User))
            return result.scalars().all()

    Note:
        此函数应该在 FastAPI 依赖注入中使用
    """
    factory = get_session_factory()
    if factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    session = factory()

    try:
        yield session
    finally:
        await session.close()


def _mask_password(url: str) -> str:
    """隐藏数据库 URL 中的密码

    Args:
        url: 数据库连接 URL

    Returns:
        str: 隐藏密码后的 URL

    Example:
        >>> _mask_password("postgresql://user:secret@localhost/db")
        "postgresql://user:****@localhost/db"
    """
    # 匹配格式：protocol://user:password@host/...
    pattern = r"(://[^:]+:)[^@]+(@)"

    def replace(match):
        # 保留 :password@ 之前和之后的部分，替换密码为 ****
        return match.group(1) + "****" + match.group(2)

    return re.sub(pattern, replace, url)
