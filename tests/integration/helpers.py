"""
Integration test helper functions

提供集成测试的辅助函数
"""

import asyncio
import os
from typing import Any, Dict
from urllib.parse import urlparse


def get_docker_db_url() -> str:
    """获取 Docker 环境下的数据库连接 URL

    Returns:
        str: 数据库连接 URL
    """
    postgres_user = os.getenv("POSTGRES_USER", "scryer")
    postgres_password = os.getenv("POSTGRES_PASSWORD", "scryer_dev_password_change_me")
    postgres_db = os.getenv("POSTGRES_DB", "scryer_test")
    postgres_host = os.getenv("POSTGRES_HOST", "postgres-test")
    postgres_port = os.getenv("POSTGRES_PORT", "5432")

    return (
        f"postgresql+asyncpg://{postgres_user}:{postgres_password}@"
        f"{postgres_host}:{postgres_port}/{postgres_db}"
    )


def get_docker_redis_url() -> str:
    """获取 Docker 环境下的 Redis 连接 URL

    Returns:
        str: Redis 连接 URL
    """
    redis_host = os.getenv("REDIS_HOST", "redis-test")
    redis_port = os.getenv("REDIS_PORT", "6379")
    redis_db = os.getenv("REDIS_DB", "1")

    return f"redis://{redis_host}:{redis_port}/{redis_db}"


def parse_db_url(url: str) -> Dict[str, Any]:
    """解析数据库 URL

    Args:
        url: 数据库连接 URL

    Returns:
        dict: 包含连接信息的字典
    """
    parsed = urlparse(url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "user": parsed.username,
        "password": parsed.password,
        "database": parsed.path[1:] if parsed.path else "scryer",
    }


def parse_redis_url(url: str) -> Dict[str, Any]:
    """解析 Redis URL

    Args:
        url: Redis 连接 URL

    Returns:
        dict: 包含连接信息的字典
    """
    parsed = urlparse(url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 6379,
        "db": parsed.path[1:] if parsed.path else "0",
    }


async def wait_for_service(
    host: str,
    port: int,
    timeout: float = 30.0,
    check_interval: float = 1.0,
) -> bool:
    """等待服务可用

    Args:
        host: 服务主机
        port: 服务端口
        timeout: 超时时间（秒）
        check_interval: 检查间隔（秒）

    Returns:
        bool: 服务可用返回 True，超时返回 False
    """
    import asyncio

    start_time = asyncio.get_event_loop().time()

    while True:
        try:
            # 尝试建立 TCP 连接
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port),
                timeout=2.0,
            )
            writer.close()
            await writer.wait_closed()
            return True

        except (ConnectionRefusedError, OSError, asyncio.TimeoutError):
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed >= timeout:
                return False

            await asyncio.sleep(check_interval)


async def check_postgres_connection(url: str) -> bool:
    """检查 PostgreSQL 连接

    Args:
        url: 数据库连接 URL

    Returns:
        bool: 连接成功返回 True
    """
    import asyncpg

    db_config = parse_db_url(url)

    try:
        conn = await asyncio.wait_for(
            asyncpg.connect(**db_config),
            timeout=10.0,
        )

        result = await conn.fetchval("SELECT 1")
        await conn.close()

        return result == 1  # type: ignore[no-any-return]

    except (asyncpg.PostgresError, asyncio.TimeoutError, ConnectionRefusedError):
        return False


async def check_redis_connection(url: str) -> bool:
    """检查 Redis 连接

    Args:
        url: Redis 连接 URL

    Returns:
        bool: 连接成功返回 True
    """
    from redis.asyncio import Redis

    redis_config = parse_redis_url(url)

    try:
        client = await asyncio.wait_for(
            Redis(**redis_config, decode_responses=True),
            timeout=10.0,
        )

        result = await asyncio.wait_for(client.ping(), timeout=5.0)
        await client.aclose()

        return result  # type: ignore[no-any-return]

    except (ConnectionError, asyncio.TimeoutError):
        return False


def format_duration(seconds: float) -> str:
    """格式化时长

    Args:
        seconds: 秒数

    Returns:
        str: 格式化后的时长字符串
    """
    if seconds < 1:
        return f"{seconds * 1000:.0f}ms"
    elif seconds < 60:
        return f"{seconds:.1f}s"
    else:
        minutes = int(seconds // 60)
        secs = seconds % 60
        return f"{minutes}m {secs:.0f}s"


def calculate_success_rate(passed: int, total: int) -> float:
    """计算成功率

    Args:
        passed: 通过数
        total: 总数

    Returns:
        float: 成功率（百分比）
    """
    if total == 0:
        return 0.0
    return (passed / total) * 100.0


class TestTimer:
    """测试计时器上下文管理器"""

    def __init__(self, name: str = "Test") -> None:
        """初始化计时器

        Args:
            name: 计时器名称
        """
        self.name = name
        self.start_time: float | None = None
        self.end_time: float | None = None
        self.duration: float | None = None

    def __enter__(self):
        import time

        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        import time

        self.end_time = time.time()
        if self.start_time is not None:
            self.duration = self.end_time - self.start_time
            print(f"{self.name} took {format_duration(self.duration)}")

        return False

    def __float__(self):
        return self.duration if self.duration is not None else 0.0
