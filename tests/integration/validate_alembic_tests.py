#!/usr/bin/env python3
"""
验证 Alembic Docker 测试的完整性

此脚本用于验证测试文件的结构和完整性，不执行实际测试。
"""

import sys
from pathlib import Path


def validate_file_exists(filepath: Path, description: str) -> bool:
    """验证文件是否存在"""
    if filepath.exists():
        print(f"✓ {description}: {filepath}")
        return True
    else:
        print(f"✗ {description}: {filepath} (NOT FOUND)")
        return False


def validate_python_syntax(filepath: Path) -> bool:
    """验证 Python 文件语法"""
    try:
        import py_compile

        py_compile.compile(str(filepath), doraise=True)
        print(f"✓ 语法正确: {filepath.name}")
        return True
    except py_compile.PyCompileError as e:
        print(f"✗ 语法错误 {filepath.name}: {e}")
        return False


def validate_imports(filepath: Path) -> bool:
    """验证导入是否正确"""
    try:
        import importlib.util

        spec = importlib.util.spec_from_file_location(filepath.stem, filepath)
        if spec is None or spec.loader is None:
            return False

        loader = spec.loader
        module = importlib.util.module_from_spec(spec)

        sys.path.insert(0, str(filepath.parent.parent.parent))
        loader.exec_module(module)

        print(f"✓ 导入正确: {filepath.name}")
        return True
    except Exception as e:
        print(f"✗ 导入错误 {filepath.name}: {e}")
        return False


def validate_test_classes(filepath: Path) -> bool:
    """验证测试类是否存在"""
    try:
        with open(filepath, encoding="utf-8") as f:
            content = f.read()

        expected_classes = [
            "TestDockerAutoMigration",
            "TestMigrationUpgradeDowngrade",
            "TestMigrationSchemaValidation",
            "TestMigrationDataIntegrity",
            "TestMigrationErrorHandling",
            "TestMigrationWithRealModels",
            "TestMigrationCommands",
        ]

        found_classes = []
        for cls in expected_classes:
            if f"class {cls}" in content:
                found_classes.append(cls)

        if len(found_classes) == len(expected_classes):
            print("✓ 所有 7 个测试类存在")
            return True
        else:
            print(f"✗ 测试类不完整: 找到 {len(found_classes)}/{len(expected_classes)}")
            return False

    except Exception as e:
        print(f"✗ 验证测试类失败: {e}")
        return False


def validate_helper_methods(filepath: Path) -> bool:
    """验证辅助工具类方法"""
    try:
        with open(filepath, encoding="utf-8") as f:
            content = f.read()

        expected_methods = [
            "get_current_version",
            "get_latest_version",
            "upgrade",
            "downgrade",
            "table_exists",
            "column_exists",
            "index_exists",
            "validate_schema",
            "clean_all_tables",
            "drop_all_tables",
        ]

        found_methods = []
        for method in expected_methods:
            if f"def {method}" in content:
                found_methods.append(method)

        if len(found_methods) >= len(expected_methods) * 0.8:  # 允许 20% 误差
            print(f"✓ 辅助方法完整: {len(found_methods)}/{len(expected_methods)}")
            return True
        else:
            print(f"✗ 辅助方法不足: {len(found_methods)}/{len(expected_methods)}")
            return False

    except Exception as e:
        print(f"✗ 验证辅助方法失败: {e}")
        return False


def main():
    """主验证函数"""
    print("=" * 60)
    print("Alembic Docker 测试完整性验证")
    print("=" * 60)
    print()

    results = []

    # 验证文件结构
    print("1. 文件结构验证")
    print("-" * 40)

    results.append(
        validate_file_exists(
            Path("tests/integration/helpers/__init__.py"),
            "Helpers package init",
        )
    )
    results.append(
        validate_file_exists(
            Path("tests/integration/helpers/migration_helpers.py"),
            "Migration helpers",
        )
    )
    results.append(
        validate_file_exists(
            Path("tests/integration/test_alembic_docker.py"),
            "Alembic Docker tests",
        )
    )
    results.append(
        validate_file_exists(
            Path("tests/integration/conftest.py"),
            "Conftest fixtures",
        )
    )
    print()

    # 验证 Python 语法
    print("2. Python 语法验证")
    print("-" * 40)

    helpers_file = Path("tests/integration/helpers/migration_helpers.py")
    test_file = Path("tests/integration/test_alembic_docker.py")

    results.append(validate_python_syntax(helpers_file))
    results.append(validate_python_syntax(test_file))
    print()

    # 验证导入
    print("3. 导入验证")
    print("-" * 40)

    results.append(validate_imports(helpers_file))
    print()

    # 验证测试类
    print("4. 测试类验证")
    print("-" * 40)

    results.append(validate_test_classes(test_file))
    print()

    # 验证辅助方法
    print("5. 辅助方法验证")
    print("-" * 40)

    results.append(validate_helper_methods(helpers_file))
    print()

    # 总结
    print("=" * 60)
    passed = sum(results)
    total = len(results)

    if passed == total:
        print(f"✓ 所有验证通过 ({passed}/{total})")
        print()
        print("测试文件已准备就绪，可以运行:")
        print("  pytest tests/integration/test_alembic_docker.py")
        return 0
    else:
        print(f"✗ 部分验证失败 ({passed}/{total})")
        return 1


if __name__ == "__main__":
    sys.exit(main())
