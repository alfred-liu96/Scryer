"""
认证业务服务单元测试

测试 AuthService (用户认证和 Token 管理)
"""

from unittest.mock import Mock

import pytest

from backend.app.core.exceptions import (
    InactiveUserError,
    InvalidCredentialsError,
    InvalidTokenError,
)
from backend.app.core.security import SecurityService


class TestAuthServiceAuthentication:
    """AuthService 用户认证测试套件"""

    @pytest.fixture
    def mock_user(self):
        """创建模拟用户"""
        user = Mock()
        user.id = 1
        user.username = "testuser"
        user.email = "test@example.com"
        user.hashed_password = (
            "$2b$12$test_hash_60_characters_long_bcrypt_hash_here_123456"
        )
        user.is_active = True
        return user

    @pytest.fixture
    def auth_service(self, security_service, jwt_service):
        from backend.app.services.auth import AuthService

        return AuthService(
            security_service=security_service,
            jwt_service=jwt_service,
            access_token_expire_seconds=1800,
        )

    # ==================== 认证成功测试 ====================

    @pytest.mark.asyncio
    async def test_authenticate_success(
        self, auth_service, mock_user, security_service
    ):
        """测试认证成功"""
        # 设置正确的密码哈希
        mock_user.hashed_password = security_service.hash_password("correct_password")

        # Mock get_user 函数
        async def mock_get_user(username):
            if username == "testuser":
                return mock_user
            return None

        response = await auth_service.authenticate(
            username="testuser",
            plain_password="correct_password",
            get_user_func=mock_get_user,
        )

        assert response.user_id == 1
        assert response.username == "testuser"
        assert response.tokens.access_token
        assert response.tokens.refresh_token
        assert response.tokens.token_type == "Bearer"
        assert response.tokens.expires_in == 1800

    @pytest.mark.asyncio
    async def test_authenticate_with_case_sensitive_username(
        self, auth_service, mock_user, security_service
    ):
        """测试用户名区分大小写"""
        mock_user.hashed_password = security_service.hash_password("password")

        async def mock_get_user(username):
            if username == "TestUser":
                return mock_user
            return None

        response = await auth_service.authenticate(
            username="TestUser",
            plain_password="password",
            get_user_func=mock_get_user,
        )

        assert response.user_id == 1
        assert response.username == "testuser"

    @pytest.mark.asyncio
    async def test_authenticate_generates_different_tokens(
        self, auth_service, mock_user, security_service
    ):
        """测试每次认证生成不同的 Token"""
        mock_user.hashed_password = security_service.hash_password("password")

        async def mock_get_user(username):
            return mock_user

        response1 = await auth_service.authenticate(
            username="testuser",
            plain_password="password",
            get_user_func=mock_get_user,
        )

        # 添加延迟确保 iat 不同
        import asyncio

        await asyncio.sleep(1)

        response2 = await auth_service.authenticate(
            username="testuser",
            plain_password="password",
            get_user_func=mock_get_user,
        )

        # Token 应该不同（因为 iat 不同）
        assert response1.tokens.access_token != response2.tokens.access_token
        assert response1.tokens.refresh_token != response2.tokens.refresh_token

    @pytest.mark.asyncio
    async def test_authenticate_with_custom_expire_time(
        self, mock_user, security_service, jwt_service
    ):
        """测试自定义 Token 过期时间"""
        from backend.app.services.auth import AuthService

        mock_user.hashed_password = security_service.hash_password("password")

        async def mock_get_user(username):
            return mock_user

        auth_service = AuthService(
            security_service=security_service,
            jwt_service=jwt_service,
            access_token_expire_seconds=3600,  # 1 hour
        )

        response = await auth_service.authenticate(
            username="testuser",
            plain_password="password",
            get_user_func=mock_get_user,
        )

        assert response.tokens.expires_in == 3600

    # ==================== 认证失败测试 ====================

    @pytest.mark.asyncio
    async def test_authenticate_user_not_found_raises_error(self, auth_service):
        """测试用户不存在抛出异常"""

        async def mock_get_user(username):
            return None

        with pytest.raises(InvalidCredentialsError):
            await auth_service.authenticate(
                username="nonexistent",
                plain_password="password",
                get_user_func=mock_get_user,
            )

    @pytest.mark.asyncio
    async def test_authenticate_wrong_password_raises_error(
        self, auth_service, mock_user, security_service
    ):
        """测试错误密码抛出异常"""
        mock_user.hashed_password = security_service.hash_password("correct_password")

        async def mock_get_user(username):
            return mock_user

        with pytest.raises(InvalidCredentialsError):
            await auth_service.authenticate(
                username="testuser",
                plain_password="wrong_password",
                get_user_func=mock_get_user,
            )

    @pytest.mark.asyncio
    async def test_authenticate_inactive_user_raises_error(
        self, auth_service, mock_user, security_service
    ):
        """测试未激活用户抛出异常"""
        mock_user.is_active = False
        mock_user.hashed_password = security_service.hash_password("password")

        async def mock_get_user(username):
            return mock_user

        with pytest.raises(InactiveUserError, match="inactive"):
            await auth_service.authenticate(
                username="testuser",
                plain_password="password",
                get_user_func=mock_get_user,
            )

    @pytest.mark.asyncio
    async def test_authenticate_empty_password_raises_error(
        self, auth_service, mock_user
    ):
        """测试空密码抛出异常"""
        mock_user.hashed_password = "$2b$12$hash"

        async def mock_get_user(username):
            return mock_user

        with pytest.raises(InvalidCredentialsError):
            await auth_service.authenticate(
                username="testuser",
                plain_password="",
                get_user_func=mock_get_user,
            )

    @pytest.mark.asyncio
    async def test_authenticate_with_exception_in_get_user(self, auth_service):
        """测试 get_user 抛出异常时传播异常"""

        async def mock_get_user(username):
            raise ValueError("Database error")

        with pytest.raises(ValueError, match="Database error"):
            await auth_service.authenticate(
                username="testuser",
                plain_password="password",
                get_user_func=mock_get_user,
            )

    @pytest.mark.asyncio
    async def test_authenticate_does_not_leak_user_existence(
        self, auth_service, mock_user, security_service
    ):
        """测试认证失败不泄露用户是否存在（安全考虑）"""
        mock_user.hashed_password = security_service.hash_password("password")

        async def mock_get_user(username):
            if username == "exists":
                return mock_user
            return None

        # 用户不存在
        with pytest.raises(InvalidCredentialsError) as exc_info1:
            await auth_service.authenticate(
                username="notexists",
                plain_password="password",
                get_user_func=mock_get_user,
            )

        # 用户存在但密码错误
        with pytest.raises(InvalidCredentialsError) as exc_info2:
            await auth_service.authenticate(
                username="exists",
                plain_password="wrong_password",
                get_user_func=mock_get_user,
            )

        # 两种情况应该抛出相同类型的异常（不区分"用户不存在"和"密码错误"）
        assert type(exc_info1.value) is type(exc_info2.value)


