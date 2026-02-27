"""认证相关模式测试

测试范围：
- RegisterRequest 模型
- LoginRequest 模型（含自定义验证器）
- UserResponse 模型（ORM 转换）

契约来源：Issue #91 蓝图 - schemas/auth.py 模块
"""

from datetime import datetime

import pytest
from pydantic import ValidationError

from src.backend.app.schemas.auth import LoginRequest, RegisterRequest, UserResponse


class TestRegisterRequest:
    """测试 RegisterRequest 模型"""

    def test_valid_registration(self):
        """测试提供所有有效字段时成功创建实例"""
        request = RegisterRequest(
            username="testuser", email="test@example.com", password="SecurePass123"
        )
        assert request.username == "testuser"
        assert request.email == "test@example.com"
        assert request.password == "SecurePass123"

    def test_missing_username(self):
        """测试缺少 username 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(email="test@example.com", password="SecurePass123")
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("username",) for e in errors)

    def test_missing_email(self):
        """测试缺少 email 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(username="testuser", password="SecurePass123")
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("email",) for e in errors)

    def test_missing_password(self):
        """测试缺少 password 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(username="testuser", email="test@example.com")
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("password",) for e in errors)

    def test_username_too_short(self):
        """测试 username 长度小于 3 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                username="ab", email="test@example.com", password="SecurePass123"
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("username",) for e in errors)

    def test_username_boundary_min(self):
        """测试 username 长度为 3 时成功创建实例"""
        request = RegisterRequest(
            username="abc", email="test@example.com", password="SecurePass123"
        )
        assert request.username == "abc"

    def test_username_boundary_max(self):
        """测试 username 长度为 50 时成功创建实例"""
        username = "a" * 50
        request = RegisterRequest(
            username=username, email="test@example.com", password="SecurePass123"
        )
        assert request.username == username

    def test_username_too_long(self):
        """测试 username 长度大于 50 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                username="a" * 51, email="test@example.com", password="SecurePass123"
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("username",) for e in errors)

    def test_password_too_short(self):
        """测试 password 长度小于 8 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                username="testuser", email="test@example.com", password="Short1"
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("password",) for e in errors)

    def test_password_boundary_min(self):
        """测试 password 长度为 8 时成功创建实例"""
        request = RegisterRequest(
            username="testuser", email="test@example.com", password="12345678"
        )
        assert request.password == "12345678"

    def test_password_boundary_max(self):
        """测试 password 长度为 100 时成功创建实例"""
        password = "a" * 100
        request = RegisterRequest(
            username="testuser", email="test@example.com", password=password
        )
        assert request.password == password

    def test_password_too_long(self):
        """测试 password 长度大于 100 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                username="testuser", email="test@example.com", password="a" * 101
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("password",) for e in errors)

    def test_invalid_email_format(self):
        """测试无效邮箱格式时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            RegisterRequest(
                username="testuser", email="invalid-email", password="SecurePass123"
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("email",) for e in errors)

    def test_valid_email_formats(self):
        """测试各种有效邮箱格式"""
        valid_emails = [
            "test@example.com",
            "user.name+tag@domain.co.uk",
            "user123@test-domain.com",
            "simple@test.com",
        ]
        for email in valid_emails:
            request = RegisterRequest(
                username="testuser", email=email, password="SecurePass123"
            )
            assert request.email == email

    def test_serialization(self):
        """测试序列化为字典"""
        request = RegisterRequest(
            username="testuser", email="test@example.com", password="SecurePass123"
        )
        data = request.model_dump()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert data["password"] == "SecurePass123"


class TestLoginRequest:
    """测试 LoginRequest 模型"""

    def test_login_with_username(self):
        """测试使用 username 登录成功"""
        request = LoginRequest(username="testuser", password="password123")
        assert request.username == "testuser"
        assert request.email is None
        assert request.password == "password123"

    def test_login_with_email(self):
        """测试使用 email 登录成功"""
        request = LoginRequest(email="test@example.com", password="password123")
        assert request.username is None
        assert request.email == "test@example.com"
        assert request.password == "password123"

    def test_login_with_both(self):
        """测试同时提供 username 和 email 时成功"""
        request = LoginRequest(
            username="testuser", email="test@example.com", password="password123"
        )
        assert request.username == "testuser"
        assert request.email == "test@example.com"
        assert request.password == "password123"

    def test_missing_both_credentials(self):
        """测试 username 和 email 均未提供时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            LoginRequest(password="password123")
        errors = exc_info.value.errors()
        # 验证自定义验证器错误
        assert any("必须提供 username 或 email" in str(e) for e in errors)

    def test_custom_validator_message(self):
        """测试自定义验证器的错误消息"""
        with pytest.raises(ValidationError) as exc_info:
            LoginRequest(password="password123")
        error_detail = str(exc_info.value)
        assert "必须提供 username 或 email 其中一个" in error_detail

    def test_missing_password(self):
        """测试缺少 password 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            LoginRequest(username="testuser")
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("password",) for e in errors)

    def test_empty_password(self):
        """测试 password 为空字符串时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            LoginRequest(username="testuser", password="")
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("password",) for e in errors)

    def test_username_too_short(self):
        """测试 username 长度小于 3 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            LoginRequest(username="ab", password="password123")
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("username",) for e in errors)

    def test_username_too_long(self):
        """测试 username 长度大于 50 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            LoginRequest(username="a" * 51, password="password123")
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("username",) for e in errors)

    def test_invalid_email_format(self):
        """测试 email 格式无效时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            LoginRequest(email="invalid-email", password="password123")
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("email",) for e in errors)

    def test_password_boundary_min(self):
        """测试 password 长度为 1 时成功创建实例"""
        request = LoginRequest(username="testuser", password="a")
        assert request.password == "a"

    def test_serialization(self):
        """测试序列化为字典"""
        request = LoginRequest(username="testuser", password="password123")
        data = request.model_dump()
        assert data["username"] == "testuser"
        assert data["email"] is None
        assert data["password"] == "password123"


