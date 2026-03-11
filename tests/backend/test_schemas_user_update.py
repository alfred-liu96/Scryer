"""用户资料更新 Schema 测试

测试范围：
- UserUpdateRequest 模型验证
- 边界值测试
- 错误消息测试

契约来源：Issue #170 - src/backend/app/schemas/auth.py 中的 UserUpdateRequest
"""

import pytest
from pydantic import ValidationError

from src.backend.app.schemas.auth import UserUpdateRequest


class TestUserUpdateRequestValid:
    """测试 UserUpdateRequest 有效输入"""

    def test_update_username_only(self):
        """测试仅更新 username 成功"""
        request = UserUpdateRequest(username="new_username")
        assert request.username == "new_username"
        assert request.email is None

    def test_update_email_only(self):
        """测试仅更新 email 成功"""
        request = UserUpdateRequest(email="new@example.com")
        assert request.username is None
        assert request.email == "new@example.com"

    def test_update_both_fields(self):
        """测试同时更新 username 和 email 成功"""
        request = UserUpdateRequest(username="new_username", email="new@example.com")
        assert request.username == "new_username"
        assert request.email == "new@example.com"

    def test_username_boundary_min_length(self):
        """测试 username 长度为最小值 3 时成功"""
        request = UserUpdateRequest(username="abc")
        assert request.username == "abc"

    def test_username_boundary_max_length(self):
        """测试 username 长度为最大值 50 时成功"""
        username = "a" * 50
        request = UserUpdateRequest(username=username)
        assert request.username == username
        assert len(request.username) == 50

    def test_valid_email_formats(self):
        """测试各种有效邮箱格式"""
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@test.com",
            "user123@test-domain.com",
        ]
        for email in valid_emails:
            request = UserUpdateRequest(email=email)
            assert request.email == email


class TestUserUpdateRequestInvalid:
    """测试 UserUpdateRequest 无效输入"""

    def test_no_fields_provided(self):
        """测试未提供任何更新字段时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdateRequest()

        errors = exc_info.value.errors()
        assert any("至少需要提供一个字段进行更新" in str(e) for e in errors)

    def test_explicit_none_values(self):
        """测试显式传入 None 值时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdateRequest(username=None, email=None)

        errors = exc_info.value.errors()
        assert any("至少需要提供一个字段进行更新" in str(e) for e in errors)

    def test_username_too_short(self):
        """测试 username 长度小于 3 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdateRequest(username="ab")

        errors = exc_info.value.errors()
        assert any(e["loc"] == ("username",) for e in errors)
        assert any("3" in str(e.get("msg", "")) for e in errors)

    def test_username_too_long(self):
        """测试 username 长度大于 50 时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdateRequest(username="a" * 51)

        errors = exc_info.value.errors()
        assert any(e["loc"] == ("username",) for e in errors)
        assert any("50" in str(e.get("msg", "")) for e in errors)

    def test_invalid_email_format(self):
        """测试无效邮箱格式时抛出 ValidationError"""
        invalid_emails = [
            "invalid-email",
            "missing@",
            "@missing.local",
            "spaces in@email.com",
            "no-at-sign.com",
        ]
        for email in invalid_emails:
            with pytest.raises(ValidationError) as exc_info:
                UserUpdateRequest(email=email)

            errors = exc_info.value.errors()
            assert any(e["loc"] == ("email",) for e in errors)

    def test_username_empty_string(self):
        """测试 username 为空字符串时抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdateRequest(username="")

        errors = exc_info.value.errors()
        assert any(e["loc"] == ("username",) for e in errors)


class TestUserUpdateRequestSerialization:
    """测试 UserUpdateRequest 序列化"""

    def test_model_dump_with_username(self):
        """测试仅包含 username 时序列化为字典"""
        request = UserUpdateRequest(username="test_user")
        data = request.model_dump()

        assert data["username"] == "test_user"
        assert data["email"] is None

    def test_model_dump_with_email(self):
        """测试仅包含 email 时序列化为字典"""
        request = UserUpdateRequest(email="test@example.com")
        data = request.model_dump()

        assert data["username"] is None
        assert data["email"] == "test@example.com"

    def test_model_dump_with_both(self):
        """测试包含两个字段时序列化为字典"""
        request = UserUpdateRequest(username="test_user", email="test@example.com")
        data = request.model_dump()

        assert data["username"] == "test_user"
        assert data["email"] == "test@example.com"

    def test_model_dump_json(self):
        """测试 JSON 序列化"""
        request = UserUpdateRequest(username="test_user", email="test@example.com")
        json_data = request.model_dump_json()

        assert "test_user" in json_data
        assert "test@example.com" in json_data


class TestUserUpdateRequestEdgeCases:
    """测试 UserUpdateRequest 边界情况"""

    def test_username_with_special_characters(self):
        """测试 username 包含特殊字符（连字符、下划线）"""
        request = UserUpdateRequest(username="user_name-123")
        assert request.username == "user_name-123"

    def test_username_with_numbers(self):
        """测试 username 仅包含数字"""
        request = UserUpdateRequest(username="123456")
        assert request.username == "123456"

    def test_username_case_sensitivity(self):
        """测试 username 大小写敏感"""
        request = UserUpdateRequest(username="UserName")
        assert request.username == "UserName"
        assert request.username != "username"

    def test_email_case_insensitive_storage(self):
        """测试 email 存储会将域名部分标准化为小写（Pydantic EmailStr 行为）"""
        request = UserUpdateRequest(email="Test@Example.COM")
        # Pydantic EmailStr 会将域名部分标准化为小写
        assert request.email == "Test@example.com"

    def test_unicode_in_username(self):
        """测试 username 支持 unicode 字符"""
        request = UserUpdateRequest(username="用户名")
        assert request.username == "用户名"

    def test_unicode_in_email_local_part(self):
        """测试 email 本地部分支持 unicode 字符"""
        # 注意：某些邮箱系统可能不支持 unicode，但 Pydantic 允许
        request = UserUpdateRequest(email="测试@example.com")
        assert request.email == "测试@example.com"
