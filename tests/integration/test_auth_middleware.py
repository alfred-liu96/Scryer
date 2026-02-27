"""
认证中间件与依赖注入集成测试

测试范围：
- AuthMiddleware 异常处理
- get_current_user_id 依赖注入
- require_auth 装饰器/依赖
- 中间件与依赖注入的协同工作

验收标准：
- 无效 Token → 401 统一响应
- 过期 Token → 401 带 expired_at 字段
- 有效 Token → 正常访问
- get_current_user_id 正确提取 user_id
- require_auth 正确注入 request.state.user_id

参考 Issue #89
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import Depends, Request
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.security import SecurityService
from backend.app.models.user import User
from backend.app.repositories.user import UserRepository

# ==================== Fixtures ====================


@pytest.fixture
def db_session(docker_db_session: AsyncSession) -> AsyncSession:
    """数据库会话 fixture 别名"""
    return docker_db_session


@pytest.fixture
def auth_app(db_session: AsyncSession, check_postgres_container: bool):
    """创建带认证中间件的测试应用"""
    from backend.app.api import deps
    from backend.app.main import create_app

    app = create_app()

    # Override dependencies
    async def override_get_db_session():
        yield db_session

    app.dependency_overrides[deps.get_db_session] = override_get_db_session

    yield app

    app.dependency_overrides = {}


@pytest.fixture
def auth_client(auth_app):
    """创建测试客户端"""
    return TestClient(auth_app)


@pytest.fixture
async def authenticated_user(db_session: AsyncSession) -> User:
    """创建已认证的测试用户"""
    user_repo = UserRepository(db_session)
    security_service = SecurityService()

    user = User(
        username="authuser",
        email="auth@example.com",
        hashed_password=security_service.hash_password("AuthPassword123"),
        is_active=True,
    )

    created_user = await user_repo.create(user)
    await db_session.commit()

    return created_user


@pytest.fixture
def valid_access_token(auth_client: TestClient, authenticated_user: User) -> str:
    """获取有效的访问 Token"""
    login_data = {
        "username": "authuser",
        "password": "AuthPassword123",
    }
    response = auth_client.post("/api/v1/auth/login", json=login_data)
    return response.json()["tokens"]["access_token"]  # type: ignore[no-any-return]


@pytest.fixture
def expired_access_token(authenticated_user: User) -> str:
    """生成已过期的访问 Token"""
    from backend.app.core.config import get_settings

    settings = get_settings()

    # 手动创建一个过期的 Token
    from jose import jwt

    from backend.app.core.security import TokenPayload

    # 创建过期时间为昨天的 payload
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    payload = TokenPayload(
        sub=str(authenticated_user.id),
        exp=yesterday,
        iat=datetime.now(timezone.utc) - timedelta(days=1, minutes=30),
        type="access",
    )

    # 手动编码 Token
    token = jwt.encode(
        payload.to_dict(),
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return token  # type: ignore[no-any-return]


@pytest.fixture
def refresh_token(auth_client: TestClient, authenticated_user: User) -> str:
    """获取刷新 Token（用于测试 Token 类型验证）"""
    login_data = {
        "username": "authuser",
        "password": "AuthPassword123",
    }
    response = auth_client.post("/api/v1/auth/login", json=login_data)
    return response.json()["tokens"]["refresh_token"]  # type: ignore[no-any-return]


# ==================== AuthMiddleware 测试 ====================


class TestAuthMiddleware:
    """认证中间件测试套件"""

    def test_middleware_allows_valid_token(
        self, auth_client: TestClient, valid_access_token: str
    ):
        """测试中间件允许有效 Token 通过"""
        headers = {"Authorization": f"Bearer {valid_access_token}"}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 200

    def test_middleware_returns_401_for_invalid_token(self, auth_client: TestClient):
        """测试中间件拦截无效 Token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_middleware_returns_401_for_missing_token(self, auth_client: TestClient):
        """测试中间件拦截缺失 Token"""
        response = auth_client.get("/api/v1/auth/me")

        assert response.status_code == 401

    def test_middleware_handles_malformed_token(self, auth_client: TestClient):
        """测试中间件处理格式错误的 Token"""
        headers = {"Authorization": "Bearer not-a-valid-jwt"}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401

    def test_middleware_handles_empty_token(self, auth_client: TestClient):
        """测试中间件处理空 Token"""
        headers = {"Authorization": "Bearer "}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401

    def test_middleware_handles_token_with_wrong_scheme(self, auth_client: TestClient):
        """测试中间件处理错误的认证方案"""
        headers = {"Authorization": f"Basic {valid_access_token}"}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401


