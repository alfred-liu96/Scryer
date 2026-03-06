"""测试 E2E CI Workflow 配置

测试 Issue #159: 配置 CI 环境支持 - Playwright E2E 测试 workflow
"""

from pathlib import Path
from typing import Any

import pytest
import yaml


class TestE2EWorkflowFile:
    """测试 .github/workflows/ci-e2e.yml 文件"""

    @pytest.fixture
    def workflow_path(self) -> Path:
        """获取 ci-e2e.yml 文件路径"""
        return Path(__file__).parent.parent / ".github" / "workflows" / "ci-e2e.yml"

    def test_workflow_file_exists(self, workflow_path: Path) -> None:
        """验证 ci-e2e.yml 文件存在"""
        assert workflow_path.exists(), f"Workflow 文件不存在: {workflow_path}"

    @pytest.fixture
    def workflow_content(self, workflow_path: Path) -> dict[str, Any]:
        """读取 workflow YAML 内容"""
        if not workflow_path.exists():
            pytest.skip("Workflow 文件不存在")

        with open(workflow_path) as f:
            content: dict[str, Any] = yaml.safe_load(f)
            return content

    def test_workflow_name(self, workflow_content: dict[str, Any]) -> None:
        """验证 workflow 名称存在且合理"""
        assert "name" in workflow_content
        assert (
            "e2e" in workflow_content["name"].lower()
            or "playwright" in workflow_content["name"].lower()
        )

    def test_workflow_triggers(self, workflow_content: dict[str, Any]) -> None:
        """验证 workflow 触发条件"""
        # PyYAML 将 "on" 解析为 True（Python 保留字）
        # 所以我们检查 True 键是否存在
        assert True in workflow_content or "on" in workflow_content
        triggers: Any = workflow_content.get(  # noqa: E501
            True, workflow_content.get("on")
        )  # type: ignore[call-overload]

        # 验证至少支持 push 和 pull_request
        assert isinstance(triggers, dict)
        assert "push" in triggers or "pull_request" in triggers

    def test_has_playwright_job(self, workflow_content: dict[str, Any]) -> None:
        """验证包含 Playwright 测试任务"""
        assert "jobs" in workflow_content
        jobs = workflow_content["jobs"]

        # 验证至少有一个 job
        assert len(jobs) > 0

        # 验证存在 E2E 或 Playwright 相关的 job
        job_names = list(jobs.keys())
        has_e2e_job = any(
            "e2e" in name.lower() or "playwright" in name.lower() for name in job_names
        )
        assert (
            has_e2e_job
        ), f"未找到 E2E 或 Playwright 相关的 job, 现有 jobs: {job_names}"


class TestPlaywrightJobConfiguration:
    """测试 Playwright Job 配置"""

    @pytest.fixture
    def workflow_path(self) -> Path:
        """获取 workflow 文件路径"""
        return Path(__file__).parent.parent / ".github" / "workflows" / "ci-e2e.yml"

    @pytest.fixture
    def workflow_content(self, workflow_path: Path) -> dict[str, Any]:
        """读取 workflow 内容"""
        if not workflow_path.exists():
            pytest.skip("Workflow 文件不存在")

        with open(workflow_path) as f:
            content: dict[str, Any] = yaml.safe_load(f)
            return content

    @pytest.fixture
    def playwright_job(self, workflow_content: dict[str, Any]) -> dict[str, Any]:
        """获取 Playwright 相关的 job"""
        jobs: dict[str, Any] = workflow_content["jobs"]

        # 查找 E2E 或 Playwright 相关的 job
        for name, job in jobs.items():
            if "e2e" in name.lower() or "playwright" in name.lower():
                return job  # type: ignore[no-any-return]

        pytest.skip("未找到 Playwright 相关的 job")
        return {}  # unreachable, but type checker needs it

    def test_job_uses_ubuntu_runner(self, playwright_job: dict[str, Any]) -> None:
        """验证使用 Ubuntu 运行器"""
        assert "runs-on" in playwright_job
        assert "ubuntu" in playwright_job["runs-on"].lower()

    def test_install_nodejs_step(self, playwright_job: dict[str, Any]) -> None:
        """验证安装 Node.js 的步骤"""
        steps = playwright_job.get("steps", [])
        step_names = [step.get("name", "") for step in steps]

        # 验证有设置 Node.js 的步骤
        has_node_setup = any(
            "node" in name.lower() or "setup" in name.lower() for name in step_names
        )
        assert has_node_setup, f"未找到安装 Node.js 的步骤, 现有步骤: {step_names}"

    def test_install_dependencies_step(self, playwright_job: dict[str, Any]) -> None:
        """验证安装依赖的步骤"""
        steps = playwright_job.get("steps", [])
        step_names = [step.get("name", "") for step in steps]

        # 验证有安装依赖的步骤
        has_install = any(
            "install" in name.lower() or "依赖" in name or "npm ci" in name
            for name in step_names
        )
        assert has_install, f"未找到安装依赖的步骤, 现有步骤: {step_names}"

    def test_install_playwright_browsers_step(
        self, playwright_job: dict[str, Any]
    ) -> None:
        """验证安装 Playwright 浏览器的步骤"""
        steps = playwright_job.get("steps", [])
        step_names = [str(step.get("run", "")) for step in steps]
        step_names += [step.get("name", "") for step in steps]

        # 验证有安装 Playwright 浏览器的命令
        has_browser_install = any(
            "playwright install" in cmd.lower() for cmd in step_names
        )
        assert has_browser_install, "未找到安装 Playwright 浏览器的步骤"

    def test_run_e2e_tests_step(self, playwright_job: dict[str, Any]) -> None:
        """验证运行 E2E 测试的步骤"""
        steps = playwright_job.get("steps", [])

        # 验证有运行测试的步骤
        has_test_run = any(
            "test" in step.get("run", "").lower()
            or "test" in step.get("name", "").lower()
            for step in steps
        )
        assert has_test_run, "未找到运行 E2E 测试的步骤"