class TestAuthServiceTokenRefresh:
    """AuthService Token 刷新测试套件"""

    @pytest.fixture
    def auth_service(self, security_service, jwt_service):
        from backend.app.services.auth import AuthService

        return AuthService(
            security_service=security_service,
            jwt_service=jwt_service,
            access_token_expire_seconds=1800,
        )

    def test_refresh_tokens_success(self, auth_service, jwt_service):
        """测试刷新 Token 成功"""
        old_refresh = jwt_service.create_refresh_token(user_id=123)

        # 添加延迟确保 iat 不同
        import time

        time.sleep(1)

        new_tokens = auth_service.refresh_tokens(old_refresh)

        assert new_tokens.access_token
        assert new_tokens.refresh_token
        assert new_tokens.token_type == "Bearer"
        assert new_tokens.expires_in == 1800

        # 新 Token 应该与旧 Token 不同
        assert new_tokens.refresh_token != old_refresh

    def test_refresh_tokens_with_custom_expire_time(
        self, jwt_service, security_service
    ):
        """测试自定义过期时间的刷新"""
        from backend.app.services.auth import AuthService

        auth_service = AuthService(
            security_service=security_service,
            jwt_service=jwt_service,
            access_token_expire_seconds=7200,  # 2 hours
        )

        old_refresh = jwt_service.create_refresh_token(user_id=1)
        new_tokens = auth_service.refresh_tokens(old_refresh)

        assert new_tokens.expires_in == 7200

    def test_refresh_tokens_preserves_user_claims(self, auth_service, jwt_service):
        """测试刷新保留用户的额外声明"""
        extra = {"role": "admin", "permissions": ["read", "write"]}
        old_refresh = jwt_service.create_refresh_token(user_id=1, extra_claims=extra)

        new_tokens = auth_service.refresh_tokens(old_refresh)

        # 验证新 Token 包含相同的用户 ID
        old_payload = jwt_service.decode_token(old_refresh)
        new_access_payload = jwt_service.decode_token(new_tokens.access_token)
        new_refresh_payload = jwt_service.decode_token(new_tokens.refresh_token)

        assert old_payload["sub"] == new_access_payload["sub"]
        assert old_payload["sub"] == new_refresh_payload["sub"]
        assert new_access_payload["extra"]["role"] == "admin"
        assert new_refresh_payload["extra"]["role"] == "admin"

    def test_refresh_tokens_with_invalid_token_raises_error(self, auth_service):
        """测试使用无效 Token 刷新抛出异常"""
        with pytest.raises(InvalidTokenError):
            auth_service.refresh_tokens("invalid.token.string")

    def test_refresh_tokens_with_access_token_raises_error(
        self, auth_service, jwt_service
    ):
        """测试使用访问 Token 刷新抛出异常"""
        access_token = jwt_service.create_access_token(user_id=1)

        with pytest.raises(InvalidTokenError, match="expected 'refresh'"):
            auth_service.refresh_tokens(access_token)

    def test_refresh_tokens_with_expired_token_raises_error(self, jwt_service):
        """测试使用过期 Token 刷新抛出异常"""
        from datetime import datetime, timedelta, timezone

        from jose import jwt

        from backend.app.services.auth import AuthService

        # 创建过期的刷新 Token
        expired_payload = {
            "sub": "123",
            "exp": datetime.now(timezone.utc) - timedelta(days=1),
            "iat": datetime.now(timezone.utc) - timedelta(days=8),
            "type": "refresh",
        }
        expired_token = jwt.encode(
            expired_payload,
            jwt_service._settings.jwt_secret_key,
            algorithm="HS256",
        )

        auth_service = AuthService(
            security_service=SecurityService(),
            jwt_service=jwt_service,
            access_token_expire_seconds=1800,
        )

        with pytest.raises(InvalidTokenError):
            auth_service.refresh_tokens(expired_token)


