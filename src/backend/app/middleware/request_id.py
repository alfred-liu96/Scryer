"""
Request ID 中间件模块

为每个请求生成唯一的 request_id，并将其注入到日志上下文中
"""

import uuid
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


# 请求上下文的 key
REQUEST_ID_CONTEXT_KEY = "request_id"


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Request ID 中间件

    为每个请求生成唯一的 request_id，并将其：
    1. 添加到响应头中（X-Request-ID）
    2. 绑定到 structlog 上下文中
    3. 在请求结束时清理上下文

    支持从请求头中读取已有的 request_id
    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        """处理请求并注入 request_id

        Args:
            request: FastAPI 请求对象
            call_next: 下一个中间件或路由处理器

        Returns:
            Response: FastAPI 响应对象，包含 X-Request-ID 响应头
        """
        # 尝试从请求头中获取现有的 request_id
        existing_request_id = request.headers.get("X-Request-ID", "")

        # 验证现有 request_id 是否为有效的 UUID
        if existing_request_id:
            try:
                uuid.UUID(existing_request_id)
                request_id = existing_request_id
            except (ValueError, AttributeError):
                # 无效的 UUID，生成新的
                request_id = str(uuid.uuid4())
        else:
            # 生成新的 request_id
            request_id = str(uuid.uuid4())

        # 将 request_id 添加到请求状态中，供后续使用
        request.state.request_id = request_id

        # 绑定到 structlog 上下文
        structlog.contextvars.bind_contextvars(request_id=request_id)

        # 调用下一个中间件或路由处理器
        response = await call_next(request)

        # 在响应头中添加 request_id
        response.headers["X-Request-ID"] = request_id

        # 清理 structlog 上下文
        structlog.contextvars.unbind_contextvars("request_id")

        return response


def get_request_id(request: Request) -> str | None:
    """获取当前请求的 request_id

    依赖注入函数，用于在路由中获取 request_id

    Args:
        request: FastAPI 请求对象

    Returns:
        str | None: 当前请求的唯一标识符，如果中间件未运行则返回 None
    """
    # 从请求状态中获取 request_id
    return getattr(request.state, "request_id", None)
