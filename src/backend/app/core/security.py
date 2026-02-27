"""
核心安全服务模块

提供密码加密和 JWT Token 管理功能
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel, Field, model_validator

from backend.app.core.config import get_settings
from backend.app.core.exceptions import InvalidTokenError, TokenExpiredError


class TokenPayload(BaseModel):
    """Token Payload 数据模型

    定义 JWT Token 的标准载荷结构

    Attributes:
        sub (str): 主题（用户 ID）
        exp (datetime): 过期时间
        iat (datetime): 签发时间
        type (str): Token 类型 (access/refresh)
        extra (dict[str, Any] | None): 额外声明
    """

    sub: str = Field(..., description="用户 ID")
    exp: datetime = Field(..., description="过期时间")
    iat: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    type: str = Field(..., description="Token 类型: access 或 refresh")
    extra: dict[str, Any] | None = Field(default=None, description="额外声明")

    @model_validator(mode="after")
    def validate_token_type(self) -> "TokenPayload":
        """验证 Token 类型是否有效"""
        if self.type not in ("access", "refresh"):
            raise ValueError("token type must be 'access' or 'refresh'")
        return self

    def to_dict(self) -> dict[str, Any]:
        """转换为字典（用于 JWT 编码）"""
        data = {
            "sub": self.sub,
            "exp": self.exp,
            "iat": self.iat,
            "type": self.type,
        }
        if self.extra:
            data["extra"] = self.extra
        return data


class SecurityService:
    """密码加密服务

    职责：
    - 密码哈希（使用 bcrypt）
    - 密码验证
    - 提供统一的密码策略

    设计原则：
    - 无状态：所有方法都是纯函数
    - 不可变：不持有任何实例状态
    - 线程安全：bcrypt 的操作天然线程安全
    """

    def __init__(self, *, rounds: int = 12, prefix: str = "2b") -> None:
        """初始化密码上下文

        Args:
            rounds: bcrypt 工作因子（默认 12，范围 4-31）
            prefix: bcrypt 前缀（2a/2b）
        """
        self._rounds = rounds
        self._prefix = prefix

    def hash_password(self, plain_password: str) -> str:
        """对密码进行哈希

        Args:
            plain_password: 明文密码

        Returns:
            str: 哈希后的密码（包含盐值和算法标识）

        Raises:
            ValueError: 密码为空或长度不足

        Note:
            - bcrypt 自动生成随机盐值
            - 返回值格式: $2b$12$salt22characters2222hash31characters
            - bcrypt 限制密码最大 72 字节
        """
        if not plain_password:
            raise ValueError("plain_password cannot be empty")
        if len(plain_password) < 6:
            raise ValueError("plain_password must be at least 6 characters")

        # bcrypt 限制密码最大 72 字节
        password_bytes = plain_password.encode("utf-8")[:72]

        # 生成盐值并哈希
        salt = bcrypt.gensalt(rounds=self._rounds, prefix=b"2b")
        hashed = bcrypt.hashpw(password_bytes, salt)

        return hashed.decode("utf-8")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """验证密码

        Args:
            plain_password: 明文密码
            hashed_password: 哈希后的密码

        Returns:
            bool: 密码匹配返回 True，否则 False

        Note:
            - 即使密码错误，时间复杂度也是恒定的（防止时序攻击）
            - 任何异常（格式错误等）都返回 False
        """
        try:
            password_bytes = plain_password.encode("utf-8")[:72]
            hashed_bytes = hashed_password.encode("utf-8")
            return bcrypt.checkpw(password_bytes, hashed_bytes)
        except Exception:
            # 哈希格式错误或其他异常，统一返回 False
            return False

    def is_hash_algorithm_supported(self, hash_prefix: str) -> bool:
        """检查哈希算法是否受支持

        Args:
            hash_prefix: 哈希前缀（如 "$2b$" 表示 bcrypt）

        Returns:
            bool: 算法受支持返回 True
        """
        try:
            return hash_prefix.startswith("$2") and "$" in hash_prefix[3:]
        except Exception:
            return False


class JWTService:
    """JWT Token 服务

    职责：
    - 生成访问 Token (Access Token)
    - 生成刷新 Token (Refresh Token)
    - 解析和验证 Token
    - 刷新 Token
    - Token 黑名单检查（可选，预留接口）

    设计原则：
    - 依赖注入：通过构造函数接收 Settings
    - 明确错误：所有错误都抛出具体异常类型
    - 时区感知：所有时间都使用 timezone.utc
    """

    def __init__(self, settings: Any | None = None) -> None:
        """初始化 JWT 服务

        Args:
            settings: 配置对象，如果为 None 则使用 get_settings()
        """
        self._settings = settings or get_settings()

    # ==================== Token 生成 ====================

    def create_access_token(
        self,
        user_id: int | str,
        extra_claims: dict[str, Any] | None = None,
    ) -> str:
        """创建访问 Token

        Args:
            user_id: 用户 ID
            extra_claims: 额外的声明（如 permissions, role）

        Returns:
            str: JWT 访问 Token

        Raises:
            ValueError: user_id 为空

        Note:
            - 默认过期时间：30 分钟（由配置控制）
            - Token 类型：access
        """
        if not user_id:
            raise ValueError("user_id cannot be empty")

        # 计算过期时间
        now = datetime.now(timezone.utc)
        expire = now + timedelta(seconds=self._settings.jwt_access_token_expire_seconds)

        # 构建 Payload
        payload = TokenPayload(
            sub=str(user_id),
            exp=expire,
            iat=now,
            type="access",
            extra=extra_claims,
        )

        # 编码 Token
        return self._encode_token(payload.to_dict())

    def create_refresh_token(
        self,
        user_id: int | str,
        extra_claims: dict[str, Any] | None = None,
    ) -> str:
        """创建刷新 Token

        Args:
            user_id: 用户 ID
            extra_claims: 额外的声明（通常为空）

        Returns:
            str: JWT 刷新 Token

        Raises:
            ValueError: user_id 为空

        Note:
            - 默认过期时间：7 天（由配置控制）
            - Token 类型：refresh
        """
        if not user_id:
            raise ValueError("user_id cannot be empty")

        # 计算过期时间
        now = datetime.now(timezone.utc)
        expire = now + timedelta(days=self._settings.jwt_refresh_token_expire_days)

        # 构建 Payload
        payload = TokenPayload(
            sub=str(user_id),
            exp=expire,
            iat=now,
            type="refresh",
            extra=extra_claims,
        )

        # 编码 Token
        return self._encode_token(payload.to_dict())

    def _encode_token(self, payload: dict[str, Any]) -> str:
        """编码 JWT Token

        Args:
            payload: Token 载荷

        Returns:
            str: JWT Token 字符串
        """
        return jwt.encode(
            payload,
            self._settings.jwt_secret_key,
            algorithm=self._settings.jwt_algorithm,
        )

    # ==================== Token 解析与验证 ====================

    def decode_token(self, token: str) -> dict[str, Any]:
        """解析 Token（不验证类型）

        Args:
            token: JWT Token 字符串

        Returns:
            dict[str, Any]: 解码后的载荷

        Raises:
            InvalidTokenError: Token 格式错误、签名无效
            TokenExpiredError: Token 已过期
        """
        try:
            payload = jwt.decode(
                token,
                self._settings.jwt_secret_key,
                algorithms=[self._settings.jwt_algorithm],
            )
            return payload
        except jwt.ExpiredSignatureError as e:
            # 提取过期时间（如果可用）
            expired_at = None
            try:
                # 尝试解码但不验证过期时间
                payload = jwt.get_unverified_claims(token)
                expired_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            except Exception:
                pass

            raise TokenExpiredError(
                "Token has expired",
                token_type=payload.get("type") if "payload" in locals() else None,
                expired_at=expired_at,
            ) from e
        except JWTError as e:
            raise InvalidTokenError(f"Invalid token: {str(e)}") from e

    def verify_access_token(self, token: str) -> dict[str, Any]:
        """验证访问 Token

        Args:
            token: JWT Token 字符串

        Returns:
            dict[str, Any]: 解码后的载荷

        Raises:
            InvalidTokenError: Token 无效或类型不是 access
            TokenExpiredError: Token 已过期
        """
        payload = self.decode_token(token)

        # 验证 Token 类型
        token_type = payload.get("type")
        if token_type != "access":
            raise InvalidTokenError(
                f"Invalid token type: expected 'access', got '{token_type}'",
                token_type=token_type,
            )

        return payload

    def verify_refresh_token(self, token: str) -> dict[str, Any]:
        """验证刷新 Token

        Args:
            token: JWT Token 字符串

        Returns:
            dict[str, Any]: 解码后的载荷

        Raises:
            InvalidTokenError: Token 无效或类型不是 refresh
            TokenExpiredError: Token 已过期
        """
        payload = self.decode_token(token)

        # 验证 Token 类型
        token_type = payload.get("type")
        if token_type != "refresh":
            raise InvalidTokenError(
                f"Invalid token type: expected 'refresh', got '{token_type}'",
                token_type=token_type,
            )

        return payload

    # ==================== Token 刷新 ====================

    def refresh_access_token(self, refresh_token: str) -> tuple[str, str]:
        """使用刷新 Token 获取新的访问 Token

        Args:
            refresh_token: 刷新 Token 字符串

        Returns:
            tuple[str, str]: (新的访问 Token, 新的刷新 Token)

        Raises:
            InvalidTokenError: 刷新 Token 无效
            TokenExpiredError: 刷新 Token 已过期

        Note:
            刷新成功后，通常会同时返回新的刷新 Token（滚动刷新）
        """
        # 验证刷新 Token
        payload = self.verify_refresh_token(refresh_token)
        user_id = payload["sub"]

        # 提取额外声明（如果有）
        extra_claims = payload.get("extra")

        # 生成新的 Token 对
        new_access_token = self.create_access_token(user_id, extra_claims)
        new_refresh_token = self.create_refresh_token(user_id, extra_claims)

        return new_access_token, new_refresh_token

    # ==================== 工具方法 ====================

    def get_user_id_from_token(self, token: str) -> str:
        """从 Token 中提取用户 ID（不验证过期时间）

        Args:
            token: JWT Token 字符串

        Returns:
            str: 用户 ID

        Raises:
            InvalidTokenError: Token 格式错误
        """
        try:
            payload = jwt.get_unverified_claims(token)
            return payload.get("sub", "")
        except JWTError as e:
            raise InvalidTokenError(f"Cannot extract user_id: {str(e)}") from e


# ==================== 模块导出 ====================

__all__ = [
    "TokenPayload",
    "SecurityService",
    "JWTService",
]
