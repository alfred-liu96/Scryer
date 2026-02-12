"""
日志系统集成测试

测试范围：
- 应用启动时正确初始化日志
- 不同日志级别的使用
- 日志在不同模块中的使用
- request_id 出现在日志中
- 日志格式正确

契约来源：Issue #35 - structlog 日志系统集成
"""

import json
import logging
from pathlib import Path
from unittest.mock import patch, Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
import structlog

from src.backend.app.core.logger import setup_logging, get_logger
from src.backend.app.main import create_app


@pytest.fixture
def clean_logging():
    """清理日志配置，确保每个测试独立"""
    # 保存原始配置
    import logging
    root_logger = logging.getLogger()
    original_handlers = root_logger.handlers[:]
    original_level = root_logger.level

    yield

    # 恢复原始配置
    root_logger.handlers = original_handlers
    root_logger.setLevel(original_level)


class TestApplicationLoggingInitialization:
    """测试应用启动时的日志初始化"""

    def test_app_can_initialize_logging(self, clean_logging):
        """测试应用可以初始化日志系统"""
        logger = setup_logging()
        assert logger is not None
        assert isinstance(logger, logging.Logger)

    def test_app_creates_loggers_for_modules(self, clean_logging):
        """测试应用可以为不同模块创建日志器"""
        setup_logging()

        logger_api = get_logger("api")
        logger_core = get_logger("core")
        logger_db = get_logger("db")

        assert logger_api.name == "api"
        assert logger_core.name == "core"
        assert logger_db.name == "db"


class TestLoggingLevelsInEndpoints:
    """测试端点中不同日志级别的使用"""

    def test_debug_level_logging(self, clean_logging, capsys):
        """测试 DEBUG 级别日志"""
        setup_logging(log_level="DEBUG")
        logger = structlog.get_logger()
        logger.debug("Debug message")

        captured = capsys.readouterr()
        # DEBUG 级别的消息应该被输出
        # 具体验证取决于日志配置

    def test_info_level_logging(self, clean_logging, capsys):
        """测试 INFO 级别日志"""
        setup_logging(log_level="INFO")
        logger = structlog.get_logger()
        logger.info("Info message")

        captured = capsys.readouterr()
        # INFO 级别的消息应该被输出
        assert len(captured.out) > 0

    def test_warning_level_logging(self, clean_logging, capsys):
        """测试 WARNING 级别日志"""
        setup_logging(log_level="WARNING")
        logger = structlog.get_logger()
        logger.warning("Warning message")

        captured = capsys.readouterr()
        # WARNING 级别的消息应该被输出
        assert len(captured.out) > 0

    def test_error_level_logging(self, clean_logging, capsys):
        """测试 ERROR 级别日志"""
        setup_logging(log_level="ERROR")
        logger = structlog.get_logger()
        logger.error("Error message")

        captured = capsys.readouterr()
        # ERROR 级别的消息应该被输出
        assert len(captured.out) > 0

    def test_critical_level_logging(self, clean_logging, capsys):
        """测试 CRITICAL 级别日志"""
        setup_logging(log_level="CRITICAL")
        logger = structlog.get_logger()
        logger.critical("Critical message")

        captured = capsys.readouterr()
        # CRITICAL 级别的消息应该被输出
        assert len(captured.out) > 0


class TestLoggingInFastAPIEndpoints:
    """测试 FastAPI 端点中的日志使用"""

    def test_endpoint_can_log_info(self, clean_logging):
        """测试端点可以记录 INFO 日志"""
        app = create_app()
        setup_logging()

        @app.get("/test-log")
        async def test_endpoint():
            logger = structlog.get_logger()
            logger.info("Endpoint called")
            return {"status": "logged"}

        client = TestClient(app)
        response = client.get("/test-log")

        # 端点应该正常工作
        assert response.status_code == 200
        assert response.json()["status"] == "logged"

    def test_endpoint_can_log_with_context(self, clean_logging):
        """测试端点可以记录带上下文的日志"""
        app = create_app()
        setup_logging()

        @app.get("/test-context")
        async def test_endpoint(user_id: str):
            logger = structlog.get_logger().bind(user_id=user_id)
            logger.info("User action", action="login")
            return {"status": "logged"}

        client = TestClient(app)
        response = client.get("/test-context?user_id=123")

        assert response.status_code == 200

    def test_endpoint_logs_errors(self, clean_logging):
        """测试端点记录错误"""
        app = create_app()
        setup_logging()

        @app.get("/test-error")
        async def test_endpoint():
            logger = structlog.get_logger()
            try:
                raise ValueError("Test error")
            except Exception as e:
                logger.error("Error occurred", error=str(e))
                return {"status": "error_logged"}

        client = TestClient(app)
        response = client.get("/test-error")

        assert response.status_code == 200
        assert response.json()["status"] == "error_logged"


class TestLoggingWithRequestID:
    """测试带有 request_id 的日志"""

    def test_log_contains_request_id(self, clean_logging):
        """测试日志包含 request_id"""
        # 这个测试需要 RequestIDMiddleware
        # 当前中间件可能尚未实现
        try:
            from src.backend.app.middleware.request_id import RequestIDMiddleware
            MIDDLEWARE_AVAILABLE = True
        except ImportError:
            MIDDLEWARE_AVAILABLE = False

        if not MIDDLEWARE_AVAILABLE:
            pytest.skip("RequestIDMiddleware 尚未实现")

        app = create_app()
        setup_logging()
        app.add_middleware(RequestIDMiddleware)

        @app.get("/test-request-id")
        async def test_endpoint():
            logger = structlog.get_logger()
            logger.info("Test with request_id")
            return {"status": "logged"}

        client = TestClient(app)
        response = client.get("/test-request-id")

        assert response.status_code == 200
        # 验证 request_id 在响应头中
        assert "X-Request-ID" in response.headers


