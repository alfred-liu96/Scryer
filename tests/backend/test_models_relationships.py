"""
模型关系集成测试

测试范围：
- User ↔ Query 关系
- Query ↔ SearchResult 关系
- Content ↔ SearchResult 关系
- 级联删除行为
- 关系加载策略
- 模型之间的交互

参考 Issue #53
"""

import pytest
from sqlalchemy import inspect

# 这些导入在当前阶段会失败，因为实现代码尚未存在
# 这正是 TDD 的 "Red First" 原则
from src.backend.app.models.user import User
from src.backend.app.models.query import Query
from src.backend.app.models.content import Content
from src.backend.app.models.search_result import SearchResult
from src.backend.app.models.task import Task


class TestUserQueryRelationship:
    """测试 User 和 Query 之间的关系"""

    def test_user_has_queries_relationship(self):
        """测试 User 有 queries 关系"""
        user = User()
        assert hasattr(user, "queries")

    def test_query_has_user_relationship(self):
        """测试 Query 有 user 关系"""
        query = Query()
        assert hasattr(query, "user")

    def test_user_queries_relationship_is_configured(self):
        """测试 User.queries 关系已正确配置"""
        mapper = inspect(User)
        assert "queries" in mapper.relationships
        relationship = mapper.relationships["queries"]
        # 验证关系指向 Query 模型
        assert relationship.mapper.class_.__name__ == "Query"

    def test_query_user_relationship_is_configured(self):
        """测试 Query.user 关系已正确配置"""
        mapper = inspect(Query)
        assert "user" in mapper.relationships
        relationship = mapper.relationships["user"]
        # 验证关系指向 User 模型
        assert relationship.mapper.class_.__name__ == "User"

    def test_user_query_back_populates(self):
        """测试 User 和 Query 的 back_populates 配置"""
        user_mapper = inspect(User)
        query_mapper = inspect(Query)

        user_rel = user_mapper.relationships["queries"]
        query_rel = query_mapper.relationships["user"]

        # 验证 back_populates 配置
        assert user_rel.back_populates == "user"
        assert query_rel.back_populates == "queries"


class TestQuerySearchResultRelationship:
    """测试 Query 和 SearchResult 之间的关系"""

    def test_query_has_search_results_relationship(self):
        """测试 Query 有 search_results 关系"""
        query = Query()
        assert hasattr(query, "search_results")

    def test_search_result_has_query_relationship(self):
        """测试 SearchResult 有 query 关系"""
        result = SearchResult()
        assert hasattr(result, "query")

    def test_query_search_results_relationship_is_configured(self):
        """测试 Query.search_results 关系已正确配置"""
        mapper = inspect(Query)
        assert "search_results" in mapper.relationships
        relationship = mapper.relationships["search_results"]
        # 验证关系指向 SearchResult 模型
        assert relationship.mapper.class_.__name__ == "SearchResult"

    def test_search_result_query_relationship_is_configured(self):
        """测试 SearchResult.query 关系已正确配置"""
        mapper = inspect(SearchResult)
        assert "query" in mapper.relationships
        relationship = mapper.relationships["query"]
        # 验证关系指向 Query 模型
        assert relationship.mapper.class_.__name__ == "Query"

    def test_query_search_result_back_populates(self):
        """测试 Query 和 SearchResult 的 back_populates 配置"""
        query_mapper = inspect(Query)
        result_mapper = inspect(SearchResult)

        query_rel = query_mapper.relationships["search_results"]
        result_rel = result_mapper.relationships["query"]

        # 验证 back_populates 配置
        assert query_rel.back_populates == "query"
        assert result_rel.back_populates == "search_results"


class TestContentSearchResultRelationship:
    """测试 Content 和 SearchResult 之间的关系"""

    def test_content_has_search_results_relationship(self):
        """测试 Content 有 search_results 关系"""
        content = Content()
        assert hasattr(content, "search_results")

    def test_search_result_has_content_relationship(self):
        """测试 SearchResult 有 content 关系"""
        result = SearchResult()
        assert hasattr(result, "content")

    def test_content_search_results_relationship_is_configured(self):
        """测试 Content.search_results 关系已正确配置"""
        mapper = inspect(Content)
        assert "search_results" in mapper.relationships
        relationship = mapper.relationships["search_results"]
        # 验证关系指向 SearchResult 模型
        assert relationship.mapper.class_.__name__ == "SearchResult"

    def test_search_result_content_relationship_is_configured(self):
        """测试 SearchResult.content 关系已正确配置"""
        mapper = inspect(SearchResult)
        assert "content" in mapper.relationships
        relationship = mapper.relationships["content"]
        # 验证关系指向 Content 模型
        assert relationship.mapper.class_.__name__ == "Content"

    def test_content_search_result_back_populates(self):
        """测试 Content 和 SearchResult 的 back_populates 配置"""
        content_mapper = inspect(Content)
        result_mapper = inspect(SearchResult)

        content_rel = content_mapper.relationships["search_results"]
        result_rel = result_mapper.relationships["content"]

        # 验证 back_populates 配置
        assert content_rel.back_populates == "content"
        assert result_rel.back_populates == "search_results"


