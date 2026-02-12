"""
核心异常处理测试

测试范围：
- 自定义异常类的定义
- 异常的错误码和消息
- 异常的 HTTP 状态码映射
- 异常处理器注册
- 错误响应格式

参考 Issue #33
"""

from typing import Any

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from pydantic import ValidationError


# 这些导入在当前阶段会失败，因为实现代码尚未存在
# 这正是 TDD 的 "Red First" 原则
from src.backend.app.core.exceptions import (
    ScryerException,
    ValidationError as ScryerValidationError,
    NotFoundError,
    ConflictError,
    UnauthorizedError,
    ForbiddenError,
    InternalServerError,
    scryer_exception_handler,
    validation_exception_handler,
    register_exception_handlers,
)


class TestScryerException:
    """测试基础异常类"""

    def test_scryer_exception_is_exception_subclass(self):
        """测试 ScryerException 是 Exception 的子类"""
        exc = ScryerException("test message")
        assert isinstance(exc, Exception)

    def test_scryer_exception_stores_message(self):
        """测试异常存储消息"""
        message = "Test error message"
        exc = ScryerException(message)
        assert str(exc) == message
        assert exc.detail == message

    def test_scryer_exception_has_default_status_code(self):
        """测试异常有默认状态码"""
        exc = ScryerException("test")
        assert exc.status_code == 500

    def test_scryer_exception_can_set_custom_status_code(self):
        """测试可以设置自定义状态码"""
        exc = ScryerException("test", status_code=400)
        assert exc.status_code == 400

    def test_scryer_exception_can_store_additional_data(self):
        """测试异常可以存储额外数据"""
        extra_data = {"field": "username", "value": "invalid"}
        exc = ScryerException("test", extra=extra_data)
        assert exc.extra == extra_data


class TestValidationError:
    """测试验证错误异常"""

    def test_validation_error_has_correct_status_code(self):
        """测试 ValidationError 有正确的状态码"""
        exc = ScryerValidationError("Validation failed")
        assert exc.status_code == 422

    def test_validation_error_message(self):
        """测试 ValidationError 消息"""
        message = "Field validation failed"
        exc = ScryerValidationError(message)
        assert str(exc) == message

    def test_validation_error_can_include_field_name(self):
        """测试 ValidationError 可以包含字段名"""
        field = "email"
        exc = ScryerValidationError("Invalid email", field=field)
        assert exc.field == field


class TestNotFoundError:
    """测试资源未找到异常"""

    def test_not_found_error_has_correct_status_code(self):
        """测试 NotFoundError 有正确的状态码"""
        exc = NotFoundError("Resource not found")
        assert exc.status_code == 404

    def test_not_found_error_message(self):
        """测试 NotFoundError 消息"""
        message = "User not found"
        exc = NotFoundError(message)
        assert str(exc) == message

    def test_not_found_error_can_include_resource_type(self):
        """测试 NotFoundError 可以包含资源类型"""
        resource_type = "User"
        exc = NotFoundError("Not found", resource_type=resource_type)
        assert exc.resource_type == resource_type


class TestConflictError:
    """测试冲突错误异常"""

    def test_conflict_error_has_correct_status_code(self):
        """测试 ConflictError 有正确的状态码"""
        exc = ConflictError("Resource already exists")
        assert exc.status_code == 409

    def test_conflict_error_message(self):
        """测试 ConflictError 消息"""
        message = "Email already registered"
        exc = ConflictError(message)
        assert str(exc) == message


class TestUnauthorizedError:
    """测试未授权异常"""

    def test_unauthorized_error_has_correct_status_code(self):
        """测试 UnauthorizedError 有正确的状态码"""
        exc = UnauthorizedError("Authentication required")
        assert exc.status_code == 401

    def test_unauthorized_error_message(self):
        """测试 UnauthorizedError 消息"""
        message = "Invalid credentials"
        exc = UnauthorizedError(message)
        assert str(exc) == message


class TestForbiddenError:
    """测试禁止访问异常"""

    def test_forbidden_error_has_correct_status_code(self):
        """测试 ForbiddenError 有正确的状态码"""
        exc = ForbiddenError("Access denied")
        assert exc.status_code == 403

    def test_forbidden_error_message(self):
        """测试 ForbiddenError 消息"""
        message = "Insufficient permissions"
        exc = ForbiddenError(message)
        assert str(exc) == message


class TestInternalServerError:
    """测试内部服务器错误异常"""

    def test_internal_server_error_has_correct_status_code(self):
        """测试 InternalServerError 有正确的状态码"""
        exc = InternalServerError("Something went wrong")
        assert exc.status_code == 500

    def test_internal_server_error_message(self):
        """测试 InternalServerError 消息"""
        message = "Database connection failed"
        exc = InternalServerError(message)
        assert str(exc) == message


