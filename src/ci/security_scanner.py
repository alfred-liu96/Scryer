"""安全扫描模块

提供依赖安全扫描功能，解析 pip-audit 报告。
Issue #24: CI/CD 流程优化与验证
"""

import json
from dataclasses import dataclass
from enum import Enum


class VulnerabilitySeverity(Enum):
    """漏洞严重级别"""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class Vulnerability:
    """漏洞信息

    Attributes:
        name: 漏洞名称（如 CVE 编号）
        severity: 严重级别
        affected_package: 受影响的包名
        installed_version: 已安装的版本
        fixed_version: 修复版本
        description: 漏洞描述
    """

    name: str
    severity: VulnerabilitySeverity
    affected_package: str
    installed_version: str
    fixed_version: str
    description: str


@dataclass
class SecurityScanResult:
    """安全扫描结果

    Attributes:
        total_vulnerabilities: 漏洞总数
        vulnerabilities: 漏洞列表
    """

    total_vulnerabilities: int
    vulnerabilities: list[Vulnerability]


class SecurityScanner:
    """安全扫描器

    用于解析 pip-audit 生成的安全报告。
    """

    def parse_audit_report(self, report_path: str) -> SecurityScanResult:
        """解析 pip-audit 报告文件

        Args:
            report_path: 报告文件路径（JSON 格式）

        Returns:
            SecurityScanResult 对象

        Raises:
            FileNotFoundError: 文件不存在
            Exception: JSON 解析错误
        """
        try:
            with open(report_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            vulnerabilities_list = data.get("vulnerabilities", [])
            vulnerabilities: list[Vulnerability] = []

            for vuln_data in vulnerabilities_list:
                # 解析严重级别
                severity_str = vuln_data.get("severity", "UNKNOWN").upper()
                try:
                    severity = VulnerabilitySeverity(severity_str)
                except ValueError:
                    severity = VulnerabilitySeverity.LOW  # 默认为低级别

                # 解析修复版本（取第一个）
                fixed_versions = vuln_data.get("fixed_versions", [])
                fixed_version = fixed_versions[0] if fixed_versions else "unknown"

                vulnerability = Vulnerability(
                    name=vuln_data.get("name", "UNKNOWN"),
                    severity=severity,
                    affected_package=vuln_data.get("affected_package", "unknown"),
                    installed_version=vuln_data.get("installed_version", "unknown"),
                    fixed_version=fixed_version,
                    description=vuln_data.get("description", ""),
                )
                vulnerabilities.append(vulnerability)

            return SecurityScanResult(
                total_vulnerabilities=len(vulnerabilities),
                vulnerabilities=vulnerabilities,
            )

        except FileNotFoundError:
            raise
        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON format: {e}")
        except Exception as e:
            raise Exception(f"Failed to parse audit report: {e}")

    def filter_by_severity(
        self, result: SecurityScanResult, min_severity: VulnerabilitySeverity
    ) -> SecurityScanResult:
        """按严重级别过滤漏洞

        Args:
            result: 原始扫描结果
            min_severity: 最小严重级别

        Returns:
            过滤后的 SecurityScanResult 对象
        """
        # 定义严重级别的顺序（从低到高）
        severity_order = {
            VulnerabilitySeverity.LOW: 1,
            VulnerabilitySeverity.MEDIUM: 2,
            VulnerabilitySeverity.HIGH: 3,
            VulnerabilitySeverity.CRITICAL: 4,
        }

        min_level = severity_order[min_severity]

        filtered_vulns = [
            v
            for v in result.vulnerabilities
            if severity_order[v.severity] >= min_level
        ]

        return SecurityScanResult(
            total_vulnerabilities=len(filtered_vulns),
            vulnerabilities=filtered_vulns,
        )

    def generate_summary(self, result: SecurityScanResult) -> str:
        """生成安全扫描摘要

        Args:
            result: 扫描结果

        Returns:
            格式化的摘要字符串
        """
        if result.total_vulnerabilities == 0:
            return "安全扫描完成：发现 0 个漏洞"

        # 统计各级别漏洞数量
        severity_counts = {
            VulnerabilitySeverity.CRITICAL: 0,
            VulnerabilitySeverity.HIGH: 0,
            VulnerabilitySeverity.MEDIUM: 0,
            VulnerabilitySeverity.LOW: 0,
        }

        for vuln in result.vulnerabilities:
            severity_counts[vuln.severity] += 1

        summary_lines = [
            f"安全扫描完成：发现 {result.total_vulnerabilities} 个漏洞",
            f"  - CRITICAL: {severity_counts[VulnerabilitySeverity.CRITICAL]}",
            f"  - HIGH: {severity_counts[VulnerabilitySeverity.HIGH]}",
            f"  - MEDIUM: {severity_counts[VulnerabilitySeverity.MEDIUM]}",
            f"  - LOW: {severity_counts[VulnerabilitySeverity.LOW]}",
        ]

        return "\n".join(summary_lines)
