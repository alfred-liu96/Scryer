"""
Backend test fixtures and configuration

提供测试共享的 fixtures 和配置
"""

import os
import tempfile
from pathlib import Path
from unittest.mock import Mock

import pytest


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

    # 保存原始的 root logger 配置
    original_logger = logging.getLogger()

    yield

    # 清理所有 handlers
    root = logging.getLogger()
    for handler in root.handlers[:]:
        root.removeHandler(handler)
        handler.close()
