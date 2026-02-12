"""User 模型

用户模型，存储用户认证信息和状态
"""

from typing import List, TYPE_CHECKING
from sqlalchemy import Index, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .query import Query


class User(Base):
    """用户模型

    职责：
    - 存储用户认证信息 (用户名, 邮箱, 密码哈希)
    - 管理用户状态 (激活/停用)
    - 提供用户查询历史的入口点

    约束：
    - username: 必填，唯一，最大 50 字符
    - email: 必填，唯一，符合邮箱格式
    - hashed_password: 必填，使用 bcrypt 加密
    - is_active: 默认 True
    """

    __tablename__ = "users"

    # 基础字段
    username: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        comment="用户名"
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        comment="邮箱地址"
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="加密后的密码"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="账户是否激活"
    )

    # 关系
    queries: Mapped[List["Query"]] = relationship(
        "Query",
        back_populates="user",
        lazy="selectin"
    )

    # 索引
    __table_args__ = (
        Index('idx_users_username', 'username'),
        Index('idx_users_email', 'email'),
    )

    def __repr__(self) -> str:
        """字符串表示"""
        return f"User(id={self.id}, username={self.username}, email={self.email})"

    def to_dict(self) -> dict[str, object]:
        """转换为字典 (排除敏感信息)"""
        data = super().to_dict()
        data.pop("hashed_password", None)  # 排除密码哈希
        return data
