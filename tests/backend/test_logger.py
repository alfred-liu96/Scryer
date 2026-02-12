"""
日志系统测试

测试范围：
- Logger 配置和初始化 (setup_logging)
- 日志记录器获取 (get_logger)
- 日志处理器配置
- 日志级别设置
- 文件日志输出

契约来源：Issue #46 蓝图 - logger.py 模块
"""

import logging
from pathlib import Path
from unittest.mock import patch

import pytest

from src.backend.app.core.logger import get_logger, setup_logging


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
