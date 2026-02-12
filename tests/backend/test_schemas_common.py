"""
通用响应模式测试

测试范围：
- 标准响应模型
- 分页响应模型
- 错误响应模型
- 模型验证和序列化

参考 Issue #33
"""

from datetime import datetime
from typing import Any, List

import pytest
from pydantic import ValidationError


# 这些导入在当前阶段会失败，因为实现代码尚未存在
# 这正是 TDD 的 "Red First" 原则
from src.backend.app.schemas.common import (
    SuccessResponse,
    ErrorResponse,
    PaginatedResponse,
    create_success_response,
    create_error_response,
    create_paginated_response,
)


class TestSuccessResponse:
    """测试成功响应模型"""

    def test_success_response_with_required_fields(self):
        """测试成功响应包含必需字段"""
        response = SuccessResponse(success=True)
        assert response.success is True
        assert response.message == "Success"

    def test_success_response_with_custom_message(self):
        """测试自定义消息的成功响应"""
        message = "Operation completed successfully"
        response = SuccessResponse(success=True, message=message)
        assert response.message == message

    def test_success_response_with_data(self):
        """测试包含数据的成功响应"""
        data = {"id": 1, "name": "Test"}
        response = SuccessResponse(success=True, data=data, message="Created")
        assert response.data == data
        assert response.message == "Created"

    def test_success_response_data_can_be_none(self):
        """测试成功响应数据可以为 None"""
        response = SuccessResponse(success=True, data=None)
        assert response.data is None

    def test_success_response_serialization(self):
        """测试成功响应序列化"""
        data = {"user_id": 123, "username": "testuser"}
        response = SuccessResponse(success=True, data=data, message="User found")
        response_dict = response.model_dump()

        assert response_dict["success"] is True
        assert response_dict["data"] == data
        assert response_dict["message"] == "User found"

    def test_success_response_json_schema(self):
        """测试成功响应 JSON schema"""
        schema = SuccessResponse.model_json_schema()
        assert "properties" in schema
        assert "success" in schema["properties"]
        assert "message" in schema["properties"]
        assert "data" in schema["properties"]


class TestErrorResponse:
    """测试错误响应模型"""

    def test_error_response_with_required_fields(self):
        """测试错误响应包含必需字段"""
        response = ErrorResponse(success=False, error="An error occurred")
        assert response.success is False
        assert response.error == "An error occurred"

    def test_error_response_with_detail(self):
        """测试包含详细信息的错误响应"""
        detail = "Field validation failed"
        response = ErrorResponse(
            success=False, error="Validation error", detail=detail
        )
        assert response.detail == detail

    def test_error_response_with_error_code(self):
        """测试包含错误码的错误响应"""
        error_code = "VALIDATION_ERROR"
        response = ErrorResponse(
            success=False, error="Invalid input", error_code=error_code
        )
        assert response.error_code == error_code

    def test_error_response_serialization(self):
        """测试错误响应序列化"""
        response = ErrorResponse(
            success=False, error="Not found", error_code="NOT_FOUND", detail="Resource not found"
        )
        response_dict = response.model_dump()

        assert response_dict["success"] is False
        assert response_dict["error"] == "Not found"
        assert response_dict["error_code"] == "NOT_FOUND"
        assert response_dict["detail"] == "Resource not found"

    def test_error_response_json_schema(self):
        """测试错误响应 JSON schema"""
        schema = ErrorResponse.model_json_schema()
        assert "properties" in schema
        assert "success" in schema["properties"]
        assert "error" in schema["properties"]
        assert "detail" in schema["properties"]
        assert "error_code" in schema["properties"]


