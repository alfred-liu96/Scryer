#!/usr/bin/env python3
"""前端代码规范配置验证脚本（不依赖 pytest）"""

import json
import sys
from pathlib import Path


def main():
    """运行所有验证测试"""
    errors = []

    # 测试 1: .eslintrc.json
    print("测试 1: .eslintrc.json")
    try:
        eslint_path = Path(".eslintrc.json")
        if not eslint_path.exists():
            errors.append(".eslintrc.json 文件不存在")
        else:
            with open(eslint_path, encoding="utf-8") as f:
                eslint_content = json.load(f)

            if "extends" not in eslint_content and "rules" not in eslint_content:
                errors.append("ESLint 必须包含规则")

            parser_options = eslint_content.get("parserOptions", {})
            ecma_version = parser_options.get("ecmaVersion", "latest")
            if not (ecma_version == "latest" or (isinstance(ecma_version, int) and ecma_version >= 2020)):
                errors.append(f"ESLint ecmaVersion 应为 'latest' 或 >= 2020，当前为 {ecma_version}")

            print("  ✅ 通过")
    except json.JSONDecodeError as e:
        errors.append(f".eslintrc.json 格式错误: {e}")
        print("  ❌ JSON 格式错误")
    except Exception as e:
        errors.append(f".eslintrc.json 测试失败: {e}")
        print(f"  ❌ 失败: {e}")

    # 测试 2: .prettierrc.json
    print("\n测试 2: .prettierrc.json")
    try:
        prettier_path = Path(".prettierrc.json")
        if not prettier_path.exists():
            errors.append(".prettierrc.json 文件不存在")
        else:
            with open(prettier_path, encoding="utf-8") as f:
                prettier_content = json.load(f)

            if "printWidth" not in prettier_content:
                errors.append("Prettier 必须配置 printWidth")
            elif prettier_content["printWidth"] != 88:
                errors.append(f"Prettier 行宽应为 88，当前为 {prettier_content['printWidth']}")

            if "useTabs" not in prettier_content:
                errors.append("Prettier 必须配置 useTabs")
            elif prettier_content["useTabs"] is not False:
                errors.append("Prettier 应使用空格而非制表符")

            if "trailingComma" not in prettier_content:
                errors.append("Prettier 必须配置 trailingComma")
            elif prettier_content["trailingComma"] not in ["all", "es5"]:
                errors.append("Prettier trailingComma 应为 'all' 或 'es5'")

            print("  ✅ 通过")
    except json.JSONDecodeError as e:
        errors.append(f".prettierrc.json 格式错误: {e}")
        print("  ❌ JSON 格式错误")
    except Exception as e:
        errors.append(f".prettierrc.json 测试失败: {e}")
        print(f"  ❌ 失败: {e}")

    # 测试 3: .editorconfig
    print("\n测试 3: .editorconfig")
    try:
        editorconfig_path = Path(".editorconfig")
        if not editorconfig_path.exists():
            errors.append(".editorconfig 文件不存在")
        else:
            content = editorconfig_path.read_text(encoding="utf-8").lower()
            if "root = true" not in content:
                errors.append("EditorConfig 必须包含 root = true")

            if "indent_style" not in content:
                errors.append("EditorConfig 必须配置 indent_style")

            if "indent_size" not in content:
                errors.append("EditorConfig 必须配置 indent_size")

            print("  ✅ 通过")
    except Exception as e:
        errors.append(f".editorconfig 测试失败: {e}")
        print(f"  ❌ 失败: {e}")

    # 测试 4: .prettierignore
    print("\n测试 4: .prettierignore")
    try:
        prettierignore_path = Path(".prettierignore")
        if not prettierignore_path.exists():
            errors.append(".prettierignore 文件不存在")
        else:
            content = prettierignore_path.read_text(encoding="utf-8")
            if len(content.strip()) == 0:
                errors.append(".prettierignore 应包含至少一个忽略模式")

            print("  ✅ 通过")
    except Exception as e:
        errors.append(f".prettierignore 测试失败: {e}")
        print(f"  ❌ 失败: {e}")

    # 测试 5: docs/frontend-style-guide.md
    print("\n测试 5: docs/frontend-style-guide.md")
    try:
        doc_path = Path("docs/frontend-style-guide.md")
        if not doc_path.exists():
            errors.append("docs/frontend-style-guide.md 文件不存在")
        else:
            content = doc_path.read_text(encoding="utf-8")
            if len(content.strip()) <= 200:
                errors.append(f"文档应包含至少 200 字符，当前为 {len(content.strip())}")

            content_lower = content.lower()
            if "eslint" not in content_lower:
                errors.append("文档应包含 ESLint 使用说明")

            if "prettier" not in content_lower:
                errors.append("文档应包含 Prettier 使用说明")

            if "editorconfig" not in content_lower and "editor" not in content_lower:
                errors.append("文档应包含 EditorConfig 使用说明")

            style_keywords = ["代码规范", "code style", "coding style", "规范"]
            if not any(keyword in content_lower for keyword in style_keywords):
                errors.append("文档应包含代码风格规范说明")

            print("  ✅ 通过")
    except Exception as e:
        errors.append(f"docs/frontend-style-guide.md 测试失败: {e}")
        print(f"  ❌ 失败: {e}")

    # 输出结果
    print("\n" + "=" * 60)
    if errors:
        print("❌ 验证失败！")
        print("\n错误列表:")
        for i, error in enumerate(errors, 1):
            print(f"  {i}. {error}")
        print("=" * 60)
        return 1
    else:
        print("🎉 所有测试通过！前端代码规范配置验证成功")
        print("=" * 60)
        return 0


if __name__ == "__main__":
    sys.exit(main())
