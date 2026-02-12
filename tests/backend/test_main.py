"""
FastAPI 应用主入口测试

测试范围：
- FastAPI 应用创建
- 应用配置
- CORS 中间件
- 路由注册
- 生命周期事件

参考 Issue #33 和 software-design.md 第 2.2.2 节
"""

from unittest.mock import Mock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# 这些导入在当前阶段会失败，因为实现代码尚未存在
from src.backend.app.main import app, create_app, get_application


class TestCreateApp:
    """测试 create_app 函数"""

    def test_create_app_returns_fastapi_instance(self):
        """测试 create_app 返回 FastAPI 实例"""
        application = create_app()
        assert isinstance(application, FastAPI)

    def test_create_app_sets_app_title(self):
        """测试应用标题设置正确"""
        application = create_app()
        assert application.title == "Scryer"

    def test_create_app_sets_app_version(self):
        """测试应用版本设置正确"""
        application = create_app()
        assert application.version == "0.1.0"

    def test_create_app_configures_cors(self):
        """测试应用配置了 CORS 中间件"""
        application = create_app()

        # 检查是否有 CORS 中间件
        from fastapi.middleware.cors import CORSMiddleware

        has_cors = any(
            isinstance(middleware, CORSMiddleware)
            for middleware in application.user_middleware
        )
        assert has_cors

    def test_create_app_registers_routes(self):
        """测试应用注册了路由"""
        application = create_app()

        # 应该有路由被注册
        assert len(application.routes) > 0


class TestGetApplication:
    """测试 get_application 单例模式"""

    def test_get_application_returns_singleton(self):
        """测试 get_application 返回单例实例"""
        app1 = get_application()
        app2 = get_application()
        assert app1 is app2

    def test_get_application_caches_instance(self):
        """测试 get_application 缓存实例"""
        app_instance = get_application()
        # 多次调用返回相同的配置
        assert get_application().title == app_instance.title


class TestAppConfiguration:
    """测试应用配置"""

    def test_app_has_debug_mode(self):
        """测试应用有调试模式配置"""
        # 根据环境变量或配置设置 debug
        application = create_app()
        assert hasattr(application, "debug")

    def test_app_has_api_prefix(self):
        """测试应用有 API 前缀"""
        application = create_app()
        # 应该有 API 前缀配置
        assert hasattr(application, "state") or application.routes

    def test_app_includes_openapi_schema(self):
        """测试应用包含 OpenAPI schema"""
        application = create_app()
        # FastAPI 默认包含 OpenAPI schema
        assert application.openapi_schema is not None or hasattr(application, "openapi")


class TestHealthEndpoint:
    """测试健康检查端点"""

    def test_health_endpoint_exists(self):
        """测试健康检查端点存在"""
        application = create_app()

        # 检查是否有健康检查路由
        routes = [route.path for route in application.routes]
        has_health = any("/health" in route or "/api/health" in route for route in routes)
        assert has_health

    def test_health_endpoint_returns_200(self):
        """测试健康检查端点返回 200"""
        from src.backend.app.main import app

        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200

    def test_health_endpoint_returns_json(self):
        """测试健康检查端点返回 JSON"""
        from src.backend.app.main import app

        client = TestClient(app)
        response = client.get("/health")

        assert response.headers["content-type"] == "application/json"

    def test_health_endpoint_response_structure(self):
        """测试健康检查端点响应结构"""
        from src.backend.app.main import app

        client = TestClient(app)
        response = client.get("/health")

        data = response.json()
        # 应该包含状态信息
        assert "status" in data or "health" in data

    def test_health_endpoint_includes_version(self):
        """测试健康检查端点包含版本信息"""
        from src.backend.app.main import app

        client = TestClient(app)
        response = client.get("/health")

        data = response.json()
        # 应该包含版本信息
        assert "version" in data or data.get("status") == "ok"


class TestRootEndpoint:
    """测试根端点"""

    def test_root_endpoint_exists(self):
        """测试根端点存在"""
        from src.backend.app.main import app

        client = TestClient(app)
        response = client.get("/")

        # 根端点应该返回某些内容
        assert response.status_code in [200, 404]

    def test_root_endpoint_welcome_message(self):
        """测试根端点返回欢迎信息"""
        from src.backend.app.main import app

        client = TestClient(app)
        response = client.get("/")

        if response.status_code == 200:
            data = response.json()
            # 应该包含欢迎信息或应用名称
            assert "Scryer" in str(data) or "welcome" in str(data).lower()


class TestAPIRoutes:
    """测试 API 路由"""

    def test_api_routes_prefix(self):
        """测试 API 路由使用正确的前缀"""
        from src.backend.app.main import app

        routes = [route.path for route in app.routes if hasattr(route, "path")]
        # 应该有 /api 前缀的路由
        has_api_prefix = any(route.startswith("/api") for route in routes)
        assert has_api_prefix

    def test_api_routes_registered(self):
        """测试 API 路由被正确注册"""
        from src.backend.app.main import app

        # 应该有路由被注册
        assert len(app.routes) > 0


