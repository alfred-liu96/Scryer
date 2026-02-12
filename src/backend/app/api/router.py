"""
API 路由主模块

聚合所有 API 路由
"""

from fastapi import APIRouter

# 创建主路由器
router = APIRouter()

# 示例路由
@router.get("/test")
async def test_endpoint():
    """测试端点"""
    return {"message": "API is working"}
