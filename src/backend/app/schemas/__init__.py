"""
Schemas Package

包含 Pydantic 模式定义
"""

from .auth import LoginRequest, RegisterRequest, UserResponse
from .common import (
    ErrorResponse,
    PaginatedResponse,
    SuccessResponse,
    create_error_response,
    create_paginated_response,
    create_success_response,
)
from .health import HealthCheckResponse

__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "UserResponse",
    "SuccessResponse",
    "ErrorResponse",
    "PaginatedResponse",
    "create_success_response",
    "create_error_response",
    "create_paginated_response",
    "HealthCheckResponse",
]
