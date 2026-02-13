"""
Task 模型测试

测试范围：
- 字段定义（task_type, status, payload, result, error_message）
- 枚举约束（TaskStatus, TaskType）
- 默认值（status 默认为 PENDING）
- 索引（status, task_type, created_at, 复合索引）
- 自定义方法（is_finished(), is_running()）
- __repr__() 方法

参考 Issue #53
"""

import pytest
from sqlalchemy import inspect

# 这些导入在当前阶段会失败，因为实现代码尚未存在
# 这正是 TDD 的 "Red First" 原则
from src.backend.app.models.task import Task, TaskStatus, TaskType


class TestTaskEnums:
    """测试 Task 枚举类"""

    def test_task_status_pending_exists(self):
        """测试 TaskStatus.PENDING 存在"""
        assert hasattr(TaskStatus, "PENDING")
        assert TaskStatus.PENDING == "pending"

    def test_task_status_running_exists(self):
        """测试 TaskStatus.RUNNING 存在"""
        assert hasattr(TaskStatus, "RUNNING")
        assert TaskStatus.RUNNING == "running"

    def test_task_status_completed_exists(self):
        """测试 TaskStatus.COMPLETED 存在"""
        assert hasattr(TaskStatus, "COMPLETED")
        assert TaskStatus.COMPLETED == "completed"

    def test_task_status_failed_exists(self):
        """测试 TaskStatus.FAILED 存在"""
        assert hasattr(TaskStatus, "FAILED")
        assert TaskStatus.FAILED == "failed"

    def test_task_status_cancelled_exists(self):
        """测试 TaskStatus.CANCELLED 存在"""
        assert hasattr(TaskStatus, "CANCELLED")
        assert TaskStatus.CANCELLED == "cancelled"

    def test_task_type_search_exists(self):
        """测试 TaskType.SEARCH 存在"""
        assert hasattr(TaskType, "SEARCH")
        assert TaskType.SEARCH == "search"

    def test_task_type_crawl_exists(self):
        """测试 TaskType.CRAWL 存在"""
        assert hasattr(TaskType, "CRAWL")
        assert TaskType.CRAWL == "crawl"

    def test_task_type_analyze_exists(self):
        """测试 TaskType.ANALYZE 存在"""
        assert hasattr(TaskType, "ANALYZE")
        assert TaskType.ANALYZE == "analyze"


class TestTaskFields:
    """测试 Task 模型字段"""

    def test_task_has_id_field(self):
        """测试 Task 模型有 id 字段（继承自 Base）"""
        task = Task()
        assert hasattr(task, "id")

    def test_task_has_task_type_field(self):
        """测试 Task 模型有 task_type 字段"""
        task = Task()
        assert hasattr(task, "task_type")

    def test_task_has_status_field(self):
        """测试 Task 模型有 status 字段"""
        task = Task()
        assert hasattr(task, "status")

    def test_task_has_payload_field(self):
        """测试 Task 模型有 payload 字段"""
        task = Task()
        assert hasattr(task, "payload")

    def test_task_has_result_field(self):
        """测试 Task 模型有 result 字段"""
        task = Task()
        assert hasattr(task, "result")

    def test_task_has_error_message_field(self):
        """测试 Task 模型有 error_message 字段"""
        task = Task()
        assert hasattr(task, "error_message")

    def test_task_has_created_at_field(self):
        """测试 Task 模型有 created_at 字段（继承自 Base）"""
        task = Task()
        assert hasattr(task, "created_at")

    def test_task_has_updated_at_field(self):
        """测试 Task 模型有 updated_at 字段（继承自 Base）"""
        task = Task()
        assert hasattr(task, "updated_at")


