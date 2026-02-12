"""
日志配置模块

基于 structlog 提供结构化日志功能
"""

import logging
import sys
from pathlib import Path
from typing import Any

import structlog
from structlog.types import EventDict, Processor


def add_app_context(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """添加应用上下文到日志记录

    Args:
        logger: 日志器实例
        method_name: 方法名
        event_dict: 日志事件字典

    Returns:
        增强后的日志事件字典
    """
    # 预留：添加请求 ID、用户信息等上下文
    event_dict["app"] = "scryer"
    return event_dict


def setup_logging(
    log_level: str = "INFO",
    log_file: str | None = None,
    environment: str = "production",
    max_bytes: int = 10485760,  # 10MB
    backup_count: int = 5,
) -> logging.Logger:
    """配置 structlog 日志系统

    Args:
        log_level: 日志级别字符串
        log_file: 日志文件路径（可选）
        environment: 运行环境 (development/production/testing)
        max_bytes: 日志文件最大字节数
        backup_count: 保留的备份文件数量

    Returns:
        logging.Logger: 配置好的标准 logger 实例
    """
    # 获取标准日志级别
    level = getattr(logging, log_level.upper(), logging.INFO)

    # 如果指定了日志文件，创建日志目录
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

    # 配置标准库 logging
    handlers: list[logging.Handler] = []

    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    handlers.append(console_handler)

    # 文件处理器（如果指定）
    if log_file:
        from logging.handlers import RotatingFileHandler
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count
        )
        file_handler.setLevel(level)
        handlers.append(file_handler)

    # 配置 root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # 清除现有的 handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # 添加新的 handlers
    for handler in handlers:
        root_logger.addHandler(handler)

    # 配置 structlog 处理器链
    processors: list[Processor] = [
        # 添加日志级别
        structlog.stdlib.add_log_level,
        # 添加应用上下文
        add_app_context,
        # 添加时间戳
        structlog.processors.TimeStamper(fmt="iso"),
        # 格式化异常信息
        structlog.processors.StackInfoRenderer(),
        # 格式化为 JSON（生产环境）或可读文本（开发环境）
        structlog.dev.ConsoleRenderer() if environment == "development" else structlog.processors.JSONRenderer(),
    ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    return root_logger


def configure_logging(
    log_level: str = "INFO",
    log_file: str | None = None,
) -> logging.Logger:
    """配置 structlog 日志系统（兼容旧接口）

    Args:
        log_level: 日志级别字符串
        log_file: 日志文件路径（可选）

    Returns:
        logging.Logger: 配置好的标准 logger 实例
    """
    return setup_logging(log_level=log_level, log_file=log_file)


def get_logger(name: str) -> logging.Logger:
    """获取日志记录器实例

    Args:
        name: 日志器名称，通常使用 __name__

    Returns:
        配置好的日志记录器实例
    """
    return logging.getLogger(name)