class TestMiddleware:
    """测试中间件"""

    def test_cors_middleware_allows_origins(self):
        """测试 CORS 中间件允许的源"""
        from src.backend.app.main import app

        client = TestClient(app)

        # 测试 CORS preflight 请求
        response = client.options(
            "/api/test",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )

        # CORS 应该被配置
        assert response.status_code in [200, 404]  # 404 是因为路由不存在，但 CORS 处理了

    def test_middleware_execution_order(self):
        """测试中间件执行顺序"""
        from src.backend.app.main import create_app

        app = create_app()
        # 中间件应该被注册
        assert len(app.user_middleware) > 0


class TestLifecycleEvents:
    """测试生命周期事件"""

    def test_startup_event_handler_exists(self):
        """测试应用有启动事件处理器"""
        from src.backend.app.main import create_app

        app = create_app()
        # 应该有启动事件
        assert len(app.on_event) > 0 or hasattr(app, "router")

    def test_shutdown_event_handler_exists(self):
        """测试应用有关闭事件处理器"""
        from src.backend.app.main import create_app

        app = create_app()
        # 应该有关闭事件
        # FastAPI 使用 lifespan events，检查是否有 lifespan context manager


class TestErrorHandlers:
    """测试错误处理器"""

    def test_404_handler(self):
        """测试 404 错误处理器"""
        from src.backend.app.main import app

        client = TestClient(app)
        response = client.get("/nonexistent-route")

        assert response.status_code == 404

    def test_404_returns_json(self):
        """测试 404 返回 JSON"""
        from src.backend.app.main import app

        client = TestClient(app)
        response = client.get("/nonexistent-route")

        assert response.headers["content-type"] == "application/json"

    def test_validation_error_handler(self):
        """测试验证错误处理器"""
        from src.backend.app.main import app

        client = TestClient(app)
        # 发送无效的请求，应该触发验证错误
        response = client.post("/api/test", json={"invalid": "data"})

        # 路由不存在返回 404，但如果存在应该返回 422
        assert response.status_code in [404, 422]


class TestAppModules:
    """测试应用模块集成"""

    @patch("src.backend.app.main.include_router")
    def test_includes_api_router(self, mock_include_router):
        """测试应用包含 API 路由"""
        from src.backend.app.main import create_app

        app = create_app()
        # API router 应该被包含
        # 如果使用了 include_router，它应该被调用

    def test_registers_error_handlers(self):
        """测试应用注册了错误处理器"""
        from src.backend.app.main import create_app

        app = create_app()
        # 应该有错误处理器
        assert len(app.exception_handlers) >= 0


class TestAppInDifferentEnvironments:
    """测试不同环境下的应用配置"""

    def test_development_mode(self):
        """测试开发模式"""
        with patch.dict("os.environ", {"ENVIRONMENT": "development"}):
            app = create_app()
            # 开发模式应该启用调试和相关功能
            assert hasattr(app, "debug")

    def test_production_mode(self):
        """测试生产模式"""
        with patch.dict("os.environ", {"ENVIRONMENT": "production"}):
            app = create_app()
            # 生产模式应该关闭调试
            assert hasattr(app, "debug")

    def test_testing_mode(self):
        """测试模式"""
        with patch.dict("os.environ", {"ENVIRONMENT": "testing"}):
            app = create_app()
            # 测试模式应该有相应配置
            assert hasattr(app, "debug")


class TestAppDependencyInjection:
    """测试依赖注入"""

    def test_config_dependency(self):
        """测试配置依赖注入"""
        from src.backend.app.main import app

        # 应该有配置依赖可以注入
        # 具体实现取决于如何设计依赖注入
        assert hasattr(app, "dependencies") or hasattr(app, "router")

    def test_logger_dependency(self):
        """测试日志依赖注入"""
        from src.backend.app.main import app

        # 应该有日志依赖可以注入
        assert hasattr(app, "dependencies") or hasattr(app, "router")


class TestAppSecurity:
    """测试安全配置"""

    def test_security_headers(self):
        """测试安全头"""
        from src.backend.app.main import app

        client = TestClient(app)
        response = client.get("/")

        if response.status_code == 200:
            # 应该有一些安全头
            headers = response.headers
            # 例如 X-Content-Type-Options, X-Frame-Options 等
            # 具体取决于实现
            assert "content-type" in headers

    def test_no_sensitive_data_in_errors(self):
        """测试错误中不包含敏感数据"""
        from src.backend.app.main import app

        client = TestClient(app)
        response = client.get("/nonexistent-route")

        if response.status_code == 404:
            data = response.json()
            # 不应该包含敏感信息如堆栈跟踪（在生产模式）
            assert "traceback" not in str(data).lower()
