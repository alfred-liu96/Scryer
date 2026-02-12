"""
核心异常处理模块

定义自定义异常类和异常处理器
"""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError


class ScryerException(Exception):
    """基础异常类

    所有自定义异常的基类

    Attributes:
        detail (str): 错误详情
        status_code (int): HTTP 状态码
        extra (dict | None): 额外数据
    """

    def __init__(
        self,
        detail: str,
        *,
        status_code: int = 500,
        extra: dict[str, Any] | None = None,
    ) -> None:
        self.detail = detail
        self.status_code = status_code
        self.extra = extra
        super().__init__(detail)

    def __str__(self) -> str:
        return self.detail


class ValidationError(ScryerException):
    """验证错误异常

    用于请求数据验证失败的情况

    Attributes:
        detail (str): 错误详情
        field (str | None): 出错的字段名
        extra (dict | None): 额外数据
    """

    def __init__(
        self,
        detail: str,
        *,
        field: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        self.field = field
        super().__init__(detail, status_code=422, extra=extra)


class NotFoundError(ScryerException):
    """资源未找到异常

    用于请求的资源不存在的情况

    Attributes:
        detail (str): 错误详情
        resource_type (str | None): 资源类型
        extra (dict | None): 额外数据
    """

    def __init__(
        self,
        detail: str,
        *,
        resource_type: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        self.resource_type = resource_type
        super().__init__(detail, status_code=404, extra=extra)


class ConflictError(ScryerException):
    """冲突错误异常

    用于请求与现有资源冲突的情况（如重复创建）

    Attributes:
        detail (str): 错误详情
        extra (dict | None): 额外数据
    """

    def __init__(
        self,
        detail: str,
        *,
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(detail, status_code=409, extra=extra)


class UnauthorizedError(ScryerException):
    """未授权异常

    用于需要认证但未提供认证信息的情况

    Attributes:
        detail (str): 错误详情
        extra (dict | None): 额外数据
    """

    def __init__(
        self,
        detail: str,
        *,
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(detail, status_code=401, extra=extra)


class ForbiddenError(ScryerException):
    """禁止访问异常

    用于认证通过但权限不足的情况

    Attributes:
        detail (str): 错误详情
        extra (dict | None): 额外数据
    """

    def __init__(
        self,
        detail: str,
        *,
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(detail, status_code=403, extra=extra)


class InternalServerError(ScryerException):
    """内部服务器错误异常

    用于服务器内部错误的情况

    Attributes:
        detail (str): 错误详情
        extra (dict | None): 额外数据
    """

    def __init__(
        self,
        detail: str,
        *,
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(detail, status_code=500, extra=extra)


async def scryer_exception_handler(
    request: Request, exc: ScryerException
) -> JSONResponse:
    """ScryerException 异常处理器

    处理所有 ScryerException 及其子类异常

    Args:
        request: FastAPI 请求对象
        exc: 异常实例

    Returns:
        JSONResponse: 错误响应
    """
    # 构建错误响应
    content = {"detail": exc.detail}

    # 如果有额外数据，添加到响应中
    if exc.extra:
        content.update(exc.extra)

    return JSONResponse(
        status_code=exc.status_code,
        content=content,
    )


async def validation_exception_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Pydantic ValidationError 异常处理器

    处理 Pydantic 验证错误

    Args:
        request: FastAPI 请求对象
        exc: Pydantic ValidationError 实例

    Returns:
        JSONResponse: 错误响应
    """
    # 提取错误信息
    errors = exc.errors()

    # 构建错误响应
    content = {
        "detail": "Validation error",
        "errors": errors,
    }

    return JSONResponse(
        status_code=422,
        content=content,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """注册异常处理器

    将自定义异常处理器注册到 FastAPI 应用

    Args:
        app: FastAPI 应用实例
    """
    # 注册 ScryerException 处理器
    app.add_exception_handler(ScryerException, scryer_exception_handler)

    # 注册 ValidationError 处理器
    app.add_exception_handler(ValidationError, validation_exception_handler)
