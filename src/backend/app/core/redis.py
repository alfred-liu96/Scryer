"""
Redis 连接管理模块

提供 Redis 异步连接管理功能
"""

from redis.asyncio import (
    ConnectionPool as AsyncConnectionPool,  # type: ignore[import-untyped]
)
from redis.asyncio import Redis as AsyncRedis
from structlog import get_logger

from backend.app.core.config import get_settings

logger = get_logger()


class RedisConnectionManager:
    """Redis 连接管理器

    管理 Redis 连接池的生命周期，提供连接获取和释放功能

    Attributes:
        redis_url (str): Redis 连接 URL
        pool (AsyncConnectionPool | None): Redis 连接池实例
    """

    def __init__(self, redis_url: str) -> None:
        """初始化 Redis 连接管理器

        Args:
            redis_url: Redis 连接 URL
        """
        self.redis_url = redis_url
        self.pool: AsyncConnectionPool | None = None

    def _ensure_pool(self) -> None:
        """确保连接池已初始化（延迟初始化）"""
        if self.pool is None:
            self.pool = AsyncConnectionPool.from_url(
                self.redis_url,
                decode_responses=True,
            )
            logger.info("Redis connection pool created", url=self.redis_url)

    async def get_client(self) -> AsyncRedis:
        """获取 Redis 客户端

        从连接池中获取一个 Redis 客户端实例

        Returns:
            AsyncRedis: Redis 客户端实例
        """
        self._ensure_pool()
        client = AsyncRedis(connection_pool=self.pool)
        return client

    async def close(self) -> None:
        """关闭连接池

        释放所有连接并关闭连接池
        """
        if self.pool is not None:
            await self.pool.disconnect()
            self.pool = None
            logger.info("Redis connection pool closed")

    async def ping(self) -> bool:
        """测试 Redis 连接

        发送 PING 命令测试连接是否正常

        Returns:
            bool: 连接正常返回 True，否则返回 False
        """
        try:
            client = await self.get_client()
            result: bool = await client.ping()  # type: ignore[no-any-return]
            return result
        except Exception as e:
            logger.error("Redis ping failed", error=str(e))
            return False


# 全局 Redis 管理器实例
_redis_manager: RedisConnectionManager | None = None
_redis_pool: AsyncConnectionPool | None = None


async def get_redis_pool() -> AsyncConnectionPool:
    """获取 Redis 连接池单例

    使用懒加载模式，第一次调用时创建连接池
    后续调用返回缓存的连接池

    Returns:
        AsyncConnectionPool: Redis 连接池实例
    """
    global _redis_pool, _redis_manager

    if _redis_pool is None:
        settings = get_settings()
        _redis_manager = RedisConnectionManager(settings.redis_url)
        _redis_pool = _redis_manager.pool

        logger.info("Redis connection pool initialized")

    return _redis_pool


async def get_redis_client() -> AsyncRedis:
    """获取 Redis 客户端

    从全局连接池中获取一个 Redis 客户端实例

    Returns:
        AsyncRedis: Redis 客户端实例
    """
    pool = await get_redis_pool()
    client = AsyncRedis(connection_pool=pool)
    return client


async def close_redis_pool() -> None:
    """关闭 Redis 连接池

    关闭全局 Redis 连接池并释放资源
    """
    global _redis_manager, _redis_pool

    if _redis_manager is not None:
        await _redis_manager.close()
        _redis_manager = None
        _redis_pool = None
        logger.info("Global Redis connection pool closed")
