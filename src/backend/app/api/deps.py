"""
API 依赖注入模块

提供 FastAPI 路由的依赖注入函数
包括配置、日志器、数据库会话、用户认证等依赖
"""

import logging
from typing import AsyncGenerator

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import get_settings
from ..core.database import get_db_session as db_get_db_session
from ..core.logger import get_logger


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
        # 导入 logger 模块中的 get_logger 函数并使用
        # 注意：为了向后兼容，使用 "scryer" 作为 logger 名称
        from ..core.logger import get_logger as core_get_logger
        _logger = core_get_logger("scryer")

    return _logger


def get_structlog_logger():
    """获取 structlog 日志器依赖

    返回应用 structlog 日志器实例

    Returns:
        structlog 日志器实例
    """
    return structlog.get_logger()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话依赖

    生成数据库会话并在使用后自动关闭

    Yields:
        AsyncSession: 数据库会话
    """
    async for session in db_get_db_session():
        yield session


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


def get_request_id(request) -> str:
    """获取请求 ID 依赖

    从请求状态中提取当前请求的唯一标识符

    Args:
        request: FastAPI 请求对象

    Returns:
        str: 请求 ID，如果中间件未运行则返回空字符串

    Note:
        需要 RequestIDMiddleware 中间件运行
    """
    from ..middleware.request_id import get_request_id as _get_request_id
    return _get_request_id(request)
