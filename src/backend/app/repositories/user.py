"""User Repository - 用户数据访问层

提供用户名和邮箱的查询接口，支持大小写不敏感的邮箱查询。
参考 Issue #92
"""

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.backend.app.models.user import User
from src.backend.app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """User 数据访问层

    职责:
        - 提供用户名的查询和存在性检查（区分大小写）
        - 提供邮箱的查询和存在性检查（不区分大小写）
        - 继承 BaseRepository 的 CRUD 能力

    类型参数:
        User: 用户模型类型

    示例:
        >>> repo = UserRepository(session)
        >>> user = await repo.get_by_username("alice")
        >>> exists = await repo.email_exists("test@example.com")
    """

    def __init__(self, session: Session) -> None:
        """初始化 UserRepository

        Args:
            session: SQLAlchemy 会话
        """
        super().__init__(session, User)

    # ========================================================================
    # 用户名查询
    # ========================================================================

    async def get_by_username(self, username: str) -> Optional[User]:
        """根据用户名查询用户

        Args:
            username: 用户名（精确匹配，区分大小写）

        Returns:
            Optional[User]: 找到的用户，不存在时返回 None

        示例:
            >>> user = await repo.get_by_username("alice")
            >>> if user:
            ...     print(user.email)
        """
        if not username:
            return None

        stmt = select(User).where(User.username == username)
        result = await self._session.execute(stmt)
        return result.scalars().first()  # type: ignore[no-any-return]

    async def username_exists(self, username: str) -> bool:
        """检查用户名是否已存在

        Args:
            username: 用户名

        Returns:
            bool: 存在返回 True，否则返回 False

        示例:
            >>> exists = await repo.username_exists("alice")
            >>> if not exists:
            ...     # 创建用户
        """
        if not username:
            return False

        stmt = select(func.count(User.id)).where(User.username == username)
        count = await self._session.scalar(stmt)
        return (count or 0) > 0

    # ========================================================================
    # 邮箱查询（不区分大小写）
    # ========================================================================

    async def get_by_email(self, email: str) -> Optional[User]:
        """根据邮箱查询用户（不区分大小写）

        Args:
            email: 邮箱地址（不区分大小写）

        Returns:
            Optional[User]: 找到的用户，不存在时返回 None

        注意:
            - 邮箱查询不区分大小写 (Email == "TEST@EXAMPLE.COM" 匹配 "test@example.com")
            - 使用 func.lower() 实现跨数据库兼容

        示例:
            >>> user = await repo.get_by_email("ALICE@EXAMPLE.COM")
            >>> # 可以匹配到数据库中的 alice@example.com
        """
        if not email:
            return None

        stmt = select(User).where(func.lower(User.email) == func.lower(email))
        result = await self._session.execute(stmt)
        return result.scalars().first()  # type: ignore[no-any-return]

    async def email_exists(self, email: str) -> bool:
        """检查邮箱是否已存在（不区分大小写）

        Args:
            email: 邮箱地址

        Returns:
            bool: 存在返回 True，否则返回 False

        注意:
            - 邮箱检查不区分大小写

        示例:
            >>> exists = await repo.email_exists("TEST@EXAMPLE.COM")
            >>> # 可以检测到数据库中的 test@example.com
        """
        if not email:
            return False

        stmt = select(func.count(User.id)).where(
            func.lower(User.email) == func.lower(email)
        )
        count = await self._session.scalar(stmt)
        return (count or 0) > 0
