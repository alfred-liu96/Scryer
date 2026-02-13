"""
缓存服务模块

提供 Redis 缓存的抽象操作层
"""

import json
from typing import Any, AsyncGenerator

from redis.asyncio import Redis as AsyncRedis
from structlog import get_logger

from backend.app.core.exceptions import (
    CacheDeserializationError,
    CacheSerializationError,
)

logger = get_logger()


class CacheService:
    """缓存服务类

    提供 Redis 缓存的高级操作接口，支持字符串、JSON 对象等数据类型的缓存

    Attributes:
        redis (AsyncRedis): Redis 客户端实例
        key_prefix (str): 缓存键前缀，用于命名空间隔离
    """

    def __init__(
        self,
        redis_client: AsyncRedis,
        key_prefix: str = "scryer",
    ) -> None:
        """初始化缓存服务

        Args:
            redis_client: Redis 客户端实例
            key_prefix: 缓存键前缀，默认为 "scryer"
        """
        self.redis = redis_client
        self.key_prefix = key_prefix
        logger.info(
            "CacheService initialized",
            key_prefix=key_prefix,
        )

    async def set(
        self,
        key: str,
        value: str,
        ttl: int | None = None,
    ) -> bool:
        """设置缓存值

        Args:
            key: 缓存键
            value: 缓存值（字符串）
            ttl: 过期时间（秒），None 表示不过期

        Returns:
            bool: 设置成功返回 True
        """
        try:
            if ttl is not None:
                await self.redis.setex(key, ttl, value)
                logger.debug(
                    "Cache set with TTL",
                    key=key,
                    ttl=ttl,
                )
            else:
                await self.redis.set(key, value)
                logger.debug("Cache set", key=key)

            return True
        except Exception as e:
            logger.error(
                "Failed to set cache",
                key=key,
                error=str(e),
            )
            return False

    async def get(self, key: str) -> str | None:
        """获取缓存值

        Args:
            key: 缓存键

        Returns:
            str | None: 缓存值，不存在返回 None
        """
        try:
            value = await self.redis.get(key)
            if value is not None:
                logger.debug("Cache hit", key=key)
            else:
                logger.debug("Cache miss", key=key)

            return value
        except Exception as e:
            logger.error(
                "Failed to get cache",
                key=key,
                error=str(e),
            )
            return None

    async def delete(self, key: str) -> bool:
        """删除缓存

        Args:
            key: 缓存键

        Returns:
            bool: 删除成功返回 True，键不存在返回 False
        """
        try:
            result = await self.redis.delete(key)
            deleted = result > 0
            if deleted:
                logger.debug("Cache deleted", key=key)

            return deleted
        except Exception as e:
            logger.error(
                "Failed to delete cache",
                key=key,
                error=str(e),
            )
            return False

    async def exists(self, key: str) -> bool:
        """检查缓存键是否存在

        Args:
            key: 缓存键

        Returns:
            bool: 键存在返回 True，否则返回 False
        """
        try:
            result = await self.redis.exists(key)
            return result > 0
        except Exception as e:
            logger.error(
                "Failed to check cache existence",
                key=key,
                error=str(e),
            )
            return False

    async def set_json(
        self,
        key: str,
        value: Any,
        ttl: int | None = None,
    ) -> bool:
        """设置 JSON 对象缓存

        Args:
            key: 缓存键
            value: 要缓存的对象（可序列化为 JSON）
            ttl: 过期时间（秒），None 表示不过期

        Returns:
            bool: 设置成功返回 True

        Raises:
            CacheSerializationError: JSON 序列化失败
        """
        try:
            json_str = json.dumps(value)
            return await self.set(key, json_str, ttl)
        except (TypeError, ValueError) as e:
            error_msg = f"Failed to serialize object to JSON: {str(e)}"
            logger.error(
                error_msg,
                key=key,
                object_type=type(value).__name__,
            )
            raise CacheSerializationError(
                error_msg,
                extra={
                    "key": key,
                    "object_type": type(value).__name__,
                },
            ) from e

    async def get_json(self, key: str) -> Any | None:
        """获取 JSON 对象缓存

        Args:
            key: 缓存键

        Returns:
            Any | None: 反序列化后的对象，不存在或无效返回 None

        Raises:
            CacheDeserializationError: JSON 反序列化失败
        """
        try:
            value = await self.get(key)
            if value is None:
                return None

            try:
                return json.loads(value)
            except json.JSONDecodeError as e:
                error_msg = f"Failed to deserialize JSON from cache: {str(e)}"
                logger.error(
                    error_msg,
                    key=key,
                    raw_value=value[:100],  # 只记录前100个字符
                )
                raise CacheDeserializationError(
                    error_msg,
                    extra={
                        "key": key,
                        "raw_data": value[:100],
                    },
                ) from e
        except CacheDeserializationError:
            raise
        except Exception as e:
            logger.error(
                "Unexpected error getting JSON cache",
                key=key,
                error=str(e),
            )
            return None

    async def mget(self, keys: list[str]) -> list[str | None]:
        """批量获取缓存值

        Args:
            keys: 缓存键列表

        Returns:
            list[str | None]: 对应的缓存值列表，不存在的键为 None
        """
        try:
            values = await self.redis.mget(keys)
            # Redis 返回的是 bytes，需要解码
            return [v if v is None else v.decode() if isinstance(v, bytes) else v for v in values]
        except Exception as e:
            logger.error(
                "Failed to mget cache",
                keys=keys,
                error=str(e),
            )
            return [None] * len(keys)

    async def mset(self, mapping: dict[str, str]) -> bool:
        """批量设置缓存值

        Args:
            mapping: 键值对字典

        Returns:
            bool: 设置成功返回 True
        """
        try:
            await self.redis.mset(mapping)
            logger.debug(
                "Cache mset",
                keys_count=len(mapping),
            )
            return True
        except Exception as e:
            logger.error(
                "Failed to mset cache",
                mapping_keys=list(mapping.keys()),
                error=str(e),
            )
            return False

    async def increment(
        self,
        key: str,
        amount: int = 1,
    ) -> int:
        """递增缓存值

        Args:
            key: 缓存键
            amount: 递增量，默认为 1

        Returns:
            int: 递增后的值
        """
        try:
            result = await self.redis.incrby(key, amount)
            logger.debug(
                "Cache incremented",
                key=key,
                amount=amount,
                result=result,
            )
            return result
        except Exception as e:
            logger.error(
                "Failed to increment cache",
                key=key,
                amount=amount,
                error=str(e),
            )
            raise

    async def decrement(
        self,
        key: str,
        amount: int = 1,
    ) -> int:
        """递减缓存值

        Args:
            key: 缓存键
            amount: 递减量，默认为 1

        Returns:
            int: 递减后的值
        """
        try:
            result = await self.redis.decrby(key, amount)
            logger.debug(
                "Cache decremented",
                key=key,
                amount=amount,
                result=result,
            )
            return result
        except Exception as e:
            logger.error(
                "Failed to decrement cache",
                key=key,
                amount=amount,
                error=str(e),
            )
            raise

    async def expire(self, key: str, ttl: int) -> bool:
        """设置缓存过期时间

        Args:
            key: 缓存键
            ttl: 过期时间（秒）

        Returns:
            bool: 设置成功返回 True
        """
        try:
            result = await self.redis.expire(key, ttl)
            logger.debug(
                "Cache expire set",
                key=key,
                ttl=ttl,
            )
            return result
        except Exception as e:
            logger.error(
                "Failed to set cache expiration",
                key=key,
                ttl=ttl,
                error=str(e),
            )
            return False

    async def ttl(self, key: str) -> int:
        """获取缓存剩余时间

        Args:
            key: 缓存键

        Returns:
            int: 剩余时间（秒），-1 表示永不过期，-2 表示键不存在
        """
        try:
            result = await self.redis.ttl(key)
            return result
        except Exception as e:
            logger.error(
                "Failed to get cache TTL",
                key=key,
                error=str(e),
            )
            return -2

    async def delete_by_pattern(self, pattern: str) -> int:
        """根据模式删除缓存

        Args:
            pattern: 键匹配模式（支持通配符 *）

        Returns:
            int: 删除的键数量
        """
        try:
            keys = []
            async for key in self.redis.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                count = await self.redis.delete(*keys)
                logger.info(
                    "Cache deleted by pattern",
                    pattern=pattern,
                    count=count,
                )
                return count
            return 0
        except Exception as e:
            logger.error(
                "Failed to delete cache by pattern",
                pattern=pattern,
                error=str(e),
            )
            return 0

    def build_key(self, *parts: str) -> str:
        """构建缓存键

        使用键前缀和各部分构建规范的缓存键

        Args:
            *parts: 键的各个部分

        Returns:
            str: 完整的缓存键（格式: prefix:part1:part2:...）

        Examples:
            >>> service = CacheService(redis, key_prefix="scryer")
            >>> service.build_key("user", "123")
            'scryer:user:123'
            >>> service.build_key("user", "123", "profile")
            'scryer:user:123:profile'
        """
        if parts:
            return f"{self.key_prefix}:{':'.join(parts)}"
        return self.key_prefix
