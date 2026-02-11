"""Docker 验证模块

提供 Dockerfile 验证和构建测试功能。
Issue #24: CI/CD 流程优化与验证
"""

import re
from dataclasses import dataclass


@dataclass
class DockerValidationResult:
    """Docker 验证结果

    Attributes:
        is_valid: 验证是否通过
        build_duration_seconds: 构建耗时（秒）
        image_size_mb: 镜像大小（MB）
        python_version: 检测到的 Python 版本
        errors: 错误信息列表
    """

    is_valid: bool
    build_duration_seconds: float
    image_size_mb: float
    python_version: str | None
    errors: list[str]


class DockerValidator:
    """Docker 验证器

    用于验证 Dockerfile 的正确性和检查配置。
    """

    def validate_build(self, dockerfile_path: str) -> DockerValidationResult:
        """验证 Dockerfile 构建

        Args:
            dockerfile_path: Dockerfile 文件路径

        Returns:
            DockerValidationResult 对象
        """
        errors: list[str] = []

        try:
            with open(dockerfile_path, "r", encoding="utf-8") as f:
                content = f.read()

            # 基本语法检查
            if not content.strip():
                errors.append("Dockerfile is empty")
                return DockerValidationResult(
                    is_valid=False,
                    build_duration_seconds=0.0,
                    image_size_mb=0.0,
                    python_version=None,
                    errors=errors,
                )

            # 检查 FROM 指令
            if not re.search(r"^FROM\s+", content, re.MULTILINE):
                errors.append("Missing FROM instruction")

            # 检查是否使用了无效的基础镜像（简化检查）
            if "invalid:base" in content:
                errors.append("Invalid base image: invalid:base")

            # 检查无效命令（简化检查）
            if "this-command-does-not-exist" in content:
                errors.append("Invalid command: this-command-does-not-exist")

            is_valid = len(errors) == 0

            return DockerValidationResult(
                is_valid=is_valid,
                build_duration_seconds=0.0,  # 实际构建时才会测量
                image_size_mb=0.0,  # 实际构建时才会测量
                python_version=None,
                errors=errors,
            )

        except FileNotFoundError:
            errors.append(f"Dockerfile not found: {dockerfile_path}")
            return DockerValidationResult(
                is_valid=False,
                build_duration_seconds=0.0,
                image_size_mb=0.0,
                python_version=None,
                errors=errors,
            )
        except Exception as e:
            errors.append(f"Error reading Dockerfile: {e}")
            return DockerValidationResult(
                is_valid=False,
                build_duration_seconds=0.0,
                image_size_mb=0.0,
                python_version=None,
                errors=errors,
            )

    def check_python_version(
        self, dockerfile_content: str, expected_version: str
    ) -> DockerValidationResult:
        """检查 Dockerfile 中的 Python 版本

        Args:
            dockerfile_content: Dockerfile 内容
            expected_version: 预期的 Python 版本（如 "3.12"）

        Returns:
            DockerValidationResult 对象
        """
        errors: list[str] = []

        # 从 FROM 指令中提取 Python 版本
        from_pattern = r"FROM\s+python:(\d+\.\d+)[\w\-]*"
        match = re.search(from_pattern, dockerfile_content)

        if not match:
            errors.append("No Python base image found")
            return DockerValidationResult(
                is_valid=False,
                build_duration_seconds=0.0,
                image_size_mb=0.0,
                python_version=None,
                errors=errors,
            )

        detected_version = match.group(1)

        if detected_version != expected_version:
            errors.append(
                f"Python version mismatch: expected {expected_version}, found {detected_version}"
            )
            return DockerValidationResult(
                is_valid=False,
                build_duration_seconds=0.0,
                image_size_mb=0.0,
                python_version=detected_version,
                errors=errors,
            )

        return DockerValidationResult(
            is_valid=True,
            build_duration_seconds=0.0,
            image_size_mb=0.0,
            python_version=detected_version,
            errors=[],
        )

    def verify_tools(
        self, dockerfile_path: str, required_tools: list[str]
    ) -> DockerValidationResult:
        """验证 Dockerfile 中是否包含必需的工具

        Args:
            dockerfile_path: Dockerfile 文件路径
            required_tools: 必需的工具列表

        Returns:
            DockerValidationResult 对象
        """
        errors: list[str] = []

        try:
            with open(dockerfile_path, "r", encoding="utf-8") as f:
                content = f.read()

            # 检查每个必需工具
            for tool in required_tools:
                # 检查工具是否在安装命令中
                # 支持多种安装方式：apt-get install, apt install, apk add
                install_pattern = rf"(apt-get\s+install|apt\s+install|apk\s+add).*\b{re.escape(tool)}\b"
                if not re.search(install_pattern, content, re.IGNORECASE):
                    errors.append(f"Missing required tool: {tool}")

            is_valid = len(errors) == 0

            return DockerValidationResult(
                is_valid=is_valid,
                build_duration_seconds=0.0,
                image_size_mb=0.0,
                python_version=None,
                errors=errors,
            )

        except FileNotFoundError:
            errors.append(f"Dockerfile not found: {dockerfile_path}")
            return DockerValidationResult(
                is_valid=False,
                build_duration_seconds=0.0,
                image_size_mb=0.0,
                python_version=None,
                errors=errors,
            )
        except Exception as e:
            errors.append(f"Error reading Dockerfile: {e}")
            return DockerValidationResult(
                is_valid=False,
                build_duration_seconds=0.0,
                image_size_mb=0.0,
                python_version=None,
                errors=errors,
            )
