"""测试 Docker 容器化开发环境配置

测试 Issue #22: Docker 容器化开发环境的验收标准
"""

from pathlib import Path
from typing import Any, cast

import pytest
import yaml


class TestDockerfile:
    """测试 Dockerfile 配置"""

    @pytest.fixture
    def dockerfile_path(self) -> Path:
        """获取 Dockerfile 文件路径"""
        return Path(__file__).parent.parent / "Dockerfile"

    @pytest.fixture
    def dockerfile_content(self, dockerfile_path: Path) -> str:
        """读取 Dockerfile 内容"""
        return dockerfile_path.read_text(encoding="utf-8")

    def test_dockerfile_exists(self, dockerfile_path: Path) -> None:
        """验证 Dockerfile 文件存在"""
        assert dockerfile_path.exists()

    def test_base_image(self, dockerfile_content: str) -> None:
        """验证使用正确的基础镜像: python:3.12-slim"""
        assert "FROM python:3.12-slim" in dockerfile_content

    def test_workdir(self, dockerfile_content: str) -> None:
        """验证工作目录设置为 /app"""
        assert "WORKDIR /app" in dockerfile_content

    def test_venv_creation(self, dockerfile_content: str) -> None:
        """验证创建虚拟环境 /app/.venv"""
        assert "RUN python -m venv /app/.venv" in dockerfile_content

    def test_dev_tools_installation(self, dockerfile_content: str) -> None:
        """验证安装开发工具: pytest, black, isort, mypy, flake8"""
        required_tools = ["pytest", "black", "isort", "mypy", "flake8"]
        for tool in required_tools:
            assert tool in dockerfile_content


class TestDockerCompose:
    """测试 docker-compose.yml 配置"""

    @pytest.fixture
    def compose_path(self) -> Path:
        """获取 docker-compose.yml 文件路径"""
        return Path(__file__).parent.parent / "docker-compose.yml"

    @pytest.fixture
    def compose_content(self, compose_path: Path) -> dict[str, Any]:
        """读取 docker-compose.yml 内容"""
        with open(compose_path) as f:
            return cast(dict[str, Any], yaml.safe_load(f))

    def test_compose_file_exists(self, compose_path: Path) -> None:
        """验证 docker-compose.yml 文件存在"""
        assert compose_path.exists()

    def test_service_name(self, compose_content: dict[str, Any]) -> None:
        """验证服务名为 scryer-dev"""
        assert "services" in compose_content
        assert "scryer-dev" in compose_content["services"]

    def test_container_name(self, compose_content: dict[str, Any]) -> None:
        """验证容器名为 scryer-dev"""
        service = compose_content["services"]["scryer-dev"]
        assert service.get("container_name") == "scryer-dev"

    def test_volume_mount_exists(self, compose_content: dict[str, Any]) -> None:
        """验证配置了卷挂载"""
        service = compose_content["services"]["scryer-dev"]
        assert "volumes" in service
        assert len(service["volumes"]) > 0

    def test_named_volume_exists(self, compose_content: dict[str, Any]) -> None:
        """验证存在命名卷 scryer-dev-venv"""
        assert "volumes" in compose_content
        assert "scryer-dev-venv" in compose_content["volumes"]

    def test_port_mapping(self, compose_content: dict[str, Any]) -> None:
        """验证端口映射 8000:8000"""
        service = compose_content["services"]["scryer-dev"]
        assert "ports" in service
        assert "8000:8000" in service["ports"]

    def test_network_config(self, compose_content: dict[str, Any]) -> None:
        """验证网络配置 scryer-network"""
        assert "networks" in compose_content
        assert "scryer-network" in compose_content["networks"]


class TestDockerignore:
    """测试 .dockerignore 配置"""

    @pytest.fixture
    def dockerignore_path(self) -> Path:
        """获取 .dockerignore 文件路径"""
        return Path(__file__).parent.parent / ".dockerignore"

    @pytest.fixture
    def dockerignore_content(self, dockerignore_path: Path) -> str:
        """读取 .dockerignore 内容"""
        return dockerignore_path.read_text(encoding="utf-8")

    def test_dockerignore_exists(self, dockerignore_path: Path) -> None:
        """验证 .dockerignore 文件存在"""
        assert dockerignore_path.exists()

    def test_venv_excluded(self, dockerignore_content: str) -> None:
        """验证排除虚拟环境目录 .venv"""
        assert ".venv" in dockerignore_content

    def test_git_excluded(self, dockerignore_content: str) -> None:
        """验证排除 .git 目录"""
        assert ".git" in dockerignore_content

    def test_ide_config_excluded(self, dockerignore_content: str) -> None:
        """验证排除 IDE 配置目录"""
        assert ".idea" in dockerignore_content or ".vscode" in dockerignore_content

    def test_cache_excluded(self, dockerignore_content: str) -> None:
        """验证排除缓存目录 __pycache__"""
        assert "__pycache__" in dockerignore_content


class TestDockerSetupDoc:
    """测试 docs/docker-setup.md 文档"""

    @pytest.fixture
    def doc_path(self) -> Path:
        """获取 docs/docker-setup.md 文件路径"""
        return Path(__file__).parent.parent / "docs" / "docker-setup.md"

    @pytest.fixture
    def doc_content(self, doc_path: Path) -> str:
        """读取文档内容"""
        return doc_path.read_text(encoding="utf-8")

    def test_doc_exists(self, doc_path: Path) -> None:
        """验证 docs/docker-setup.md 文件存在"""
        assert doc_path.exists()

    def test_doc_contains_quick_start(self, doc_content: str) -> None:
        """验证文档包含快速开始章节"""
        assert "快速开始" in doc_content or "Quick Start" in doc_content

    def test_doc_contains_build_instructions(self, doc_content: str) -> None:
        """验证文档包含构建说明"""
        has_build = (
            "docker build" in doc_content or "docker-compose build" in doc_content
        )
        assert has_build

    def test_doc_contains_run_instructions(self, doc_content: str) -> None:
        """验证文档包含运行说明"""
        has_run = (
            "docker run" in doc_content
            or "docker-compose up" in doc_content
            or "docker compose" in doc_content
        )
        assert has_run

    def test_doc_contains_volume_info(self, doc_content: str) -> None:
        """验证文档包含卷挂载说明"""
        assert "volume" in doc_content.lower() or "卷" in doc_content

    def test_doc_has_sufficient_content(self, doc_content: str) -> None:
        """验证文档有足够的内容（至少 200 字符）"""
        assert len(doc_content.strip()) > 200
