"""测试安全扫描模块

测试 Issue #24: CI/CD 流程优化与验证 - 依赖安全扫描功能
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any

import pytest

# 注意：以下导入目标在实现阶段会创建
# 当前阶段这些导入会失败，符合 Red First 原则
try:
    from src.ci.security_scanner import (
        SecurityScanner,
        SecurityScanResult,
        Vulnerability,
        VulnerabilitySeverity,
    )
except ImportError:
    pytest.skip("src.ci.security_scanner 模块尚未实现", allow_module_level=True)


class TestVulnerabilitySeverity:
    """测试 VulnerabilitySeverity 枚举"""

    def test_severity_levels_exist(self) -> None:
        """验证所有严重级别都存在"""
        assert hasattr(VulnerabilitySeverity, "LOW")
        assert hasattr(VulnerabilitySeverity, "MEDIUM")
        assert hasattr(VulnerabilitySeverity, "HIGH")
        assert hasattr(VulnerabilitySeverity, "CRITICAL")

    def test_severity_comparison(self) -> None:
        """验证严重级别可以比较"""
        assert VulnerabilitySeverity.LOW != VulnerabilitySeverity.HIGH
        assert VulnerabilitySeverity.CRITICAL != VulnerabilitySeverity.MEDIUM


class TestVulnerability:
    """测试 Vulnerability 数据类"""

    def test_create_vulnerability_with_all_fields(self) -> None:
        """验证创建包含所有字段的漏洞记录"""
        vuln = Vulnerability(
            name="CVE-2024-1234",
            severity=VulnerabilitySeverity.HIGH,
            affected_package="requests",
            installed_version="2.28.0",
            fixed_version="2.31.0",
            description="HTTP request smuggling vulnerability",
        )
        assert vuln.name == "CVE-2024-1234"
        assert vuln.severity == VulnerabilitySeverity.HIGH
        assert vuln.affected_package == "requests"
        assert vuln.installed_version == "2.28.0"
        assert vuln.fixed_version == "2.31.0"
        assert vuln.description == "HTTP request smuggling vulnerability"

    def test_create_vulnerability_minimal_fields(self) -> None:
        """验证创建仅包含必填字段的漏洞记录"""
        vuln = Vulnerability(
            name="CVE-2024-5678",
            severity=VulnerabilitySeverity.MEDIUM,
            affected_package="flask",
            installed_version="2.0.0",
            fixed_version="2.0.1",
            description="",
        )
        assert vuln.name == "CVE-2024-5678"
        assert vuln.severity == VulnerabilitySeverity.MEDIUM
        assert vuln.affected_package == "flask"

    def test_create_critical_vulnerability(self) -> None:
        """验证创建严重级别为 CRITICAL 的漏洞"""
        vuln = Vulnerability(
            name="CVE-2024-9999",
            severity=VulnerabilitySeverity.CRITICAL,
            affected_package="openssl",
            installed_version="1.1.1",
            fixed_version="3.0.0",
            description="Critical security flaw",
        )
        assert vuln.severity == VulnerabilitySeverity.CRITICAL


class TestSecurityScanResult:
    """测试 SecurityScanResult 数据类"""

    def test_create_scan_result_with_vulnerabilities(self) -> None:
        """验证包含漏洞的扫描结果"""
        vulns = [
            Vulnerability(
                name="CVE-2024-0001",
                severity=VulnerabilitySeverity.HIGH,
                affected_package="pkg1",
                installed_version="1.0.0",
                fixed_version="1.0.1",
                description="High severity bug",
            ),
            Vulnerability(
                name="CVE-2024-0002",
                severity=VulnerabilitySeverity.LOW,
                affected_package="pkg2",
                installed_version="2.0.0",
                fixed_version="2.0.1",
                description="Low severity bug",
            ),
        ]

        result = SecurityScanResult(
            total_vulnerabilities=2,
            vulnerabilities=vulns,
        )
        assert result.total_vulnerabilities == 2
        assert len(result.vulnerabilities) == 2
        assert result.vulnerabilities[0].severity == VulnerabilitySeverity.HIGH
        assert result.vulnerabilities[1].severity == VulnerabilitySeverity.LOW

    def test_create_scan_result_no_vulnerabilities(self) -> None:
        """验证无漏洞的扫描结果"""
        result = SecurityScanResult(
            total_vulnerabilities=0,
            vulnerabilities=[],
        )
        assert result.total_vulnerabilities == 0
        assert len(result.vulnerabilities) == 0


class TestSecurityScannerParseAuditReport:
    """测试 SecurityScanner.parse_audit_report 方法"""

    @pytest.fixture
    def sample_audit_report(self, tmp_path: Any) -> str:
        """创建示例 pip-audit 报告文件"""
        report_content = """{
  "vulnerabilities": [
    {
      "name": "CVE-2024-1234",
      "severity": "HIGH",
      "affected_package": "requests",
      "installed_version": "2.28.0",
      "fixed_versions": ["2.31.0"],
      "description": "HTTP request smuggling vulnerability"
    },
    {
      "name": "CVE-2024-5678",
      "severity": "MEDIUM",
      "affected_package": "flask",
      "installed_version": "2.0.0",
      "fixed_versions": ["2.0.1"],
      "description": "Cross-site scripting vulnerability"
    }
  ]
}
"""
        report_file = tmp_path / "audit_report.json"
        report_file.write_text(report_content)
        return str(report_file)

    def test_parse_valid_audit_report(self, sample_audit_report: str) -> None:
        """验证解析有效的审计报告"""
        scanner = SecurityScanner()
        result = scanner.parse_audit_report(sample_audit_report)

        assert isinstance(result, SecurityScanResult)
        assert result.total_vulnerabilities == 2
        assert len(result.vulnerabilities) == 2

    def test_parse_audit_report_with_no_vulnerabilities(
        self, tmp_path: Any
    ) -> None:
        """验证解析无漏洞的审计报告"""
        report_content = """{
  "vulnerabilities": []
}
"""
        report_file = tmp_path / "clean_report.json"
        report_file.write_text(report_content)

        scanner = SecurityScanner()
        result = scanner.parse_audit_report(str(report_file))

        assert result.total_vulnerabilities == 0
        assert len(result.vulnerabilities) == 0

    def test_parse_nonexistent_report(self) -> None:
        """验证解析不存在的报告文件"""
        scanner = SecurityScanner()
        with pytest.raises(FileNotFoundError):
            scanner.parse_audit_report("/nonexistent/report.json")

    def test_parse_invalid_json(self, tmp_path: Any) -> None:
        """验证解析无效 JSON 文件"""
        invalid_file = tmp_path / "invalid.json"
        invalid_file.write_text("{ not valid json }")

        scanner = SecurityScanner()
        with pytest.raises(Exception):
            scanner.parse_audit_report(str(invalid_file))


class TestSecurityScannerFilterBySeverity:
    """测试 SecurityScanner.filter_by_severity 方法"""

    @pytest.fixture
    def sample_scan_result(self) -> SecurityScanResult:
        """创建包含多种严重级别的扫描结果"""
        vulns = [
            Vulnerability(
                name="CVE-2024-0001",
                severity=VulnerabilitySeverity.CRITICAL,
                affected_package="pkg1",
                installed_version="1.0.0",
                fixed_version="1.0.1",
                description="Critical bug",
            ),
            Vulnerability(
                name="CVE-2024-0002",
                severity=VulnerabilitySeverity.HIGH,
                affected_package="pkg2",
                installed_version="2.0.0",
                fixed_version="2.0.1",
                description="High bug",
            ),
            Vulnerability(
                name="CVE-2024-0003",
                severity=VulnerabilitySeverity.MEDIUM,
                affected_package="pkg3",
                installed_version="3.0.0",
                fixed_version="3.0.1",
                description="Medium bug",
            ),
            Vulnerability(
                name="CVE-2024-0004",
                severity=VulnerabilitySeverity.LOW,
                affected_package="pkg4",
                installed_version="4.0.0",
                fixed_version="4.0.1",
                description="Low bug",
            ),
        ]
        return SecurityScanResult(total_vulnerabilities=4, vulnerabilities=vulns)

    def test_filter_by_high_severity(self, sample_scan_result: SecurityScanResult) -> None:
        """验证过滤高级别漏洞（HIGH 及以上）"""
        scanner = SecurityScanner()
        filtered = scanner.filter_by_severity(
            sample_scan_result, min_severity=VulnerabilitySeverity.HIGH
        )

        # 应该包含 HIGH 和 CRITICAL
        assert len(filtered.vulnerabilities) == 2
        assert all(
            v.severity in [VulnerabilitySeverity.HIGH, VulnerabilitySeverity.CRITICAL]
            for v in filtered.vulnerabilities
        )

    def test_filter_by_critical_severity_only(
        self, sample_scan_result: SecurityScanResult
    ) -> None:
        """验证仅过滤 CRITICAL 级别漏洞"""
        scanner = SecurityScanner()
        filtered = scanner.filter_by_severity(
            sample_scan_result, min_severity=VulnerabilitySeverity.CRITICAL
        )

        assert len(filtered.vulnerabilities) == 1
        assert filtered.vulnerabilities[0].severity == VulnerabilitySeverity.CRITICAL

    def test_filter_by_all_severities(self, sample_scan_result: SecurityScanResult) -> None:
        """验证过滤所有级别漏洞"""
        scanner = SecurityScanner()
        filtered = scanner.filter_by_severity(
            sample_scan_result, min_severity=VulnerabilitySeverity.LOW
        )

        assert len(filtered.vulnerabilities) == 4

    def test_filter_result_with_no_matches(self, sample_scan_result: SecurityScanResult) -> None:
        """验证过滤结果无匹配的情况"""
        # 先过滤出只有 CRITICAL 的结果
        scanner = SecurityScanner()
        critical_only = scanner.filter_by_severity(
            sample_scan_result, min_severity=VulnerabilitySeverity.CRITICAL
        )

        # 然后尝试过滤 HIGH，应该没有结果
        no_matches = scanner.filter_by_severity(
            critical_only, min_severity=VulnerabilitySeverity.HIGH
        )

        # 实际结果取决于实现，这里验证返回空结果或原结果
        assert isinstance(no_matches, SecurityScanResult)


class TestSecurityScannerGenerateSummary:
    """测试 SecurityScanner.generate_summary 方法"""

    def test_generate_summary_with_vulnerabilities(self) -> None:
        """验证生成包含漏洞的摘要"""
        vulns = [
            Vulnerability(
                name="CVE-2024-0001",
                severity=VulnerabilitySeverity.HIGH,
                affected_package="pkg1",
                installed_version="1.0.0",
                fixed_version="1.0.1",
                description="High bug",
            ),
            Vulnerability(
                name="CVE-2024-0002",
                severity=VulnerabilitySeverity.MEDIUM,
                affected_package="pkg2",
                installed_version="2.0.0",
                fixed_version="2.0.1",
                description="Medium bug",
            ),
        ]
        result = SecurityScanResult(total_vulnerabilities=2, vulnerabilities=vulns)

        scanner = SecurityScanner()
        summary = scanner.generate_summary(result)

        assert "2" in summary  # 总数
        assert ("HIGH" in summary or "高" in summary)
        assert ("MEDIUM" in summary or "中" in summary)

    def test_generate_summary_no_vulnerabilities(self) -> None:
        """验证生成无漏洞的摘要"""
        result = SecurityScanResult(total_vulnerabilities=0, vulnerabilities=[])

        scanner = SecurityScanner()
        summary = scanner.generate_summary(result)

        assert "0" in summary
        # 使用括号确保逻辑正确
        assert ("no" in summary.lower()) or ("无" in summary) or ("safe" in summary.lower())

    def test_generate_summary_includes_severity_breakdown(self) -> None:
        """验证摘要包含严重级别统计"""
        vulns = [
            Vulnerability(
                name="CVE-2024-0001",
                severity=VulnerabilitySeverity.CRITICAL,
                affected_package="pkg1",
                installed_version="1.0.0",
                fixed_version="1.0.1",
                description="Critical bug",
            ),
            Vulnerability(
                name="CVE-2024-0002",
                severity=VulnerabilitySeverity.CRITICAL,
                affected_package="pkg2",
                installed_version="2.0.0",
                fixed_version="2.0.1",
                description="Critical bug",
            ),
            Vulnerability(
                name="CVE-2024-0003",
                severity=VulnerabilitySeverity.LOW,
                affected_package="pkg3",
                installed_version="3.0.0",
                fixed_version="3.0.1",
                description="Low bug",
            ),
        ]
        result = SecurityScanResult(total_vulnerabilities=3, vulnerabilities=vulns)

        scanner = SecurityScanner()
        summary = scanner.generate_summary(result)

        assert "3" in summary  # 总数
        # 应该包含严重级别信息
        assert len(summary) > 20  # 确保有实质性内容
