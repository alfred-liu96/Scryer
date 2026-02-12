"""
配置管理系统测试

测试范围：
- Settings 类的加载和验证
- 环境变量的读取
- 默认值设置
- 配置验证逻辑

参考 Issue #33 和 software-design.md 第 2.2.2 节
"""

import os
from pathlib import Path

import pytest
from pydantic import ValidationError

# 这些导入在当前阶段会失败，因为实现代码尚未存在
# 这正是 TDD 的 "Red First" 原则
from backend.app.core.config import Settings, get_settings


class TestSettingsModel:
    """测试 Settings 模型的基础功能"""

    def test_settings_with_default_values(self):
        """测试使用默认值创建 Settings"""
        # 确保环境变量未设置
        env_vars = ["APP_NAME", "APP_VERSION", "DEBUG", "API_PREFIX"]
        for var in env_vars:
            if var in os.environ:
                del os.environ[var]

        settings = Settings()

        # 验证默认值
        assert settings.app_name == "Scryer"
        assert settings.app_version == "0.1.0"
        assert settings.debug is False
        assert settings.api_prefix == "/api"

    def test_settings_from_environment_variables(self):
        """测试从环境变量加载配置"""
        # 设置环境变量
        os.environ["APP_NAME"] = "TestApp"
        os.environ["APP_VERSION"] = "1.0.0"
        os.environ["DEBUG"] = "true"
        os.environ["API_PREFIX"] = "/v1/api"

        settings = Settings()

        # 验证环境变量被正确加载
        assert settings.app_name == "TestApp"
        assert settings.app_version == "1.0.0"
        assert settings.debug is True
        assert settings.api_prefix == "/v1/api"

        # 清理环境变量
        del os.environ["APP_NAME"]
        del os.environ["APP_VERSION"]
        del os.environ["DEBUG"]
        del os.environ["API_PREFIX"]

    def test_settings_database_url_validation(self):
        """测试数据库 URL 验证"""
        # 测试有效的数据库 URL
        valid_url = "postgresql://user:password@localhost:5432/scryer"
        settings = Settings(database_url=valid_url)
        assert settings.database_url == valid_url

    def test_settings_redis_url_validation(self):
        """测试 Redis URL 验证"""
        # 测试有效的 Redis URL
        valid_url = "redis://localhost:6379/0"
        settings = Settings(redis_url=valid_url)
        assert settings.redis_url == valid_url

    def test_settings_invalid_secret_key_raises_error(self):
        """测试无效的 SECRET_KEY 应该抛出验证错误"""
        # SECRET_KEY 必须至少 32 个字符
        with pytest.raises(ValidationError) as exc_info:
            Settings(secret_key="short")

        # 验证错误信息包含最少长度要求
        assert "at least 32 characters" in str(exc_info.value).lower() or "min_length" in str(exc_info.value).lower()

    def test_settings_valid_secret_key(self):
        """测试有效的 SECRET_KEY"""
        valid_key = "a" * 32  # 32 字符的密钥
        settings = Settings(secret_key=valid_key)
        assert settings.secret_key == valid_key

    def test_settings_cors_origins_default(self):
        """测试 CORS 源的默认值"""
        settings = Settings()
        # 默认应该只允许 localhost
        assert "http://localhost:3000" in settings.cors_origins or settings.cors_origins == []

    def test_settings_cors_origins_custom(self):
        """测试自定义 CORS 源"""
        custom_origins = ["http://example.com", "https://example.com"]
        settings = Settings(cors_origins=custom_origins)
        assert settings.cors_origins == custom_origins


class TestGetSettings:
    """测试 get_settings 单例模式"""

    def test_get_settings_returns_singleton(self):
        """测试 get_settings 返回单例实例"""
        settings1 = get_settings()
        settings2 = get_settings()

        # 应该返回同一个实例
        assert settings1 is settings2

    def test_get_settings_caches_instance(self):
        """测试 get_settings 缓存实例"""
        settings = get_settings()

        # 多次调用应该返回相同的属性值
        assert get_settings().app_name == settings.app_name
        assert get_settings().app_version == settings.app_version


class TestSettingsEnvironment:
    """测试不同环境下的配置"""

    def test_development_environment(self):
        """测试开发环境配置"""
        os.environ["ENVIRONMENT"] = "development"

        settings = Settings()

        # 开发环境应该启用调试
        assert settings.environment == "development"
        assert settings.debug is True  # 假设开发环境自动启用 debug

        del os.environ["ENVIRONMENT"]

    def test_production_environment(self):
        """测试生产环境配置"""
        os.environ["ENVIRONMENT"] = "production"

        settings = Settings()

        # 生产环境应该关闭调试
        assert settings.environment == "production"
        assert settings.debug is False

        del os.environ["ENVIRONMENT"]

    def test_testing_environment(self):
        """测试环境配置"""
        os.environ["ENVIRONMENT"] = "testing"

        settings = Settings()

        assert settings.environment == "testing"
        assert settings.debug is True  # 测试环境通常启用 debug

        del os.environ["ENVIRONMENT"]


class TestSettingsValidation:
    """测试配置验证逻辑"""

    def test_invalid_port_number_raises_error(self):
        """测试无效的端口号"""
        with pytest.raises(ValidationError):
            Settings(port=99999)  # 超出有效端口范围

    def test_negative_port_number_raises_error(self):
        """测试负端口号"""
        with pytest.raises(ValidationError):
            Settings(port=-1)

    def test_valid_port_number(self):
        """测试有效的端口号"""
        settings = Settings(port=8080)
        assert settings.port == 8080

    def test_invalid_log_level_raises_error(self):
        """测试无效的日志级别"""
        with pytest.raises(ValidationError):
            Settings(log_level="INVALID")

    def test_valid_log_levels(self):
        """测试有效的日志级别"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        for level in valid_levels:
            settings = Settings(log_level=level)
            assert settings.log_level == level


class TestSettingsPaths:
    """测试路径相关配置"""

    def test_base_dir_is_absolute_path(self):
        """测试 BASE_DIR 是绝对路径"""
        settings = Settings()
        assert Path(settings.base_dir).is_absolute()

    def test_static_files_dir_exists(self):
        """测试静态文件目录配置"""
        settings = Settings()
        # 应该有一个静态文件目录配置
        assert hasattr(settings, "static_dir") or hasattr(settings, "static_files_dir")

    def test_templates_dir_config(self):
        """测试模板目录配置"""
        settings = Settings()
        # 应该有一个模板目录配置
        assert hasattr(settings, "templates_dir")
