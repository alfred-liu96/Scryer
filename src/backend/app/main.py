"""
FastAPI 应用主入口

包含应用创建、配置、中间件、路由注册等核心功能
"""

import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .core.config import get_settings
from .core.logger import get_logger, setup_logging
from .schemas.health import ComponentStatus, HealthCheckResponse

# 全局应用实例缓存
_app_instance: FastAPI | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """应用生命周期管理

    处理应用启动和关闭时的逻辑

    Args:
        app: FastAPI 应用实例
    """
    settings = get_settings()

    # 启动时执行
    # 初始化日志系统
    setup_logging(
        log_level=settings.log_level,
        log_file=settings.log_file,
        environment=settings.environment,
        max_bytes=settings.log_max_bytes,
        backup_count=settings.log_backup_count,
    )

    logger = get_logger(__name__)
    logger.info(f"Application starting up... environment={settings.environment}")

    # 初始化数据库
    from .core.database import init_db

    init_db()
    logger.info("Database initialized")

    yield

    # 关闭时执行
    logger.info("Application shutting down...")
    print("Application shutting down...")

    # 关闭数据库
    from .core.database import close_db

    await close_db()
    logger.info("Database closed")


async def _check_database_health() -> ComponentStatus:
    """检查数据库健康状态

    通过执行简单的查询来验证数据库连接是否正常

    Returns:
        ComponentStatus: 数据库组件状态
    """
    from .core.database import get_engine

    start_time = time.time()
    engine = get_engine()

    if engine is None:
        return ComponentStatus(
            status="unhealthy", latency_ms=None, error="Database engine not initialized"
        )

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            latency_ms = int((time.time() - start_time) * 1000)
            return ComponentStatus(status="healthy", latency_ms=latency_ms, error=None)
    except Exception as e:
        return ComponentStatus(status="unhealthy", latency_ms=None, error=str(e))


async def _check_redis_health() -> ComponentStatus:
    """检查 Redis 健康状态

    通过执行 PING 命令来验证 Redis 连接是否正常

    Returns:
        ComponentStatus: Redis 组件状态
    """
    from .core.redis import get_redis_client

    start_time = time.time()

    try:
        client = await get_redis_client()
        await client.ping()
        latency_ms = int((time.time() - start_time) * 1000)
        return ComponentStatus(status="healthy", latency_ms=latency_ms, error=None)
    except Exception as e:
        return ComponentStatus(status="unhealthy", latency_ms=None, error=str(e))


def create_app() -> FastAPI:
    """创建 FastAPI 应用实例

    配置应用、注册中间件、注册路由、设置事件处理器

    Returns:
        FastAPI: 配置好的 FastAPI 应用实例
    """
    settings = get_settings()

    # 创建 FastAPI 应用
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        lifespan=lifespan,
    )

    # 注册 RequestID 中间件（必须在其他中间件之前）
    from .middleware.request_id import RequestIDMiddleware

    app.add_middleware(RequestIDMiddleware)

    # 配置 CORS 中间件
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注册根端点
    @app.get("/")
    async def root():
        """根端点"""
        return {
            "message": f"Welcome to {settings.app_name}",
            "version": settings.app_version,
        }

    # 注册健康检查端点
    @app.get("/health")
    async def health() -> HealthCheckResponse:
        """健康检查端点"""
        # 并发检查各组件状态
        db_status = await _check_database_health()
        redis_status = await _check_redis_health()

        # 计算整体健康状态：任一组件不健康则整体不健康
        overall_status = (
            "healthy"
            if (db_status.status == "healthy" and redis_status.status == "healthy")
            else "unhealthy"
        )

        return HealthCheckResponse(
            status=overall_status,
            version=settings.app_version,
            timestamp=datetime.now(timezone.utc),
            database=db_status,
            redis=redis_status,
        )

    # 注册 API 路由
    from .api.router import api_router

    app.include_router(api_router, prefix=settings.api_prefix)

    return app


def get_application() -> FastAPI:
    """获取应用单例实例

    使用单例模式确保应用实例唯一

    Returns:
        FastAPI: FastAPI 应用实例
    """
    global _app_instance
    if _app_instance is None:
        _app_instance = create_app()
    return _app_instance


# 创建全局应用实例
app = get_application()
