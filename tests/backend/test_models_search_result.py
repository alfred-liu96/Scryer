"""
SearchResult 模型测试

测试范围：
- 字段定义（query_id, content_id, rank, score）
- 外键约束（query_id → queries.id, content_id → contents.id）
- 唯一约束（query_id, content_id）
- 关系（query, content）
- 索引（复合索引）
- __repr__() 方法

参考 Issue #53
"""

import pytest
from sqlalchemy import inspect

# 这些导入在当前阶段会失败，因为实现代码尚未存在
# 这正是 TDD 的 "Red First" 原则
from src.backend.app.models.search_result import SearchResult


class TestSearchResultFields:
    """测试 SearchResult 模型字段"""

    def test_search_result_has_id_field(self):
        """测试 SearchResult 模型有 id 字段（继承自 Base）"""
        result = SearchResult()
        assert hasattr(result, "id")

    def test_search_result_has_query_id_field(self):
        """测试 SearchResult 模型有 query_id 字段"""
        result = SearchResult()
        assert hasattr(result, "query_id")

    def test_search_result_has_content_id_field(self):
        """测试 SearchResult 模型有 content_id 字段"""
        result = SearchResult()
        assert hasattr(result, "content_id")

    def test_search_result_has_rank_field(self):
        """测试 SearchResult 模型有 rank 字段"""
        result = SearchResult()
        assert hasattr(result, "rank")

    def test_search_result_has_score_field(self):
        """测试 SearchResult 模型有 score 字段"""
        result = SearchResult()
        assert hasattr(result, "score")

    def test_search_result_has_created_at_field(self):
        """测试 SearchResult 模型有 created_at 字段（继承自 Base）"""
        result = SearchResult()
        assert hasattr(result, "created_at")

    def test_search_result_has_updated_at_field(self):
        """测试 SearchResult 模型有 updated_at 字段（继承自 Base）"""
        result = SearchResult()
        assert hasattr(result, "updated_at")


class TestSearchResultFieldTypes:
    """测试 SearchResult 模型字段类型"""

    def test_query_id_is_string(self):
        """测试 query_id 是字符串类型"""
        result = SearchResult()
        result.query_id = "query-uuid"
        assert isinstance(result.query_id, str)

    def test_content_id_is_string(self):
        """测试 content_id 是字符串类型"""
        result = SearchResult()
        result.content_id = "content-uuid"
        assert isinstance(result.content_id, str)

    def test_rank_is_integer(self):
        """测试 rank 是整数类型"""
        result = SearchResult()
        result.rank = 1
        assert isinstance(result.rank, int)

    def test_score_is_float(self):
        """测试 score 是浮点类型"""
        result = SearchResult()
        result.score = 0.95
        assert isinstance(result.score, float)


class TestSearchResultFieldConstraints:
    """测试 SearchResult 模型字段约束"""

    def test_query_id_is_nullable_false(self):
        """测试 query_id 不允许为空"""
        mapper = inspect(SearchResult)
        query_id_column = mapper.columns.query_id
        assert query_id_column.nullable is False

    def test_content_id_is_nullable_false(self):
        """测试 content_id 不允许为空"""
        mapper = inspect(SearchResult)
        content_id_column = mapper.columns.content_id
        assert content_id_column.nullable is False

    def test_rank_is_nullable_false(self):
        """测试 rank 不允许为空"""
        mapper = inspect(SearchResult)
        rank_column = mapper.columns.rank
        assert rank_column.nullable is False

    def test_score_is_nullable_true(self):
        """测试 score 允许为空"""
        mapper = inspect(SearchResult)
        score_column = mapper.columns.score
        assert score_column.nullable is True


