"""
API 路由主模块

聚合所有 API 路由
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Request, Depends

import structlog

from ..core.config import get_settings
from ..schemas.health import HealthCheckResponse
from .deps import get_structlog_logger, get_request_id

# 创建主路由器
api_router = APIRouter()


# 健康检查端点
@api_router.get("/health")
async def health_check() -> HealthCheckResponse:
    """健康检查端点"""
    settings = get_settings()
    return HealthCheckResponse(
        status="healthy",
        version=settings.app_version,
        timestamp=datetime.now(timezone.utc)
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
        "levels_shown": ["debug", "info", "warning", "error"]
    }
