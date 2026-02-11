"""测试前端代码规范工具配置

测试 Issue #23: 前端代码规范工具配置（预备）的验收标准
"""

from pathlib import Path
from typing import Any

import pytest
import json


class TestESLintConfig:
    """测试 .eslintrc.json 配置"""

    @pytest.fixture
    def eslint_path(self) -> Path:
        """获取 .eslintrc.json 文件路径"""
        return Path(__file__).parent.parent / ".eslintrc.json"

    @pytest.fixture
    def eslint_content(self, eslint_path: Path) -> dict[str, Any]:
        """读取 .eslintrc.json 内容"""
        if not eslint_path.exists():
            pytest.skip(".eslintrc.json 文件不存在")
        with open(eslint_path, encoding="utf-8") as f:
            return json.load(f)

    def test_eslint_file_exists(self, eslint_path: Path) -> None:
        """验证 .eslintrc.json 文件存在"""
        assert eslint_path.exists(), ".eslintrc.json 文件必须存在"

    def test_eslint_valid_json(self, eslint_path: Path) -> None:
        """验证 .eslintrc.json 格式正确"""
        if not eslint_path.exists():
            pytest.skip(".eslintrc.json 文件不存在，跳过格式验证")
        with open(eslint_path, encoding="utf-8") as f:
            json.load(f)

    def test_eslint_has_rules(self, eslint_content: dict[str, Any]) -> None:
        """验证 ESLint 配置包含规则"""
        assert "rules" in eslint_content or "extends" in eslint_content

    def test_eslint_target_esnext(self, eslint_content: dict[str, Any]) -> None:
        """验证 ESLint 配置支持现代 JavaScript/TypeScript"""
        parser_options = eslint_content.get("parserOptions", {})
        ecma_version = parser_options.get("ecmaVersion", "latest")
        assert ecma_version == "latest" or isinstance(ecma_version, int) and ecma_version >= 2020


class TestPrettierConfig:
    """测试 .prettierrc.json 配置"""

    @pytest.fixture
    def prettier_path(self) -> Path:
        """获取 .prettierrc.json 文件路径"""
        return Path(__file__).parent.parent / ".prettierrc.json"

    @pytest.fixture
    def prettier_content(self, prettier_path: Path) -> dict[str, Any]:
        """读取 .prettierrc.json 内容"""
        if not prettier_path.exists():
            pytest.skip(".prettierrc.json 文件不存在")
        with open(prettier_path, encoding="utf-8") as f:
            return json.load(f)

    def test_prettier_file_exists(self, prettier_path: Path) -> None:
        """验证 .prettierrc.json 文件存在"""
        assert prettier_path.exists(), ".prettierrc.json 文件必须存在"

    def test_prettier_valid_json(self, prettier_path: Path) -> None:
        """验证 .prettierrc.json 格式正确"""
        if not prettier_path.exists():
            pytest.skip(".prettierrc.json 文件不存在，跳过格式验证")
        with open(prettier_path, encoding="utf-8") as f:
            json.load(f)

    def test_prettier_line_width_consistent_with_black(self, prettier_content: dict[str, Any]) -> None:
        """验证 Prettier 行宽与 Python black 一致（88 字符）"""
        assert "printWidth" in prettier_content
        assert prettier_content["printWidth"] == 88, "Prettier 行宽应与 Python black 保持一致（88 字符）"

    def test_prettier_use_tabs_false(self, prettier_content: dict[str, Any]) -> None:
        """验证 Prettier 使用空格而非制表符"""
        assert "useTabs" in prettier_content
        assert prettier_content["useTabs"] is False, "应使用空格而非制表符"

    def test_prettier_trailing_comma(self, prettier_content: dict[str, Any]) -> None:
        """验证 Prettier 配置尾随逗号"""
        assert "trailingComma" in prettier_content
        assert prettier_content["trailingComma"] in ["all", "es5"]