class TestTestReportConfiguration:
    """测试测试报告配置"""

    @pytest.fixture
    def workflow_path(self) -> Path:
        """获取 workflow 文件路径"""
        return Path(__file__).parent.parent / ".github" / "workflows" / "ci-e2e.yml"

    @pytest.fixture
    def workflow_content(self, workflow_path: Path) -> dict[str, Any]:
        """读取 workflow 内容"""
        if not workflow_path.exists():
            pytest.skip("Workflow 文件不存在")

        with open(workflow_path) as f:
            content: dict[str, Any] = yaml.safe_load(f)
            return content

    @pytest.fixture
    def playwright_job(self, workflow_path: Path) -> dict[str, Any]:
        """获取 Playwright job"""
        if not workflow_path.exists():
            pytest.skip("Workflow 文件不存在")

        with open(workflow_path) as f:
            content: dict[str, Any] = yaml.safe_load(f)
            jobs: dict[str, Any] = content["jobs"]

        for name, job in jobs.items():
            if "e2e" in name.lower() or "playwright" in name.lower():
                return job  # type: ignore[no-any-return]

        pytest.skip("未找到 Playwright 相关的 job")
        return {}

    def test_upload_test_results(self, playwright_job: dict[str, Any]) -> None:
        """验证上传测试结果为 artifact"""
        steps = playwright_job.get("steps", [])

        # 验证有上传 artifact 的步骤
        has_upload = any(
            "upload" in step.get("uses", "").lower()
            and "artifact" in step.get("uses", "").lower()
            for step in steps
        )
        assert has_upload, "未找到上传测试结果的 artifact 配置"

    def test_upload_html_report(self, playwright_job: dict[str, Any]) -> None:
        """验证上传 HTML 测试报告"""
        steps = playwright_job.get("steps", [])

        # 验证有上传 HTML 报告的步骤
        has_report_upload = False
        for step in steps:
            uses = step.get("uses", "")
            if "upload" in uses.lower() and "artifact" in uses.lower():
                # 检查 artifact 名称包含 report 或 playwright-report
                name = step.get("with", {}).get("name", "")
                if "report" in name.lower() or "playwright" in name.lower():
                    has_report_upload = True
                    break

        assert has_report_upload, "未找到上传 HTML 测试报告的配置"

    def test_retain_test_artifacts_on_failure(
        self, playwright_job: dict[str, Any]
    ) -> None:
        """验证失败时保留测试产物（截图、视频、追踪）"""
        steps = playwright_job.get("steps", [])

        # 验证配置了失败时保留产物的步骤
        # 通常通过 if: failure() 实现
        has_failure_condition = any(
            step.get("if", "") == "failure()"
            or "failure" in str(step.get("if", "")).lower()
            for step in steps
        )

        # 或者检查上传 artifact 时包含失败产物
        has_failure_artifacts = False
        for step in steps:
            uses = step.get("uses", "")
            if "upload" in uses.lower() and "artifact" in uses.lower():
                path = step.get("with", {}).get("path", "")
                if any(
                    name in path
                    for name in [
                        "test-results",
                        "playwright-report",
                        "screenshots",
                        "videos",
                    ]
                ):
                    has_failure_artifacts = True
                    break

        assert (
            has_failure_condition or has_failure_artifacts
        ), "未找到失败时保留测试产物的配置"
