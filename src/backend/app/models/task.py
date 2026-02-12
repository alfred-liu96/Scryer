"""Task 模型

异步任务模型，管理异步任务的生命周期
"""

from enum import Enum
from typing import Any
from sqlalchemy import Index, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class TaskStatus(str, Enum):
    """任务状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskType(str, Enum):
    """任务类型枚举"""
    SEARCH = "search"
    CRAWL = "crawl"
    ANALYZE = "analyze"


class Task(Base):
    """异步任务模型

    职责：
    - 管理异步任务的生命周期
    - 存储任务输入 (payload) 和输出 (result)
    - 记录任务执行状态和错误信息

    约束：
    - task_type: 必填，任务类型
    - status: 必填，任务状态 (见 TaskStatus)
    - payload: 可选，JSONB 格式的任务输入
    - result: 可选，JSONB 格式的任务输出
    - error_message: 可选，失败时记录错误信息
    """

    __tablename__ = "tasks"

    # 业务字段
    task_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="任务类型"
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=TaskStatus.PENDING,
        comment="任务状态"
    )
    payload: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="任务负载 (输入参数)"
    )
    result: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="任务结果 (输出数据)"
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="错误信息"
    )

    # 索引
    __table_args__ = (
        Index('idx_tasks_status', 'status'),
        Index('idx_tasks_task_type', 'task_type'),
        Index('idx_tasks_created_at', 'created_at'),
        Index('idx_tasks_status_created', 'status', 'created_at'),
    )

    def __repr__(self) -> str:
        """字符串表示"""
        return f"Task(id={self.id}, type={self.task_type}, status={self.status})"

    def is_finished(self) -> bool:
        """判断任务是否已完成（成功或失败）"""
        return self.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED)

    def is_running(self) -> bool:
        """判断任务是否正在运行"""
        return self.status == TaskStatus.RUNNING