class TestSearchResultForeignKeys:
    """测试 SearchResult 外键约束"""

    def test_query_id_is_foreign_key(self):
        """测试 query_id 是外键"""
        mapper = inspect(SearchResult)
        query_id_column = mapper.columns.query_id
        assert len(query_id_column.foreign_keys) > 0

    def test_query_id_references_queries_id(self):
        """测试 query_id 引用 queries.id"""
        mapper = inspect(SearchResult)
        query_id_column = mapper.columns.query_id
        foreign_key = list(query_id_column.foreign_keys)[0]
        assert "queries" in str(foreign_key.column.table)
        assert "id" in str(foreign_key.column.name)

    def test_query_id_on_delete_cascade(self):
        """测试 query_id 有 ON DELETE CASCADE"""
        mapper = inspect(SearchResult)
        query_id_column = mapper.columns.query_id
        foreign_key = list(query_id_column.foreign_keys)[0]
        assert foreign_key.ondelete is not None

    def test_content_id_is_foreign_key(self):
        """测试 content_id 是外键"""
        mapper = inspect(SearchResult)
        content_id_column = mapper.columns.content_id
        assert len(content_id_column.foreign_keys) > 0

    def test_content_id_references_contents_id(self):
        """测试 content_id 引用 contents.id"""
        mapper = inspect(SearchResult)
        content_id_column = mapper.columns.content_id
        foreign_key = list(content_id_column.foreign_keys)[0]
        assert "contents" in str(foreign_key.column.table)
        assert "id" in str(foreign_key.column.name)

    def test_content_id_on_delete_cascade(self):
        """测试 content_id 有 ON DELETE CASCADE"""
        mapper = inspect(SearchResult)
        content_id_column = mapper.columns.content_id
        foreign_key = list(content_id_column.foreign_keys)[0]
        assert foreign_key.ondelete is not None


class TestSearchResultIndexes:
    """测试 SearchResult 模型索引"""

    def test_query_id_index_exists(self):
        """测试 query_id 索引存在"""
        table = SearchResult.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_search_results_query_id" in index_names

    def test_content_id_index_exists(self):
        """测试 content_id 索引存在"""
        table = SearchResult.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_search_results_content_id" in index_names

    def test_query_content_composite_unique_index_exists(self):
        """测试 query_id + content_id 复合唯一索引存在"""
        table = SearchResult.__table__
        # 找到包含 query 和 content 的索引
        qc_indexes = [idx for idx in table.indexes if "query" in idx.name and "content" in idx.name]
        assert len(qc_indexes) > 0
        # 验证是唯一索引
        assert any(idx.unique for idx in qc_indexes)

    def test_query_rank_composite_index_exists(self):
        """测试 query_id + rank 复合索引存在"""
        table = SearchResult.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_search_results_rank" in index_names


class TestSearchResultRelationships:
    """测试 SearchResult 模型关系"""

    def test_search_result_has_query_relationship(self):
        """测试 SearchResult 有 query 关系"""
        result = SearchResult()
        assert hasattr(result, "query")

    def test_search_result_has_content_relationship(self):
        """测试 SearchResult 有 content 关系"""
        result = SearchResult()
        assert hasattr(result, "content")

    def test_query_relationship_is_configured(self):
        """测试 query 关系已配置"""
        mapper = inspect(SearchResult)
        assert "query" in mapper.relationships

    def test_content_relationship_is_configured(self):
        """测试 content 关系已配置"""
        mapper = inspect(SearchResult)
        assert "content" in mapper.relationships


class TestSearchResultRepr:
    """测试 SearchResult __repr__ 方法"""

    def test_repr_returns_string(self):
        """测试 __repr__ 返回字符串"""
        result = SearchResult()
        result.id = "test-id"
        result.query_id = "query-id"
        result.rank = 1

        repr_str = repr(result)

        assert isinstance(repr_str, str)

    def test_repr_includes_class_name(self):
        """测试 __repr__ 包含类名"""
        result = SearchResult()
        repr_str = repr(result)
        assert "SearchResult" in repr_str

    def test_repr_includes_id(self):
        """测试 __repr__ 包含 id"""
        result = SearchResult()
        result.id = "test-id"
        repr_str = repr(result)
        assert "test-id" in repr_str

    def test_repr_includes_query_id(self):
        """测试 __repr__ 包含 query_id"""
        result = SearchResult()
        result.id = "test-id"
        result.query_id = "query-id"
        repr_str = repr(result)
        assert "query-id" in repr_str

    def test_repr_includes_rank(self):
        """测试 __repr__ 包含 rank"""
        result = SearchResult()
        result.id = "test-id"
        result.query_id = "query-id"
        result.rank = 5
        repr_str = repr(result)
        assert "5" in repr_str


