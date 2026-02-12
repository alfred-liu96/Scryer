"""
API 路由主模块

聚合所有 API 路由
"""

from fastapi import APIRouter

# 创建主路由器
api_router = APIRouter()


# 健康检查端点
@api_router.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy"}


# 示例路由
@api_router.get("/test")
async def test_endpoint():
    """测试端点"""
    return {"message": "API is working"}