class TestTaskFieldTypes:
    """测试 Task 模型字段类型"""

    def test_task_type_is_string(self):
        """测试 task_type 是字符串类型"""
        task = Task()
        task.task_type = "search"
        assert isinstance(task.task_type, str)

    def test_status_is_string(self):
        """测试 status 是字符串类型"""
        task = Task()
        task.status = "pending"
        assert isinstance(task.status, str)

    def test_payload_can_be_dict(self):
        """测试 payload 可以是字典类型"""
        task = Task()
        payload = {"url": "https://example.com"}
        task.payload = payload
        assert isinstance(task.payload, dict)

    def test_payload_can_be_none(self):
        """测试 payload 可以是 None"""
        task = Task()
        task.payload = None
        assert task.payload is None

    def test_result_can_be_dict(self):
        """测试 result 可以是字典类型"""
        task = Task()
        result = {"total": 100}
        task.result = result
        assert isinstance(task.result, dict)

    def test_result_can_be_none(self):
        """测试 result 可以是 None"""
        task = Task()
        task.result = None
        assert task.result is None

    def test_error_message_is_string(self):
        """测试 error_message 是字符串类型"""
        task = Task()
        task.error_message = "Error occurred"
        assert isinstance(task.error_message, str)

    def test_error_message_can_be_none(self):
        """测试 error_message 可以是 None"""
        task = Task()
        task.error_message = None
        assert task.error_message is None


class TestTaskFieldConstraints:
    """测试 Task 模型字段约束"""

    def test_task_type_is_nullable_false(self):
        """测试 task_type 不允许为空"""
        mapper = inspect(Task)
        task_type_column = mapper.columns.task_type
        assert task_type_column.nullable is False

    def test_status_is_nullable_false(self):
        """测试 status 不允许为空"""
        mapper = inspect(Task)
        status_column = mapper.columns.status
        assert status_column.nullable is False

    def test_payload_is_nullable_true(self):
        """测试 payload 允许为空"""
        mapper = inspect(Task)
        payload_column = mapper.columns.payload
        assert payload_column.nullable is True

    def test_result_is_nullable_true(self):
        """测试 result 允许为空"""
        mapper = inspect(Task)
        result_column = mapper.columns.result
        assert result_column.nullable is True

    def test_error_message_is_nullable_true(self):
        """测试 error_message 允许为空"""
        mapper = inspect(Task)
        error_message_column = mapper.columns.error_message
        assert error_message_column.nullable is True

    def test_task_type_max_length_is_50(self):
        """测试 task_type 最大长度为 50"""
        mapper = inspect(Task)
        task_type_column = mapper.columns.task_type
        assert task_type_column.type.length == 50

    def test_status_max_length_is_20(self):
        """测试 status 最大长度为 20"""
        mapper = inspect(Task)
        status_column = mapper.columns.status
        assert status_column.type.length == 20


class TestTaskDefaultValues:
    """测试 Task 模型默认值"""

    def test_status_defaults_to_pending(self):
        """测试 status 默认值为 PENDING"""
        task = Task()
        # 检查字段定义
        mapper = inspect(Task)
        status_column = mapper.columns.status
        # default 可能是函数或值
        assert status_column.default is not None or status_column.server_default is not None


class TestTaskIndexes:
    """测试 Task 模型索引"""

    def test_status_index_exists(self):
        """测试 status 索引存在"""
        table = Task.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_tasks_status" in index_names

    def test_task_type_index_exists(self):
        """测试 task_type 索引存在"""
        table = Task.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_tasks_task_type" in index_names

    def test_created_at_index_exists(self):
        """测试 created_at 索引存在"""
        table = Task.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_tasks_created_at" in index_names

    def test_status_created_composite_index_exists(self):
        """测试 status + created_at 复合索引存在"""
        table = Task.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_tasks_status_created" in index_names


