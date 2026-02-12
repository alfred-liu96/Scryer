"""
配置管理模块

基于 Pydantic 的配置管理系统，支持环境变量和多环境配置
"""

import os
from pathlib import Path
from typing import List

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置类

    从环境变量和默认值加载配置
    支持多环境配置（development/production/testing）
    """

    # 应用基础配置
    app_name: str = Field(default="Scryer", description="应用名称")
    app_version: str = Field(default="0.1.0", description="应用版本")
    debug: bool = Field(default=False, description="调试模式")
    environment: str = Field(default="production", description="运行环境")

    # API 配置
    api_prefix: str = Field(default="/api", description="API 路由前缀")
    port: int = Field(default=8000, ge=1, le=65535, description="服务端口")

    # 数据库配置
    database_url: str = Field(
        default="postgresql://user:password@localhost:5432/scryer",
        description="数据库连接 URL"
    )

    # Redis 配置
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis 连接 URL"
    )

    # 安全配置
    secret_key: str = Field(
        default="a" * 32,  # 默认 32 字符密钥（仅用于开发）
        min_length=32,
        description="应用密钥（至少 32 字符）"
    )

    # CORS 配置
    cors_origins: List[str] = Field(
        default=["http://localhost:3000"],
        description="允许的 CORS 源列表"
    )

    # 日志配置
    log_level: str = Field(
        default="INFO",
        description="日志级别"
    )
    log_file: str | None = Field(
        default=None,
        description="日志文件路径（可选）"
    )
    log_max_bytes: int = Field(
        default=10485760,  # 10MB
        description="单个日志文件最大字节数"
    )
    log_backup_count: int = Field(
        default=5,
        description="保留的日志备份文件数量"
    )
    log_format_json: bool = Field(
        default=True,
        description="是否使用 JSON 格式输出日志"
    )

    # 路径配置
    base_dir: str = Field(default=str(Path(__file__).resolve().parent.parent.parent), description="项目根目录")
    static_dir: str = Field(default=str(Path(__file__).resolve().parent.parent.parent / "static"), description="静态文件目录")
    templates_dir: str = Field(default=str(Path(__file__).resolve().parent.parent.parent / "templates"), description="模板目录")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """验证日志级别是否有效"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return v.upper()

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_from_string(cls, v: any) -> bool:
        """解析 DEBUG 字符串为布尔值"""
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "on")
        return v

    @model_validator(mode="after")
    def set_debug_by_environment(self) -> "Settings":
        """根据环境自动设置 debug 模式

        注意：只有在没有显式设置 DEBUG 环境变量时，才会根据 ENVIRONMENT 来自动设置
        如果设置了 DEBUG 环境变量，则优先使用该值
        """
        # 检查是否设置了 DEBUG 环境变量
        # 如果设置了，不覆盖
        # 如果没设置，根据 environment 来设置

        # 问题：我们无法在 model_validator 中区分 debug 的来源
        # 解决方案：检查环境变量 DEBUG 是否存在
        debug_env = os.getenv("DEBUG")

        if debug_env is None:
            # 只有在 DEBUG 环境变量未设置时，才根据 environment 来设置
            if self.environment == "development":
                self.debug = True
            elif self.environment == "production":
                self.debug = False
            elif self.environment == "testing":
                self.debug = True
        # else: DEBUG 环境变量已设置，保持其值不变

        return self


# 全局配置实例缓存
_settings_instance: Settings | None = None


def get_settings() -> Settings:
    """获取配置单例实例

    使用懒加载模式，第一次调用时创建实例
    后续调用返回缓存的实例

    Returns:
        Settings: 配置实例
    """
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance
