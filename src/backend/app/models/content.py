"""Content 模型

内容模型，存储爬取或搜索到的内容
"""

from typing import List, TYPE_CHECKING
from sqlalchemy import Index, Text, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .search_result import SearchResult


class Content(Base):
    """内容模型

    职责：
    - 存储爬取或搜索到的内容
    - 通过 content_hash 实现内容去重
    - 提供搜索结果的关联点

    约束：
    - url: 必填，存储内容的原始 URL
    - content_hash: 必填，唯一，基于内容的 SHA-256 哈希
    - title: 可选，最多 500 字符
    - summary: 可选，存储内容摘要
    """

    __tablename__ = "contents"

    # 业务字段
    url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="内容 URL"
    )
    title: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="内容标题"
    )
    summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="内容摘要"
    )
    content_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        comment="内容哈希值 (SHA-256)"
    )

    # 关系
    search_results: Mapped[List["SearchResult"]] = relationship(
        "SearchResult",
        back_populates="content",
        lazy="selectin"
    )

    # 索引
    __table_args__ = (
        Index('idx_contents_content_hash', 'content_hash', unique=True),
        Index('idx_contents_created_at', 'created_at'),
    )

    def __repr__(self) -> str:
        """字符串表示"""
        title_str = self.title[:30] if self.title else "N/A"
        hash_str = self.content_hash[:8] if self.content_hash else "N/A"
        return f"Content(id={self.id}, title={title_str}, hash={hash_str}...)"
