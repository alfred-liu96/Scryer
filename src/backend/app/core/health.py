"""
健康检查模块

提供数据库和 Redis 的健康检查功能
"""

import time

from sqlalchemy import text

from ..schemas.health import ComponentStatus
from .database import get_engine
from .redis import get_redis_client


async def check_database() -> ComponentStatus:
    """检查数据库健康状态

    Returns:
        ComponentStatus: 数据库组件状态
    """
    engine = get_engine()

    if engine is None:
        return ComponentStatus(
            status="unhealthy", latency_ms=None, error="Database engine not initialized"
        )

    try:
        start_time = time.time()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        latency_ms = int((time.time() - start_time) * 1000)
        return ComponentStatus(status="healthy", latency_ms=latency_ms, error=None)
    except Exception as e:
        return ComponentStatus(status="unhealthy", latency_ms=None, error=str(e))


async def check_redis() -> ComponentStatus:
    """检查 Redis 健康状态

    Returns:
        ComponentStatus: Redis 组件状态
    """
    start_time = time.time()

    try:
        client = await get_redis_client()
        await client.ping()
        latency_ms = int((time.time() - start_time) * 1000)
        return ComponentStatus(status="healthy", latency_ms=latency_ms, error=None)
    except Exception as e:
        return ComponentStatus(status="unhealthy", latency_ms=None, error=str(e))