class TestEditorConfig:
    """测试 .editorconfig 配置"""

    @pytest.fixture
    def editorconfig_path(self) -> Path:
        """获取 .editorconfig 文件路径"""
        return Path(__file__).parent.parent / ".editorconfig"

    @pytest.fixture
    def editorconfig_content(self, editorconfig_path: Path) -> str:
        """读取 .editorconfig 内容"""
        if not editorconfig_path.exists():
            pytest.skip(".editorconfig 文件不存在")
        return editorconfig_path.read_text(encoding="utf-8")

    def test_editorconfig_file_exists(self, editorconfig_path: Path) -> None:
        """验证 .editorconfig 文件存在"""
        assert editorconfig_path.exists(), ".editorconfig 文件必须存在"

    def test_editorconfig_has_root_marker(self, editorconfig_content: str) -> None:
        """验证 .editorconfig 包含 root 标记"""
        assert "root = true" in editorconfig_content.lower()

    def test_editorconfig_indent_style(self, editorconfig_content: str) -> None:
        """验证 .editorconfig 配置缩进样式"""
        assert "indent_style" in editorconfig_content
        assert "space" in editorconfig_content or "indent_style = space" in editorconfig_content

    def test_editorconfig_indent_size(self, editorconfig_content: str) -> None:
        """验证 .editorconfig 配置缩进大小"""
        assert "indent_size" in editorconfig_content


class TestPrettierIgnore:
    """测试 .prettierignore 配置"""

    @pytest.fixture
    def prettierignore_path(self) -> Path:
        """获取 .prettierignore 文件路径"""
        return Path(__file__).parent.parent / ".prettierignore"

    def test_prettierignore_file_exists(self, prettierignore_path: Path) -> None:
        """验证 .prettierignore 文件存在"""
        assert prettierignore_path.exists(), ".prettierignore 文件必须存在"

    def test_prettierignore_has_common_patterns(self, prettierignore_path: Path) -> None:
        """验证 .prettierignore 包含常见忽略模式"""
        if not prettierignore_path.exists():
            pytest.skip(".prettierignore 文件不存在")
        content = prettierignore_path.read_text(encoding="utf-8")
        assert len(content.strip()) > 0, ".prettierignore 应包含至少一个忽略模式"


class TestFrontendStyleGuideDoc:
    """测试 docs/frontend-style-guide.md 文档"""

    @pytest.fixture
    def doc_path(self) -> Path:
        """获取 docs/frontend-style-guide.md 文件路径"""
        return Path(__file__).parent.parent / "docs" / "frontend-style-guide.md"

    def test_doc_exists(self, doc_path: Path) -> None:
        """验证 docs/frontend-style-guide.md 文件存在"""
        assert doc_path.exists(), "docs/frontend-style-guide.md 文件必须存在"

    def test_doc_has_substantial_content(self, doc_path: Path) -> None:
        """验证文档包含实质性内容"""
        if not doc_path.exists():
            pytest.skip("文档不存在，跳过内容检查")
        content = doc_path.read_text(encoding="utf-8")
        assert len(content.strip()) > 200, "文档应包含至少 200 字符的实质性内容"

    def test_doc_contains_eslint_section(self, doc_path: Path) -> None:
        """验证文档包含 ESLint 相关说明"""
        if not doc_path.exists():
            pytest.skip("文档不存在，跳过内容检查")
        content = doc_path.read_text(encoding="utf-8").lower()
        assert "eslint" in content, "文档应包含 ESLint 使用说明"

    def test_doc_contains_prettier_section(self, doc_path: Path) -> None:
        """验证文档包含 Prettier 相关说明"""
        if not doc_path.exists():
            pytest.skip("文档不存在，跳过内容检查")
        content = doc_path.read_text(encoding="utf-8").lower()
        assert "prettier" in content, "文档应包含 Prettier 使用说明"

    def test_doc_contains_editorconfig_section(self, doc_path: Path) -> None:
        """验证文档包含 EditorConfig 相关说明"""
        if not doc_path.exists():
            pytest.skip("文档不存在，跳过内容检查")
        content = doc_path.read_text(encoding="utf-8").lower()
        has_editorconfig = "editorconfig" in content or "editor" in content
        assert has_editorconfig, "文档应包含 EditorConfig 使用说明"

    def test_doc_contains_code_style_rules(self, doc_path: Path) -> None:
        """验证文档包含代码风格规范"""
        if not doc_path.exists():
            pytest.skip("文档不存在，跳过内容检查")
        content = doc_path.read_text(encoding="utf-8").lower()
        has_style_guide = (
            "代码规范" in content
            or "code style" in content
            or "coding style" in content
            or "规范" in content
        )
        assert has_style_guide, "文档应包含代码风格规范说明"