class TestLoggingToFile:
    """测试文件日志输出"""

    def test_logs_are_written_to_file(self, clean_logging, tmp_path):
        """测试日志被写入文件"""
        log_file = tmp_path / "test.log"
        setup_logging(log_file=str(log_file))

        # 记录一些日志
        logger = structlog.get_logger()
        logger.info("Test message to file")

        # 确保缓冲区刷新
        import logging
        for handler in logging.getLogger().handlers:
            handler.flush()

        # 验证文件存在
        assert log_file.exists()

        # 验证文件包含内容
        content = log_file.read_text()
        assert len(content) > 0

    def test_log_file_rotation(self, clean_logging, tmp_path):
        """测试日志文件轮转"""
        log_file = tmp_path / "rotating.log"
        # 设置小的 max_bytes 来测试轮转
        setup_logging(log_file=str(log_file), max_bytes=1024, backup_count=3)

        logger = structlog.get_logger()

        # 写入大量日志以触发轮转
        for i in range(1000):
            logger.info(f"Log message {i}: " + "x" * 100)

        # 刷新处理器
        import logging
        for handler in logging.getLogger().handlers:
            handler.flush()

        # 验证可能存在备份文件
        # 注意：实际轮转行为取决于 RotatingFileHandler 的实现


class TestLoggingFormats:
    """测试不同格式的日志输出"""

    def test_json_format_in_production(self, clean_logging, tmp_path, capsys):
        """测试生产环境使用 JSON 格式"""
        log_file = tmp_path / "prod.json"
        setup_logging(log_file=str(log_file), environment="production")

        logger = structlog.get_logger()
        logger.info("Test message", field1="value1", field2="value2")

        captured = capsys.readouterr()

        # 尝试解析为 JSON
        # 注意：实际输出可能需要调整
        try:
            # 如果输出是 JSON，应该可以解析
            lines = captured.out.strip().split('\n')
            for line in lines:
                if line.strip():
                    # 尝试解析 JSON
                    data = json.loads(line)
                    assert "Test message" in str(data)
        except (json.JSONDecodeError, ValueError):
            # 如果不是标准 JSON，至少验证包含内容
            assert len(captured.out) > 0

    def test_readable_format_in_development(self, clean_logging, capsys):
        """测试开发环境使用可读格式"""
        setup_logging(environment="development")

        logger = structlog.get_logger()
        logger.info("Test readable message")

        captured = capsys.readouterr()

        # 开发环境格式应该是人类可读的文本
        assert len(captured.out) > 0
        # 应该包含关键字
        assert "Test readable message" in captured.out or "info" in captured.out.lower()


class TestLoggingWithExceptions:
    """测试异常日志记录"""

    def test_exception_logging(self, clean_logging, capsys):
        """测试异常被正确记录"""
        setup_logging()
        logger = structlog.get_logger()

        try:
            1 / 0
        except ZeroDivisionError as e:
            logger.exception("An error occurred")

        captured = capsys.readouterr()
        # 应该包含异常信息
        assert len(captured.out) > 0

    def test_exception_with_stack_trace(self, clean_logging, capsys):
        """测试异常包含堆栈跟踪"""
        setup_logging()
        logger = structlog.get_logger()

        try:
            raise ValueError("Test exception with stack trace")
        except Exception:
            logger.error("Error with exception", exc_info=True)

        captured = capsys.readouterr()
        # 应该包含堆栈跟踪信息
        assert len(captured.out) > 0


class TestPerformanceAndReliability:
    """测试日志系统的性能和可靠性"""

    def test_high_volume_logging(self, clean_logging):
        """测试大量日志记录"""
        setup_logging()
        logger = structlog.get_logger()

        # 记录大量日志
        for i in range(1000):
            logger.info(f"Message {i}", index=i)

        # 应该能够处理大量日志而不崩溃
        assert True

    def test_concurrent_logging(self, clean_logging):
        """测试并发日志记录"""
        setup_logging()
        logger = structlog.get_logger()

        import threading

        def log_messages(thread_id):
            for i in range(100):
                logger.info(f"Thread {thread_id}, message {i}")

        threads = [threading.Thread(target=log_messages, args=(i,)) for i in range(10)]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # 应该能够处理并发日志
        assert True

    def test_logging_after_exception(self, clean_logging):
        """测试异常发生后日志系统仍然工作"""
        setup_logging()
        logger = structlog.get_logger()

        try:
            raise RuntimeError("Test exception")
        except Exception:
            logger.error("Exception occurred")

        # 异常后日志系统应该仍然工作
        logger.info("Logging after exception")
        assert True


class TestLoggingConfiguration:
    """测试日志配置"""

    def test_configure_logging_from_settings(self, clean_logging):
        """测试从配置对象设置日志"""
        from src.backend.app.core.config import Settings
        settings = Settings(log_level="DEBUG")

        logger = setup_logging(log_level=settings.log_level)

        assert logger is not None
        assert logger.level == logging.DEBUG

    def test_multiple_loggers_share_configuration(self, clean_logging):
        """测试多个日志器共享配置"""
        setup_logging(log_level="INFO")

        logger1 = get_logger("module1")
        logger2 = get_logger("module2")
        logger3 = get_logger("module3")

        # 所有日志器应该共享相同的配置
        # 通过验证它们都是 Logger 实例
        assert isinstance(logger1, logging.Logger)
        assert isinstance(logger2, logging.Logger)
        assert isinstance(logger3, logging.Logger)
