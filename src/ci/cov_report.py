"""代码覆盖率报告模块

提供解析和处理 pytest-cov 生成的覆盖率报告的功能。
Issue #24: CI/CD 流程优化与验证
"""

import xml.etree.ElementTree as ET
from dataclasses import dataclass


@dataclass
class CoverageMetrics:
    """代码覆盖率指标

    Attributes:
        line_coverage: 行覆盖率百分比 (0-100)
        branch_coverage: 分支覆盖率百分比 (0-100)
        total_lines: 总行数
        covered_lines: 已覆盖的行数
        total_branches: 总分支数
        covered_branches: 已覆盖的分支数
    """

    line_coverage: float
    branch_coverage: float
    total_lines: int
    covered_lines: int
    total_branches: int
    covered_branches: int


class CoverageReporter:
    """覆盖率报告处理器

    用于解析 coverage.xml 文件并生成覆盖率摘要和验证结果。
    """

    def parse_coverage_xml(self, xml_path: str) -> CoverageMetrics | None:
        """解析 coverage.xml 文件

        Args:
            xml_path: coverage.xml 文件路径

        Returns:
            CoverageMetrics 对象，解析失败时返回 None

        Raises:
            FileNotFoundError: 文件不存在
            Exception: XML 解析错误
        """
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()

            # 统计总行数和已覆盖行数
            total_lines = 0
            covered_lines = 0

            for line in root.findall(".//line"):
                total_lines += 1
                hits = int(line.get("hits", 0))
                if hits > 0:
                    covered_lines += 1

            # 计算行覆盖率
            line_coverage = (
                (covered_lines / total_lines * 100) if total_lines > 0 else 0.0
            )

            # 目前没有分支信息，使用默认值
            branch_coverage = 0.0
            total_branches = 0
            covered_branches = 0

            return CoverageMetrics(
                line_coverage=line_coverage,
                branch_coverage=branch_coverage,
                total_lines=total_lines,
                covered_lines=covered_lines,
                total_branches=total_branches,
                covered_branches=covered_branches,
            )
        except FileNotFoundError:
            raise
        except Exception as e:
            raise Exception(f"Failed to parse coverage XML: {e}")

    def generate_summary(self, metrics: CoverageMetrics) -> str:
        """生成覆盖率摘要

        Args:
            metrics: 覆盖率指标

        Returns:
            格式化的摘要字符串
        """
        summary_lines = [
            f"代码覆盖率报告",
            f"行覆盖率: {metrics.line_coverage:.1f}% ({metrics.covered_lines}/{metrics.total_lines})",
            f"分支覆盖率: {metrics.branch_coverage:.1f}% ({metrics.covered_branches}/{metrics.total_branches})",
        ]
        return "\n".join(summary_lines)

    def validate_threshold(
        self, metrics: CoverageMetrics, min_line_coverage: float = 80.0
    ) -> bool:
        """验证覆盖率是否达到阈值

        Args:
            metrics: 覆盖率指标
            min_line_coverage: 最小行覆盖率阈值

        Returns:
            是否达到阈值要求
        """
        return metrics.line_coverage >= min_line_coverage