class TestAuthServiceTokenVerification:
    """AuthService Token 验证测试套件"""

    @pytest.fixture
    def auth_service(self, security_service, jwt_service):
        from backend.app.services.auth import AuthService

        return AuthService(
            security_service=security_service,
            jwt_service=jwt_service,
            access_token_expire_seconds=1800,
        )

    def test_verify_access_token_success(self, auth_service, jwt_service):
        """测试验证访问 Token 成功"""
        token = jwt_service.create_access_token(user_id=456)
        payload = auth_service.verify_access_token(token)

        assert payload["sub"] == "456"
        assert payload["type"] == "access"

    def test_verify_access_token_with_claims(self, auth_service, jwt_service):
        """测试验证带声明的访问 Token"""
        extra = {"role": "user", "department": "engineering"}
        token = jwt_service.create_access_token(user_id=789, extra_claims=extra)

        payload = auth_service.verify_access_token(token)

        assert payload["sub"] == "789"
        assert payload["type"] == "access"
        assert payload["extra"]["role"] == "user"
        assert payload["extra"]["department"] == "engineering"

    def test_verify_access_token_invalid_raises_error(self, auth_service):
        """测试验证无效 Token 抛出异常"""
        with pytest.raises(InvalidTokenError):
            auth_service.verify_access_token("invalid.token")

    def test_verify_access_token_with_refresh_token_raises_error(
        self, auth_service, jwt_service
    ):
        """测试使用刷新 Token 调用 verify_access_token 抛出异常"""
        refresh_token = jwt_service.create_refresh_token(user_id=1)

        with pytest.raises(InvalidTokenError, match="expected 'access'"):
            auth_service.verify_access_token(refresh_token)

    def test_verify_access_token_expired_raises_error(self, jwt_service):
        """测试验证过期 Token 抛出异常"""
        from datetime import datetime, timedelta, timezone

        from jose import jwt

        from backend.app.services.auth import AuthService

        # 创建过期的访问 Token
        expired_payload = {
            "sub": "123",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
            "iat": datetime.now(timezone.utc) - timedelta(minutes=35),
            "type": "access",
        }
        expired_token = jwt.encode(
            expired_payload,
            jwt_service._settings.jwt_secret_key,
            algorithm="HS256",
        )

        auth_service = AuthService(
            security_service=SecurityService(),
            jwt_service=jwt_service,
            access_token_expire_seconds=1800,
        )

        with pytest.raises(InvalidTokenError):
            auth_service.verify_access_token(expired_token)


