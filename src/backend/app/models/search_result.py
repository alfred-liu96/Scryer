"""SearchResult 模型

搜索结果模型，记录查询与内容的关联关系
"""

from typing import TYPE_CHECKING
from sqlalchemy import Index, String, ForeignKey, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .query import Query
    from .content import Content


class SearchResult(Base):
    """搜索结果模型

    职责：
    - 记录查询与内容的关联关系
    - 存储排名和评分信息
    - 支持结果去重 (同一查询+内容组合)

    约束：
    - query_id: 必填，外键关联到 queries.id
    - content_id: 必填，外键关联到 contents.id
    - rank: 必填，排名位置 (从 1 开始)
    - score: 可选，相关性评分 (0-1)
    - 唯一约束: (query_id, content_id) 组合唯一
    """

    __tablename__ = "search_results"

    # 外键
    query_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("queries.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联的查询 ID"
    )
    content_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("contents.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联的内容 ID"
    )

    # 业务字段
    rank: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="排名位置 (从 1 开始)"
    )
    score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
        comment="相关性评分 (0-1)"
    )

    # 关系
    query: Mapped["Query"] = relationship(
        "Query",
        back_populates="search_results",
        lazy="selectin"
    )
    content: Mapped["Content"] = relationship(
        "Content",
        back_populates="search_results",
        lazy="selectin"
    )

    # 索引和约束
    __table_args__ = (
        Index('idx_search_results_query_id', 'query_id'),
        Index('idx_search_results_content_id', 'content_id'),
        Index('idx_search_results_query_content', 'query_id', 'content_id', unique=True),
        Index('idx_search_results_rank', 'query_id', 'rank'),
    )

    def __repr__(self) -> str:
        """字符串表示"""
        return f"SearchResult(id={self.id}, query_id={self.query_id}, rank={self.rank})"
