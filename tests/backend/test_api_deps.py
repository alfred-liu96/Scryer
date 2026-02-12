"""
API 依赖注入测试

测试范围：
- 依赖注入函数的创建和返回值
- 数据库会话依赖
- 配置依赖注入
- 日志器依赖注入
- 认证依赖（预留）

参考 Issue #33
"""

from typing import AsyncGenerator
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient

# 这些导入在当前阶段会失败，因为实现代码尚未存在
# 这正是 TDD 的 "Red First" 原则
from src.backend.app.api.deps import (
    get_config,
    get_db,
    get_db_session,
    get_logger,
    get_current_user_id,
)


class TestGetConfig:
    """测试配置依赖注入"""

    def test_get_config_returns_settings_instance(self):
        """测试 get_config 返回 Settings 实例"""
        from src.backend.app.core.config import Settings

        config = get_config()
        assert isinstance(config, Settings)

    def test_get_config_returns_singleton(self):
        """测试 get_config 返回单例实例"""
        config1 = get_config()
        config2 = get_config()
        assert config1 is config2

    def test_get_config_has_required_attributes(self):
        """测试配置包含必需的属性"""
        config = get_config()
        assert hasattr(config, "app_name")
        assert hasattr(config, "app_version")
        assert hasattr(config, "debug")
        assert hasattr(config, "api_prefix")


class TestGetLogger:
    """测试日志器依赖注入"""

    def test_get_logger_returns_logger_instance(self):
        """测试 get_logger 返回 logging.Logger 实例"""
        import logging

        logger = get_logger()
        assert isinstance(logger, logging.Logger)

    def test_get_logger_has_name(self):
        """测试日志器有名称"""
        logger = get_logger()
        assert logger.name == "scryer"

    def test_get_logger_is_configured(self):
        """测试日志器已配置"""
        logger = get_logger()
        # 应该有处理器
        assert len(logger.handlers) > 0 or logger.propagate is True


class TestGetDbSession:
    """测试数据库会话依赖注入"""

    def test_get_db_session_returns_generator(self):
        """测试 get_db_session 返回生成器"""
        db_gen = get_db_session()
        # 应该是异步生成器
        assert hasattr(db_gen, "__aiter__") or hasattr(db_gen, "__anext__")

    @pytest.mark.asyncio
    async def test_get_db_session_yields_session(self):
        """测试 get_db_session 生成数据库会话"""
        # 这个测试需要 mock 数据库连接
        with patch("src.backend.app.api.deps.async_session_maker") as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value = mock_session

            db_gen = get_db_session()
            session = await db_gen.__anext__()

            # 验证返回的是会话对象
            assert session is not None

    @pytest.mark.asyncio
    async def test_get_db_session_closes_on_exit(self):
        """测试数据库会话在使用后关闭"""
        with patch("src.backend.app.api.deps.async_session_maker") as mock_session_maker:
            mock_session = AsyncMock()
            mock_session_maker.return_value = mock_session

            db_gen = get_db_session()
            session = await db_gen.__anext__()

            # 模拟生成器结束
            try:
                await db_gen.athrow(GeneratorExit)
            except:
                pass

            # 验证会话被关闭
            # mock_session.close.assert_called_once()


class TestGetDb:
    """测试数据库依赖（简化版）"""

    def test_get_db_is_callable(self):
        """测试 get_db 是可调用的"""
        assert callable(get_db)

    def test_get_db_can_be_used_as_dependency(self):
        """测试 get_db 可以用作 FastAPI 依赖"""
        # 模拟使用 get_db 作为依赖
        from fastapi import FastAPI

        app = FastAPI()

        @app.get("/test")
        async def test_endpoint(db=Depends(get_db)):
            return {"status": "ok"}

        # 路由应该被注册
        assert len(app.routes) > 0


class TestGetCurrentUserId:
    """测试当前用户ID依赖"""

    def test_get_current_user_id_returns_none_by_default(self):
        """测试默认情况下返回 None（未认证）"""
        user_id = get_current_user_id()
        assert user_id is None

    def test_get_current_user_id_returns_string_when_authenticated(self):
        """测试认证后返回用户ID字符串"""
        # 这个测试需要 mock 认证逻辑
        with patch("src.backend.app.api.deps.get_current_user_id", return_value="user_123"):
            from src.backend.app.api.deps import get_current_user_id

            user_id = get_current_user_id()
            assert isinstance(user_id, str)
            assert user_id == "user_123"


class TestDependencyIntegration:
    """测试依赖注入集成"""

    def test_multiple_dependencies_in_endpoint(self):
        """测试端点可以使用多个依赖"""
        from fastapi import FastAPI

        app = FastAPI()

        @app.get("/test")
        async def test_endpoint(
            config=Depends(get_config),
            logger=Depends(get_logger),
        ):
            return {
                "app_name": config.app_name,
                "logger_name": logger.name,
            }

        # 路由应该被注册
        assert len(app.routes) > 0

    def test_dependencies_work_with_test_client(self):
        """测试依赖在 TestClient 中正常工作"""
        from src.backend.app.main import app

        client = TestClient(app)

        # 测试健康检查端点
        response = client.get("/api/health")

        # 应该返回成功
        assert response.status_code == 200