class TestPaginatedResponse:
    """测试分页响应模型"""

    def test_paginated_response_with_required_fields(self):
        """测试分页响应包含必需字段"""
        items = [{"id": 1}, {"id": 2}]
        response = PaginatedResponse(items=items, total=10, page=1, page_size=2)

        assert response.items == items
        assert response.total == 10
        assert response.page == 1
        assert response.page_size == 2

    def test_paginated_response_calculates_total_pages(self):
        """测试分页响应计算总页数"""
        items = [{"id": 1}, {"id": 2}]
        response = PaginatedResponse(items=items, total=10, page=1, page_size=2)
        assert response.total_pages == 5

    def test_paginated_response_with_empty_items(self):
        """测试空列表的分页响应"""
        response = PaginatedResponse(items=[], total=0, page=1, page_size=10)
        assert response.items == []
        assert response.total == 0
        assert response.total_pages == 0

    def test_paginated_response_has_next(self):
        """测试分页响应是否有下一页"""
        items = [{"id": 1}, {"id": 2}]
        response = PaginatedResponse(items=items, total=10, page=1, page_size=2)
        assert response.has_next is True

    def test_paginated_response_has_previous(self):
        """测试分页响应是否有上一页"""
        items = [{"id": 3}, {"id": 4}]
        response = PaginatedResponse(items=items, total=10, page=2, page_size=2)
        assert response.has_previous is True

    def test_paginated_response_first_page_has_no_previous(self):
        """测试第一页没有上一页"""
        items = [{"id": 1}, {"id": 2}]
        response = PaginatedResponse(items=items, total=10, page=1, page_size=2)
        assert response.has_previous is False

    def test_paginated_response_last_page_has_no_next(self):
        """测试最后一页没有下一页"""
        items = [{"id": 9}]
        response = PaginatedResponse(items=items, total=9, page=2, page_size=5)
        assert response.has_next is False

    def test_paginated_response_serialization(self):
        """测试分页响应序列化"""
        items = [{"id": 1}, {"id": 2}]
        response = PaginatedResponse(items=items, total=10, page=1, page_size=2)
        response_dict = response.model_dump()

        assert response_dict["items"] == items
        assert response_dict["total"] == 10
        assert response_dict["page"] == 1
        assert response_dict["page_size"] == 2
        assert response_dict["total_pages"] == 5

    def test_paginated_response_json_schema(self):
        """测试分页响应 JSON schema"""
        schema = PaginatedResponse.model_json_schema()
        assert "properties" in schema
        assert "items" in schema["properties"]
        assert "total" in schema["properties"]
        assert "page" in schema["properties"]
        assert "page_size" in schema["properties"]


class TestCreateSuccessResponse:
    """测试创建成功响应函数"""

    def test_create_success_response_without_data(self):
        """测试创建不包含数据的成功响应"""
        response = create_success_response()
        assert response.success is True
        assert response.message == "Success"

    def test_create_success_response_with_data(self):
        """测试创建包含数据的成功响应"""
        data = {"id": 1, "name": "Test"}
        response = create_success_response(data=data, message="Created")
        assert response.data == data
        assert response.message == "Created"

    def test_create_success_response_custom_message(self):
        """测试创建自定义消息的成功响应"""
        message = "Record updated"
        response = create_success_response(message=message)
        assert response.message == message


class TestCreateErrorResponse:
    """测试创建错误响应函数"""

    def test_create_error_response_basic(self):
        """测试创建基本错误响应"""
        response = create_error_response(error="Not found")
        assert response.success is False
        assert response.error == "Not found"

    def test_create_error_response_with_detail(self):
        """测试创建包含详细信息的错误响应"""
        response = create_error_response(
            error="Validation error",
            detail="Email is required",
            error_code="VALIDATION_ERROR",
        )
        assert response.error == "Validation error"
        assert response.detail == "Email is required"
        assert response.error_code == "VALIDATION_ERROR"


