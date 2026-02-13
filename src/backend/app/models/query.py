"""Query 模型

查询记录模型，记录用户的查询历史
"""

from typing import List, TYPE_CHECKING, Any
from sqlalchemy import Index, Text, String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .search_result import SearchResult


class Query(Base):
    """查询记录模型

    职责：
    - 记录用户的查询文本和参数
    - 维护与用户的多对一关系
    - 维护与搜索结果的一对多关系

    约束：
    - user_id: 必填，外键关联到 users.id
    - query_text: 必填，存储查询文本
    - query_params: 可选，JSONB 格式存储查询参数
    """

    __tablename__ = "queries"

    # 外键
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联的用户 ID"
    )

    # 业务字段
    query_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="查询文本"
    )
    query_params: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="查询参数 (JSONB 格式)"
    )

    # 关系
    user: Mapped["User"] = relationship(
        "User",
        back_populates="queries",
        lazy="selectin"
    )
    search_results: Mapped[List["SearchResult"]] = relationship(
        "SearchResult",
        back_populates="query",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # 索引
    __table_args__ = (
        Index('idx_queries_user_id', 'user_id'),
        Index('idx_queries_created_at', 'created_at'),
        Index('idx_queries_user_created', 'user_id', 'created_at'),
    )

    def __repr__(self) -> str:
        """字符串表示"""
        text_preview = self.query_text[:30] if self.query_text else "N/A"
        return f"Query(id={self.id}, user_id={self.user_id}, text={text_preview}...)"