# ==================== get_current_user_id 测试 ====================


class TestGetCurrentUserId:
    """get_current_user_id 依赖注入测试套件"""

    def test_get_current_user_id_returns_correct_id(
        self,
        auth_client: TestClient,
        valid_access_token: str,
        authenticated_user: User,
        db_session: AsyncSession,
    ):
        """测试 get_current_user_id 返回正确的用户 ID"""
        from backend.app.api import deps
        from backend.app.main import create_app

        app = create_app()

        @app.get("/test/user-id")
        async def test_user_id(user_id: int = Depends(deps.get_current_user_id)):
            return {"user_id": user_id}

        # Override dependencies
        async def override_get_db_session():
            yield db_session

        app.dependency_overrides[deps.get_db_session] = override_get_db_session

        client = TestClient(app)

        # 测试有效 Token
        headers = {"Authorization": f"Bearer {valid_access_token}"}
        response = client.get("/test/user-id", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == authenticated_user.id

    def test_get_current_user_id_returns_int_type(
        self, auth_client: TestClient, valid_access_token: str, db_session: AsyncSession
    ):
        """测试 get_current_user_id 返回 int 类型"""
        from backend.app.api import deps
        from backend.app.main import create_app

        app = create_app()

        @app.get("/test/user-id-type")
        async def test_user_id_type(
            user_id: int = Depends(deps.get_current_user_id),
        ):
            return {"user_id": user_id, "type": str(type(user_id))}

        # Override dependencies
        async def override_get_db_session():
            yield db_session

        app.dependency_overrides[deps.get_db_session] = override_get_db_session

        client = TestClient(app)

        headers = {"Authorization": f"Bearer {valid_access_token}"}
        response = client.get("/test/user-id-type", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["user_id"], int)

    def test_get_current_user_id_raises_401_for_invalid_token(
        self, auth_client: TestClient, db_session: AsyncSession
    ):
        """测试 get_current_user_id 对无效 Token 抛出 401"""
        from backend.app.api import deps
        from backend.app.main import create_app

        app = create_app()

        @app.get("/test/user-id")
        async def test_user_id(user_id: int = Depends(deps.get_current_user_id)):
            return {"user_id": user_id}

        # Override dependencies
        async def override_get_db_session():
            yield db_session

        app.dependency_overrides[deps.get_db_session] = override_get_db_session

        client = TestClient(app)

        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/test/user-id", headers=headers)

        assert response.status_code == 401

    def test_get_current_user_id_raises_401_for_missing_token(
        self, auth_client: TestClient, db_session: AsyncSession
    ):
        """测试 get_current_user_id 对缺失 Token 抛出 401"""
        from backend.app.api import deps
        from backend.app.main import create_app

        app = create_app()

        @app.get("/test/user-id")
        async def test_user_id(user_id: int = Depends(deps.get_current_user_id)):
            return {"user_id": user_id}

        # Override dependencies
        async def override_get_db_session():
            yield db_session

        app.dependency_overrides[deps.get_db_session] = override_get_db_session

        client = TestClient(app)

        response = client.get("/test/user-id")

        assert response.status_code == 401


# ==================== require_auth 测试 ====================


class TestRequireAuth:
    """require_auth 装饰器/依赖测试套件"""

    def test_require_auth_as_dependency_returns_user_id(
        self,
        auth_client: TestClient,
        valid_access_token: str,
        authenticated_user: User,
        db_session: AsyncSession,
    ):
        """测试 require_auth 作为依赖注入返回 user_id"""
        from backend.app.api import deps
        from backend.app.main import create_app

        app = create_app()

        @app.get("/test/require-auth-dependency")
        async def test_require_auth_dependency(
            user_id: int = Depends(deps.require_auth),
        ):
            return {"user_id": user_id}

        # Override dependencies
        async def override_get_db_session():
            yield db_session

        app.dependency_overrides[deps.get_db_session] = override_get_db_session

        client = TestClient(app)

        headers = {"Authorization": f"Bearer {valid_access_token}"}
        response = client.get("/test/require-auth-dependency", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == authenticated_user.id

    def test_require_auth_injects_user_id_to_request_state(
        self,
        auth_client: TestClient,
        valid_access_token: str,
        authenticated_user: User,
        db_session: AsyncSession,
    ):
        """测试 require_auth 将 user_id 注入到 request.state"""
        from backend.app.api import deps
        from backend.app.main import create_app

        app = create_app()

        @app.get("/test/require-auth-state")
        async def test_require_auth_state(
            request: Request, _=Depends(deps.require_auth)
        ):
            return {"user_id": request.state.user_id}

        # Override dependencies
        async def override_get_db_session():
            yield db_session

        app.dependency_overrides[deps.get_db_session] = override_get_db_session

        client = TestClient(app)

        headers = {"Authorization": f"Bearer {valid_access_token}"}
        response = client.get("/test/require-auth-state", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == authenticated_user.id

    def test_require_auth_returns_401_for_invalid_token(
        self, auth_client: TestClient, db_session: AsyncSession
    ):
        """测试 require_auth 对无效 Token 返回 401"""
        from backend.app.api import deps
        from backend.app.main import create_app

        app = create_app()

        @app.get("/test/require-auth")
        async def test_require_auth(user_id: int = Depends(deps.require_auth)):
            return {"user_id": user_id}

        # Override dependencies
        async def override_get_db_session():
            yield db_session

        app.dependency_overrides[deps.get_db_session] = override_get_db_session

        client = TestClient(app)

        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/test/require-auth", headers=headers)

        assert response.status_code == 401

    def test_require_auth_returns_401_for_missing_token(
        self, auth_client: TestClient, db_session: AsyncSession
    ):
        """测试 require_auth 对缺失 Token 返回 401"""
        from backend.app.api import deps
        from backend.app.main import create_app

        app = create_app()

        @app.get("/test/require-auth")
        async def test_require_auth(user_id: int = Depends(deps.require_auth)):
            return {"user_id": user_id}

        # Override dependencies
        async def override_get_db_session():
            yield db_session

        app.dependency_overrides[deps.get_db_session] = override_get_db_session

        client = TestClient(app)

        response = client.get("/test/require-auth")

        assert response.status_code == 401


# ==================== Token 类型验证测试 ====================


class TestTokenTypeValidation:
    """Token 类型验证测试套件"""

    def test_reject_refresh_token_on_protected_endpoint(
        self, auth_client: TestClient, refresh_token: str
    ):
        """测试拒绝使用 refresh Token 访问受保护端点"""
        headers = {"Authorization": f"Bearer {refresh_token}"}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "token type" in data["detail"].lower()


# ==================== Token 过期测试 ====================


class TestTokenExpiry:
    """Token 过期测试套件"""

    def test_expired_token_returns_401(
        self, auth_client: TestClient, expired_access_token: str
    ):
        """测试过期 Token 返回 401"""
        headers = {"Authorization": f"Bearer {expired_access_token}"}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401

    def test_expired_token_error_message(
        self, auth_client: TestClient, expired_access_token: str
    ):
        """测试过期 Token 的错误消息"""
        headers = {"Authorization": f"Bearer {expired_access_token}"}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401
        data = response.json()
        assert "expired" in data["detail"].lower()


# ==================== 集成测试 ====================


class TestAuthIntegration:
    """认证功能集成测试套件"""

    def test_complete_protected_flow(
        self, auth_client: TestClient, authenticated_user: User
    ):
        """测试完整的受保护端点访问流程"""
        # 1. 登录获取 Token
        login_data = {
            "username": "authuser",
            "password": "AuthPassword123",
        }
        login_response = auth_client.post("/api/v1/auth/login", json=login_data)

        assert login_response.status_code == 200
        access_token = login_response.json()["tokens"]["access_token"]

        # 2. 使用 Token 访问受保护端点
        headers = {"Authorization": f"Bearer {access_token}"}
        me_response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert me_response.status_code == 200
        user_data = me_response.json()
        assert user_data["id"] == authenticated_user.id

    def test_multiple_requests_with_same_token(
        self, auth_client: TestClient, valid_access_token: str
    ):
        """测试多个请求使用同一个 Token"""
        headers = {"Authorization": f"Bearer {valid_access_token}"}

        # 第一次请求
        response1 = auth_client.get("/api/v1/auth/me", headers=headers)
        assert response1.status_code == 200

        # 第二次请求
        response2 = auth_client.get("/api/v1/auth/me", headers=headers)
        assert response2.status_code == 200

        # 第三次请求
        response3 = auth_client.get("/api/v1/auth/me", headers=headers)
        assert response3.status_code == 200

    async def test_different_users_have_different_user_ids(
        self, auth_client: TestClient, db_session: AsyncSession
    ):
        """测试不同用户拥有不同的 user_id"""
        from backend.app.core.security import SecurityService
        from backend.app.repositories.user import UserRepository

        user_repo = UserRepository(db_session)
        security_service = SecurityService()

        # 创建两个用户
        user1 = User(
            username="user1",
            email="user1@example.com",
            hashed_password=security_service.hash_password("Password123"),
            is_active=True,
        )
        created_user1 = await user_repo.create(user1)

        user2 = User(
            username="user2",
            email="user2@example.com",
            hashed_password=security_service.hash_password("Password123"),
            is_active=True,
        )
        created_user2 = await user_repo.create(user2)
        await db_session.commit()

        # 登录两个用户
        login1 = auth_client.post(
            "/api/v1/auth/login",
            json={"username": "user1", "password": "Password123"},
        )
        token1 = login1.json()["tokens"]["access_token"]

        login2 = auth_client.post(
            "/api/v1/auth/login",
            json={"username": "user2", "password": "Password123"},
        )
        token2 = login2.json()["tokens"]["access_token"]

        # 访问受保护端点
        headers1 = {"Authorization": f"Bearer {token1}"}
        response1 = auth_client.get("/api/v1/auth/me", headers=headers1)

        headers2 = {"Authorization": f"Bearer {token2}"}
        response2 = auth_client.get("/api/v1/auth/me", headers=headers2)

        user_id1 = response1.json()["id"]
        user_id2 = response2.json()["id"]

        assert user_id1 != user_id2
        assert user_id1 == created_user1.id
        assert user_id2 == created_user2.id

    def test_unauthorized_endpoint_without_middleware(self, auth_client: TestClient):
        """测试无需认证的端点可以正常访问"""
        # 健康检查端点不需要认证
        response = auth_client.get("/health")

        assert response.status_code == 200


# ==================== 错误响应格式测试 ====================


class TestErrorResponseFormat:
    """错误响应格式测试套件"""

    def test_401_response_contains_detail_field(self, auth_client: TestClient):
        """测试 401 响应包含 detail 字段"""
        response = auth_client.get("/api/v1/auth/me")

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_invalid_token_response_format(self, auth_client: TestClient):
        """测试无效 Token 的响应格式"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
