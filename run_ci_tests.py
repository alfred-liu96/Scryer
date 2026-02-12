#!/usr/bin/env python3
"""CI 模块测试脚本

在没有 pytest 的情况下手动运行测试，验证核心功能。
"""

import sys
import tempfile
import os
import json

sys.path.insert(0, '.')

from src.ci.cov_report import CoverageReporter, CoverageMetrics
from src.ci.docker_validator import DockerValidator, DockerValidationResult
from src.ci.security_scanner import (
    SecurityScanner,
    SecurityScanResult,
    Vulnerability,
    VulnerabilitySeverity,
)


def test_cov_report():
    """测试覆盖率报告模块"""
    print("=" * 60)
    print("测试覆盖率报告模块")
    print("=" * 60)

    # 测试 CoverageMetrics 创建
    print("\n1. 测试 CoverageMetrics 创建")
    metrics = CoverageMetrics(
        line_coverage=85.5,
        branch_coverage=78.2,
        total_lines=1000,
        covered_lines=855,
        total_branches=500,
        covered_branches=391,
    )
    assert metrics.line_coverage == 85.5
    assert metrics.branch_coverage == 78.2
    print("   ✓ CoverageMetrics 创建成功")

    # 测试解析 coverage.xml
    print("\n2. 测试解析 coverage.xml")
    xml_content = """<?xml version="1.0" ?>
<coverage version="7.0">
    <packages>
        <package name="src">
            <classes>
                <class name="example.py">
                    <lines>
                        <line number="1" hits="1"/>
                        <line number="2" hits="1"/>
                        <line number="3" hits="0"/>
                        <line number="4" hits="1"/>
                    </lines>
                </class>
            </classes>
        </package>
    </packages>
</coverage>
"""

    with tempfile.NamedTemporaryFile(mode="w", suffix=".xml", delete=False) as f:
        f.write(xml_content)
        temp_file = f.name

    try:
        reporter = CoverageReporter()
        metrics = reporter.parse_coverage_xml(temp_file)
        assert metrics.total_lines == 4
        assert metrics.covered_lines == 3
        print(f"   ✓ 解析成功: {metrics.covered_lines}/{metrics.total_lines} 行")
    finally:
        os.unlink(temp_file)

    # 测试生成摘要
    print("\n3. 测试生成摘要")
    summary = reporter.generate_summary(metrics)
    assert "75.0%" in summary
    assert "行覆盖率" in summary
    print("   ✓ 摘要生成成功")
    print(f"   {summary.replace(chr(10), '   ' + chr(10))}")

    # 测试阈值验证
    print("\n4. 测试阈值验证")
    result_high = reporter.validate_threshold(metrics, min_line_coverage=70.0)
    assert result_high is True
    result_low = reporter.validate_threshold(metrics, min_line_coverage=80.0)
    assert result_low is False
    print(f"   ✓ 阈值验证: 70%阈值通过, 80%阈值失败 (符合预期)")

    print("\n✅ 覆盖率报告模块测试通过\n")


def test_docker_validator():
    """测试 Docker 验证模块"""
    print("=" * 60)
    print("测试 Docker 验证模块")
    print("=" * 60)

    validator = DockerValidator()

    # 测试 Python 版本检查
    print("\n1. 测试 Python 版本检查")
    result = validator.check_python_version("FROM python:3.12-slim", "3.12")
    assert result.is_valid is True
    assert result.python_version == "3.12"
    print("   ✓ Python 3.12 匹配成功")

    result = validator.check_python_version("FROM python:3.11-slim", "3.12")
    assert result.is_valid is False
    assert "Python version mismatch" in result.errors[0]
    print("   ✓ Python 3.11 不匹配检测成功")

    result = validator.check_python_version("FROM python:3.12-alpine", "3.12")
    assert result.is_valid is True
    print("   ✓ Alpine 变体识别成功")

    # 测试工具验证
    print("\n2. 测试工具验证")
    dockerfile_with_tools = """FROM python:3.12-slim
RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*
"""

    with tempfile.NamedTemporaryFile(mode="w", suffix="Dockerfile", delete=False) as f:
        f.write(dockerfile_with_tools)
        temp_file = f.name

    try:
        result = validator.verify_tools(temp_file, ["git", "curl"])
        if not result.is_valid:
            print(f"   ❌ 验证失败，错误: {result.errors}")
            # 读取文件内容用于调试
            with open(temp_file, 'r') as debug_f:
                content = debug_f.read()
                print(f"   文件内容: {repr(content)}")
        assert result.is_valid is True
        print("   ✓ 所有工具存在: git, curl")

        result = validator.verify_tools(temp_file, ["git", "make"])
        assert result.is_valid is False
        assert any("make" in err.lower() for err in result.errors)
        print("   ✓ 缺少工具检测成功: make")
    finally:
        os.unlink(temp_file)

    # 测试 Dockerfile 验证
    print("\n3. 测试 Dockerfile 验证")
    valid_dockerfile = """FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
"""

    with tempfile.NamedTemporaryFile(mode="w", suffix="Dockerfile", delete=False) as f:
        f.write(valid_dockerfile)
        temp_file = f.name

    try:
        result = validator.validate_build(temp_file)
        assert result.is_valid is True
        print("   ✓ 有效 Dockerfile 验证通过")
    finally:
        os.unlink(temp_file)

    # 测试无效 Dockerfile
    invalid_dockerfile = """FROM invalid:base
RUN this-command-does-not-exist
"""

    with tempfile.NamedTemporaryFile(mode="w", suffix="Dockerfile", delete=False) as f:
        f.write(invalid_dockerfile)
        temp_file = f.name

    try:
        result = validator.validate_build(temp_file)
        assert result.is_valid is False
        assert len(result.errors) > 0
        print("   ✓ 无效 Dockerfile 检测成功")
    finally:
        os.unlink(temp_file)

    print("\n✅ Docker 验证模块测试通过\n")


