"""
BaseRepository - 基础仓储类

提供通用的数据访问方法，所有 Repository 都应该继承此类。

职责:
- 封装 SQLAlchemy 操作
- 提供标准的 CRUD 方法
- 提供查询、分页、排序等功能
- 管理事务 (commit/rollback)

类型安全:
- 使用 TypeVar 和 Generic 确保类型提示
- 所有方法返回模型类型或 None

事务管理:
- create, update, delete, bulk_create 会自动提交事务
- 操作失败时自动回滚
- 也可以在外部控制事务 (不自动 commit)

参考 Issue #54
"""

from typing import TypeVar, Generic, Type, Optional, Dict, List, Any
from logging import getLogger

from sqlalchemy import select, update as sql_update, func
from sqlalchemy.orm import Session

from src.backend.app.models import Base


# 类型变量 T 必须是 Base 的子类
T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """基础仓储类

    提供通用的数据访问方法，所有具体的 Repository 都应该继承此类。

    类型参数:
        T: 模型类型，必须继承自 Base

    示例:
        >>> class UserRepository(BaseRepository[User]):
        ...     pass
        >>> repo = UserRepository(session, User)
        >>> user = await repo.get_by_id("user-123")
    """

    def __init__(self, session: Session, model: Type[T]) -> None:
        """初始化 Repository

        Args:
            session: SQLAlchemy 异步会话
            model: 模型类 (如 User, Query 等)

        Raises:
            TypeError: 如果 model 不是 Base 的子类
        """
        if not issubclass(model, Base):
            raise TypeError(f"Model must be a subclass of Base, got {model}")

        self._session = session
        self._model = model
        self._logger = getLogger(f"{self.__class__.__name__}[{model.__name__}]")

    # ========================================================================
    # CRUD 操作
    # ========================================================================

    async def create(self, entity: T) -> T:
        """创建单条记录

        Args:
            entity: 要创建的模型实例

        Returns:
            T: 创建后的模型实例 (包含数据库生成的字段)

        Raises:
            Exception: 创建失败时抛出异常，并自动回滚事务

        示例:
            >>> user = User(username="test", email="test@example.com")
            >>> created_user = await repo.create(user)
        """
        try:
            # 添加到会话
            self._session.add(entity)

            # 提交事务
            await self._session.commit()

            # 刷新以获取数据库生成的值
            await self._refresh(entity)

            self._logger.debug(f"Created entity: {entity}")
            return entity

        except Exception as e:
            # 回滚事务
            await self._session.rollback()
            self._logger.error(f"Failed to create entity: {e}")
            raise

    async def get_by_id(self, entity_id: str) -> Optional[T]:
        """根据 ID 查询记录

        Args:
            entity_id: 实体 ID

        Returns:
            Optional[T]: 找到的记录，不存在时返回 None

        示例:
            >>> user = await repo.get_by_id("user-123")
            >>> if user:
            ...     print(user.username)
        """
        if not entity_id:
            return None

        stmt = select(self._model).where(self._model.id == entity_id)
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def list(
        self,
        *,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[List[str]] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[T]:
        """列表查询 (支持过滤、排序、分页)

        Args:
            filters: 过滤条件字典，例如 {"is_active": True}
            order_by: 排序字段列表，例如 ["username", "-created_at"]
                     前缀 "-" 表示降序
            skip: 跳过的记录数 (用于分页)
            limit: 返回的最大记录数 (默认 100)

        Returns:
            List[T]: 记录列表，空表时返回空列表

        示例:
            >>> # 获取所有激活用户，按创建时间倒序
            >>> users = await repo.list(
            ...     filters={"is_active": True},
            ...     order_by=["-created_at"],
            ...     skip=0,
            ...     limit=10
            ... )
        """
        # 构建查询
        stmt = select(self._model)

        # 应用过滤条件
        if filters:
            stmt = stmt.where(*self._build_filters(filters))

        # 应用排序
        if order_by:
            stmt = stmt.order_by(*self._build_order_by(order_by))

        # 应用分页
        stmt = stmt.offset(skip).limit(limit)

        # 执行查询
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, entity_id: str, update_data: Dict[str, Any]) -> Optional[T]:
        """更新记录

        Args:
            entity_id: 实体 ID
            update_data: 要更新的字段字典

        Returns:
            Optional[T]: 更新后的实体，不存在时返回 None

        Raises:
            Exception: 更新失败时抛出异常，并自动回滚事务

        示例:
            >>> user = await repo.update("user-123", {"username": "new_name"})
        """
        try:
            # 先查询记录是否存在
            entity = await self.get_by_id(entity_id)
            if not entity:
                return None

            # 更新字段
            for key, value in update_data.items():
                if hasattr(entity, key):
                    setattr(entity, key, value)

            # 提交事务
            await self._session.commit()

            # 刷新以获取最新状态
            await self._refresh(entity)

            self._logger.debug(f"Updated entity {entity_id}: {update_data}")
            return entity

        except Exception as e:
            # 回滚事务
            await self._session.rollback()
            self._logger.error(f"Failed to update entity {entity_id}: {e}")
            raise

    async def delete(self, entity_id: str) -> bool:
        """删除记录

        Args:
            entity_id: 实体 ID

        Returns:
            bool: 删除成功返回 True，记录不存在返回 False

        Raises:
            Exception: 删除失败时抛出异常，并自动回滚事务

        示例:
            >>> success = await repo.delete("user-123")
        """
        try:
            # 先查询记录是否存在
            entity = await self.get_by_id(entity_id)
            if not entity:
                return False

            # 删除记录
            self._session.delete(entity)

            # 提交事务
            await self._session.commit()

            self._logger.debug(f"Deleted entity: {entity_id}")
            return True

        except Exception as e:
            # 回滚事务
            await self._session.rollback()
            self._logger.error(f"Failed to delete entity {entity_id}: {e}")
            raise

    # ========================================================================
    # 统计和存在性检查
    # ========================================================================

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """统计记录数

        Args:
            filters: 过滤条件字典

        Returns:
            int: 记录总数

        示例:
            >>> total = await repo.count()
            >>> active_count = await repo.count({"is_active": True})
        """
        stmt = select(func.count(self._model.id))

        # 应用过滤条件
        if filters:
            stmt = stmt.where(*self._build_filters(filters))

        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def exists(self, filters: Dict[str, Any]) -> bool:
        """检查记录是否存在

        Args:
            filters: 过滤条件字典，至少需要一个条件

        Returns:
            bool: 记录存在返回 True，否则返回 False

        示例:
            >>> exists = await repo.exists({"username": "testuser"})
            >>> exists = await repo.exists({"email": "test@example.com", "is_active": True})
        """
        if not filters:
            # 空条件时检查是否有任意记录
            stmt = select(self._model).limit(1)
        else:
            stmt = select(self._model).where(*self._build_filters(filters)).limit(1)

        result = await self._session.execute(stmt)
        return result.scalars().first() is not None

    # ========================================================================
    # 批量操作
    # ========================================================================

    async def bulk_create(self, entities: List[T]) -> List[T]:
        """批量创建记录

        Args:
            entities: 要创建的模型实例列表

        Returns:
            List[T]: 创建后的模型实例列表

        Raises:
            Exception: 创建失败时抛出异常，并自动回滚事务

        示例:
            >>> users = [
            ...     User(username="user1", email="user1@example.com"),
            ...     User(username="user2", email="user2@example.com"),
            ... ]
            >>> created_users = await repo.bulk_create(users)
        """
        if not entities:
            return []

        try:
            # 批量添加到会话
            for entity in entities:
                self._session.add(entity)

            # 提交事务
            await self._session.commit()

            # 批量刷新
            for entity in entities:
                await self._refresh(entity)

            self._logger.debug(f"Bulk created {len(entities)} entities")
            return entities

        except Exception as e:
            # 回滚事务
            await self._session.rollback()
            self._logger.error(f"Failed to bulk create entities: {e}")
            raise

    # ========================================================================
    # 辅助方法
    # ========================================================================

    def _build_filters(self, filters: Dict[str, Any]) -> List:
        """构建过滤条件

        Args:
            filters: 过滤条件字典

        Returns:
            List: SQLAlchemy 过滤条件列表

        示例:
            >>> filters = {"is_active": True, "username": "test"}
            >>> conditions = self._build_filters(filters)
            >>> # [User.is_active == True, User.username == "test"]
        """
        conditions = []
        for key, value in filters.items():
            if hasattr(self._model, key):
                # 使用模型的属性构建条件
                attr = getattr(self._model, key)
                conditions.append(attr == value)
            else:
                self._logger.warning(f"Filter field '{key}' not found in model {self._model.__name__}")

        return conditions

    def _build_order_by(self, order_by: List[str]) -> List:
        """构建排序条件

        Args:
            order_by: 排序字段列表，前缀 "-" 表示降序

        Returns:
            List: SQLAlchemy 排序条件列表

        示例:
            >>> order_by = ["username", "-created_at"]
            >>> conditions = self._build_order_by(order_by)
            >>> # [User.username.asc(), User.created_at.desc()]
        """
        conditions = []
        for field in order_by:
            # 检查是否有降序前缀
            if field.startswith("-"):
                field_name = field[1:]
                is_desc = True
            else:
                field_name = field
                is_desc = False

            # 获取模型属性
            if hasattr(self._model, field_name):
                attr = getattr(self._model, field_name)
                if is_desc:
                    conditions.append(attr.desc())
                else:
                    conditions.append(attr.asc())
            else:
                self._logger.warning(f"Order field '{field_name}' not found in model {self._model.__name__}")

        return conditions

    async def _refresh(self, entity: T) -> None:
        """刷新实体以获取最新状态

        Args:
            entity: 要刷新的实体

        示例:
            >>> await self._refresh(user)
            >>> print(user.created_at)  # 最新值
        """
        try:
            await self._session.refresh(entity)
        except Exception as e:
            self._logger.warning(f"Failed to refresh entity {entity}: {e}")
