"""
健康检查响应模型

定义健康检查端点的响应结构
"""

from datetime import datetime

from pydantic import BaseModel, Field


class HealthCheckResponse(BaseModel):
    """健康检查响应模型

    用于健康检查端点的响应

    Attributes:
        status (str): 健康状态 (healthy/unhealthy)
        version (str): 应用版本
        timestamp (datetime): 检查时间戳
    """

    status: str = Field(default="healthy", description="健康状态")
    version: str = Field(..., description="应用版本")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="检查时间戳")
