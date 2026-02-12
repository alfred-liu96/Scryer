"""
通用响应模式测试

测试范围：
- SuccessResponse 模型
- ErrorResponse 模型
- PaginatedResponse 模型（含自动计算字段）
- 创建响应函数
- 响应验证

契约来源：Issue #46 蓦图 - schemas/common.py 模块
"""

from typing import Any

import pytest
from pydantic import ValidationError

from src.backend.app.schemas.common import (
    SuccessResponse,
    ErrorResponse,
    PaginatedResponse,
    create_success_response,
    create_error_response,
    create_paginated_response,
)


class TestSuccessResponse:
    """测试 SuccessResponse 模型"""

    def test_default_success_field(self):
        """测试默认 success 字段为 True"""
        response = SuccessResponse()
        assert response.success is True

    def test_default_message_field(self):
        """测试默认 message 为 Success"""
        response = SuccessResponse()
        assert response.message == "Success"

    def test_default_data_field(self):
        """测试默认 data 为 None"""
        response = SuccessResponse()
        assert response.data is None

    def test_custom_message(self):
        """测试自定义 message"""
        response = SuccessResponse(message="Created")
        assert response.message == "Created"

    def test_with_data(self):
        """测试带 data 的响应"""
        data = {"id": 1}
        response = SuccessResponse(data=data)
        assert response.data == data

    def test_serialization(self):
        """测试序列化"""
        data = {"user_id": 123}
        response = SuccessResponse(data=data, message="User found")
        result = response.model_dump()

        assert result["success"] is True
        assert result["data"] == data
        assert result["message"] == "User found"


class TestErrorResponse:
    """测试 ErrorResponse 模型"""

    def test_default_success_field(self):
        """测试默认 success 字段为 False"""
        response = ErrorResponse(error="Not found")
        assert response.success is False

    def test_required_error_field(self):
        """测试 error 字段必需"""
        with pytest.raises(ValidationError):
            ErrorResponse()

    def test_with_detail(self):
        """测试带 detail 的响应"""
        response = ErrorResponse(error="Error", detail="Detail")
        assert response.detail == "Detail"

    def test_with_error_code(self):
        """测试带 error_code 的响应"""
        response = ErrorResponse(error="Error", error_code="CODE")
        assert response.error_code == "CODE"

    def test_serialization(self):
        """测试序列化"""
        response = ErrorResponse(
            error="Not found",
            detail="Resource not found",
            error_code="NOT_FOUND"
        )
        result = response.model_dump()

        assert result["success"] is False
        assert result["error"] == "Not found"
        assert result["detail"] == "Resource not found"
        assert result["error_code"] == "NOT_FOUND"


class TestPaginatedResponse:
    """测试 PaginatedResponse 模型"""

    def test_calculates_total_pages(self):
        """测试自动计算 total_pages"""
        response = PaginatedResponse(
            items=[{"id": 1}, {"id": 2}],
            total=10,
            page=1,
            page_size=2
        )
        assert response.total_pages == 5

    def test_calculates_has_next(self):
        """测试自动计算 has_next"""
        response = PaginatedResponse(
            items=[{"id": 1}],
            total=10,
            page=1,
            page_size=5
        )
        assert response.has_next is True

    def test_calculates_has_previous(self):
        """测试自动计算 has_previous"""
        response = PaginatedResponse(
            items=[{"id": 6}],
            total=10,
            page=2,
            page_size=5
        )
        assert response.has_previous is True

    def test_first_page_has_no_previous(self):
        """测试第一页 has_previous 为 False"""
        response = PaginatedResponse(
            items=[{"id": 1}],
            total=10,
            page=1,
            page_size=5
        )
        assert response.has_previous is False

    def test_last_page_has_no_next(self):
        """测试最后一页 has_next 为 False"""
        response = PaginatedResponse(
            items=[{"id": 10}],
            total=10,
            page=2,
            page_size=5
        )
        assert response.has_next is False

    def test_empty_response(self):
        """测试空数据响应"""
        response = PaginatedResponse(
            items=[],
            total=0,
            page=1,
            page_size=10
        )
        assert response.total_pages == 0
        assert response.has_next is False
        assert response.has_previous is False

    def test_page_validation(self):
        """测试 page 必须大于 0"""
        with pytest.raises(ValidationError):
            PaginatedResponse(
                items=[],
                total=0,
                page=0,
                page_size=10
            )

    def test_page_size_validation(self):
        """测试 page_size 必须大于 0"""
        with pytest.raises(ValidationError):
            PaginatedResponse(
                items=[],
                total=0,
                page=1,
                page_size=0
            )

    def test_total_validation(self):
        """测试 total 必须大于等于 0"""
        with pytest.raises(ValidationError):
            PaginatedResponse(
                items=[],
                total=-1,
                page=1,
                page_size=10
            )


class TestCreateSuccessResponse:
    """测试 create_success_response 函数"""

    def test_without_args(self):
        """测试无参数调用"""
        response = create_success_response()
        assert response.success is True
        assert response.message == "Success"
        assert response.data is None

    def test_with_data(self):
        """测试带 data"""
        data = {"id": 1}
        response = create_success_response(data=data)
        assert response.data == data

    def test_with_message(self):
        """测试带 message"""
        response = create_success_response(message="Created")
        assert response.message == "Created"

    def test_with_both(self):
        """测试带 data 和 message"""
        data = {"id": 1}
        response = create_success_response(data=data, message="Created")
        assert response.data == data
        assert response.message == "Created"


class TestCreateErrorResponse:
    """测试 create_error_response 函数"""

    def test_basic(self):
        """测试基本调用"""
        response = create_error_response(error="Not found")
        assert response.success is False
        assert response.error == "Not found"

    def test_with_all_params(self):
        """测试带所有参数"""
        response = create_error_response(
            error="Validation error",
            detail="Email required",
            error_code="VALIDATION_ERROR"
        )
        assert response.error == "Validation error"
        assert response.detail == "Email required"
        assert response.error_code == "VALIDATION_ERROR"


class TestCreatePaginatedResponse:
    """测试 create_paginated_response 函数"""

    def test_basic(self):
        """测试基本调用"""
        items = [{"id": 1}, {"id": 2}]
        response = create_paginated_response(
            items=items,
            total=10,
            page=1,
            page_size=2
        )
        assert response.items == items
        assert response.total == 10
        assert response.page == 1
        assert response.page_size == 2

    def test_calculates_metadata(self):
        """测试自动计算元数据"""
        items = [{"id": 1}]
        response = create_paginated_response(
            items=items,
            total=10,
            page=1,
            page_size=3
        )
        assert response.total_pages == 4  # (10 + 3 - 1) // 3
        assert response.has_next is True
        assert response.has_previous is False


class TestResponseValidation:
    """测试响应验证边界情况"""

    def test_success_empty_message(self):
        """测试 SuccessResponse 空消息"""
        response = SuccessResponse(message="")
        assert response.message == ""

    def test_error_empty_error(self):
        """测试 ErrorResponse 空错误消息"""
        response = ErrorResponse(error="")
        assert response.error == ""