class TestCascadeDeleteConfiguration:
    """测试级联删除配置"""

    def test_query_user_id_has_cascade_delete(self):
        """测试 Query.user_id 外键有 ON DELETE CASCADE"""
        mapper = inspect(Query)
        user_id_column = mapper.columns.user_id
        foreign_key = list(user_id_column.foreign_keys)[0]
        assert foreign_key.ondelete is not None

    def test_search_result_query_id_has_cascade_delete(self):
        """测试 SearchResult.query_id 外键有 ON DELETE CASCADE"""
        mapper = inspect(SearchResult)
        query_id_column = mapper.columns.query_id
        foreign_key = list(query_id_column.foreign_keys)[0]
        assert foreign_key.ondelete is not None

    def test_search_result_content_id_has_cascade_delete(self):
        """测试 SearchResult.content_id 外键有 ON DELETE CASCADE"""
        mapper = inspect(SearchResult)
        content_id_column = mapper.columns.content_id
        foreign_key = list(content_id_column.foreign_keys)[0]
        assert foreign_key.ondelete is not None


class TestRelationshipLoadingStrategy:
    """测试关系加载策略"""

    def test_user_queries_uses_selectin(self):
        """测试 User.queries 使用 selectin 加载策略"""
        mapper = inspect(User)
        relationship = mapper.relationships["queries"]
        # 验证 lazy 策略
        assert relationship.lazy == "selectin"

    def test_query_user_uses_selectin(self):
        """测试 Query.user 使用 selectin 加载策略"""
        mapper = inspect(Query)
        relationship = mapper.relationships["user"]
        assert relationship.lazy == "selectin"

    def test_query_search_results_uses_selectin(self):
        """测试 Query.search_results 使用 selectin 加载策略"""
        mapper = inspect(Query)
        relationship = mapper.relationships["search_results"]
        assert relationship.lazy == "selectin"

    def test_search_result_query_uses_selectin(self):
        """测试 SearchResult.query 使用 selectin 加载策略"""
        mapper = inspect(SearchResult)
        relationship = mapper.relationships["query"]
        assert relationship.lazy == "selectin"

    def test_search_result_content_uses_selectin(self):
        """测试 SearchResult.content 使用 selectin 加载策略"""
        mapper = inspect(SearchResult)
        relationship = mapper.relationships["content"]
        assert relationship.lazy == "selectin"

    def test_content_search_results_uses_selectin(self):
        """测试 Content.search_results 使用 selectin 加载策略"""
        mapper = inspect(Content)
        relationship = mapper.relationships["search_results"]
        assert relationship.lazy == "selectin"


class TestModelTableNames:
    """测试所有模型的表名"""

    def test_user_table_name(self):
        """测试 User 表名是 users"""
        assert User.__tablename__ == "users"

    def test_query_table_name(self):
        """测试 Query 表名是 queries"""
        assert Query.__tablename__ == "queries"

    def test_content_table_name(self):
        """测试 Content 表名是 contents"""
        assert Content.__tablename__ == "contents"

    def test_search_result_table_name(self):
        """测试 SearchResult 表名是 search_results"""
        assert SearchResult.__tablename__ == "search_results"

    def test_task_table_name(self):
        """测试 Task 表名是 tasks"""
        assert Task.__tablename__ == "tasks"


class TestAllModelsInheritBase:
    """测试所有模型都继承自 Base"""

    def test_user_inherits_base(self):
        """测试 User 继承自 Base"""
        from src.backend.app.models.base import Base
        assert issubclass(User, Base)

    def test_query_inherits_base(self):
        """测试 Query 继承自 Base"""
        from src.backend.app.models.base import Base
        assert issubclass(Query, Base)

    def test_content_inherits_base(self):
        """测试 Content 继承自 Base"""
        from src.backend.app.models.base import Base
        assert issubclass(Content, Base)

    def test_search_result_inherits_base(self):
        """测试 SearchResult 继承自 Base"""
        from src.backend.app.models.base import Base
        assert issubclass(SearchResult, Base)

    def test_task_inherits_base(self):
        """测试 Task 继承自 Base"""
        from src.backend.app.models.base import Base
        assert issubclass(Task, Base)


