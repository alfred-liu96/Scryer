"""
核心安全服务单元测试

测试 SecurityService (密码哈希) 和 JWTService (Token 管理)
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

import pytest
from jose import jwt

from backend.app.core.exceptions import InvalidTokenError, TokenExpiredError


class TestSecurityService:
    """SecurityService 测试套件"""

    @pytest.fixture
    def security_service(self):
        from backend.app.core.security import SecurityService

        return SecurityService()

    # ==================== 密码哈希测试 ====================

    def test_hash_password_success(self, security_service):
        """测试密码哈希成功"""
        plain = "secure_password_123"
        hashed = security_service.hash_password(plain)

        # 验证哈希格式（bcrypt 前缀）
        assert hashed.startswith("$2b$")

        # 验证哈希长度（bcrypt 固定 60 字符）
        assert len(hashed) == 60

        # 验证两次哈希结果不同（盐值随机）
        hashed2 = security_service.hash_password(plain)
        assert hashed != hashed2

    def test_hash_password_empty_raises_error(self, security_service):
        """测试空密码抛出异常"""
        with pytest.raises(ValueError, match="cannot be empty"):
            security_service.hash_password("")

    def test_hash_password_too_short_raises_error(self, security_service):
        """测试过短密码抛出异常"""
        with pytest.raises(ValueError, match="at least 6 characters"):
            security_service.hash_password("12345")

    def test_hash_password_exactly_6_chars(self, security_service):
        """测试恰好 6 字符密码可以哈希"""
        plain = "123456"
        hashed = security_service.hash_password(plain)

        assert hashed.startswith("$2b$")
        assert len(hashed) == 60

    def test_hash_password_with_special_chars(self, security_service):
        """测试包含特殊字符的密码哈希"""
        plain = "P@ssw0rd!#$%^&*()"
        hashed = security_service.hash_password(plain)

        assert hashed.startswith("$2b$")
        assert len(hashed) == 60

        # 验证可以正确验证
        assert security_service.verify_password(plain, hashed) is True

    def test_hash_password_with_unicode(self, security_service):
        """测试包含 Unicode 字符的密码哈希"""
        plain = "密码测试密码🔐"
        hashed = security_service.hash_password(plain)

        assert hashed.startswith("$2b$")
        assert security_service.verify_password(plain, hashed) is True

    # ==================== 密码验证测试 ====================

    def test_verify_password_success(self, security_service):
        """测试密码验证成功"""
        plain = "correct_password"
        hashed = security_service.hash_password(plain)

        assert security_service.verify_password(plain, hashed) is True

    def test_verify_password_wrong_password(self, security_service):
        """测试错误密码验证失败"""
        plain = "correct_password"
        hashed = security_service.hash_password(plain)

        assert security_service.verify_password("wrong_password", hashed) is False

    def test_verify_password_invalid_hash_returns_false(self, security_service):
        """测试无效哈希返回 False（不抛异常）"""
        assert security_service.verify_password("password", "invalid_hash") is False
        assert security_service.verify_password("password", "") is False
        assert security_service.verify_password("password", "$2b$invalid") is False

    def test_verify_password_case_sensitive(self, security_service):
        """测试密码区分大小写"""
        plain = "MyPassword"
        hashed = security_service.hash_password(plain)

        assert security_service.verify_password("MyPassword", hashed) is True
        assert security_service.verify_password("mypassword", hashed) is False
        assert security_service.verify_password("MYPASSWORD", hashed) is False

    def test_verify_password_timing_attack_resistance(self, security_service):
        """测试验证时间恒定（防止时序攻击）"""
        plain = "test_password"
        hashed = security_service.hash_password(plain)

        # 正确密码和错误密码都应该返回结果（不抛异常）
        result1 = security_service.verify_password(plain, hashed)
        result2 = security_service.verify_password("wrong", hashed)

        assert result1 is True
        assert result2 is False

    # ==================== 算法支持测试 ====================

    def test_is_hash_algorithm_supported_bcrypt(self, security_service):
        """测试识别 bcrypt 算法"""
        assert security_service.is_hash_algorithm_supported("$2b$12$hash") is True
        assert security_service.is_hash_algorithm_supported("$2a$10$hash") is True

    def test_is_hash_algorithm_supported_unknown(self, security_service):
        """测试未知算法返回 False"""
        assert security_service.is_hash_algorithm_supported("$1$md5hash") is False
        assert security_service.is_hash_algorithm_supported("$5$sha256hash") is False
        assert security_service.is_hash_algorithm_supported("$6$sha512hash") is False
        assert security_service.is_hash_algorithm_supported("invalid") is False
        assert security_service.is_hash_algorithm_supported("") is False


class TestJWTServiceTokenGeneration:
    """JWTService Token 生成测试套件"""

    @pytest.fixture
    def jwt_service(self):
        from backend.app.core.security import JWTService

        settings = Mock()
        settings.jwt_secret_key = "test_secret_key_32_characters_long!"
        settings.jwt_algorithm = "HS256"
        settings.jwt_access_token_expire_minutes = 30
        settings.jwt_access_token_expire_seconds = 1800
        settings.jwt_refresh_token_expire_days = 7
        return JWTService(settings)

    # ==================== 访问 Token 测试 ====================

    def test_create_access_token_success(self, jwt_service):
        """测试创建访问 Token 成功"""
        token = jwt_service.create_access_token(user_id=123)

        # Token 是非空字符串
        assert token
        assert isinstance(token, str)

        # Token 包含三个部分（header.payload.signature）
        parts = token.split(".")
        assert len(parts) == 3

    def test_create_access_token_with_claims(self, jwt_service):
        """测试创建带额外声明的访问 Token"""
        extra = {"role": "admin", "permissions": ["read", "write"]}
        token = jwt_service.create_access_token(user_id=456, extra_claims=extra)

        payload = jwt_service.decode_token(token)
        assert payload["sub"] == "456"
        assert payload["type"] == "access"
        assert payload["extra"]["role"] == "admin"
        assert payload["extra"]["permissions"] == ["read", "write"]

    def test_create_access_token_empty_user_id_raises_error(self, jwt_service):
        """测试空用户 ID 抛出异常"""
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            jwt_service.create_access_token(user_id="")

        with pytest.raises(ValueError, match="user_id cannot be empty"):
            jwt_service.create_access_token(user_id=0)

    def test_create_access_token_with_int_user_id(self, jwt_service):
        """测试整数用户 ID 转换为字符串"""
        token = jwt_service.create_access_token(user_id=999)
        payload = jwt_service.decode_token(token)

        assert payload["sub"] == "999"
        assert isinstance(payload["sub"], str)

    def test_create_access_token_expiration_time(self, jwt_service):
        """测试 Token 过期时间设置正确"""
        from datetime import datetime, timezone

        before_creation = datetime.now(timezone.utc)
        token = jwt_service.create_access_token(user_id=1)
        after_creation = datetime.now(timezone.utc)

        payload = jwt_service.decode_token(token)

        # 验证过期时间约为 30 分钟后（使用时间戳差值比较）
        exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        time_diff = (exp_time - before_creation).total_seconds()

        # 期望过期时间为 1800 秒（30 分钟），允许 2 秒误差
        assert 1798 <= time_diff <= 1802

    # ==================== 刷新 Token 测试 ====================

    def test_create_refresh_token_success(self, jwt_service):
        """测试创建刷新 Token 成功"""
        token = jwt_service.create_refresh_token(user_id=789)

        assert token
        parts = token.split(".")
        assert len(parts) == 3

    def test_create_refresh_token_longer_expiration(self, jwt_service):
        """测试刷新 Token 过期时间更长"""
        access_token = jwt_service.create_access_token(user_id=1)
        refresh_token = jwt_service.create_refresh_token(user_id=1)

        access_payload = jwt_service.decode_token(access_token)
        refresh_payload = jwt_service.decode_token(refresh_token)

        # 刷新 Token 的过期时间应该更晚
        assert refresh_payload["exp"] > access_payload["exp"]

    def test_create_refresh_token_type(self, jwt_service):
        """测试刷新 Token 类型标记正确"""
        token = jwt_service.create_refresh_token(user_id=1)
        payload = jwt_service.decode_token(token)

        assert payload["type"] == "refresh"

    def test_create_refresh_token_with_claims(self, jwt_service):
        """测试创建带额外声明的刷新 Token"""
        extra = {"device_id": "mobile_123"}
        token = jwt_service.create_refresh_token(user_id=1, extra_claims=extra)

        payload = jwt_service.decode_token(token)
        assert payload["extra"]["device_id"] == "mobile_123"


class TestJWTServiceTokenVerification:
    """JWTService Token 验证测试套件"""

    @pytest.fixture
    def jwt_service(self):
        from backend.app.core.security import JWTService

        settings = Mock()
        settings.jwt_secret_key = "test_secret_key_32_characters_long!"
        settings.jwt_algorithm = "HS256"
        settings.jwt_access_token_expire_minutes = 30
        settings.jwt_access_token_expire_seconds = 1800
        settings.jwt_refresh_token_expire_days = 7
        return JWTService(settings)

    @pytest.fixture
    def valid_access_token(self, jwt_service):
        return jwt_service.create_access_token(user_id=100)

    @pytest.fixture
    def valid_refresh_token(self, jwt_service):
        return jwt_service.create_refresh_token(user_id=100)

    # ==================== 解码测试 ====================

    def test_decode_token_success(self, jwt_service, valid_access_token):
        """测试解码 Token 成功"""
        payload = jwt_service.decode_token(valid_access_token)

        assert payload["sub"] == "100"
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload

    def test_decode_token_all_claims(self, jwt_service):
        """测试解码包含所有声明的 Token"""
        extra = {"role": "user", "permissions": ["read"]}
        token = jwt_service.create_access_token(user_id=1, extra_claims=extra)

        payload = jwt_service.decode_token(token)

        assert payload["sub"] == "1"
        assert payload["type"] == "access"
        assert payload["extra"]["role"] == "user"
        assert payload["extra"]["permissions"] == ["read"]
        assert "exp" in payload
        assert "iat" in payload

    def test_decode_token_invalid_signature_raises_error(self, jwt_service):
        """测试无效签名抛出异常"""
        invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature"

        with pytest.raises(InvalidTokenError, match="Invalid token"):
            jwt_service.decode_token(invalid_token)

    def test_decode_token_malformed_raises_error(self, jwt_service):
        """测试格式错误的 Token 抛出异常"""
        with pytest.raises(InvalidTokenError):
            jwt_service.decode_token("not_a_token")

        with pytest.raises(InvalidTokenError):
            jwt_service.decode_token("only.two")

    def test_decode_token_expired_raises_error(self, jwt_service):
        """测试过期 Token 抛出异常"""
        # 手动创建一个过期的 Token
        expired_payload = {
            "sub": "123",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            "type": "access",
        }
        expired_token = jwt.encode(
            expired_payload,
            jwt_service._settings.jwt_secret_key,
            algorithm="HS256",
        )

        with pytest.raises(TokenExpiredError, match="has expired"):
            jwt_service.decode_token(expired_token)

    def test_decode_token_wrong_secret_raises_error(self, jwt_service):
        """测试错误密钥签发的 Token 抛出异常"""
        # 使用不同的密钥创建 Token
        payload = {
            "sub": "123",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
            "iat": datetime.now(timezone.utc),
            "type": "access",
        }
        token = jwt.encode(
            payload, "wrong_secret_key_32_characters_long!", algorithm="HS256"
        )

        with pytest.raises(InvalidTokenError):
            jwt_service.decode_token(token)

    # ==================== 类型验证测试 ====================

    def test_verify_access_token_success(self, jwt_service, valid_access_token):
        """测试验证访问 Token 成功"""
        payload = jwt_service.verify_access_token(valid_access_token)
        assert payload["type"] == "access"

    def test_verify_access_token_with_refresh_token_raises_error(
        self, jwt_service, valid_refresh_token
    ):
        """测试使用刷新 Token 调用 verify_access_token 抛出异常"""
        with pytest.raises(InvalidTokenError, match="expected 'access'"):
            jwt_service.verify_access_token(valid_refresh_token)

    def test_verify_refresh_token_success(self, jwt_service, valid_refresh_token):
        """测试验证刷新 Token 成功"""
        payload = jwt_service.verify_refresh_token(valid_refresh_token)
        assert payload["type"] == "refresh"

    def test_verify_refresh_token_with_access_token_raises_error(
        self, jwt_service, valid_access_token
    ):
        """测试使用访问 Token 调用 verify_refresh_token 抛出异常"""
        with pytest.raises(InvalidTokenError, match="expected 'refresh'"):
            jwt_service.verify_refresh_token(valid_access_token)

    def test_verify_access_token_expired_raises_error(self, jwt_service):
        """测试验证过期访问 Token 抛出异常"""
        expired_payload = {
            "sub": "123",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
            "iat": datetime.now(timezone.utc) - timedelta(minutes=31),
            "type": "access",
        }
        expired_token = jwt.encode(
            expired_payload,
            jwt_service._settings.jwt_secret_key,
            algorithm="HS256",
        )

        with pytest.raises(TokenExpiredError):
            jwt_service.verify_access_token(expired_token)

    def test_verify_refresh_token_expired_raises_error(self, jwt_service):
        """测试验证过期刷新 Token 抛出异常"""
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

        with pytest.raises(TokenExpiredError):
            jwt_service.verify_refresh_token(expired_token)


class TestJWTServiceTokenRefresh:
    """JWTService Token 刷新测试套件"""

    @pytest.fixture
    def jwt_service(self):
        from backend.app.core.security import JWTService

        settings = Mock()
        settings.jwt_secret_key = "test_secret_key_32_characters_long!"
        settings.jwt_algorithm = "HS256"
        settings.jwt_access_token_expire_minutes = 30
        settings.jwt_access_token_expire_seconds = 1800
        settings.jwt_refresh_token_expire_days = 7
        return JWTService(settings)

    @pytest.fixture
    def refresh_token(self, jwt_service):
        return jwt_service.create_refresh_token(user_id=999)

    def test_refresh_access_token_success(self, jwt_service, refresh_token):
        """测试刷新 Token 成功"""
        # 添加延迟确保 iat 不同
        import time

        time.sleep(1)

        new_access, new_refresh = jwt_service.refresh_access_token(refresh_token)

        # 验证新 Token 有效
        access_payload = jwt_service.decode_token(new_access)
        refresh_payload = jwt_service.decode_token(new_refresh)

        assert access_payload["sub"] == "999"
        assert refresh_payload["sub"] == "999"

        # 新 Token 应该与旧 Token 不同
        assert new_access != refresh_token
        assert new_refresh != refresh_token

    def test_refresh_access_token_preserves_claims(self, jwt_service):
        """测试刷新 Token 保留额外声明"""
        extra = {"role": "admin"}
        old_refresh = jwt_service.create_refresh_token(user_id=1, extra_claims=extra)

        new_access, new_refresh = jwt_service.refresh_access_token(old_refresh)

        # 验证额外声明被保留
        access_payload = jwt_service.decode_token(new_access)
        refresh_payload = jwt_service.decode_token(new_refresh)

        assert access_payload["extra"]["role"] == "admin"
        assert refresh_payload["extra"]["role"] == "admin"

    def test_refresh_access_token_with_invalid_token_raises_error(self, jwt_service):
        """测试使用无效 Token 刷新抛出异常"""
        with pytest.raises(InvalidTokenError):
            jwt_service.refresh_access_token("invalid.token.here")

    def test_refresh_access_token_with_access_token_raises_error(self, jwt_service):
        """测试使用访问 Token 刷新抛出异常"""
        access_token = jwt_service.create_access_token(user_id=1)

        with pytest.raises(InvalidTokenError, match="expected 'refresh'"):
            jwt_service.refresh_access_token(access_token)

    def test_refresh_access_token_with_expired_token_raises_error(self, jwt_service):
        """测试使用过期 Token 刷新抛出异常"""
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

        with pytest.raises(TokenExpiredError):
            jwt_service.refresh_access_token(expired_token)


class TestJWTServiceUtilityMethods:
    """JWTService 工具方法测试套件"""

    @pytest.fixture
    def jwt_service(self):
        from backend.app.core.security import JWTService

        settings = Mock()
        settings.jwt_secret_key = "test_secret_key_32_characters_long!"
        settings.jwt_algorithm = "HS256"
        settings.jwt_access_token_expire_minutes = 30
        settings.jwt_access_token_expire_seconds = 1800
        settings.jwt_refresh_token_expire_days = 7
        return JWTService(settings)

    def test_get_user_id_from_token_success(self, jwt_service):
        """测试从 Token 提取用户 ID 成功"""
        token = jwt_service.create_access_token(user_id=42)
        user_id = jwt_service.get_user_id_from_token(token)

        assert user_id == "42"

    def test_get_user_id_from_int_user_id(self, jwt_service):
        """测试从整数用户 ID 的 Token 提取"""
        token = jwt_service.create_access_token(user_id=12345)
        user_id = jwt_service.get_user_id_from_token(token)

        assert user_id == "12345"
        assert isinstance(user_id, str)

    def test_get_user_id_from_invalid_token_raises_error(self, jwt_service):
        """测试从无效 Token 提取用户 ID 抛出异常"""
        with pytest.raises(InvalidTokenError, match="Cannot extract user_id"):
            jwt_service.get_user_id_from_token("invalid")

        with pytest.raises(InvalidTokenError, match="Cannot extract user_id"):
            jwt_service.get_user_id_from_token("not.a.jwt")

    def test_get_user_id_from_expired_token(self, jwt_service):
        """测试从过期 Token 提取用户 ID（不验证过期时间）"""
        # 创建过期的 Token
        expired_payload = {
            "sub": "999",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            "type": "access",
        }
        expired_token = jwt.encode(
            expired_payload,
            jwt_service._settings.jwt_secret_key,
            algorithm="HS256",
        )

        # 即使 Token 过期，也应该能提取用户 ID
        user_id = jwt_service.get_user_id_from_token(expired_token)
        assert user_id == "999"

    def test_get_user_id_from_token_without_sub(self, jwt_service):
        """测试没有 sub 声明的 Token 返回空字符串"""
        from jose import jwt

        payload = {
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
            "iat": datetime.now(timezone.utc),
            "type": "access",
        }
        token = jwt.encode(
            payload,
            jwt_service._settings.jwt_secret_key,
            algorithm="HS256",
        )

        user_id = jwt_service.get_user_id_from_token(token)
        assert user_id == ""


class TestTokenPayload:
    """TokenPayload 模型测试套件"""

    def test_token_payload_valid_types(self):
        """测试有效的 Token 类型"""
        from datetime import datetime, timezone

        from backend.app.core.security import TokenPayload

        payload = TokenPayload(
            sub="123",
            exp=datetime.now(timezone.utc) + timedelta(minutes=30),
            iat=datetime.now(timezone.utc),
            type="access",
        )
        assert payload.type == "access"

        payload = TokenPayload(
            sub="123",
            exp=datetime.now(timezone.utc) + timedelta(days=7),
            iat=datetime.now(timezone.utc),
            type="refresh",
        )
        assert payload.type == "refresh"

    def test_token_payload_invalid_type_raises_error(self):
        """测试无效的 Token 类型抛出异常"""
        from datetime import datetime, timezone

        from backend.app.core.security import TokenPayload

        with pytest.raises(ValueError, match="token type must be"):
            TokenPayload(
                sub="123",
                exp=datetime.now(timezone.utc) + timedelta(minutes=30),
                iat=datetime.now(timezone.utc),
                type="invalid",
            )

    def test_token_payload_to_dict(self):
        """测试转换为字典"""
        from datetime import datetime, timezone

        from backend.app.core.security import TokenPayload

        exp_time = datetime.now(timezone.utc) + timedelta(minutes=30)
        iat_time = datetime.now(timezone.utc)

        payload = TokenPayload(
            sub="456",
            exp=exp_time,
            iat=iat_time,
            type="access",
            extra={"role": "admin"},
        )

        result = payload.to_dict()

        assert result["sub"] == "456"
        assert result["exp"] == exp_time
        assert result["iat"] == iat_time
        assert result["type"] == "access"
        assert result["extra"]["role"] == "admin"  # 修正：extra 是嵌套结构

    def test_token_payload_without_extra(self):
        """测试没有额外声明的 TokenPayload"""
        from datetime import datetime, timezone

        from backend.app.core.security import TokenPayload

        payload = TokenPayload(
            sub="789",
            exp=datetime.now(timezone.utc) + timedelta(minutes=30),
            iat=datetime.now(timezone.utc),
            type="access",
        )

        result = payload.to_dict()

        assert "sub" in result
        assert "exp" in result
        assert "iat" in result
        assert "type" in result
        # 没有 extra，字典中不应有额外的键
        assert len([k for k in result if k not in ["sub", "exp", "iat", "type"]]) == 0
