"""
Query 模型测试

测试范围：
- 字段定义（user_id, query_text, query_params）
- 外键约束（user_id → users.id）
- 关系（user, search_results）
- 索引（user_id, created_at, 复合索引）
- __repr__() 方法

参考 Issue #53
"""

from typing import Any
import pytest
from sqlalchemy import inspect

# 这些导入在当前阶段会失败，因为实现代码尚未存在
# 这正是 TDD 的 "Red First" 原则
from src.backend.app.models.query import Query


class TestQueryFields:
    """测试 Query 模型字段"""

    def test_query_has_id_field(self):
        """测试 Query 模型有 id 字段（继承自 Base）"""
        query = Query()
        assert hasattr(query, "id")

    def test_query_has_user_id_field(self):
        """测试 Query 模型有 user_id 字段"""
        query = Query()
        assert hasattr(query, "user_id")

    def test_query_has_query_text_field(self):
        """测试 Query 模型有 query_text 字段"""
        query = Query()
        assert hasattr(query, "query_text")

    def test_query_has_query_params_field(self):
        """测试 Query 模型有 query_params 字段"""
        query = Query()
        assert hasattr(query, "query_params")

    def test_query_has_created_at_field(self):
        """测试 Query 模型有 created_at 字段（继承自 Base）"""
        query = Query()
        assert hasattr(query, "created_at")

    def test_query_has_updated_at_field(self):
        """测试 Query 模型有 updated_at 字段（继承自 Base）"""
        query = Query()
        assert hasattr(query, "updated_at")


class TestQueryFieldTypes:
    """测试 Query 模型字段类型"""

    def test_user_id_is_string(self):
        """测试 user_id 是字符串类型"""
        query = Query()
        query.user_id = "user-uuid"
        assert isinstance(query.user_id, str)

    def test_query_text_is_string(self):
        """测试 query_text 是字符串类型"""
        query = Query()
        query.query_text = "search query"
        assert isinstance(query.query_text, str)

    def test_query_params_can_be_dict(self):
        """测试 query_params 可以是字典类型"""
        query = Query()
        params = {"limit": 10, "offset": 0}
        query.query_params = params
        assert isinstance(query.query_params, dict)

    def test_query_params_can_be_none(self):
        """测试 query_params 可以是 None"""
        query = Query()
        query.query_params = None
        assert query.query_params is None


class TestQueryFieldConstraints:
    """测试 Query 模型字段约束"""

    def test_user_id_is_nullable_false(self):
        """测试 user_id 不允许为空"""
        mapper = inspect(Query)
        user_id_column = mapper.columns.user_id
        assert user_id_column.nullable is False

    def test_query_text_is_nullable_false(self):
        """测试 query_text 不允许为空"""
        mapper = inspect(Query)
        query_text_column = mapper.columns.query_text
        assert query_text_column.nullable is False

    def test_query_params_is_nullable_true(self):
        """测试 query_params 允许为空"""
        mapper = inspect(Query)
        query_params_column = mapper.columns.query_params
        assert query_params_column.nullable is True

    def test_user_id_is_foreign_key(self):
        """测试 user_id 是外键"""
        mapper = inspect(Query)
        user_id_column = mapper.columns.user_id
        # 检查外键约束
        assert len(user_id_column.foreign_keys) > 0
        # 获取外键
        foreign_key = list(user_id_column.foreign_keys)[0]
        # 验证外键指向 users.id
        assert "users" in str(foreign_key.column)
        assert "id" in str(foreign_key.column)


class TestQueryForeignKeys:
    """测试 Query 外键约束"""

    def test_user_id_references_users_id(self):
        """测试 user_id 引用 users.id"""
        mapper = inspect(Query)
        user_id_column = mapper.columns.user_id
        foreign_key = list(user_id_column.foreign_keys)[0]
        assert "users" in str(foreign_key.column.table)
        assert "id" in str(foreign_key.column.name)

    def test_user_id_on_delete_cascade(self):
        """测试 user_id 有 ON DELETE CASCADE"""
        mapper = inspect(Query)
        user_id_column = mapper.columns.user_id
        foreign_key = list(user_id_column.foreign_keys)[0]
        # 检查 ondelete 参数
        assert foreign_key.ondelete is not None


class TestQueryIndexes:
    """测试 Query 模型索引"""

    def test_user_id_index_exists(self):
        """测试 user_id 索引存在"""
        table = Query.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_queries_user_id" in index_names

    def test_created_at_index_exists(self):
        """测试 created_at 索引存在"""
        table = Query.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_queries_created_at" in index_names

    def test_user_created_composite_index_exists(self):
        """测试 user_id + created_at 复合索引存在"""
        table = Query.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_queries_user_created" in index_names


class TestQueryRelationships:
    """测试 Query 模型关系"""

    def test_query_has_user_relationship(self):
        """测试 Query 有 user 关系"""
        query = Query()
        assert hasattr(query, "user")

    def test_query_has_search_results_relationship(self):
        """测试 Query 有 search_results 关系"""
        query = Query()
        assert hasattr(query, "search_results")

    def test_user_relationship_is_configured(self):
        """测试 user 关系已配置"""
        mapper = inspect(Query)
        assert "user" in mapper.relationships

    def test_search_results_relationship_is_configured(self):
        """测试 search_results 关系已配置"""
        mapper = inspect(Query)
        assert "search_results" in mapper.relationships