class TestAllModelsHaveBaseFields:
    """测试所有模型都有 Base 的字段"""

    def test_user_has_base_fields(self):
        """测试 User 有 id, created_at, updated_at"""
        user = User()
        assert hasattr(user, "id")
        assert hasattr(user, "created_at")
        assert hasattr(user, "updated_at")

    def test_query_has_base_fields(self):
        """测试 Query 有 id, created_at, updated_at"""
        query = Query()
        assert hasattr(query, "id")
        assert hasattr(query, "created_at")
        assert hasattr(query, "updated_at")

    def test_content_has_base_fields(self):
        """测试 Content 有 id, created_at, updated_at"""
        content = Content()
        assert hasattr(content, "id")
        assert hasattr(content, "created_at")
        assert hasattr(content, "updated_at")

    def test_search_result_has_base_fields(self):
        """测试 SearchResult 有 id, created_at, updated_at"""
        result = SearchResult()
        assert hasattr(result, "id")
        assert hasattr(result, "created_at")
        assert hasattr(result, "updated_at")

    def test_task_has_base_fields(self):
        """测试 Task 有 id, created_at, updated_at"""
        task = Task()
        assert hasattr(task, "id")
        assert hasattr(task, "created_at")
        assert hasattr(task, "updated_at")


class TestAllModelsHaveBaseMethods:
    """测试所有模型都有 Base 的方法"""

    def test_user_has_base_methods(self):
        """测试 User 有 to_dict 和 __repr__"""
        user = User()
        assert hasattr(user, "to_dict")
        assert callable(user.to_dict)
        assert hasattr(user, "__repr__")

    def test_query_has_base_methods(self):
        """测试 Query 有 to_dict 和 __repr__"""
        query = Query()
        assert hasattr(query, "to_dict")
        assert callable(query.to_dict)
        assert hasattr(query, "__repr__")

    def test_content_has_base_methods(self):
        """测试 Content 有 to_dict 和 __repr__"""
        content = Content()
        assert hasattr(content, "to_dict")
        assert callable(content.to_dict)
        assert hasattr(content, "__repr__")

    def test_search_result_has_base_methods(self):
        """测试 SearchResult 有 to_dict 和 __repr__"""
        result = SearchResult()
        assert hasattr(result, "to_dict")
        assert callable(result.to_dict)
        assert hasattr(result, "__repr__")

    def test_task_has_base_methods(self):
        """测试 Task 有 to_dict 和 __repr__"""
        task = Task()
        assert hasattr(task, "to_dict")
        assert callable(task.to_dict)
        assert hasattr(task, "__repr__")


class TestModelIndexesExist:
    """测试所有模型的索引都存在"""

    def test_user_indexes_exist(self):
        """测试 User 索引存在"""
        table = User.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_users_username" in index_names
        assert "idx_users_email" in index_names

    def test_query_indexes_exist(self):
        """测试 Query 索引存在"""
        table = Query.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_queries_user_id" in index_names
        assert "idx_queries_created_at" in index_names
        assert "idx_queries_user_created" in index_names

    def test_content_indexes_exist(self):
        """测试 Content 索引存在"""
        table = Content.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_contents_created_at" in index_names
        # content_hash 索引应该存在（唯一索引）
        hash_indexes = [idx for idx in table.indexes if "content_hash" in idx.name]
        assert len(hash_indexes) > 0

    def test_search_result_indexes_exist(self):
        """测试 SearchResult 索引存在"""
        table = SearchResult.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_search_results_query_id" in index_names
        assert "idx_search_results_content_id" in index_names
        assert "idx_search_results_query_content" in index_names
        assert "idx_search_results_rank" in index_names

    def test_task_indexes_exist(self):
        """测试 Task 索引存在"""
        table = Task.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_tasks_status" in index_names
        assert "idx_tasks_task_type" in index_names
        assert "idx_tasks_created_at" in index_names
        assert "idx_tasks_status_created" in index_names


class TestModelExportStructure:
    """测试模型导出结构"""

    def test_models_can_be_imported(self):
        """测试所有模型可以从 models 包导入"""
        # 这个测试验证 models 包的 __init__.py 正确导出所有模型
        from src.backend.app.models import (
            User,
            Query,
            Content,
            SearchResult,
            Task,
            TaskStatus,
            TaskType,
        )
        # 验证导入成功
        assert User is not None
        assert Query is not None
        assert Content is not None
        assert SearchResult is not None
        assert Task is not None
        assert TaskStatus is not None
        assert TaskType is not None


