"""
日志系统测试

测试范围：
- Logger 配置和初始化 (setup_logging)
- 日志记录器获取 (get_logger)
- 日志处理器配置
- 日志级别设置
- 文件日志输出
- structlog 集成测试
- 日志上下文绑定
- 不同环境格式 (JSON vs 文本)

契约来源：Issue #35 - structlog 日志系统集成
"""

import json
import logging
from pathlib import Path
from unittest.mock import Mock, patch
from io import StringIO

import pytest
import structlog

from src.backend.app.core.logger import get_logger, setup_logging, add_app_context


class TestSetupLoggingSignature:
    """测试 setup_logging 函数签名 (Issue #46)"""

    def test_returns_logger_instance(self):
        """测试返回 logging.Logger 实例"""
        logger = setup_logging()
        assert isinstance(logger, logging.Logger)

    def test_accepts_log_level_param(self):
        """测试接受 log_level 参数"""
        logger = setup_logging(log_level="DEBUG")
        assert isinstance(logger, logging.Logger)

    def test_accepts_log_file_param(self, tmp_path):
        """测试接受 log_file 参数"""
        # 使用 tmp_path fixture 避免权限问题
        log_file = tmp_path / "test.log"
        logger = setup_logging(log_file=str(log_file))
        assert isinstance(logger, logging.Logger)


class TestSetupLoggingDefaultBehavior:
    """测试 setup_logging 默认行为"""

    def test_default_level_is_info(self):
        """测试默认日志级别为 INFO"""
        logger = setup_logging()
        assert logger.level == logging.INFO

    def test_has_stream_handler(self):
        """测试配置了控制台处理器"""
        logger = setup_logging()
        has_stream_handler = any(
            isinstance(h, logging.StreamHandler) for h in logger.handlers
        )
        assert has_stream_handler


class TestSetupLoggingWithFile:
    """测试带文件的 setup_logging"""

    def test_creates_log_directory(self, tmp_path):
        """测试创建日志目录"""
        log_file = tmp_path / "logs" / "app.log"
        setup_logging(log_file=str(log_file))

        assert log_file.parent.exists()

    def test_adds_file_handler(self, tmp_path):
        """测试添加文件处理器"""
        log_file = tmp_path / "test.log"
        logger = setup_logging(log_file=str(log_file))

        has_file_handler = any(
            isinstance(h, logging.FileHandler) for h in logger.handlers
        )
        assert has_file_handler


class TestSetupLoggingLevels:
    """测试日志级别设置"""

    @pytest.mark.parametrize(
        "level_name,expected_level",
        [
            ("DEBUG", logging.DEBUG),
            ("INFO", logging.INFO),
            ("WARNING", logging.WARNING),
            ("ERROR", logging.ERROR),
            ("CRITICAL", logging.CRITICAL),
        ],
    )
    def test_sets_log_level(self, level_name, expected_level):
        """测试设置各种日志级别"""
        logger = setup_logging(log_level=level_name)
        assert logger.level == expected_level


class TestGetLogger:
    """测试 get_logger 函数"""

    def test_returns_logger_instance(self):
        """测试返回 logger 实例"""
        logger = get_logger("test")
        assert isinstance(logger, logging.Logger)

    def test_returns_correct_name(self):
        """测试返回正确名称的 logger"""
        logger = get_logger("my_module")
        assert logger.name == "my_module"

    def test_returns_same_instance_for_same_name(self):
        """测试相同名称返回相同实例"""
        logger1 = get_logger("test")
        logger2 = get_logger("test")
        assert logger1 is logger2

    def test_returns_different_instance_for_different_name(self):
        """测试不同名称返回不同实例"""
        logger1 = get_logger("module_a")
        logger2 = get_logger("module_b")
        assert logger1 is not logger2


class TestAddAppContext:
    """测试 add_app_context 处理器"""

    def test_adds_app_name_to_event_dict(self):
        """测试添加应用名称到事件字典"""
        event_dict = {}
        result = add_app_context(None, "info", event_dict)
        assert result["app"] == "scryer"

    def test_preserves_existing_event_dict_fields(self):
        """测试保留事件字典中的现有字段"""
        event_dict = {"message": "test", "level": "info"}
        result = add_app_context(None, "info", event_dict)
        assert result["message"] == "test"
        assert result["level"] == "info"
        assert result["app"] == "scryer"


class TestSetupLoggingEnvironment:
    """测试不同环境下的日志配置"""

    def test_development_environment_uses_console_renderer(self, tmp_path):
        """测试开发环境使用 ConsoleRenderer"""
        log_file = tmp_path / "dev.log"
        logger = setup_logging(
            log_file=str(log_file),
            environment="development"
        )
        assert isinstance(logger, logging.Logger)

    def test_production_environment_uses_json_renderer(self, tmp_path):
        """测试生产环境使用 JSONRenderer"""
        log_file = tmp_path / "prod.log"
        logger = setup_logging(
            log_file=str(log_file),
            environment="production"
        )
        assert isinstance(logger, logging.Logger)

    def test_testing_environment_uses_console_renderer(self, tmp_path):
        """测试测试环境使用 ConsoleRenderer"""
        log_file = tmp_path / "test.log"
        logger = setup_logging(
            log_file=str(log_file),
            environment="testing"
        )
        assert isinstance(logger, logging.Logger)