class TestQueryRepr:
    """测试 Query __repr__ 方法"""

    def test_repr_returns_string(self):
        """测试 __repr__ 返回字符串"""
        query = Query()
        query.id = "test-id"
        query.user_id = "user-id"
        query.query_text = "test search query"

        result = repr(query)

        assert isinstance(result, str)

    def test_repr_includes_class_name(self):
        """测试 __repr__ 包含类名"""
        query = Query()
        result = repr(query)
        assert "Query" in result

    def test_repr_includes_id(self):
        """测试 __repr__ 包含 id"""
        query = Query()
        query.id = "test-id"
        result = repr(query)
        assert "test-id" in result

    def test_repr_includes_user_id(self):
        """测试 __repr__ 包含 user_id"""
        query = Query()
        query.id = "test-id"
        query.user_id = "user-id"
        result = repr(query)
        assert "user-id" in result

    def test_repr_includes_partial_query_text(self):
        """测试 __repr__ 包含部分 query_text"""
        query = Query()
        query.id = "test-id"
        query.user_id = "user-id"
        query.query_text = "this is a very long search query text"
        result = repr(query)
        # 应该截断到 30 个字符
        assert "this is a very long search" in result


class TestQueryToDict:
    """测试 Query to_dict 方法"""

    def test_to_dict_returns_dict(self):
        """测试 to_dict 返回字典"""
        query = Query()
        result = query.to_dict()
        assert isinstance(result, dict)

    def test_to_dict_includes_id(self):
        """测试 to_dict 包含 id"""
        query = Query()
        query.id = "test-id"
        result = query.to_dict()
        assert "id" in result

    def test_to_dict_includes_user_id(self):
        """测试 to_dict 包含 user_id"""
        query = Query()
        query.user_id = "user-id"
        result = query.to_dict()
        assert "user_id" in result

    def test_to_dict_includes_query_text(self):
        """测试 to_dict 包含 query_text"""
        query = Query()
        query.query_text = "test query"
        result = query.to_dict()
        assert "query_text" in result

    def test_to_dict_includes_query_params(self):
        """测试 to_dict 包含 query_params"""
        query = Query()
        query.query_params = {"limit": 10}
        result = query.to_dict()
        assert "query_params" in result

    def test_to_dict_includes_created_at(self):
        """测试 to_dict 包含 created_at"""
        query = Query()
        result = query.to_dict()
        assert "created_at" in result

    def test_to_dict_includes_updated_at(self):
        """测试 to_dict 包含 updated_at"""
        query = Query()
        result = query.to_dict()
        assert "updated_at" in result


class TestQueryTableName:
    """测试 Query 表名"""

    def test_table_name_is_queries(self):
        """测试表名是 queries"""
        assert Query.__tablename__ == "queries"


class TestQueryInheritance:
    """测试 Query 继承 Base"""

    def test_query_inherits_from_base(self):
        """测试 Query 继承自 Base"""
        from src.backend.app.models.base import Base
        assert issubclass(Query, Base)

    def test_query_has_base_fields(self):
        """测试 Query 有 Base 的所有字段"""
        query = Query()
        assert hasattr(query, "id")
        assert hasattr(query, "created_at")
        assert hasattr(query, "updated_at")

    def test_query_has_base_methods(self):
        """测试 Query 有 Base 的所有方法"""
        query = Query()
        assert hasattr(query, "to_dict")
        assert callable(query.to_dict)
        assert hasattr(query, "__repr__")


class TestQueryJsonbFields:
    """测试 Query JSONB 字段"""

    def test_query_params_accepts_dict(self):
        """测试 query_params 接受字典"""
        query = Query()
        params = {
            "limit": 10,
            "offset": 0,
            "filters": {"status": "active"}
        }
        query.query_params = params
        assert query.query_params == params

    def test_query_params_accepts_empty_dict(self):
        """测试 query_params 接受空字典"""
        query = Query()
        query.query_params = {}
        assert query.query_params == {}

    def test_query_params_accepts_nested_dict(self):
        """测试 query_params 接受嵌套字典"""
        query = Query()
        params = {
            "filters": {
                "status": "active",
                "tags": ["python", "fastapi"]
            }
        }
        query.query_params = params
        assert query.query_params == params


class TestQueryEdgeCases:
    """测试 Query 边界情况"""

    def test_query_text_can_be_long(self):
        """测试 query_text 可以很长"""
        query = Query()
        query.query_text = "a" * 1000
        assert len(query.query_text) == 1000

    def test_query_text_can_be_empty(self):
        """测试 query_text 可以为空字符串"""
        query = Query()
        query.query_text = ""
        assert query.query_text == ""

    def test_multiple_queries_are_independent(self):
        """测试多个 Query 实例是独立的"""
        query1 = Query()
        query2 = Query()

        query1.query_text = "query 1"
        query2.query_text = "query 2"

        assert query1.query_text == "query 1"
        assert query2.query_text == "query 2"