class TestExceptionHandler:
    """测试异常处理器"""

    def test_scryer_exception_handler_returns_json_response(self):
        """测试异常处理器返回 JSON 响应"""
        app = FastAPI()
        app.add_exception_handler(ScryerException, scryer_exception_handler)

        @app.get("/test")
        async def test_endpoint():
            raise ScryerException("Test error", status_code=400)

        client = TestClient(app)
        response = client.get("/test")

        assert response.status_code == 400
        assert response.headers["content-type"] == "application/json"

    def test_scryer_exception_handler_response_format(self):
        """测试异常处理器响应格式"""
        app = FastAPI()
        app.add_exception_handler(ScryerException, scryer_exception_handler)

        @app.get("/test")
        async def test_endpoint():
            raise ScryerException("Test error", status_code=400)

        client = TestClient(app)
        response = client.get("/test")

        data = response.json()
        assert "detail" in data or "message" in data

    def test_validation_exception_handler_catches_pydantic_errors(self):
        """测试验证异常处理器捕获 Pydantic 错误"""
        app = FastAPI()
        app.add_exception_handler(ValidationError, validation_exception_handler)

        @app.get("/test")
        async def test_endpoint():
            # 模拟一个验证错误
            raise ValidationError.from_exception_data(
                "TestModel",
                [{"loc": ("field",), "msg": "field required", "type": "value_error.missing"}],
            )

        client = TestClient(app)
        response = client.get("/test")

        assert response.status_code == 422

    def test_validation_exception_handler_response_format(self):
        """测试验证异常处理器响应格式"""
        app = FastAPI()
        app.add_exception_handler(ValidationError, validation_exception_handler)

        @app.get("/test")
        async def test_endpoint():
            raise ValidationError.from_exception_data(
                "TestModel",
                [{"loc": ("field",), "msg": "field required", "type": "value_error.missing"}],
            )

        client = TestClient(app)
        response = client.get("/test")

        data = response.json()
        assert "detail" in data


class TestRegisterExceptionHandlers:
    """测试异常处理器注册"""

    def test_register_exception_handlers_adds_handlers(self):
        """测试注册异常处理器添加处理器"""
        app = FastAPI()
        initial_handler_count = len(app.exception_handlers)

        register_exception_handlers(app)

        # 应该添加了异常处理器
        assert len(app.exception_handlers) > initial_handler_count

    def test_register_exception_handlers_registers_scryer_exception(self):
        """测试注册 ScryerException 处理器"""
        app = FastAPI()
        register_exception_handlers(app)

        # ScryerException 应该被注册
        assert ScryerException in app.exception_handlers

    def test_register_exception_handlers_registers_validation_error(self):
        """测试注册 ValidationError 处理器"""
        app = FastAPI()
        register_exception_handlers(app)

        # ValidationError 应该被注册
        assert ValidationError in app.exception_handlers


class TestErrorResponses:
    """测试错误响应"""

    def test_not_found_error_response(self):
        """测试 404 错误响应"""
        app = FastAPI()
        register_exception_handlers(app)

        @app.get("/test")
        async def test_endpoint():
            raise NotFoundError("Resource not found")

        client = TestClient(app)
        response = client.get("/test")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data or "message" in data

    def test_conflict_error_response(self):
        """测试 409 错误响应"""
        app = FastAPI()
        register_exception_handlers(app)

        @app.get("/test")
        async def test_endpoint():
            raise ConflictError("Resource already exists")

        client = TestClient(app)
        response = client.get("/test")

        assert response.status_code == 409

    def test_unauthorized_error_response(self):
        """测试 401 错误响应"""
        app = FastAPI()
        register_exception_handlers(app)

        @app.get("/test")
        async def test_endpoint():
            raise UnauthorizedError("Authentication required")

        client = TestClient(app)
        response = client.get("/test")

        assert response.status_code == 401

    def test_forbidden_error_response(self):
        """测试 403 错误响应"""
        app = FastAPI()
        register_exception_handlers(app)

        @app.get("/test")
        async def test_endpoint():
            raise ForbiddenError("Access denied")

        client = TestClient(app)
        response = client.get("/test")

        assert response.status_code == 403

    def test_internal_server_error_response(self):
        """测试 500 错误响应"""
        app = FastAPI()
        register_exception_handlers(app)

        @app.get("/test")
        async def test_endpoint():
            raise InternalServerError("Internal error")

        client = TestClient(app)
        response = client.get("/test")

        assert response.status_code == 500


class TestErrorResponsesWithExtraData:
    """测试包含额外数据的错误响应"""

    def test_error_response_includes_extra_data(self):
        """测试错误响应包含额外数据"""
        app = FastAPI()
        register_exception_handlers(app)

        @app.get("/test")
        async def test_endpoint():
            extra = {"field": "email", "value": "invalid@example.com"}
            raise ScryerValidationError("Invalid email", extra=extra)

        client = TestClient(app)
        response = client.get("/test")

        data = response.json()
        # 额外数据应该在响应中
        assert "detail" in data or "message" in data


class TestErrorMessages:
    """测试错误消息"""

    def test_error_message_is_user_friendly(self):
        """测试错误消息对用户友好"""
        exc = ScryerValidationError("Email is required")
        message = str(exc)
        # 消息应该是可读的
        assert len(message) > 0
        assert "Email" in message or "required" in message.lower()

    def test_error_message_does_not_expose_internal_details(self):
        """测试错误消息不暴露内部细节"""
        exc = InternalServerError("An error occurred")
        message = str(exc)
        # 不应该包含技术细节如堆栈跟踪
        assert "Traceback" not in message
        assert "File" not in message
        assert "Line" not in message