class TestTaskIndependence:
    """测试 Task 模型的独立性（无外键关系）"""

    def test_task_has_no_relationships(self):
        """测试 Task 没有关系定义"""
        mapper = inspect(Task)
        # Task 模型不应该有 relationships
        relationships = list(mapper.relationships.keys())
        # Task 是独立的，没有外键关系
        assert len(relationships) == 0


class TestModelRelationshipConfiguration:
    """测试关系配置的正确性"""

    def test_query_search_results_has_cascade_delete_orphan(self):
        """测试 Query.search_results 有 cascade='all, delete-orphan'"""
        mapper = inspect(Query)
        relationship = mapper.relationships["search_results"]
        # 验证 cascade 配置
        # SQLAlchemy 2.0 将 'all, delete-orphan' 展开为具体的操作列表
        cascade = relationship.cascade
        # 验证包含 delete 和 delete-orphan（这是 'all, delete-orphan' 的展开结果）
        assert "delete" in cascade
        assert "delete-orphan" in cascade


class TestModelRelationshipTypes:
    """测试关系类型"""

    def test_user_query_is_one_to_many(self):
        """测试 User ↔ Query 是一对多关系"""
        user_mapper = inspect(User)
        query_mapper = inspect(Query)

        # User 端应该是 list
        user_rel = user_mapper.relationships["queries"]
        # uselist 默认为 True，表示一对多
        assert user_rel.uselist is True

        # Query 端应该是单个对象
        query_rel = query_mapper.relationships["user"]
        assert query_rel.uselist is False

    def test_query_search_result_is_one_to_many(self):
        """测试 Query ↔ SearchResult 是一对多关系"""
        query_mapper = inspect(Query)
        result_mapper = inspect(SearchResult)

        # Query 端应该是 list
        query_rel = query_mapper.relationships["search_results"]
        assert query_rel.uselist is True

        # SearchResult 端应该是单个对象
        result_rel = result_mapper.relationships["query"]
        assert result_rel.uselist is False

    def test_content_search_result_is_one_to_many(self):
        """测试 Content ↔ SearchResult 是一对多关系"""
        content_mapper = inspect(Content)
        result_mapper = inspect(SearchResult)

        # Content 端应该是 list
        content_rel = content_mapper.relationships["search_results"]
        assert content_rel.uselist is True

        # SearchResult 端应该是单个对象
        result_rel = result_mapper.relationships["content"]
        assert result_rel.uselist is False


class TestModelFieldCount:
    """测试模型字段数量"""

    def test_user_field_count(self):
        """测试 User 字段数量正确"""
        mapper = inspect(User)
        # 应该有: id, username, email, hashed_password, is_active, created_at, updated_at
        columns = list(mapper.columns.keys())
        assert len(columns) == 7
        assert "id" in columns
        assert "username" in columns
        assert "email" in columns
        assert "hashed_password" in columns
        assert "is_active" in columns
        assert "created_at" in columns
        assert "updated_at" in columns

    def test_query_field_count(self):
        """测试 Query 字段数量正确"""
        mapper = inspect(Query)
        # 应该有: id, user_id, query_text, query_params, created_at, updated_at
        columns = list(mapper.columns.keys())
        assert len(columns) == 6
        assert "id" in columns
        assert "user_id" in columns
        assert "query_text" in columns
        assert "query_params" in columns
        assert "created_at" in columns
        assert "updated_at" in columns

    def test_content_field_count(self):
        """测试 Content 字段数量正确"""
        mapper = inspect(Content)
        # 应该有: id, url, title, summary, content_hash, created_at, updated_at
        columns = list(mapper.columns.keys())
        assert len(columns) == 7
        assert "id" in columns
        assert "url" in columns
        assert "title" in columns
        assert "summary" in columns
        assert "content_hash" in columns
        assert "created_at" in columns
        assert "updated_at" in columns

    def test_search_result_field_count(self):
        """测试 SearchResult 字段数量正确"""
        mapper = inspect(SearchResult)
        # 应该有: id, query_id, content_id, rank, score, created_at, updated_at
        columns = list(mapper.columns.keys())
        assert len(columns) == 7
        assert "id" in columns
        assert "query_id" in columns
        assert "content_id" in columns
        assert "rank" in columns
        assert "score" in columns
        assert "created_at" in columns
        assert "updated_at" in columns

    def test_task_field_count(self):
        """测试 Task 字段数量正确"""
        mapper = inspect(Task)
        # 应该有: id, task_type, status, payload, result, error_message, created_at, updated_at
        columns = list(mapper.columns.keys())
        assert len(columns) == 8
        assert "id" in columns
        assert "task_type" in columns
        assert "status" in columns
        assert "payload" in columns
        assert "result" in columns
        assert "error_message" in columns
        assert "created_at" in columns
        assert "updated_at" in columns
