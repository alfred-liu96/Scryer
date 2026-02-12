"""
日志配置模块

基于 structlog 提供结构化日志功能
"""

import logging
import sys
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


def configure_logging(log_level: str = "INFO") -> None:
    """配置 structlog 日志系统

    Args:
        log_level: 日志级别字符串
    """
    # 获取标准日志级别
    level = getattr(logging, log_level.upper(), logging.INFO)

    # 配置标准库 logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

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
        structlog.dev.ConsoleRenderer() if log_level == "DEBUG" else structlog.processors.JSONRenderer(),
    ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """获取日志记录器实例

    Args:
        name: 日志器名称，通常使用 __name__

    Returns:
        配置好的日志记录器实例
    """
    return structlog.get_logger(name)


# 兼容测试代码的别名
setup_logging = configure_logging
