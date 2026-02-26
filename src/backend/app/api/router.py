"""
API 路由主模块

聚合所有 API 路由
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request

from ..core.config import get_settings
from ..core.health import check_database, check_redis
from ..schemas.health import HealthCheckResponse
from .deps import get_request_id, get_structlog_logger

# 创建主路由器
api_router = APIRouter()


# 健康检查端点
@api_router.get("/health")
async def health_check() -> HealthCheckResponse:
    """健康检查端点

    检查应用、数据库、Redis 的健康状态
    """
    settings = get_settings()

    # 检查数据库连接
    db_status = await check_database()

    # 检查 Redis 连接
    redis_status = await check_redis()

    # 计算整体状态：任意组件失败则为 unhealthy
    overall_status = (
        "healthy"
        if db_status.status == "healthy" and redis_status.status == "healthy"
        else "unhealthy"
    )

    return HealthCheckResponse(
        status=overall_status,
        version=settings.app_version,
        timestamp=datetime.now(timezone.utc),
        database=db_status,
        redis=redis_status,
    )


# 示例路由
@api_router.get("/test")
async def test_endpoint():
    """测试端点"""
    return {"message": "API is working"}


# 日志演示端点
@api_router.get("/demo/logging")
async def logging_demo(
    request: Request,
    request_id: str = Depends(get_request_id),
):
    """日志演示端点

    展示不同日志级别的使用
    """
    logger = get_structlog_logger().bind(request_id=request_id)

    logger.debug("This is a DEBUG log message")
    logger.info("This is an INFO log message", endpoint="/demo/logging")
    logger.warning("This is a WARNING log message", level="warning")
    logger.error("This is an ERROR log message", level="error")

    # 记录带有结构化数据的日志
    logger.info(
        "User action logged",
        action="logging_demo",
        request_id=request_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    return {
        "message": "Logging demo completed",
        "request_id": request_id,
        "levels_shown": ["debug", "info", "warning", "error"],
    }
