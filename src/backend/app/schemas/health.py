"""
健康检查响应模型

定义健康检查端点的响应结构
"""

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


class ComponentStatus(BaseModel):
    """组件状态模型

    用于表示单个组件（数据库、Redis等）的健康状态

    Attributes:
        status (Literal["healthy", "unhealthy"]): 组件状态
        latency_ms (int | None): 延迟时间（毫秒）
        error (str | None): 错误信息
    """

    status: Literal["healthy", "unhealthy"] = Field(..., description="组件状态")
    latency_ms: int | None = Field(None, description="延迟(毫秒)")
    error: str | None = Field(None, description="错误信息")


class HealthCheckResponse(BaseModel):
    """健康检查响应模型

    用于健康检查端点的响应

    Attributes:
        status (str): 健康状态 (healthy/unhealthy)
        version (str): 应用版本
        timestamp (datetime): 检查时间戳
        database (ComponentStatus): 数据库组件状态
        redis (ComponentStatus): Redis组件状态
    """

    status: str = Field(default="healthy", description="健康状态")
    version: str = Field(..., description="应用版本")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), description="检查时间戳"
    )
    database: ComponentStatus = Field(..., description="数据库组件状态")
    redis: ComponentStatus = Field(..., description="Redis组件状态")