class TestTokenResponse:
    """TokenResponse 模型测试套件"""

    def test_token_response_creation(self):
        """测试创建 TokenResponse"""
        from backend.app.services.auth import TokenResponse

        response = TokenResponse(
            access_token="access123",
            refresh_token="refresh123",
            token_type="Bearer",
            expires_in=1800,
        )

        assert response.access_token == "access123"
        assert response.refresh_token == "refresh123"
        assert response.token_type == "Bearer"
        assert response.expires_in == 1800

    def test_token_response_default_token_type(self):
        """测试 TokenResponse 默认类型为 Bearer"""
        from backend.app.services.auth import TokenResponse

        response = TokenResponse(
            access_token="access",
            refresh_token="refresh",
            expires_in=3600,
        )

        assert response.token_type == "Bearer"

    def test_token_response_serialization(self):
        """测试 TokenResponse 序列化"""
        from backend.app.services.auth import TokenResponse

        response = TokenResponse(
            access_token="access_token_value",
            refresh_token="refresh_token_value",
            expires_in=1800,
        )

        data = response.model_dump()

        assert data["access_token"] == "access_token_value"
        assert data["refresh_token"] == "refresh_token_value"
        assert data["token_type"] == "Bearer"
        assert data["expires_in"] == 1800


class TestUserAuthResponse:
    """UserAuthResponse 模型测试套件"""

    def test_user_auth_response_creation(self):
        """测试创建 UserAuthResponse"""
        from backend.app.services.auth import TokenResponse, UserAuthResponse

        tokens = TokenResponse(
            access_token="access123",
            refresh_token="refresh123",
            expires_in=1800,
        )

        response = UserAuthResponse(
            tokens=tokens,
            user_id=1,
            username="testuser",
        )

        assert response.tokens.access_token == "access123"
        assert response.tokens.refresh_token == "refresh123"
        assert response.user_id == 1
        assert response.username == "testuser"

    def test_user_auth_response_serialization(self):
        """测试 UserAuthResponse 序列化"""
        from backend.app.services.auth import TokenResponse, UserAuthResponse

        tokens = TokenResponse(
            access_token="access",
            refresh_token="refresh",
            expires_in=3600,
        )

        response = UserAuthResponse(
            tokens=tokens,
            user_id=42,
            username="john_doe",
        )

        data = response.model_dump()

        assert data["tokens"]["access_token"] == "access"
        assert data["tokens"]["refresh_token"] == "refresh"
        assert data["user_id"] == 42
        assert data["username"] == "john_doe"

    def test_user_auth_response_with_json(self):
        """测试 UserAuthResponse JSON 序列化"""
        from backend.app.services.auth import TokenResponse, UserAuthResponse

        tokens = TokenResponse(
            access_token="access_json",
            refresh_token="refresh_json",
            expires_in=1800,
        )

        response = UserAuthResponse(
            tokens=tokens,
            user_id=100,
            username="json_user",
        )

        json_data = response.model_dump_json()

        assert "access_json" in json_data
        assert "refresh_json" in json_data
        assert "100" in json_data
        assert "json_user" in json_data


