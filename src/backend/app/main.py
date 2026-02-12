"""
FastAPI 应用主入口

包含应用创建、配置、中间件、路由注册等核心功能
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_settings, Settings

# 全局应用实例缓存
_app_instance: FastAPI | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """应用生命周期管理

    处理应用启动和关闭时的逻辑

    Args:
        app: FastAPI 应用实例
    """
    # 启动时执行
    print("Application starting up...")
    yield
    # 关闭时执行
    print("Application shutting down...")


def create_app() -> FastAPI:
    """创建 FastAPI 应用实例

    配置应用、注册中间件、注册路由、设置事件处理器

    Returns:
        FastAPI: 配置好的 FastAPI 应用实例
    """
    settings = get_settings()

    # 创建 FastAPI 应用
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        lifespan=lifespan,
    )

    # 配置 CORS 中间件
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注册健康检查路由
    @app.get("/health")
    async def health_check():
        """健康检查端点"""
        return {
            "status": "ok",
            "version": settings.app_version
        }

    # 注册根端点
    @app.get("/")
    async def root():
        """根端点"""
        return {
            "message": f"Welcome to {settings.app_name}",
            "version": settings.app_version
        }

    # 注册 API 路由
    from .api.router import router as api_router
    app.include_router(api_router, prefix=settings.api_prefix)

    return app


def get_application() -> FastAPI:
    """获取应用单例实例

    使用单例模式确保应用实例唯一

    Returns:
        FastAPI: FastAPI 应用实例
    """
    global _app_instance
    if _app_instance is None:
        _app_instance = create_app()
    return _app_instance


# 创建全局应用实例
app = get_application()