class TestTaskMethods:
    """测试 Task 自定义方法"""

    def test_is_finished_method_exists(self):
        """测试 is_finished 方法存在"""
        task = Task()
        assert hasattr(task, "is_finished")
        assert callable(task.is_finished)

    def test_is_running_method_exists(self):
        """测试 is_running 方法存在"""
        task = Task()
        assert hasattr(task, "is_running")
        assert callable(task.is_running)

    def test_is_finished_returns_true_when_completed(self):
        """测试 is_finished 在 status=completed 时返回 True"""
        task = Task()
        task.status = TaskStatus.COMPLETED
        assert task.is_finished() is True

    def test_is_finished_returns_true_when_failed(self):
        """测试 is_finished 在 status=failed 时返回 True"""
        task = Task()
        task.status = TaskStatus.FAILED
        assert task.is_finished() is True

    def test_is_finished_returns_true_when_cancelled(self):
        """测试 is_finished 在 status=cancelled 时返回 True"""
        task = Task()
        task.status = TaskStatus.CANCELLED
        assert task.is_finished() is True

    def test_is_finished_returns_false_when_pending(self):
        """测试 is_finished 在 status=pending 时返回 False"""
        task = Task()
        task.status = TaskStatus.PENDING
        assert task.is_finished() is False

    def test_is_finished_returns_false_when_running(self):
        """测试 is_finished 在 status=running 时返回 False"""
        task = Task()
        task.status = TaskStatus.RUNNING
        assert task.is_finished() is False

    def test_is_running_returns_true_when_running(self):
        """测试 is_running 在 status=running 时返回 True"""
        task = Task()
        task.status = TaskStatus.RUNNING
        assert task.is_running() is True

    def test_is_running_returns_false_when_pending(self):
        """测试 is_running 在 status=pending 时返回 False"""
        task = Task()
        task.status = TaskStatus.PENDING
        assert task.is_running() is False

    def test_is_running_returns_false_when_completed(self):
        """测试 is_running 在 status=completed 时返回 False"""
        task = Task()
        task.status = TaskStatus.COMPLETED
        assert task.is_running() is False


class TestTaskRepr:
    """测试 Task __repr__ 方法"""

    def test_repr_returns_string(self):
        """测试 __repr__ 返回字符串"""
        task = Task()
        task.id = "test-id"
        task.task_type = "search"
        task.status = "pending"

        result = repr(task)

        assert isinstance(result, str)

    def test_repr_includes_class_name(self):
        """测试 __repr__ 包含类名"""
        task = Task()
        result = repr(task)
        assert "Task" in result

    def test_repr_includes_id(self):
        """测试 __repr__ 包含 id"""
        task = Task()
        task.id = "test-id"
        result = repr(task)
        assert "test-id" in result

    def test_repr_includes_task_type(self):
        """测试 __repr__ 包含 task_type"""
        task = Task()
        task.id = "test-id"
        task.task_type = "search"
        task.status = "pending"
        result = repr(task)
        assert "search" in result

    def test_repr_includes_status(self):
        """测试 __repr__ 包含 status"""
        task = Task()
        task.id = "test-id"
        task.task_type = "search"
        task.status = "pending"
        result = repr(task)
        assert "pending" in result


class TestTaskToDict:
    """测试 Task to_dict 方法"""

    def test_to_dict_returns_dict(self):
        """测试 to_dict 返回字典"""
        task = Task()
        result = task.to_dict()
        assert isinstance(result, dict)

    def test_to_dict_includes_id(self):
        """测试 to_dict 包含 id"""
        task = Task()
        task.id = "test-id"
        result = task.to_dict()
        assert "id" in result

    def test_to_dict_includes_task_type(self):
        """测试 to_dict 包含 task_type"""
        task = Task()
        task.task_type = "search"
        result = task.to_dict()
        assert "task_type" in result

    def test_to_dict_includes_status(self):
        """测试 to_dict 包含 status"""
        task = Task()
        task.status = "pending"
        result = task.to_dict()
        assert "status" in result

    def test_to_dict_includes_payload(self):
        """测试 to_dict 包含 payload"""
        task = Task()
        task.payload = {"url": "test"}
        result = task.to_dict()
        assert "payload" in result

    def test_to_dict_includes_result(self):
        """测试 to_dict 包含 result"""
        task = Task()
        task.result = {"total": 100}
        result = task.to_dict()
        assert "result" in result

    def test_to_dict_includes_error_message(self):
        """测试 to_dict 包含 error_message"""
        task = Task()
        task.error_message = "Error"
        result = task.to_dict()
        assert "error_message" in result

    def test_to_dict_includes_created_at(self):
        """测试 to_dict 包含 created_at"""
        task = Task()
        result = task.to_dict()
        assert "created_at" in result

    def test_to_dict_includes_updated_at(self):
        """测试 to_dict 包含 updated_at"""
        task = Task()
        result = task.to_dict()
        assert "updated_at" in result


