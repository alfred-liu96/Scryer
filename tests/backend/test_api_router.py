"""
API 路由测试

测试范围：
- api_router 实例
- 健康检查端点 /api/health (Issue #46 要求)
- 测试端点 /api/test
- 响应格式验证
- 路由注册验证
- OpenAPI 文档

契约来源：Issue #46 蓝图 - api/router.py 模块
"""

from unittest.mock import patch

from fastapi.testclient import TestClient

from src.backend.app.api.router import api_router
from src.backend.app.main import app
from src.backend.app.schemas.health import ComponentStatus


class TestAPIRouter:
    """测试 api_router 基本配置"""

    def test_api_router_exists(self):
        """测试 api_router 存在"""
        assert api_router is not None

    def test_api_router_is_router(self):
        """测试 api_router 是 FastAPI 路由器"""
        from fastapi import APIRouter

        assert isinstance(api_router, APIRouter)


class TestHealthEndpoint:
    """测试 /api/health 端点 (Issue #46 要求)"""

    def test_returns_200(self):
        """测试返回 200 状态码"""
        client = TestClient(app)
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_returns_json(self):
        """测试返回 JSON 格式"""
        client = TestClient(app)
        response = client.get("/api/health")
        assert response.headers["content-type"] == "application/json"

    def test_response_has_status_field(self):
        """测试响应包含 status 字段"""
        client = TestClient(app)
        response = client.get("/api/health")
        data = response.json()
        assert "status" in data

    @patch("src.backend.app.api.router.check_database")
    @patch("src.backend.app.api.router.check_redis")
    def test_status_value_is_healthy(self, mock_redis, mock_db):
        """测试 status 值为 healthy"""
        # 模拟健康的组件状态
        mock_db.return_value = ComponentStatus(
            status="healthy", latency_ms=10, error=None
        )
        mock_redis.return_value = ComponentStatus(
            status="healthy", latency_ms=5, error=None
        )

        client = TestClient(app)
        response = client.get("/api/health")
        data = response.json()
        assert data["status"] == "healthy"

    def test_no_auth_required(self):
        """测试不需要认证"""
        client = TestClient(app)
        # 不提供任何认证头
        response = client.get("/api/health")
        assert response.status_code == 200


class TestTestEndpoint:
    """测试 /api/test 端点"""

    def test_returns_200(self):
        """测试返回 200"""
        client = TestClient(app)
        response = client.get("/api/test")
        assert response.status_code == 200

    def test_returns_json(self):
        """测试返回 JSON"""
        client = TestClient(app)
        response = client.get("/api/test")
        assert response.headers["content-type"] == "application/json"

    def test_response_has_message(self):
        """测试响应包含 message"""
        client = TestClient(app)
        response = client.get("/api/test")
        data = response.json()
        assert "message" in data

    def test_message_value(self):
        """测试 message 值正确"""
        client = TestClient(app)
        response = client.get("/api/test")
        data = response.json()
        assert data["message"] == "API is working"


class TestRouteRegistration:
    """测试路由注册"""

    def test_api_router_has_health_route(self):
        """测试 api_router 包含健康检查路由"""
        routes = [route.path for route in api_router.routes if hasattr(route, "path")]
        assert "/health" in routes

    def test_api_router_has_test_route(self):
        """测试 api_router 包含测试路由"""
        routes = [route.path for route in api_router.routes if hasattr(route, "path")]
        assert "/test" in routes

    def test_app_has_api_prefix_routes(self):
        """测试主应用包含 /api 前缀的路由"""
        routes = [route.path for route in app.routes if hasattr(route, "path")]
        has_api_routes = any(r.startswith("/api") for r in routes)
        assert has_api_routes

    def test_api_health_route_exists(self):
        """测试 /api/health 路由存在"""
        routes = [route.path for route in app.routes if hasattr(route, "path")]
        assert "/api/health" in routes

    def test_api_test_route_exists(self):
        """测试 /api/test 路由存在"""
        routes = [route.path for route in app.routes if hasattr(route, "path")]
        assert "/api/test" in routes


class TestOpenAPIDocumentation:
    """测试 OpenAPI 文档"""

    def test_openapi_schema_exists(self):
        """测试 OpenAPI schema 存在"""
        schema = app.openapi()
        assert schema is not None

    def test_openapi_has_paths(self):
        """测试 OpenAPI 包含路径"""
        schema = app.openapi()
        assert "paths" in schema

    def test_openapi_has_health_endpoint(self):
        """测试 OpenAPI 包含健康检查端点"""
        schema = app.openapi()
        paths = schema.get("paths", {})
        # 可能是 /health 或 /api/health
        has_health = "/health" in paths or "/api/health" in paths
        assert has_health

    def test_swagger_ui_accessible(self):
        """测试 Swagger UI 可访问"""
        client = TestClient(app)
        response = client.get("/docs")
        assert response.status_code == 200

    def test_redoc_accessible(self):
        """测试 ReDoc 可访问"""
        client = TestClient(app)
        response = client.get("/redoc")
        assert response.status_code == 200


class TestErrorHandling:
    """测试错误处理"""

    def test_404_returns_json(self):
        """测试 404 返回 JSON"""
        client = TestClient(app)
        response = client.get("/api/nonexistent")
        assert response.headers["content-type"] == "application/json"

    def test_404_status_code(self):
        """测试 404 状态码"""
        client = TestClient(app)
        response = client.get("/api/nonexistent")
        assert response.status_code == 404

    def test_405_method_not_allowed(self):
        """测试不支持的方法"""
        client = TestClient(app)
        # /api/health 只支持 GET
        response = client.post("/api/health")
        assert response.status_code == 405


class TestResponseFormat:
    """测试响应格式"""

    def test_health_response_format(self):
        """测试健康检查响应格式"""
        client = TestClient(app)
        response = client.get("/api/health")
        data = response.json()
        # 应该是字典类型
        assert isinstance(data, dict)

    def test_test_response_format(self):
        """测试测试端点响应格式"""
        client = TestClient(app)
        response = client.get("/api/test")
        data = response.json()
        # 应该是字典类型
        assert isinstance(data, dict)
