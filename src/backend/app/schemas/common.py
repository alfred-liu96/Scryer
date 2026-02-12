"""
通用响应模式模块

定义标准的 API 响应模型
"""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field, field_validator


# 定义泛型类型变量
T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    """成功响应模型

    用于所有成功操作的响应

    Attributes:
        success (bool): 成功标识，固定为 True
        message (str): 响应消息
        data (T | None): 响应数据
    """

    success: bool = Field(default=True, description="成功标识")
    message: str = Field(default="Success", description="响应消息")
    data: T | None = Field(default=None, description="响应数据")


class ErrorResponse(BaseModel):
    """错误响应模型

    用于所有错误情况的响应

    Attributes:
        success (bool): 成功标识，固定为 False
        error (str): 错误信息
        detail (str | None): 错误详细信息
        error_code (str | None): 错误码
    """

    success: bool = Field(default=False, description="成功标识")
    error: str = Field(..., description="错误信息")
    detail: str | None = Field(default=None, description="错误详细信息")
    error_code: str | None = Field(default=None, description="错误码")


class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应模型

    用于分页列表的响应

    Attributes:
        items (list[T]): 数据列表
        total (int): 总记录数
        page (int): 当前页码
        page_size (int): 每页大小
        total_pages (int): 总页数（计算得出）
        has_next (bool): 是否有下一页（计算得出）
        has_previous (bool): 是否有上一页（计算得出）
    """

    items: list[T] = Field(..., description="数据列表")
    total: int = Field(..., ge=0, description="总记录数")
    page: int = Field(..., gt=0, description="当前页码")
    page_size: int = Field(..., gt=0, description="每页大小")
    total_pages: int = Field(default=0, ge=0, description="总页数")
    has_next: bool = Field(default=False, description="是否有下一页")
    has_previous: bool = Field(default=False, description="是否有上一页")

    def __init__(self, **data: Any) -> None:
        """初始化分页响应

        自动计算 total_pages、has_next、has_previous
        """
        super().__init__(**data)

        # 计算总页数
        if self.page_size > 0:
            self.total_pages = (self.total + self.page_size - 1) // self.page_size
        else:
            self.total_pages = 0

        # 计算是否有下一页
        self.has_next = self.page < self.total_pages

        # 计算是否有上一页
        self.has_previous = self.page > 1


def create_success_response(
    data: T | None = None,
    message: str = "Success",
) -> SuccessResponse[T]:
    """创建成功响应

    Args:
        data: 响应数据
        message: 响应消息

    Returns:
        SuccessResponse: 成功响应实例
    """
    return SuccessResponse[T](success=True, data=data, message=message)


def create_error_response(
    error: str,
    detail: str | None = None,
    error_code: str | None = None,
) -> ErrorResponse:
    """创建错误响应

    Args:
        error: 错误信息
        detail: 错误详细信息
        error_code: 错误码

    Returns:
        ErrorResponse: 错误响应实例
    """
    return ErrorResponse(
        success=False,
        error=error,
        detail=detail,
        error_code=error_code,
    )


def create_paginated_response(
    items: list[T],
    total: int,
    page: int,
    page_size: int,
) -> PaginatedResponse[T]:
    """创建分页响应

    Args:
        items: 数据列表
        total: 总记录数
        page: 当前页码
        page_size: 每页大小

    Returns:
        PaginatedResponse: 分页响应实例
    """
    return PaginatedResponse[T](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )
