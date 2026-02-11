"""测试开发环境与代码规范工具链配置

测试 Issue #21: 完善 Python 开发环境与代码规范的验收标准
"""

from pathlib import Path
from typing import Any

import pytest
import tomllib  # Python 3.11+ 内置
import yaml  # 通过 pyyaml 提供


class TestPyprojectToml:
    """测试 pyproject.toml 配置"""

    @pytest.fixture
    def pyproject_path(self) -> Path:
        """获取 pyproject.toml 文件路径"""
        return Path(__file__).parent.parent / "pyproject.toml"

    @pytest.fixture
    def pyproject_content(self, pyproject_path: Path) -> dict[str, Any]:
        """读取 pyproject.toml 内容"""
        with open(pyproject_path, "rb") as f:
            return tomllib.load(f)

    def test_black_dependency_exists(self, pyproject_content: dict[str, Any]) -> None:
        """验证 Black 依赖已添加到 dev dependencies"""
        dev_deps = pyproject_content["project"]["optional-dependencies"]["dev"]
        dep_names = [dep.split("==")[0] for dep in dev_deps]
        assert "black" in dep_names

    def test_black_version(self, pyproject_content: dict[str, Any]) -> None:
        """验证 Black 版本为 24.10.0"""
        dev_deps = pyproject_content["project"]["optional-dependencies"]["dev"]
        black_dep = [dep for dep in dev_deps if dep.startswith("black")][0]
        assert black_dep == "black==24.10.0"

    def test_isort_dependency_exists(self, pyproject_content: dict[str, Any]) -> None:
        """验证 isort 依赖已添加到 dev dependencies"""
        dev_deps = pyproject_content["project"]["optional-dependencies"]["dev"]
        dep_names = [dep.split("==")[0] for dep in dev_deps]
        assert "isort" in dep_names

    def test_isort_version(self, pyproject_content: dict[str, Any]) -> None:
        """验证 isort 版本为 5.13.2"""
        dev_deps = pyproject_content["project"]["optional-dependencies"]["dev"]
        isort_dep = [dep for dep in dev_deps if dep.startswith("isort")][0]
        assert isort_dep == "isort==5.13.2"

    def test_mypy_dependency_exists(self, pyproject_content: dict[str, Any]) -> None:
        """验证 mypy 依赖已添加到 dev dependencies"""
        dev_deps = pyproject_content["project"]["optional-dependencies"]["dev"]
        dep_names = [dep.split("==")[0] for dep in dev_deps]
        assert "mypy" in dep_names

    def test_mypy_version(self, pyproject_content: dict[str, Any]) -> None:
        """验证 mypy 版本为 1.14.1"""
        dev_deps = pyproject_content["project"]["optional-dependencies"]["dev"]
        mypy_dep = [dep for dep in dev_deps if dep.startswith("mypy")][0]
        assert mypy_dep == "mypy==1.14.1"

    def test_flake8_dependency_exists(self, pyproject_content: dict[str, Any]) -> None:
        """验证 Flake8 依赖已添加到 dev dependencies"""
        dev_deps = pyproject_content["project"]["optional-dependencies"]["dev"]
        dep_names = [dep.split("==")[0] for dep in dev_deps]
        assert "flake8" in dep_names

    def test_black_config(self, pyproject_content: dict[str, Any]) -> None:
        """验证 Black 配置参数: line-length=88"""
        assert "tool" in pyproject_content
        assert "black" in pyproject_content["tool"]
        assert pyproject_content["tool"]["black"]["line-length"] == 88

    def test_isort_config(self, pyproject_content: dict[str, Any]) -> None:
        """验证 isort 配置参数: profile=black"""
        assert "tool" in pyproject_content
        assert "isort" in pyproject_content["tool"]
        assert pyproject_content["tool"]["isort"]["profile"] == "black"

    def test_mypy_config(self, pyproject_content: dict[str, Any]) -> None:
        """验证 mypy 配置参数"""
        assert "tool" in pyproject_content
        assert "mypy" in pyproject_content["tool"]
        # 验证渐进式类型检查配置
        mypy_config = pyproject_content["tool"]["mypy"]
        assert mypy_config.get("check_untyped_defs", True)


class TestPreCommitConfig:
    """测试 .pre-commit-config.yaml 配置"""

    @pytest.fixture
    def precommit_path(self) -> Path:
        """获取 .pre-commit-config.yaml 文件路径"""
        return Path(__file__).parent.parent / ".pre-commit-config.yaml"

    @pytest.fixture
    def precommit_content(self, precommit_path: Path) -> dict[str, Any]:
        """读取 .pre-commit-config.yaml 内容"""
        with open(precommit_path) as f:
            return yaml.safe_load(f)

    def test_black_hook_exists(self, precommit_content: dict[str, Any]) -> None:
        """验证 Black hook 已配置"""
        hook_ids = []
        for repo in precommit_content["repos"]:
            for hook in repo["hooks"]:
                hook_ids.append(hook["id"])

        assert "black" in hook_ids

    def test_isort_hook_exists(self, precommit_content: dict[str, Any]) -> None:
        """验证 isort hook 已配置"""
        hook_ids = []
        for repo in precommit_content["repos"]:
            for hook in repo["hooks"]:
                hook_ids.append(hook["id"])

        assert "isort" in hook_ids

    def test_mypy_hook_exists(self, precommit_content: dict[str, Any]) -> None:
        """验证 mypy hook 已配置"""
        hook_ids = []
        for repo in precommit_content["repos"]:
            for hook in repo["hooks"]:
                hook_ids.append(hook["id"])

        assert "mypy" in hook_ids

    def test_flake8_hook_exists(self, precommit_content: dict[str, Any]) -> None:
        """验证 Flake8 hook 已配置"""
        hook_ids = []
        for repo in precommit_content["repos"]:
            for hook in repo["hooks"]:
                hook_ids.append(hook["id"])

        assert "flake8" in hook_ids


class TestGitWorkflowDoc:
    """测试 docs/git-workflow.md 文档"""

    @pytest.fixture
    def doc_path(self) -> Path:
        """获取 docs/git-workflow.md 文件路径"""
        return Path(__file__).parent.parent / "docs" / "git-workflow.md"

    def test_doc_exists(self, doc_path: Path) -> None:
        """验证 docs/git-workflow.md 文件存在"""
        assert doc_path.exists()

    def test_doc_contains_branch_strategy(self, doc_path: Path) -> None:
        """验证文档包含分支策略章节"""
        if not doc_path.exists():
            pytest.skip("文档不存在,跳过内容检查")

        content = doc_path.read_text(encoding="utf-8")
        # 验证包含分支策略相关标题或内容
        assert "分支策略" in content or "branch strategy" in content.lower()

    def test_doc_contains_workflow_description(self, doc_path: Path) -> None:
        """验证文档包含工作流描述"""
        if not doc_path.exists():
            pytest.skip("文档不存在,跳过内容检查")

        content = doc_path.read_text(encoding="utf-8")
        # 验证文档有实质内容(至少 100 字符)
        assert len(content.strip()) > 100

    def test_doc_contains_commit_convention(self, doc_path: Path) -> None:
        """验证文档包含提交规范章节"""
        if not doc_path.exists():
            pytest.skip("文档不存在,跳过内容检查")

        content = doc_path.read_text(encoding="utf-8")
        # 验证包含提交规范相关内容
        has_commit_info = (
            "提交规范" in content
            or "commit" in content.lower()
            or "conventional" in content.lower()
        )
        assert has_commit_info
