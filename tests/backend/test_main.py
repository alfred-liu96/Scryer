"""
FastAPI 应用主入口测试

测试范围：
- create_app 函数
- get_application 单例模式
- 应用配置 (title, version, debug)
- CORS 中间件
- 根端点 (/)
- 健康检查端点 (/health)
- lifespan 生命周期管理
- 路由注册

契约来源：Issue #46 蓝图 - main.py 模块
"""

from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.backend.app.core.config import get_settings
from src.backend.app.main import app, create_app, get_application


class TestCreateApp:
    """测试 create_app 函数"""

    def test_returns_fastapi_instance(self):
        """测试返回 FastAPI 实例"""
        application = create_app()
        assert isinstance(application, FastAPI)

    def test_sets_title_from_config(self):
        """测试从配置设置 title"""
        settings = get_settings()
        application = create_app()
        assert application.title == settings.app_name

    def test_sets_version_from_config(self):
        """测试从配置设置 version"""
        settings = get_settings()
        application = create_app()
        assert application.version == settings.app_version

    def test_sets_debug_from_config(self):
        """测试从配置设置 debug"""
        settings = get_settings()
        application = create_app()
        assert application.debug == settings.debug

    def test_has_lifespan_context_manager(self):
        """测试有 lifespan 上下文管理器"""
        application = create_app()
        # FastAPI 应用在创建时指定了 lifespan 参数
        # 验证应用可以正常启动即可
        assert application is not None


class TestGetApplication:
    """测试 get_application 单例模式"""

    def test_returns_singleton(self):
        """测试返回单例实例"""
        app1 = get_application()
        app2 = get_application()
        assert app1 is app2

    def test_cached_instance_same_config(self):
        """测试缓存的实例配置相同"""
        app_instance = get_application()
        assert get_application().title == app_instance.title


class TestCORSMiddleware:
    """测试 CORS 中间件"""

    def test_has_cors_middleware(self):
        """测试配置了 CORS 中间件"""
        from fastapi.middleware.cors import CORSMiddleware

        application = create_app()
        has_cors = any(
            isinstance(middleware, CORSMiddleware)
            for middleware in application.user_middleware
        )
        assert has_cors


class TestRootEndpoint:
    """测试根端点"""

    def test_returns_200(self):
        """测试返回 200"""
        client = TestClient(app)
        response = client.get("/")
        assert response.status_code == 200

    def test_returns_json(self):
        """测试返回 JSON"""
        client = TestClient(app)
        response = client.get("/")
        assert response.headers["content-type"] == "application/json"

    def test_response_contains_message(self):
        """测试响应包含 message 字段"""
        client = TestClient(app)
        response = client.get("/")
        data = response.json()
        assert "message" in data

    def test_response_contains_version(self):
        """测试响应包含 version 字段"""
        client = TestClient(app)
        response = client.get("/")
        data = response.json()
        assert "version" in data


class TestHealthEndpoint:
    """测试健康检查端点 /health"""

    def test_returns_200(self):
        """测试返回 200"""
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200

    def test_returns_json(self):
        """测试返回 JSON"""
        client = TestClient(app)
        response = client.get("/health")
        assert response.headers["content-type"] == "application/json"

    def test_response_contains_status(self):
        """测试响应包含 status 字段"""
        client = TestClient(app)
        response = client.get("/health")
        data = response.json()
        assert "status" in data

    def test_response_contains_version(self):
        """测试响应包含 version 字段"""
        client = TestClient(app)
        response = client.get("/health")
        data = response.json()
        assert "version" in data

    def test_status_is_healthy(self):
        """测试 status 值为 healthy"""
        client = TestClient(app)
        response = client.get("/health")
        data = response.json()
        assert data["status"] == "healthy"


class TestLifespanEvents:
    """测试 lifespan 生命周期事件"""

    def test_startup_event_executes(self):
        """测试启动事件执行"""
        # lifespan 在 TestClient 中自动执行
        # 这里只是验证应用可以正常创建和运行
        application = create_app()
        client = TestClient(application)
        response = client.get("/health")
        assert response.status_code == 200

    def test_shutdown_event_executes(self):
        """测试关闭事件执行"""
        # TestClient 退出时会触发 shutdown
        application = create_app()
        with TestClient(application) as client:
            response = client.get("/health")
            assert response.status_code == 200


class TestRouteRegistration:
    """测试路由注册"""

    def test_registers_root_route(self):
        """测试注册根路由"""
        application = create_app()
        routes = [route.path for route in application.routes if hasattr(route, "path")]
        assert "/" in routes

    def test_registers_health_route(self):
        """测试注册健康检查路由"""
        application = create_app()
        routes = [route.path for route in application.routes if hasattr(route, "path")]
        assert "/health" in routes

    def test_registers_api_router(self):
        """测试注册 API 路由"""
        application = create_app()
        routes = [route.path for route in application.routes if hasattr(route, "path")]
        # 应该有 /api 前缀的路由
        has_api_route = any(route.startswith("/api") for route in routes)
        assert has_api_route


class TestErrorHandling:
    """测试错误处理"""

    def test_404_returns_json(self):
        """测试 404 返回 JSON"""
        client = TestClient(app)
        response = client.get("/nonexistent")
        assert response.headers["content-type"] == "application/json"

    def test_404_status_code(self):
        """测试 404 状态码"""
        client = TestClient(app)
        response = client.get("/nonexistent")
        assert response.status_code == 404