class TestAuthServiceIntegration:
    """AuthService 集成测试套件（完整流程测试）"""

    @pytest.fixture
    def auth_service(self, security_service, jwt_service):
        from backend.app.services.auth import AuthService

        return AuthService(
            security_service=security_service,
            jwt_service=jwt_service,
            access_token_expire_seconds=1800,
        )

    @pytest.mark.asyncio
    async def test_complete_auth_flow(
        self, auth_service, jwt_service, security_service
    ):
        """测试完整的认证流程：登录 -> 使用 Token -> 刷新 Token"""
        # 1. 准备用户
        mock_user = Mock()
        mock_user.id = 1
        mock_user.username = "john"
        mock_user.hashed_password = security_service.hash_password("password123")
        mock_user.is_active = True

        async def mock_get_user(username):
            return mock_user if username == "john" else None

        # 2. 用户登录
        auth_response = await auth_service.authenticate(
            username="john",
            plain_password="password123",
            get_user_func=mock_get_user,
        )

        assert auth_response.user_id == 1
        assert auth_response.username == "john"
        access_token = auth_response.tokens.access_token
        refresh_token = auth_response.tokens.refresh_token

        # 3. 验证访问 Token
        payload = auth_service.verify_access_token(access_token)
        assert payload["sub"] == "1"
        assert payload["type"] == "access"

        # 4. 刷新 Token（添加延迟确保 iat 不同）
        import time

        time.sleep(1)
        new_tokens = auth_service.refresh_tokens(refresh_token)
        assert new_tokens.access_token != access_token
        assert new_tokens.refresh_token != refresh_token

        # 5. 验证新的访问 Token
        new_payload = auth_service.verify_access_token(new_tokens.access_token)
        assert new_payload["sub"] == "1"

    @pytest.mark.asyncio
    async def test_multiple_refreshes(
        self, auth_service, jwt_service, security_service
    ):
        """测试多次刷新 Token"""
        # 创建初始 Token
        mock_user = Mock()
        mock_user.id = 1
        mock_user.username = "user"
        mock_user.hashed_password = security_service.hash_password("password123")
        mock_user.is_active = True

        async def mock_get_user(username):
            return mock_user

        auth_response = await auth_service.authenticate(
            username="user",
            plain_password="password123",
            get_user_func=mock_get_user,
        )

        refresh_token = auth_response.tokens.refresh_token

        # 连续刷新 5 次
        import time

        for i in range(5):
            time.sleep(1)  # 添加延迟确保 iat 不同
            new_tokens = auth_service.refresh_tokens(refresh_token)
            refresh_token = new_tokens.refresh_token

            # 验证新 Token 有效
            payload = auth_service.verify_access_token(new_tokens.access_token)
            assert payload["sub"] == "1"

    @pytest.mark.asyncio
    async def test_authenticate_with_extra_claims_propagation(
        self, auth_service, jwt_service, security_service
    ):
        """测试认证时额外声明的传播"""
        # 注意：当前 AuthService 实现不支持认证时传递额外声明
        # 这个测试验证未来扩展的可能性
        mock_user = Mock()
        mock_user.id = 1
        mock_user.username = "admin"
        mock_user.hashed_password = security_service.hash_password("admin_pass")
        mock_user.is_active = True

        async def mock_get_user(username):
            return mock_user

        auth_response = await auth_service.authenticate(
            username="admin",
            plain_password="admin_pass",
            get_user_func=mock_get_user,
        )

        # 验证 Token 生成
        payload = jwt_service.decode_token(auth_response.tokens.access_token)
        assert payload["sub"] == "1"
        assert payload["type"] == "access"
