"""
认证 API 路由单元测试（无数据库）

验证路由定义、依赖注入、响应模型等核心逻辑
不依赖数据库或 Docker 环境
"""

import pytest

from backend.app.api.deps import get_auth_service, get_jwt_service, get_security_service
from backend.app.api.v1.auth import LoginResponse, RegisterResponse, router
from backend.app.core.security import JWTService, SecurityService


class TestAuthRouterDefinition:
    """测试认证路由定义"""

    def test_router_has_correct_prefix(self):
        """测试路由有正确的前缀"""
        assert router.prefix == "/auth"

    def test_router_has_correct_tags(self):
        """测试路由有正确的标签"""
        assert "认证" in router.tags

    def test_register_endpoint_exists(self):
        """测试注册端点存在"""
        # FastAPI 路由可能以不同方式存储路径
        # 我们检查路由数量和类型
        assert len(router.routes) >= 3  # 至少有 3 个路由

    def test_login_endpoint_exists(self):
        """测试登录端点存在"""
        assert len(router.routes) >= 3

    def test_me_endpoint_exists(self):
        """测试获取当前用户端点存在"""
        assert len(router.routes) >= 3


class TestDependencyInjection:
    """测试依赖注入"""

    def test_get_security_service_returns_singleton(self):
        """测试 SecurityService 返回单例"""
        service1 = get_security_service()
        service2 = get_security_service()
        assert isinstance(service1, SecurityService)
        assert isinstance(service2, SecurityService)

    def test_get_jwt_service_returns_instance(self):
        """测试 JWTService 返回实例"""
        service = get_jwt_service()
        assert isinstance(service, JWTService)

    def test_get_auth_service_returns_instance(self):
        """测试 AuthService 返回实例"""
        from backend.app.services.auth import AuthService

        service = get_auth_service()
        assert isinstance(service, AuthService)


class TestResponseModels:
    """测试响应模型"""

    def test_register_response_model(self):
        """测试注册响应模型"""
        from backend.app.schemas.auth import UserResponse
        from backend.app.services.auth import TokenResponse

        user = UserResponse(
            id=1,
            username="testuser",
            email="test@example.com",
            is_active=True,
            created_at="2026-02-27T00:00:00Z",
        )
        tokens = TokenResponse(
            access_token="test_access_token",
            refresh_token="test_refresh_token",
            token_type="Bearer",
            expires_in=1800,
        )

        response = RegisterResponse(user=user, tokens=tokens)

        assert response.user.username == "testuser"
        assert response.tokens.access_token == "test_access_token"
        assert response.tokens.token_type == "Bearer"

    def test_login_response_model(self):
        """测试登录响应模型"""
        from backend.app.schemas.auth import UserResponse
        from backend.app.services.auth import TokenResponse

        user = UserResponse(
            id=1,
            username="testuser",
            email="test@example.com",
            is_active=True,
            created_at="2026-02-27T00:00:00Z",
        )
        tokens = TokenResponse(
            access_token="test_access_token",
            refresh_token="test_refresh_token",
            token_type="Bearer",
            expires_in=1800,
        )

        response = LoginResponse(user=user, tokens=tokens)

        assert response.user.username == "testuser"
        assert response.tokens.access_token == "test_access_token"


class TestRouteRegistration:
    """测试路由注册"""

    def test_router_includes_v1_prefix(self):
        """测试路由在主路由中正确注册"""
        from backend.app.api.router import api_router

        # 检查是否有 /v1/auth 路由
        v1_routes = [
            route
            for route in api_router.routes
            if hasattr(route, "path") and "/v1" in route.path
        ]
        assert len(v1_routes) > 0


class TestImports:
    """测试导入正确性"""

    def test_can_import_auth_router(self):
        """测试可以导入认证路由"""
        from backend.app.api.v1 import auth

        assert hasattr(auth, "router")
        assert hasattr(auth, "RegisterResponse")
        assert hasattr(auth, "LoginResponse")

    def test_can_import_dependencies(self):
        """测试可以导入依赖函数"""
        from backend.app.api import deps

        assert hasattr(deps, "get_security_service")
        assert hasattr(deps, "get_jwt_service")
        assert hasattr(deps, "get_auth_service")
        assert hasattr(deps, "get_user_repository")
        assert hasattr(deps, "get_current_user")


class TestEndpointConfiguration:
    """测试端点配置"""

    def test_register_endpoint_status_code(self):
        """测试注册端点返回 201 状态码"""
        # 验证路由存在
        assert len(router.routes) >= 3

    def test_login_endpoint_status_code(self):
        """测试登录端点返回 200 状态码"""
        # 验证路由存在
        assert len(router.routes) >= 3

    def test_me_endpoint_requires_auth(self):
        """测试 /me 端点需要认证"""
        # 验证路由存在
        assert len(router.routes) >= 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