class TestSearchResultToDict:
    """测试 SearchResult to_dict 方法"""

    def test_to_dict_returns_dict(self):
        """测试 to_dict 返回字典"""
        result = SearchResult()
        data = result.to_dict()
        assert isinstance(data, dict)

    def test_to_dict_includes_id(self):
        """测试 to_dict 包含 id"""
        result = SearchResult()
        result.id = "test-id"
        data = result.to_dict()
        assert "id" in data

    def test_to_dict_includes_query_id(self):
        """测试 to_dict 包含 query_id"""
        result = SearchResult()
        result.query_id = "query-id"
        data = result.to_dict()
        assert "query_id" in data

    def test_to_dict_includes_content_id(self):
        """测试 to_dict 包含 content_id"""
        result = SearchResult()
        result.content_id = "content-id"
        data = result.to_dict()
        assert "content_id" in data

    def test_to_dict_includes_rank(self):
        """测试 to_dict 包含 rank"""
        result = SearchResult()
        result.rank = 1
        data = result.to_dict()
        assert "rank" in data

    def test_to_dict_includes_score(self):
        """测试 to_dict 包含 score"""
        result = SearchResult()
        result.score = 0.95
        data = result.to_dict()
        assert "score" in data

    def test_to_dict_includes_created_at(self):
        """测试 to_dict 包含 created_at"""
        result = SearchResult()
        data = result.to_dict()
        assert "created_at" in data

    def test_to_dict_includes_updated_at(self):
        """测试 to_dict 包含 updated_at"""
        result = SearchResult()
        data = result.to_dict()
        assert "updated_at" in data


class TestSearchResultTableName:
    """测试 SearchResult 表名"""

    def test_table_name_is_search_results(self):
        """测试表名是 search_results"""
        assert SearchResult.__tablename__ == "search_results"


class TestSearchResultInheritance:
    """测试 SearchResult 继承 Base"""

    def test_search_result_inherits_from_base(self):
        """测试 SearchResult 继承自 Base"""
        from src.backend.app.models.base import Base
        assert issubclass(SearchResult, Base)

    def test_search_result_has_base_fields(self):
        """测试 SearchResult 有 Base 的所有字段"""
        result = SearchResult()
        assert hasattr(result, "id")
        assert hasattr(result, "created_at")
        assert hasattr(result, "updated_at")

    def test_search_result_has_base_methods(self):
        """测试 SearchResult 有 Base 的所有方法"""
        result = SearchResult()
        assert hasattr(result, "to_dict")
        assert callable(result.to_dict)
        assert hasattr(result, "__repr__")


class TestSearchResultEdgeCases:
    """测试 SearchResult 边界情况"""

    def test_rank_can_be_1(self):
        """测试 rank 可以是 1（最小值）"""
        result = SearchResult()
        result.rank = 1
        assert result.rank == 1

    def test_rank_can_be_large_number(self):
        """测试 rank 可以是大数"""
        result = SearchResult()
        result.rank = 1000000
        assert result.rank == 1000000

    def test_score_can_be_0(self):
        """测试 score 可以是 0"""
        result = SearchResult()
        result.score = 0.0
        assert result.score == 0.0

    def test_score_can_be_1(self):
        """测试 score 可以是 1（最大值）"""
        result = SearchResult()
        result.score = 1.0
        assert result.score == 1.0

    def test_score_can_be_between_0_and_1(self):
        """测试 score 可以在 0-1 之间"""
        result = SearchResult()
        result.score = 0.5
        assert result.score == 0.5

    def test_score_can_be_none(self):
        """测试 score 可以是 None"""
        result = SearchResult()
        result.score = None
        assert result.score is None

    def test_multiple_results_are_independent(self):
        """测试多个 SearchResult 实例是独立的"""
        result1 = SearchResult()
        result2 = SearchResult()

        result1.rank = 1
        result2.rank = 2

        assert result1.rank == 1
        assert result2.rank == 2
        assert result1.rank != result2.rank
