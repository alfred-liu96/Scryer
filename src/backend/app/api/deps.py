"""
API 依赖注入模块

提供 FastAPI 路由的依赖注入函数
包括配置、日志器、数据库会话、用户认证等依赖
"""

import logging
from typing import AsyncGenerator

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import get_settings
from ..core.database import get_db_session as db_get_db_session
from ..core.exceptions import InvalidTokenError, TokenExpiredError
from ..core.security import JWTService, SecurityService
from ..models.user import User
from ..repositories.user import UserRepository
from ..services.auth import AuthService

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


def get_security_service() -> SecurityService:
    """获取 SecurityService 单例"""
    return SecurityService()


def get_jwt_service() -> JWTService:
    """获取 JWTService 单例"""
    settings = get_settings()
    return JWTService(settings)


def get_auth_service(
    security_service: SecurityService = Depends(get_security_service),
    jwt_service: JWTService = Depends(get_jwt_service),
) -> AuthService:
    """获取 AuthService 实例"""
    settings = get_settings()
    return AuthService(
        security_service=security_service,
        jwt_service=jwt_service,
        access_token_expire_seconds=settings.jwt_access_token_expire_minutes * 60,
    )


def get_user_repository(
    session: AsyncSession = Depends(get_db_session),
) -> UserRepository:
    """获取 UserRepository 实例"""
    return UserRepository(session)


# HTTP Bearer 认证方案
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    jwt_service: JWTService = Depends(get_jwt_service),
    session: AsyncSession = Depends(get_db_session),
    user_repo: UserRepository = Depends(get_user_repository),
) -> User:
    """获取当前认证用户

    从 JWT Token 中提取用户信息并验证

    Args:
        credentials: HTTP Bearer 认证凭证
        jwt_service: JWT 服务
        session: 数据库会话
        user_repo: 用户仓储

    Returns:
        User: 当前认证用户

    Raises:
        HTTPException: Token 无效或用户不存在
    """
    token = credentials.credentials

    try:
        # 验证 Token
        payload = jwt_service.verify_access_token(token)
        user_id = payload["sub"]

        # 查询用户
        user = await user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        return user

    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        ) from e
    except TokenExpiredError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        ) from e


def get_request_id(request) -> str | None:
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
