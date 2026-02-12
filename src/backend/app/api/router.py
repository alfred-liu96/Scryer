"""
API 路由主模块

聚合所有 API 路由
"""

from datetime import datetime, timezone

from fastapi import APIRouter

from ..core.config import get_settings
from ..schemas.health import HealthCheckResponse

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
