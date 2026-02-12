"""
API 依赖注入模块

提供 FastAPI 路由的依赖注入函数
包括配置、日志器、数据库会话、用户认证等依赖
"""

import logging
from typing import AsyncGenerator

from ..core.config import get_settings


# 全局日志器实例
_logger: logging.Logger | None = None


def get_config():
    """获取配置依赖

    返回应用配置单例实例

    Returns:
        Settings: 配置实例
    """
    return get_settings()


def get_logger() -> logging.Logger:
    """获取日志器依赖

    返回应用日志器实例

    Returns:
        logging.Logger: 日志器实例
    """
    global _logger
    if _logger is None:
        _logger = logging.getLogger("scryer")

        # 如果没有配置处理器，添加基本配置
        if not _logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            _logger.addHandler(handler)
            _logger.setLevel(logging.INFO)
            _logger.propagate = False

    return _logger


async def get_db_session() -> AsyncGenerator:
    """获取数据库会话依赖

    生成数据库会话并在使用后自动关闭

    Yields:
        AsyncSession: 数据库会话
    """
    # TODO: 实现真实的数据库会话管理
    # 当前阶段返回 None，后续集成数据库时实现
    from sqlalchemy.ext.asyncio import AsyncSession

    # 模拟会话对象
    session = None

    try:
        yield session
    finally:
        # 清理会话
        if session:
            await session.close()


def get_db():
    """获取数据库依赖（简化版）

    用于路由依赖注入的数据库会话获取函数

    Returns:
        数据库会话依赖函数
    """
    return get_db_session


def get_current_user_id() -> str | None:
    """获取当前用户ID依赖

    从请求上下文中提取当前认证的用户ID

    Returns:
        str | None: 用户ID，未认证时返回 None

    Note:
        当前阶段返回 None，后续实现认证后需要从 JWT token 或 session 中提取
    """
    # TODO: 实现真实的用户认证逻辑
    # 当前阶段返回 None，表示未认证
    return None
