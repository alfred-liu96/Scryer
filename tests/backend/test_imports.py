"""
测试模型导入

验证所有模型可以正确导入
"""


def test_user_import():
    """测试 User 模型可以导入"""
    from src.backend.app.models.user import User
    assert User is not None


def test_query_import():
    """测试 Query 模型可以导入"""
    from src.backend.app.models.query import Query
    assert Query is not None


def test_content_import():
    """测试 Content 模型可以导入"""
    from src.backend.app.models.content import Content
    assert Content is not None


def test_search_result_import():
    """测试 SearchResult 模型可以导入"""
    from src.backend.app.models.search_result import SearchResult
    assert SearchResult is not None


def test_task_import():
    """测试 Task 模型可以导入"""
    from src.backend.app.models.task import Task, TaskStatus, TaskType
    assert Task is not None
    assert TaskStatus is not None
    assert TaskType is not None


def test_base_import():
    """测试 Base 模型可以导入"""
    from src.backend.app.models.base import Base
    assert Base is not None