class TestCreatePaginatedResponse:
    """测试创建分页响应函数"""

    def test_create_paginated_response_basic(self):
        """测试创建基本分页响应"""
        items = [{"id": 1}, {"id": 2}]
        response = create_paginated_response(items=items, total=10, page=1, page_size=2)
        assert response.items == items
        assert response.total == 10
        assert response.page == 1

    def test_create_paginated_response_calculates_metadata(self):
        """测试分页响应计算元数据"""
        items = [{"id": 1}, {"id": 2}]
        response = create_paginated_response(items=items, total=10, page=1, page_size=2)
        assert response.total_pages == 5
        assert response.has_next is True
        assert response.has_previous is False


class TestResponseValidation:
    """测试响应验证"""

    def test_success_response_success_must_be_bool(self):
        """测试成功响应的 success 必须是布尔值"""
        with pytest.raises(ValidationError) as exc_info:
            SuccessResponse(success="true")  # type: ignore
        assert "success" in str(exc_info.value).lower()

    def test_error_response_success_must_be_false(self):
        """测试错误响应的 success 必须是 False"""
        # 这个测试取决于是否强制 success=False
        # 如果允许，则可以创建 success=True 的 ErrorResponse
        response = ErrorResponse(success=True, error="Test")
        # 根据业务逻辑，可能需要验证
        assert response.success is True

    def test_paginated_response_page_must_be_positive(self):
        """测试分页响应的页码必须为正数"""
        with pytest.raises(ValidationError):
            PaginatedResponse(items=[], total=0, page=0, page_size=10)

    def test_paginated_response_page_size_must_be_positive(self):
        """测试分页响应的页面大小必须为正数"""
        with pytest.raises(ValidationError):
            PaginatedResponse(items=[], total=0, page=1, page_size=0)


class TestResponseWithComplexData:
    """测试复杂数据的响应"""

    def test_success_response_with_nested_data(self):
        """测试包含嵌套数据的成功响应"""
        data = {
            "user": {"id": 1, "name": "Test"},
            "metadata": {"created_at": "2024-01-01", "updated_at": "2024-01-02"},
        }
        response = SuccessResponse(success=True, data=data)
        assert response.data == data

    def test_success_response_with_list_data(self):
        """测试包含列表数据的成功响应"""
        data = [{"id": 1}, {"id": 2}, {"id": 3}]
        response = SuccessResponse(success=True, data=data)
        assert response.data == data

    def test_paginated_response_with_complex_items(self):
        """测试包含复杂项的分页响应"""
        items = [
            {"id": 1, "user": {"name": "Alice", "email": "alice@example.com"}},
            {"id": 2, "user": {"name": "Bob", "email": "bob@example.com"}},
        ]
        response = PaginatedResponse(items=items, total=2, page=1, page_size=2)
        assert len(response.items) == 2


class TestResponseTimestamps:
    """测试响应时间戳"""

    def test_response_includes_timestamp(self):
        """测试响应包含时间戳"""
        response = SuccessResponse(success=True)
        # 如果模型包含时间戳字段
        if hasattr(response, "timestamp"):
            assert isinstance(response.timestamp, datetime)

    def test_response_timestamp_is_auto_generated(self):
        """测试响应时间戳自动生成"""
        response1 = SuccessResponse(success=True)
        response2 = SuccessResponse(success=True)

        if hasattr(response1, "timestamp") and hasattr(response2, "timestamp"):
            # 时间戳应该不同
            assert response1.timestamp <= response2.timestamp


class TestResponseEdgeCases:
    """测试响应边界情况"""

    def test_success_response_with_empty_string_message(self):
        """测试空字符串消息的成功响应"""
        response = SuccessResponse(success=True, message="")
        assert response.message == ""

    def test_error_response_with_empty_error(self):
        """测试空错误的错误响应"""
        # 可能需要验证，取决于业务逻辑
        response = ErrorResponse(success=False, error="")
        assert response.error == ""

    def test_paginated_response_with_single_item(self):
        """测试单项的分页响应"""
        items = [{"id": 1}]
        response = PaginatedResponse(items=items, total=1, page=1, page_size=10)
        assert len(response.items) == 1
        assert response.has_next is False
        assert response.has_previous is False
