"""
认证 API 端点集成测试

测试范围：
- 用户注册端点 (POST /api/v1/auth/register)
- 用户登录端点 (POST /api/v1/auth/login)
- 获取当前用户端点 (GET /api/v1/auth/me)
- 完整认证流程测试

验收标准：
- 注册成功返回 201 和用户信息 + Token
- 注册失败返回正确的错误响应（409 冲突，422 验证错误）
- 登录成功返回 200 和用户信息 + Token
- 登录失败返回正确的错误响应（401 凭证错误，403 未激活）
- 获取用户信息成功返回 200
- 未认证返回 401

参考 Issue #88
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.security import SecurityService
from backend.app.models.user import User
from backend.app.repositories.user import UserRepository

# ==================== Fixtures ====================


# Fixture 别名：将 docker_db_session 别名为 db_session
@pytest.fixture
def db_session(docker_db_session: AsyncSession) -> AsyncSession:
    """数据库会话 fixture 别名

    将 docker_db_session 别名为 db_session，以便测试使用
    """
    return docker_db_session


@pytest.fixture
def client(db_session: AsyncSession, check_postgres_container: bool):
    """创建测试客户端

    使用测试数据库会话配置 FastAPI 测试客户端
    """
    from fastapi.testclient import TestClient

    from backend.app.api import deps
    from backend.app.main import create_app

    # 创建应用
    app = create_app()

    # Override get_db_session dependency to use test database session
    async def override_get_db_session():
        yield db_session

    app.dependency_overrides[deps.get_db_session] = override_get_db_session

    # 创建测试客户端
    test_client = TestClient(app)

    yield test_client

    # 清理 overrides
    app.dependency_overrides = {}


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """创建测试用户

    创建一个激活状态的测试用户，用于登录测试

    Returns:
        User: 创建的测试用户实例
    """
    user_repo = UserRepository(db_session)
    security_service = SecurityService()

    # 创建测试用户
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=security_service.hash_password("TestPassword123"),
        is_active=True,
    )

    created_user = await user_repo.create(user)
    await db_session.commit()

    return created_user


@pytest.fixture
async def inactive_user(db_session: AsyncSession) -> User:
    """创建未激活的测试用户

    创建一个未激活状态的测试用户，用于测试未激活场景

    Returns:
        User: 创建的未激活用户实例
    """
    user_repo = UserRepository(db_session)
    security_service = SecurityService()

    # 创建未激活用户
    user = User(
        username="inactiveuser",
        email="inactive@example.com",
        hashed_password=security_service.hash_password("TestPassword123"),
        is_active=False,
    )

    created_user = await user_repo.create(user)
    await db_session.commit()

    return created_user


@pytest.fixture
def valid_register_data():
    """有效的注册数据"""
    return {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "NewPassword123",
    }


@pytest.fixture
def valid_login_data():
    """有效的登录数据"""
    return {
        "username": "testuser",
        "password": "TestPassword123",
    }


# ==================== 用户注册端点测试 ====================


class TestUserRegistration:
    """用户注册端点测试套件"""

    def test_register_success_returns_201(
        self, client: TestClient, valid_register_data
    ):
        """测试注册成功返回 201 Created"""
        response = client.post("/api/v1/auth/register", json=valid_register_data)

        assert response.status_code == 201

    def test_register_success_returns_user_data(
        self, client: TestClient, valid_register_data
    ):
        """测试注册成功返回用户信息"""
        response = client.post("/api/v1/auth/register", json=valid_register_data)

        data = response.json()
        assert "user" in data
        assert "tokens" in data

        user = data["user"]
        assert user["username"] == "newuser"
        assert user["email"] == "newuser@example.com"
        assert user["is_active"] is True
        assert "id" in user
        assert "created_at" in user

    def test_register_success_returns_tokens(
        self, client: TestClient, valid_register_data
    ):
        """测试注册成功返回 Token"""
        response = client.post("/api/v1/auth/register", json=valid_register_data)

        data = response.json()
        tokens = data["tokens"]

        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "Bearer"
        assert tokens["expires_in"] == 1800
        assert len(tokens["access_token"]) > 0
        assert len(tokens["refresh_token"]) > 0

    def test_register_duplicate_username_returns_409(
        self, client: TestClient, valid_register_data
    ):
        """测试用户名已存在返回 409 Conflict"""
        # 第一次注册
        client.post("/api/v1/auth/register", json=valid_register_data)

        # 第二次注册相同用户名
        duplicate_data = {
            "username": "newuser",  # 相同用户名
            "email": "another@example.com",  # 不同邮箱
            "password": "Password123",
        }

        response = client.post("/api/v1/auth/register", json=duplicate_data)

        assert response.status_code == 409
        data = response.json()
        assert data["detail"] == "Username already exists"
        assert data["field"] == "username"

    def test_register_duplicate_email_returns_409(
        self, client: TestClient, valid_register_data
    ):
        """测试邮箱已存在返回 409 Conflict"""
        # 第一次注册
        client.post("/api/v1/auth/register", json=valid_register_data)

        # 第二次注册相同邮箱
        duplicate_data = {
            "username": "anotheruser",  # 不同用户名
            "email": "newuser@example.com",  # 相同邮箱
            "password": "Password123",
        }

        response = client.post("/api/v1/auth/register", json=duplicate_data)

        assert response.status_code == 409
        data = response.json()
        assert data["detail"] == "Email already exists"
        assert data["field"] == "email"

    def test_register_missing_username_returns_422(self, client: TestClient):
        """测试缺少用户名返回 422 Validation Error"""
        invalid_data = {
            "email": "test@example.com",
            "password": "Password123",
        }

        response = client.post("/api/v1/auth/register", json=invalid_data)

        assert response.status_code == 422

    def test_register_missing_email_returns_422(self, client: TestClient):
        """测试缺少邮箱返回 422 Validation Error"""
        invalid_data = {
            "username": "testuser",
            "password": "Password123",
        }

        response = client.post("/api/v1/auth/register", json=invalid_data)

        assert response.status_code == 422

    def test_register_missing_password_returns_422(self, client: TestClient):
        """测试缺少密码返回 422 Validation Error"""
        invalid_data = {
            "username": "testuser",
            "email": "test@example.com",
        }

        response = client.post("/api/v1/auth/register", json=invalid_data)

        assert response.status_code == 422

    def test_register_short_username_returns_422(self, client: TestClient):
        """测试用户名过短返回 422 Validation Error"""
        invalid_data = {
            "username": "ab",  # 少于 3 字符
            "email": "test@example.com",
            "password": "Password123",
        }

        response = client.post("/api/v1/auth/register", json=invalid_data)

        assert response.status_code == 422

    def test_register_short_password_returns_422(self, client: TestClient):
        """测试密码过短返回 422 Validation Error"""
        invalid_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "short",  # 少于 8 字符
        }

        response = client.post("/api/v1/auth/register", json=invalid_data)

        assert response.status_code == 422

    def test_register_invalid_email_returns_422(self, client: TestClient):
        """测试无效邮箱格式返回 422 Validation Error"""
        invalid_data = {
            "username": "testuser",
            "email": "not-an-email",  # 无效邮箱格式
            "password": "Password123",
        }

        response = client.post("/api/v1/auth/register", json=invalid_data)

        assert response.status_code == 422


# ==================== 用户登录端点测试 ====================


class TestUserLogin:
    """用户登录端点测试套件"""

    def test_login_with_username_returns_200(self, client: TestClient, test_user: User):
        """测试使用用户名登录成功返回 200 OK"""
        login_data = {
            "username": "testuser",
            "password": "TestPassword123",
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 200

    def test_login_with_username_returns_user_data(
        self, client: TestClient, test_user: User
    ):
        """测试使用用户名登录返回正确的用户信息"""
        login_data = {
            "username": "testuser",
            "password": "TestPassword123",
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        data = response.json()
        assert "user" in data
        assert "tokens" in data

        user = data["user"]
        assert user["id"] == test_user.id
        assert user["username"] == "testuser"
        assert user["email"] == "test@example.com"
        assert user["is_active"] is True

    def test_login_with_email_returns_200(self, client: TestClient, test_user: User):
        """测试使用邮箱登录成功返回 200 OK"""
        login_data = {
            "email": "test@example.com",
            "password": "TestPassword123",
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 200

    def test_login_with_email_returns_user_data(
        self, client: TestClient, test_user: User
    ):
        """测试使用邮箱登录返回正确的用户信息"""
        login_data = {
            "email": "test@example.com",
            "password": "TestPassword123",
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        data = response.json()
        user = data["user"]

        assert user["id"] == test_user.id
        assert user["username"] == "testuser"
        assert user["email"] == "test@example.com"

    def test_login_returns_tokens(self, client: TestClient, test_user: User):
        """测试登录成功返回 Token"""
        login_data = {
            "username": "testuser",
            "password": "TestPassword123",
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        data = response.json()
        tokens = data["tokens"]

        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "Bearer"
        assert tokens["expires_in"] == 1800

    def test_login_wrong_password_returns_401(
        self, client: TestClient, test_user: User
    ):
        """测试密码错误返回 401 Unauthorized"""
        login_data = {
            "username": "testuser",
            "password": "WrongPassword123",
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401
        data = response.json()
        assert data["detail"] == "Invalid username or password"

    def test_login_nonexistent_user_returns_401(self, client: TestClient):
        """测试用户不存在返回 401 Unauthorized"""
        login_data = {
            "username": "nonexistent",
            "password": "Password123",
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401
        data = response.json()
        assert data["detail"] == "Invalid username or password"

    def test_login_inactive_user_returns_403(
        self, client: TestClient, inactive_user: User
    ):
        """测试未激活用户登录返回 403 Forbidden"""
        login_data = {
            "username": "inactiveuser",
            "password": "TestPassword123",
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 403
        data = response.json()
        assert data["detail"] == "User account is inactive"
        assert "user_id" in data

    def test_login_missing_credentials_returns_422(self, client: TestClient):
        """测试缺少凭证返回 422 Validation Error"""
        login_data = {
            "password": "Password123",
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 422

    def test_login_missing_password_returns_422(self, client: TestClient):
        """测试缺少密码返回 422 Validation Error"""
        login_data = {
            "username": "testuser",
        }

        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 422


# ==================== 获取当前用户端点测试 ====================


class TestGetCurrentUser:
    """获取当前用户端点测试套件"""

    def test_get_current_user_with_valid_token_returns_200(
        self, client: TestClient, test_user: User
    ):
        """测试使用有效 Token 获取当前用户返回 200 OK"""
        # 先登录获取 Token
        login_data = {
            "username": "testuser",
            "password": "TestPassword123",
        }
        login_response = client.post("/api/v1/auth/login", json=login_data)
        tokens = login_response.json()["tokens"]
        access_token = tokens["access_token"]

        # 使用 Token 获取当前用户
        headers = {"Authorization": f"Bearer {access_token}"}
        response = client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 200

    def test_get_current_user_returns_correct_user_data(
        self, client: TestClient, test_user: User
    ):
        """测试获取当前用户返回正确的用户信息"""
        # 先登录获取 Token
        login_data = {
            "username": "testuser",
            "password": "TestPassword123",
        }
        login_response = client.post("/api/v1/auth/login", json=login_data)
        tokens = login_response.json()["tokens"]
        access_token = tokens["access_token"]

        # 使用 Token 获取当前用户
        headers = {"Authorization": f"Bearer {access_token}"}
        response = client.get("/api/v1/auth/me", headers=headers)

        data = response.json()
        assert data["id"] == test_user.id
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert data["is_active"] is True

    def test_get_current_user_without_token_returns_401(self, client: TestClient):
        """测试未提供 Token 返回 401 Unauthorized"""
        response = client.get("/api/v1/auth/me")

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_get_current_user_with_invalid_token_returns_401(self, client: TestClient):
        """测试使用无效 Token 返回 401 Unauthorized"""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_get_current_user_with_malformed_token_returns_401(
        self, client: TestClient
    ):
        """测试使用格式错误的 Token 返回 401 Unauthorized"""
        headers = {"Authorization": "Bearer not-a-valid-jwt"}
        response = client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401

    def test_get_current_user_with_empty_token_returns_401(self, client: TestClient):
        """测试使用空 Token 返回 401 Unauthorized"""
        headers = {"Authorization": "Bearer "}
        response = client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401


# ==================== 完整认证流程测试 ====================


class TestAuthFlow:
    """认证流程端到端测试套件"""

    def test_complete_auth_flow_register_login_get_user(self, client: TestClient):
        """测试完整认证流程：注册 → 登录 → 获取用户信息"""
        # Step 1: 注册新用户
        register_data = {
            "username": "flowuser",
            "email": "flow@example.com",
            "password": "FlowPassword123",
        }
        register_response = client.post("/api/v1/auth/register", json=register_data)

        assert register_response.status_code == 201
        register_data_response = register_response.json()
        assert register_data_response["user"]["username"] == "flowuser"
        assert "tokens" in register_data_response

        # Step 2: 使用新用户登录
        login_data = {
            "username": "flowuser",
            "password": "FlowPassword123",
        }
        login_response = client.post("/api/v1/auth/login", json=login_data)

        assert login_response.status_code == 200
        login_data_response = login_response.json()
        assert login_data_response["user"]["username"] == "flowuser"
        assert "tokens" in login_data_response

        access_token = login_data_response["tokens"]["access_token"]

        # Step 3: 使用 Token 获取当前用户信息
        headers = {"Authorization": f"Bearer {access_token}"}
        me_response = client.get("/api/v1/auth/me", headers=headers)

        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["username"] == "flowuser"
        assert me_data["email"] == "flow@example.com"
        assert me_data["is_active"] is True

    def test_auth_flow_tokens_are_unique_per_login(
        self, client: TestClient, test_user: User
    ):
        """测试每次登录生成不同的 Token"""
        # 第一次登录
        login_data = {
            "username": "testuser",
            "password": "TestPassword123",
        }
        first_login_response = client.post("/api/v1/auth/login", json=login_data)
        first_token = first_login_response.json()["tokens"]["access_token"]

        # 第二次登录
        second_login_response = client.post("/api/v1/auth/login", json=login_data)
        second_token = second_login_response.json()["tokens"]["access_token"]

        # Token 应该不同
        assert first_token != second_token

    def test_auth_flow_register_and_login_tokens_match(self, client: TestClient):
        """测试注册后直接使用返回的 Token"""
        # 注册并获取 Token
        register_data = {
            "username": "tokenuser",
            "email": "token@example.com",
            "password": "TokenPassword123",
        }
        register_response = client.post("/api/v1/auth/register", json=register_data)
        register_token = register_response.json()["tokens"]["access_token"]

        # 使用注册返回的 Token 获取用户信息
        headers = {"Authorization": f"Bearer {register_token}"}
        me_response = client.get("/api/v1/auth/me", headers=headers)

        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["username"] == "tokenuser"

    def test_auth_flow_username_case_sensitive(self, client: TestClient):
        """测试用户名区分大小写"""
        # 注册小写用户名
        register_data = {
            "username": "caseuser",
            "email": "case@example.com",
            "password": "CasePassword123",
        }
        client.post("/api/v1/auth/register", json=register_data)

        # 使用大写用户名登录应该失败
        login_data = {
            "username": "CaseUser",  # 不同大小写
            "password": "CasePassword123",
        }
        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401

    def test_auth_flow_email_case_insensitive(self, client: TestClient):
        """测试邮箱不区分大小写"""
        # 注册小写邮箱
        register_data = {
            "username": "emailuser",
            "email": "email@example.com",
            "password": "EmailPassword123",
        }
        client.post("/api/v1/auth/register", json=register_data)

        # 使用大写邮箱登录应该成功
        login_data = {
            "email": "EMAIL@EXAMPLE.COM",  # 大写邮箱
            "password": "EmailPassword123",
        }
        response = client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 200
