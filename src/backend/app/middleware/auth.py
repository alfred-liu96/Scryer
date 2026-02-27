"""
JWT 认证中间件模块

负责捕获认证相关异常并统一处理错误响应
"""

import structlog
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from ..core.exceptions import InvalidTokenError, TokenExpiredError


class AuthMiddleware(BaseHTTPMiddleware):
    """JWT 认证中间件

    职责：
        - 捕获认证相关异常并统一处理
        - 记录认证失败日志
        - 返回标准化的错误响应

    注意：
        - 不主动拦截请求（由依赖注入完成）
        - 仅处理异常层面的统一响应

    设计原则：
        - 最小化：只做异常捕获和响应格式化
        - 透明性：不影响正常请求流程
    """

    def __init__(self, app: ASGIApp) -> None:
        """初始化中间件

        Args:
            app: ASGI 应用实例
        """
        super().__init__(app)
        self._logger = structlog.get_logger(__name__)

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """处理请求并捕获认证异常

        Args:
            request: FastAPI 请求对象
            call_next: 下一个中间件或路由处理器

        Returns:
            Response: FastAPI 响应对象
        """
        try:
            # 调用下一个中间件或路由处理器
            response = await call_next(request)
            return response
        except TokenExpiredError as e:
            # 必须先捕获 TokenExpiredError（因为它是 InvalidTokenError 的子类）
            self._logger.warning(
                "token_expired",
                path=request.url.path,
                detail=str(e),
                expired_at=str(e.expired_at),
            )
            return JSONResponse(
                status_code=401,
                content={
                    "detail": str(e),
                    "token_type": e.token_type,
                    "expired_at": e.expired_at.isoformat() if e.expired_at else None,
                },
            )
        except InvalidTokenError as e:
            # 记录日志
            self._logger.warning(
                "invalid_token",
                path=request.url.path,
                detail=str(e),
                token_type=e.token_type,
            )
            # 返回 401 响应
            return JSONResponse(
                status_code=401,
                content={"detail": str(e), "token_type": e.token_type},
            )