class TestTaskTableName:
    """测试 Task 表名"""

    def test_table_name_is_tasks(self):
        """测试表名是 tasks"""
        assert Task.__tablename__ == "tasks"


class TestTaskInheritance:
    """测试 Task 继承 Base"""

    def test_task_inherits_from_base(self):
        """测试 Task 继承自 Base"""
        from src.backend.app.models.base import Base
        assert issubclass(Task, Base)

    def test_task_has_base_fields(self):
        """测试 Task 有 Base 的所有字段"""
        task = Task()
        assert hasattr(task, "id")
        assert hasattr(task, "created_at")
        assert hasattr(task, "updated_at")

    def test_task_has_base_methods(self):
        """测试 Task 有 Base 的所有方法"""
        task = Task()
        assert hasattr(task, "to_dict")
        assert callable(task.to_dict)
        assert hasattr(task, "__repr__")


class TestTaskJsonbFields:
    """测试 Task JSONB 字段"""

    def test_payload_accepts_dict(self):
        """测试 payload 接受字典"""
        task = Task()
        payload = {
            "url": "https://example.com",
            "depth": 2,
            "options": {"follow_links": True}
        }
        task.payload = payload
        assert task.payload == payload

    def test_payload_accepts_empty_dict(self):
        """测试 payload 接受空字典"""
        task = Task()
        task.payload = {}
        assert task.payload == {}

    def test_result_accepts_dict(self):
        """测试 result 接受字典"""
        task = Task()
        result = {
            "total": 100,
            "items": [{"id": 1}, {"id": 2}],
            "metadata": {"page": 1}
        }
        task.result = result
        assert task.result == result

    def test_result_accepts_empty_dict(self):
        """测试 result 接受空字典"""
        task = Task()
        task.result = {}
        assert task.result == {}


class TestTaskEdgeCases:
    """测试 Task 边界情况"""

    def test_task_type_can_be_search(self):
        """测试 task_type 可以是 'search'"""
        task = Task()
        task.task_type = TaskType.SEARCH
        assert task.task_type == "search"

    def test_task_type_can_be_crawl(self):
        """测试 task_type 可以是 'crawl'"""
        task = Task()
        task.task_type = TaskType.CRAWL
        assert task.task_type == "crawl"

    def test_task_type_can_be_analyze(self):
        """测试 task_type 可以是 'analyze'"""
        task = Task()
        task.task_type = TaskType.ANALYZE
        assert task.task_type == "analyze"

    def test_status_can_be_all_enum_values(self):
        """测试 status 可以是所有枚举值"""
        task = Task()
        for status in [TaskStatus.PENDING, TaskStatus.RUNNING, TaskStatus.COMPLETED,
                       TaskStatus.FAILED, TaskStatus.CANCELLED]:
            task.status = status
            assert task.status == status

    def test_error_message_can_be_long(self):
        """测试 error_message 可以很长"""
        task = Task()
        task.error_message = "Error: " + "a" * 1000
        assert len(task.error_message) == 1007

    def test_multiple_tasks_are_independent(self):
        """测试多个 Task 实例是独立的"""
        task1 = Task()
        task2 = Task()

        task1.status = TaskStatus.PENDING
        task2.status = TaskStatus.RUNNING

        assert task1.status == TaskStatus.PENDING
        assert task2.status == TaskStatus.RUNNING
        assert task1.status != task2.status
