#!/usr/bin/env python3
"""
实现验证脚本

模拟测试用例验证代码实现是否正确
不依赖 pytest，仅检查基本功能
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_directory_structure():
    """测试目录结构是否完整"""
    print("=" * 60)
    print("测试 1: 目录结构")
    print("=" * 60)

    required_paths = [
        "src/backend/__init__.py",
        "src/backend/app/__init__.py",
        "src/backend/app/api/__init__.py",
        "src/backend/app/core/__init__.py",
        "src/backend/app/core/config.py",
        "src/backend/app/models/__init__.py",
        "src/backend/app/schemas/__init__.py",
        "src/backend/app/services/__init__.py",
        "src/backend/app/utils/__init__.py",
        "src/backend/app/main.py",
    ]

    all_exist = True
    for path in required_paths:
        full_path = project_root / path
        exists = full_path.exists()
        status = "✓" if exists else "✗"
        print(f"  {status} {path}")
        if not exists:
            all_exist = False

    print()
    if all_exist:
        print("✓ 所有目录和文件已创建")
    else:
        print("✗ 部分文件缺失")
    print()

    return all_exist


def test_imports():
    """测试基本导入是否成功"""
    print("=" * 60)
    print("测试 2: 模块导入")
    print("=" * 60)

    try:
        print("  尝试导入 config 模块...")
        from src.backend.app.core.config import Settings, get_settings
        print("  ✓ config 模块导入成功")
    except Exception as e:
        print(f"  ✗ config 模块导入失败: {e}")
        return False

    try:
        print("  尝试导入 main 模块...")
        from src.backend.app.main import create_app, get_application, app
        print("  ✓ main 模块导入成功")
    except Exception as e:
        print(f"  ✗ main 模块导入失败: {e}")
        return False

    print()
    print("✓ 所有模块导入成功")
    print()
    return True


def test_config():
    """测试配置管理"""
    print("=" * 60)
    print("测试 3: 配置管理")
    print("=" * 60)

    try:
        from src.backend.app.core.config import Settings, get_settings

        # 测试默认值
        print("  测试默认配置...")
        settings = Settings()
        assert settings.app_name == "Scryer", f"app_name 应该是 'Scryer'，实际是 '{settings.app_name}'"
        assert settings.app_version == "0.1.0", f"app_version 应该是 '0.1.0'，实际是 '{settings.app_version}'"
        assert settings.api_prefix == "/api", f"api_prefix 应该是 '/api'，实际是 '{settings.api_prefix}'"
        print("  ✓ 默认配置正确")

        # 测试单例模式
        print("  测试单例模式...")
        settings1 = get_settings()
        settings2 = get_settings()
        assert settings1 is settings2, "get_settings() 应该返回单例"
        print("  ✓ 单例模式正确")

        print()
        print("✓ 配置管理测试通过")
        print()
        return True

    except Exception as e:
        print(f"  ✗ 配置测试失败: {e}")
        print()
        return False


def test_app_creation():
    """测试应用创建"""
    print("=" * 60)
    print("测试 4: 应用创建")
    print("=" * 60)

    try:
        from src.backend.app.main import create_app, get_application
        from fastapi import FastAPI

        # 测试 create_app
        print("  测试 create_app()...")
        app = create_app()
        assert isinstance(app, FastAPI), "create_app() 应该返回 FastAPI 实例"
        assert app.title == "Scryer", f"应用标题应该是 'Scryer'，实际是 '{app.title}'"
        assert app.version == "0.1.0", f"应用版本应该是 '0.1.0'，实际是 '{app.version}'"
        print("  ✓ create_app() 正确")

        # 测试 get_application 单例
        print("  测试 get_application() 单例...")
        app1 = get_application()
        app2 = get_application()
        assert app1 is app2, "get_application() 应该返回单例"
        print("  ✓ get_application() 单例正确")

        # 测试 CORS 中间件
        print("  测试 CORS 中间件...")
        from fastapi.middleware.cors import CORSMiddleware
        has_cors = False
        for middleware in app.user_middleware:
            # middleware 是一个 UserMiddleware 对象，实际类在 cls 属性中
            actual_class = middleware.cls if hasattr(middleware, 'cls') else middleware
            if actual_class == CORSMiddleware or (hasattr(actual_class, '__name__') and actual_class.__name__ == 'CORSMiddleware'):
                has_cors = True
                break
        assert has_cors, "应用应该配置 CORS 中间件"
        print("  ✓ CORS 中间件已配置")

        # 测试路由
        print("  测试路由注册...")
        assert len(app.routes) > 0, "应用应该有路由注册"
        print(f"  ✓ 已注册 {len(app.routes)} 个路由")

        print()
        print("✓ 应用创建测试通过")
        print()
        return True

    except Exception as e:
        print(f"  ✗ 应用创建测试失败: {e}")
        import traceback
        traceback.print_exc()
        print()
        return False


def main():
    """运行所有测试"""
    print()
    print("=" * 60)
    print("Issue #33 实现验证")
    print("=" * 60)
    print()

    results = {
        "目录结构": test_directory_structure(),
        "模块导入": test_imports(),
        "配置管理": test_config(),
        "应用创建": test_app_creation(),
    }

    print("=" * 60)
    print("测试总结")
    print("=" * 60)
    for name, passed in results.items():
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"  {status} - {name}")

    all_passed = all(results.values())
    print()
    if all_passed:
        print("=" * 60)
        print("✓ 所有测试通过！实现完成。")
        print("=" * 60)
        return 0
    else:
        print("=" * 60)
        print("✗ 部分测试失败，请检查实现。")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    exit(main())