def test_security_scanner():
    """测试安全扫描模块"""
    print("=" * 60)
    print("测试安全扫描模块")
    print("=" * 60)

    scanner = SecurityScanner()

    # 测试漏洞严重级别
    print("\n1. 测试漏洞严重级别")
    assert hasattr(VulnerabilitySeverity, "LOW")
    assert hasattr(VulnerabilitySeverity, "MEDIUM")
    assert hasattr(VulnerabilitySeverity, "HIGH")
    assert hasattr(VulnerabilitySeverity, "CRITICAL")
    print("   ✓ 所有严重级别定义正确")

    # 测试漏洞创建
    print("\n2. 测试漏洞创建")
    vuln = Vulnerability(
        name="CVE-2024-1234",
        severity=VulnerabilitySeverity.HIGH,
        affected_package="requests",
        installed_version="2.28.0",
        fixed_version="2.31.0",
        description="HTTP request smuggling",
    )
    assert vuln.name == "CVE-2024-1234"
    assert vuln.severity == VulnerabilitySeverity.HIGH
    print("   ✓ Vulnerability 对象创建成功")

    # 测试解析审计报告
    print("\n3. 测试解析审计报告")
    report_data = {
        "vulnerabilities": [
            {
                "name": "CVE-2024-0001",
                "severity": "HIGH",
                "affected_package": "pkg1",
                "installed_version": "1.0.0",
                "fixed_versions": ["1.0.1"],
                "description": "High severity bug",
            },
            {
                "name": "CVE-2024-0002",
                "severity": "MEDIUM",
                "affected_package": "pkg2",
                "installed_version": "2.0.0",
                "fixed_versions": ["2.0.1"],
                "description": "Medium severity bug",
            },
        ]
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(report_data, f)
        temp_file = f.name

    try:
        result = scanner.parse_audit_report(temp_file)
        assert result.total_vulnerabilities == 2
        assert len(result.vulnerabilities) == 2
        print(f"   ✓ 解析成功: {result.total_vulnerabilities} 个漏洞")
    finally:
        os.unlink(temp_file)

    # 测试严重级别过滤
    print("\n4. 测试严重级别过滤")
    high_and_above = scanner.filter_by_severity(result, VulnerabilitySeverity.HIGH)
    assert len(high_and_above.vulnerabilities) == 1
    print(f"   ✓ HIGH 及以上: {len(high_and_above.vulnerabilities)} 个")

    all_vulns = scanner.filter_by_severity(result, VulnerabilitySeverity.LOW)
    assert len(all_vulns.vulnerabilities) == 2
    print(f"   ✓ 所有级别: {len(all_vulns.vulnerabilities)} 个")

    # 测试摘要生成
    print("\n5. 测试摘要生成")
    summary = scanner.generate_summary(result)
    assert "2" in summary
    assert "HIGH" in summary
    print("   ✓ 摘要生成成功")
    print(f"   {summary.replace(chr(10), '   ' + chr(10))}")

    # 测试无漏洞情况
    print("\n6. 测试无漏洞情况")
    clean_report_data = {"vulnerabilities": []}
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(clean_report_data, f)
        temp_file = f.name

    try:
        result = scanner.parse_audit_report(temp_file)
        assert result.total_vulnerabilities == 0
        summary = scanner.generate_summary(result)
        # 检查摘要中包含"未发现"或"0"（取决于实际输出）
        assert "未发现" in summary or "0" in summary or "no" in summary.lower()
        print("   ✓ 无漏洞报告处理成功")
    finally:
        os.unlink(temp_file)

    print("\n✅ 安全扫描模块测试通过\n")


def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("CI/CD 模块集成测试")
    print("=" * 60 + "\n")

    try:
        test_cov_report()
        test_docker_validator()
        test_security_scanner()

        print("=" * 60)
        print("🎉 所有测试通过！")
        print("=" * 60 + "\n")
        return 0

    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback

        traceback.print_exc()
        return 1

    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