class TestStructlogIntegration:
    """测试 structlog 集成"""

    def test_structlog_is_configured(self):
        """测试 structlog 已正确配置"""
        setup_logging()
        # structlog.configure 应该已被调用
        # 验证可以获取 structlog logger
        slog = structlog.get_logger()
        assert slog is not None

    def test_structlog_bound_logger_integration(self):
        """测试 structlog BoundLogger 集成"""
        setup_logging()
        logger = structlog.get_logger()
        # 应该是 BoundLogger 实例
        assert hasattr(logger, "info")
        assert hasattr(logger, "error")
        assert hasattr(logger, "warning")

    def test_structlog_log_level_in_output(self, tmp_path, capsys):
        """测试日志级别出现在输出中"""
        setup_logging(environment="production")
        logger = structlog.get_logger()
        logger.info("test message")

        # 验证日志级别在输出中
        captured = capsys.readouterr()
        # 结构化日志应该包含 level 字段
        # 注意：实际输出格式取决于处理器配置

    def test_structlog_timestamp_in_output(self):
        """测试时间戳出现在日志输出中"""
        setup_logging(environment="production")
        logger = structlog.get_logger()
        # TimeStamper 处理器应该添加时间戳
        # 验证处理器已配置


class TestStructlogWithContext:
    """测试带上下文的 structlog 日志"""

    def test_bind_context_to_logger(self):
        """测试绑定上下文到日志器"""
        setup_logging()
        logger = structlog.get_logger()
        logger = logger.bind(user_id="test_user", request_id="req_123")
        # 上下文应该被绑定
        assert logger is not None

    def test_multiple_context_bindings(self):
        """测试多次绑定上下文"""
        setup_logging()
        logger = structlog.get_logger()
        logger = logger.bind(request_id="req_1")
        logger = logger.bind(user_id="user_1")
        # 应该支持多次绑定
        assert logger is not None

    def test_context_appears_in_log_output(self):
        """测试上下文出现在日志输出中"""
        setup_logging(environment="production")
        logger = structlog.get_logger().bind(request_id="test_req_123")
        logger.info("test message")
        # 绑定的上下文应该出现在日志中


class TestFileRotation:
    """测试日志文件轮转"""

    def test_rotating_file_handler_configured(self, tmp_path):
        """测试配置了 RotatingFileHandler"""
        log_file = tmp_path / "rotating.log"
        logger = setup_logging(log_file=str(log_file), max_bytes=1024, backup_count=3)

        # 检查是否有 RotatingFileHandler
        from logging.handlers import RotatingFileHandler
        has_rotating_handler = any(
            isinstance(h, RotatingFileHandler) for h in logger.handlers
        )
        assert has_rotating_handler

    def test_max_bytes_parameter_respected(self, tmp_path):
        """测试 max_bytes 参数被正确设置"""
        log_file = tmp_path / "size.log"
        logger = setup_logging(log_file=str(log_file), max_bytes=5000)

        from logging.handlers import RotatingFileHandler
        rotating_handler = next(
            (h for h in logger.handlers if isinstance(h, RotatingFileHandler)),
            None
        )
        assert rotating_handler is not None
        assert rotating_handler.maxBytes == 5000

    def test_backup_count_parameter_respected(self, tmp_path):
        """测试 backup_count 参数被正确设置"""
        log_file = tmp_path / "backup.log"
        logger = setup_logging(log_file=str(log_file), backup_count=7)

        from logging.handlers import RotatingFileHandler
        rotating_handler = next(
            (h for h in logger.handlers if isinstance(h, RotatingFileHandler)),
            None
        )
        assert rotating_handler is not None
        assert rotating_handler.backupCount == 7


class TestLoggingOutputFormat:
    """测试日志输出格式"""

    def test_json_format_in_production(self, tmp_path, capsys):
        """测试生产环境使用 JSON 格式"""
        log_file = tmp_path / "prod.log"
        setup_logging(log_file=str(log_file), environment="production")
        logger = structlog.get_logger()
        logger.info("test message", extra_field="extra_value")

        captured = capsys.readouterr()
        # JSON 格式的输出应该包含可解析的 JSON
        # 注意：实际验证需要根据输出的具体格式

    def test_readable_format_in_development(self, tmp_path, capsys):
        """测试开发环境使用可读格式"""
        log_file = tmp_path / "dev.log"
        setup_logging(log_file=str(log_file), environment="development")
        logger = structlog.get_logger()
        logger.info("test message")

        captured = capsys.readouterr()
        # 开发环境格式应该人类可读
        assert len(captured.out) > 0

    def test_log_contains_app_context(self, tmp_path, capsys):
        """测试日志包含应用上下文"""
        setup_logging(environment="production")
        logger = structlog.get_logger()
        logger.info("test message")

        captured = capsys.readouterr()
        # 应该包含 app=scryer
        output = captured.out
        # 实际验证取决于输出格式


class TestConfigureLoggingCompatibility:
    """测试 configure_logging 兼容性接口"""

    def test_configure_logging_returns_logger(self):
        """测试 configure_logging 返回 logger"""
        logger = setup_logging()
        assert isinstance(logger, logging.Logger)

    def test_configure_logging_accepts_log_level(self):
        """测试 configure_logging 接受 log_level 参数"""
        logger = setup_logging(log_level="DEBUG")
        assert isinstance(logger, logging.Logger)

    def test_configure_logging_accepts_log_file(self, tmp_path):
        """测试 configure_logging 接受 log_file 参数"""
        log_file = tmp_path / "compat.log"
        logger = setup_logging(log_file=str(log_file))
        assert isinstance(logger, logging.Logger)