class TestUserResponse:
    """测试 UserResponse 模型"""

    def test_from_dict(self):
        """测试从字典创建响应"""
        data = {
            "id": 1,
            "username": "testuser",
            "email": "test@example.com",
            "is_active": True,
            "created_at": datetime(2024, 1, 1, 0, 0, 0),
        }
        response = UserResponse(**data)
        assert response.id == 1
        assert response.username == "testuser"
        assert response.email == "test@example.com"
        assert response.is_active is True
        assert response.created_at == datetime(2024, 1, 1, 0, 0, 0)

    def test_from_orm_model(self):
        """测试从 ORM 模型创建响应 (测试 from_attributes=True)"""

        # 创建模拟 ORM 对象
        class MockUser:
            id = 1
            username = "testuser"
            email = "test@example.com"
            is_active = True
            created_at = datetime(2024, 1, 1, 0, 0, 0)

        mock_user = MockUser()
        response = UserResponse.model_validate(mock_user)
        assert response.id == 1
        assert response.username == "testuser"
        assert response.email == "test@example.com"
        assert response.is_active is True
        assert response.created_at == datetime(2024, 1, 1, 0, 0, 0)

    def test_serialization(self):
        """测试序列化为字典"""
        response = UserResponse(
            id=1,
            username="testuser",
            email="test@example.com",
            is_active=True,
            created_at=datetime(2024, 1, 1, 0, 0, 0),
        )
        data = response.model_dump()
        assert data["id"] == 1
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert data["is_active"] is True
        assert isinstance(data["created_at"], datetime)

    def test_response_fields(self):
        """测试所有字段正确映射"""
        response = UserResponse(
            id=123,
            username="john_doe",
            email="john@example.com",
            is_active=False,
            created_at=datetime(2024, 6, 15, 12, 30, 0),
        )
        assert response.id == 123
        assert response.username == "john_doe"
        assert response.email == "john@example.com"
        assert response.is_active is False
        assert response.created_at == datetime(2024, 6, 15, 12, 30, 0)

    def test_datetime_field(self):
        """测试 datetime 字段正确处理"""
        test_datetime = datetime(2024, 12, 25, 23, 59, 59)
        response = UserResponse(
            id=1,
            username="testuser",
            email="test@example.com",
            is_active=True,
            created_at=test_datetime,
        )
        assert response.created_at == test_datetime
        assert isinstance(response.created_at, datetime)

    def test_missing_id(self):
        """测试缺少 id 字段时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            UserResponse(
                username="testuser",
                email="test@example.com",
                is_active=True,
                created_at=datetime(2024, 1, 1, 0, 0, 0),
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("id",) for e in errors)

    def test_missing_username(self):
        """测试缺少 username 字段时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            UserResponse(
                id=1,
                email="test@example.com",
                is_active=True,
                created_at=datetime(2024, 1, 1, 0, 0, 0),
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("username",) for e in errors)

    def test_missing_email(self):
        """测试缺少 email 字段时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            UserResponse(
                id=1,
                username="testuser",
                is_active=True,
                created_at=datetime(2024, 1, 1, 0, 0, 0),
            )
        errors = exc_info.value.errors()
        assert any(e["loc"] == ("email",) for e in errors)

    def test_json_serialization(self):
        """测试 JSON 序列化"""
        response = UserResponse(
            id=1,
            username="testuser",
            email="test@example.com",
            is_active=True,
            created_at=datetime(2024, 1, 1, 0, 0, 0),
        )
        json_data = response.model_dump_json()
        assert "testuser" in json_data
        assert "test@example.com" in json_data
