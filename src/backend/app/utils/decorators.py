"""
缓存装饰器模块

提供函数和异步函数的缓存装饰器
"""

import json
from functools import wraps
from typing import Any, Awaitable, Callable, TypeVar, cast

from redis.asyncio import Redis as AsyncRedis  # type: ignore[import-untyped]
from structlog import get_logger

from backend.app.services.cache import CacheService

logger = get_logger()

T = TypeVar("T")
F = TypeVar("F", bound=Callable[..., Any])
AsyncF = TypeVar("AsyncF", bound=Callable[..., Awaitable[Any]])


# 全局缓存服务实例（用于装饰器）
_cache_service: CacheService | None = None


def _get_cache_service() -> CacheService:
    """获取全局缓存服务实例

    Returns:
        CacheService: 缓存服务实例

    Raises:
        RuntimeError: 如果缓存服务未初始化
    """
    if _cache_service is None:
        raise RuntimeError(
            "Cache service not initialized. " "Call init_cache_decorators() first."
        )
    return _cache_service


def init_cache_decorators(redis_client: AsyncRedis) -> None:
    """初始化缓存装饰器

    Args:
        redis_client: Redis 客户端实例
    """
    global _cache_service
    _cache_service = CacheService(redis_client=redis_client)
    logger.info("Cache decorators initialized")


def cached_async(
    key_builder: Callable[..., str],
    ttl: int | None = None,
) -> Callable[[AsyncF], AsyncF]:
    """异步函数缓存装饰器

    Args:
        key_builder: 缓存键构建函数，接收函数参数返回缓存键
        ttl: 缓存过期时间（秒），None 表示不过期

    Returns:
        装饰器函数

    Examples:
        >>> @cached_async(key_builder=lambda user_id: f"user:{user_id}")
        >>> async def get_user(user_id: int):
        >>>     return await db.query_user(user_id)
    """

    def decorator(func: AsyncF) -> AsyncF:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            cache_service = _get_cache_service()

            # 构建缓存键
            cache_key = key_builder(*args, **kwargs)

            # 尝试从缓存获取
            cached_value = await cache_service.get(cache_key)
            if cached_value is not None:
                logger.debug("Cache hit", key=cache_key, function=func.__name__)
                # 尝试解析 JSON，如果失败则返回原始值
                try:
                    return json.loads(cached_value)
                except (json.JSONDecodeError, TypeError):
                    return cached_value

            # 缓存未命中，执行函数
            logger.debug(
                "Cache miss",
                key=cache_key,
                function=func.__name__,
            )
            try:
                result = await func(*args, **kwargs)

                # 将结果存入缓存
                try:
                    json_result = json.dumps(result)
                    if ttl is not None:
                        await cache_service.set(cache_key, json_result, ttl=ttl)
                    else:
                        await cache_service.set(cache_key, json_result)
                except (TypeError, ValueError):
                    # 如果无法序列化为 JSON，直接存储字符串
                    str_result = str(result)
                    if ttl is not None:
                        await cache_service.set(
                            cache_key,
                            str_result,
                            ttl=ttl,
                        )
                    else:
                        await cache_service.set(cache_key, str_result)

                return result
            except Exception as e:
                logger.error(
                    "Function execution failed",
                    function=func.__name__,
                    error=str(e),
                )
                raise

        return cast(AsyncF, wrapper)

    return decorator


# cached 是 cached_async 的别名，提供更简洁的 API
cached = cached_async
