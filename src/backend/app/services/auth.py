"""
认证业务服务模块

提供用户认证和 Token 管理的业务逻辑
"""

from typing import Any

from pydantic import BaseModel, Field

from backend.app.core.security import JWTService, SecurityService


class TokenResponse(BaseModel):
    """Token 响应模型

    登录或刷新 Token 后的响应

    Attributes:
        access_token (str): 访问 Token
        refresh_token (str): 刷新 Token
        token_type (str): Token 类型（固定为 "Bearer"）
        expires_in (int): 访问 Token 过期时间（秒）
    """

    access_token: str = Field(..., description="访问 Token")
    refresh_token: str = Field(..., description="刷新 Token")
    token_type: str = Field(default="Bearer", description="Token 类型")
    expires_in: int = Field(..., description="访问 Token 过期时间（秒）")


class UserAuthResponse(BaseModel):
    """用户认证响应模型

    包含 Token 和用户基本信息

    Attributes:
        tokens (TokenResponse): Token 对
        user_id (int): 用户 ID
        username (str): 用户名
    """

    tokens: TokenResponse = Field(..., description="Token 对")
    user_id: int = Field(..., description="用户 ID")
    username: str = Field(..., description="用户名")


class AuthService:
    """认证业务服务

    职责：
    - 用户认证（验证用户名和密码）
    - 创建 Token 对（访问 + 刷新）
    - 刷新 Token
    - 验证用户状态

    设计原则：
    - 单一职责：仅处理认证相关的业务逻辑
    - 依赖注入：接收 SecurityService 和 JWTService 实例
    - 明确异常：所有错误都抛出具体异常类型
    - 无数据库依赖：通过回调函数获取用户（解耦数据层）
    """

    def __init__(
        self,
        security_service: SecurityService,
        jwt_service: JWTService,
        *,
        access_token_expire_seconds: int,
    ) -> None:
        """初始化认证服务

        Args:
            security_service: 密码加密服务
            jwt_service: JWT Token 服务
            access_token_expire_seconds: 访问 Token 过期时间（秒）
        """
        self._security = security_service
        self._jwt = jwt_service
        self._access_token_expire_seconds = access_token_expire_seconds

    # ==================== 用户认证 ====================

    async def authenticate(
        self,
        username: str,
        plain_password: str,
        get_user_func: Any,
    ) -> UserAuthResponse:
        """验证用户凭证并返回 Token

        Args:
            username: 用户名
            plain_password: 明文密码
            get_user_func: 获取用户的回调函数，签名为:
                async def get_user(username: str) -> User | None

        Returns:
            UserAuthResponse: 认证响应，包含 Token 和用户信息

        Raises:
            InvalidCredentialsError: 用户名或密码错误
            InactiveUserError: 用户账户未激活
        """
        from backend.app.core.exceptions import (
            InactiveUserError,
            InvalidCredentialsError,
        )

        # 获取用户
        user = await get_user_func(username)
        if not user:
            # 为了安全，不区分"用户不存在"和"密码错误"
            raise InvalidCredentialsError()

        # 验证密码
        if not self._security.verify_password(plain_password, user.hashed_password):
            raise InvalidCredentialsError()

        # 检查用户状态
        if not user.is_active:
            raise InactiveUserError(
                "User account is inactive",
                user_id=user.id,
            )

        # 生成 Token
        tokens = self._create_tokens(user.id)

        return UserAuthResponse(
            tokens=tokens,
            user_id=user.id,
            username=user.username,
        )

    def _create_tokens(self, user_id: int) -> TokenResponse:
        """创建 Token 对

        Args:
            user_id: 用户 ID

        Returns:
            TokenResponse: Token 响应
        """
        access_token = self._jwt.create_access_token(user_id)
        refresh_token = self._jwt.create_refresh_token(user_id)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="Bearer",
            expires_in=self._access_token_expire_seconds,
        )

    # ==================== Token 刷新 ====================

    def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        """刷新 Token 对

        Args:
            refresh_token: 刷新 Token

        Returns:
            TokenResponse: 新的 Token 对

        Raises:
            InvalidTokenError: 刷新 Token 无效
            TokenExpiredError: 刷新 Token 已过期
        """
        # 使用 JWT 服务刷新 Token
        new_access_token, new_refresh_token = self._jwt.refresh_access_token(
            refresh_token
        )

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="Bearer",
            expires_in=self._access_token_expire_seconds,
        )

    # ==================== Token 验证 ====================

    def verify_access_token(self, token: str) -> dict[str, Any]:
        """验证访问 Token

        Args:
            token: 访问 Token

        Returns:
            dict[str, Any]: Token 载荷

        Raises:
            InvalidTokenError: Token 无效
            TokenExpiredError: Token 已过期
        """
        return self._jwt.verify_access_token(token)


# ==================== 模块导出 ====================

__all__ = [
    "TokenResponse",
    "UserAuthResponse",
    "AuthService",
]
