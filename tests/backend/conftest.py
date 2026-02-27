"""
Backend test fixtures and configuration

提供测试共享的 fixtures 和配置
"""

import os
import tempfile
from pathlib import Path
from unittest.mock import Mock

import pytest

# 在所有测试运行前设置必要的环境变量（至少 32 字符）
os.environ.setdefault("JWT_SECRET_KEY", "test_jwt_secret_key_with_32_characters!!")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7")


@pytest.fixture
def temp_log_file():
    """创建临时日志文件"""
    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".log") as f:
        log_file = f.name
    yield log_file
    # 清理
    try:
        os.unlink(log_file)
    except FileNotFoundError:
        pass


@pytest.fixture
def temp_log_dir():
    """创建临时日志目录"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def clean_env():
    """清理环境变量"""
    # 保存当前环境变量
    original_env = os.environ.copy()

    # 清理相关的环境变量
    env_vars_to_clean = [
        "APP_NAME",
        "APP_VERSION",
        "DEBUG",
        "API_PREFIX",
        "ENVIRONMENT",
        "DATABASE_URL",
        "REDIS_URL",
        "SECRET_KEY",
        "LOG_LEVEL",
        "JWT_SECRET_KEY",
        "JWT_ALGORITHM",
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
        "JWT_REFRESH_TOKEN_EXPIRE_DAYS",
    ]

    for var in env_vars_to_clean:
        if var in os.environ:
            del os.environ[var]

    yield

    # 恢复原始环境变量
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def mock_settings():
    """模拟配置对象"""
    settings = Mock()
    settings.app_name = "Scryer"
    settings.app_version = "0.1.0"
    settings.debug = True
    settings.api_prefix = "/api"
    settings.environment = "testing"
    settings.database_url = "postgresql://test:test@localhost:5432/test"
    settings.redis_url = "redis://localhost:6379/0"
    settings.secret_key = "a" * 32
    settings.log_level = "DEBUG"
    settings.port = 8000
    settings.cors_origins = ["http://localhost:3000"]
    settings.base_dir = "/tmp"
    settings.static_dir = "/tmp/static"
    settings.templates_dir = "/tmp/templates"
    # JWT 配置
    settings.jwt_secret_key = "test_jwt_secret_key_with_32_characters!!"
    settings.jwt_algorithm = "HS256"
    settings.jwt_access_token_expire_minutes = 30
    settings.jwt_access_token_expire_seconds = 1800
    settings.jwt_refresh_token_expire_days = 7
    return settings


@pytest.fixture
def test_config_values():
    """测试配置值"""
    return {
        "app_name": "TestApp",
        "app_version": "1.0.0",
        "debug": True,
        "environment": "testing",
        "api_prefix": "/api/v1",
        "database_url": "postgresql://user:pass@localhost:5432/testdb",
        "redis_url": "redis://localhost:6379/1",
        "secret_key": "test_secret_key_32_characters_long!",
        "log_level": "INFO",
        "port": 8080,
        "cors_origins": ["http://localhost:3000", "http://localhost:8000"],
    }


@pytest.fixture(autouse=True)
def reset_logging():
    """重置日志配置"""
    import logging

    yield

    # 清理所有 handlers
    root = logging.getLogger()
    for handler in root.handlers[:]:
        root.removeHandler(handler)
        handler.close()


# ==================== Redis 相关 Fixtures ====================


@pytest.fixture
def mock_redis_pool():
    """模拟 Redis 连接池"""
    from unittest.mock import AsyncMock, Mock

    mock_pool = Mock()
    mock_pool.acquire = AsyncMock()
    mock_pool.release = Mock()
    mock_pool.disconnect = AsyncMock()
    mock_pool.acquire.return_value = Mock()
    return mock_pool


@pytest.fixture
def mock_redis_client():
    """模拟 Redis 客户端

    返回一个工厂函数，每次调用创建新的 mock 实例
    """
    from unittest.mock import AsyncMock, Mock

    def create_mock_client():
        """创建新的 mock 客户端"""
        client = Mock()
        client.get = AsyncMock(return_value=None)
        client.set = AsyncMock(return_value=True)
        client.setex = AsyncMock(return_value=True)
        client.delete = AsyncMock(return_value=1)
        client.exists = AsyncMock(return_value=0)
        client.expire = AsyncMock(return_value=True)
        client.ttl = AsyncMock(return_value=-1)
        client.incrby = AsyncMock(return_value=1)
        client.decrby = AsyncMock(return_value=-1)
        client.mget = AsyncMock(return_value=[])
        client.mset = AsyncMock(return_value=True)
        client.ping = AsyncMock(return_value=True)
        client.keys = AsyncMock(return_value=[])
        client.scan_iter = Mock(return_value=iter([]))
        client.close = AsyncMock(return_value=None)
        client.aclose = AsyncMock(return_value=None)
        return client

    return create_mock_client


@pytest.fixture(autouse=True)
def reset_redis_globals():
    """自动重置 Redis 全局状态（每个测试前后）"""
    import sys

    # 测试前重置
    if "backend.app.core.redis" in sys.modules:
        redis_module = sys.modules["backend.app.core.redis"]
        redis_module._redis_pool = None
        redis_module._redis_manager = None

    if "backend.app.utils.decorators" in sys.modules:
        decorators_module = sys.modules["backend.app.utils.decorators"]
        decorators_module._cache_service = None

    yield

    # 测试后重置
    if "backend.app.core.redis" in sys.modules:
        redis_module = sys.modules["backend.app.core.redis"]
        redis_module._redis_pool = None
        redis_module._redis_manager = None

    if "backend.app.utils.decorators" in sys.modules:
        decorators_module = sys.modules["backend.app.utils.decorators"]
        decorators_module._cache_service = None


# 移除了 cache_service fixture，因为测试文件直接创建 mock 对象
# 这样可以避免导入路径混淆和状态污染问题


# ==================== Security 相关 Fixtures ====================


@pytest.fixture
def security_service():
    """创建 SecurityService 实例"""
    from backend.app.core.security import SecurityService

    return SecurityService()


@pytest.fixture
def jwt_service_factory():
    """创建 JWTService 工厂函数"""
    from backend.app.core.security import JWTService

    def create_jwt_service(
        jwt_secret: str = "test_jwt_secret_key_32_chars!",
        algorithm: str = "HS256",
        access_expire_minutes: int = 30,
        refresh_expire_days: int = 7,
    ):
        """创建自定义配置的 JWTService"""
        settings = Mock()
        settings.jwt_secret_key = jwt_secret
        settings.jwt_algorithm = algorithm
        settings.jwt_access_token_expire_minutes = access_expire_minutes
        settings.jwt_access_token_expire_seconds = access_expire_minutes * 60
        settings.jwt_refresh_token_expire_days = refresh_expire_days
        return JWTService(settings)

    return create_jwt_service


@pytest.fixture
def jwt_service(jwt_service_factory):
    """创建默认配置的 JWTService 实例"""
    return jwt_service_factory()


@pytest.fixture
def auth_service_factory(security_service, jwt_service):
    """创建 AuthService 工厂函数"""
    from backend.app.services.auth import AuthService

    def create_auth_service(access_expire_seconds: int = 1800):
        """创建自定义配置的 AuthService"""
        return AuthService(
            security_service=security_service,
            jwt_service=jwt_service,
            access_token_expire_seconds=access_expire_seconds,
        )

    return create_auth_service


@pytest.fixture
def auth_service(auth_service_factory):
    """创建默认配置的 AuthService 实例"""
    return auth_service_factory()
