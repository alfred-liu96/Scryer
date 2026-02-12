"""
SQLAlchemy Base 模型

提供所有数据库模型的基类，包含通用字段和方法
"""

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column


class Base(DeclarativeBase):
    """数据库模型基类

    所有 SQLAlchemy 模型都应该继承此类

    提供通用字段：
    - id: UUID 主键
    - created_at: 创建时间
    - updated_at: 更新时间

    提供通用方法：
    - to_dict(): 转换为字典
    - __repr__(): 字符串表示
    """

    # 通用字段
    id: Mapped[str] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(),
        onupdate=lambda: datetime.now(),
        nullable=False,
    )

    __table_args__ = {"extend_existing": True}

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """自动生成表名

        将类名转换为小写并复数化

        Returns:
            str: 表名

        Example:
            class User(Base):
                pass
            # 表名为 "users"
        """
        # 简单的复数化规则：添加 's'
        # TODO: 可以使用更复杂的复数化库（如 inflect）
        name = cls.__name__.lower()
        if name.endswith("y"):
            # 以 y 结尾，去掉 y 加 ies
            return name[:-1] + "ies"
        elif name.endswith("s"):
            # 已经以 s 结尾，直接返回
            return name
        else:
            # 其他情况加 s
            return name + "s"

    def to_dict(self) -> dict[str, Any]:
        """将模型实例转换为字典

        排除 SQLAlchemy 内部属性（如 _sa_instance_state）

        Returns:
            dict[str, Any]: 包含模型字段的字典

        Example:
            >>> user = User(id="123", name="John")
            >>> user.to_dict()
            {"id": "123", "name": "John", "created_at": "...", "updated_at": "..."}
        """
        # 获取所有列
        columns = self.__table__.columns.keys()

        # 构建字典
        result = {}
        for column in columns:
            value = getattr(self, column)

            # 序列化特殊类型
            if isinstance(value, datetime):
                value = value.isoformat()
            elif hasattr(value, "hex"):  # UUID 等类型
                value = str(value)

            result[column] = value

        return result

    def __repr__(self) -> str:
        """字符串表示

        Returns:
            str: 模型的可读字符串表示

        Example:
            >>> user = User(id="123")
            >>> repr(user)
            "User(id=123)"
        """
        class_name = self.__class__.__name__
        id_str = str(self.id) if self.id is not None else "None"
        return f"{class_name}(id={id_str})"
