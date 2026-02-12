"""
Content 模型测试

测试范围：
- 字段定义（url, title, summary, content_hash）
- 字段约束（唯一性、长度限制）
- 唯一索引（content_hash）
- 关系（search_results）
- __repr__() 方法

参考 Issue #53
"""

import pytest
from sqlalchemy import inspect

# 这些导入在当前阶段会失败，因为实现代码尚未存在
# 这正是 TDD 的 "Red First" 原则
from src.backend.app.models.content import Content


class TestContentFields:
    """测试 Content 模型字段"""

    def test_content_has_id_field(self):
        """测试 Content 模型有 id 字段（继承自 Base）"""
        content = Content()
        assert hasattr(content, "id")

    def test_content_has_url_field(self):
        """测试 Content 模型有 url 字段"""
        content = Content()
        assert hasattr(content, "url")

    def test_content_has_title_field(self):
        """测试 Content 模型有 title 字段"""
        content = Content()
        assert hasattr(content, "title")

    def test_content_has_summary_field(self):
        """测试 Content 模型有 summary 字段"""
        content = Content()
        assert hasattr(content, "summary")

    def test_content_has_content_hash_field(self):
        """测试 Content 模型有 content_hash 字段"""
        content = Content()
        assert hasattr(content, "content_hash")

    def test_content_has_created_at_field(self):
        """测试 Content 模型有 created_at 字段（继承自 Base）"""
        content = Content()
        assert hasattr(content, "created_at")

    def test_content_has_updated_at_field(self):
        """测试 Content 模型有 updated_at 字段（继承自 Base）"""
        content = Content()
        assert hasattr(content, "updated_at")


class TestContentFieldTypes:
    """测试 Content 模型字段类型"""

    def test_url_is_string(self):
        """测试 url 是字符串类型"""
        content = Content()
        content.url = "https://example.com"
        assert isinstance(content.url, str)

    def test_title_is_string(self):
        """测试 title 是字符串类型"""
        content = Content()
        content.title = "Test Title"
        assert isinstance(content.title, str)

    def test_summary_is_string(self):
        """测试 summary 是字符串类型"""
        content = Content()
        content.summary = "Test summary"
        assert isinstance(content.summary, str)

    def test_content_hash_is_string(self):
        """测试 content_hash 是字符串类型"""
        content = Content()
        content.content_hash = "a" * 64
        assert isinstance(content.content_hash, str)


class TestContentFieldConstraints:
    """测试 Content 模型字段约束"""

    def test_url_is_nullable_false(self):
        """测试 url 不允许为空"""
        mapper = inspect(Content)
        url_column = mapper.columns.url
        assert url_column.nullable is False

    def test_title_is_nullable_true(self):
        """测试 title 允许为空"""
        mapper = inspect(Content)
        title_column = mapper.columns.title
        assert title_column.nullable is True

    def test_summary_is_nullable_true(self):
        """测试 summary 允许为空"""
        mapper = inspect(Content)
        summary_column = mapper.columns.summary
        assert summary_column.nullable is True

    def test_content_hash_is_nullable_false(self):
        """测试 content_hash 不允许为空"""
        mapper = inspect(Content)
        content_hash_column = mapper.columns.content_hash
        assert content_hash_column.nullable is False

    def test_title_max_length_is_500(self):
        """测试 title 最大长度为 500"""
        mapper = inspect(Content)
        title_column = mapper.columns.title
        assert title_column.type.length == 500

    def test_content_hash_length_is_64(self):
        """测试 content_hash 固定长度为 64（SHA-256）"""
        mapper = inspect(Content)
        content_hash_column = mapper.columns.content_hash
        assert content_hash_column.type.length == 64

    def test_content_hash_is_unique(self):
        """测试 content_hash 是唯一的"""
        mapper = inspect(Content)
        content_hash_column = mapper.columns.content_hash
        assert content_hash_column.unique is True


class TestContentIndexes:
    """测试 Content 模型索引"""

    def test_content_hash_unique_index_exists(self):
        """测试 content_hash 唯一索引存在"""
        table = Content.__table__
        # 找到 content_hash 索引
        content_hash_indexes = [idx for idx in table.indexes if "content_hash" in idx.name]
        assert len(content_hash_indexes) > 0
        # 验证是唯一索引
        assert any(idx.unique for idx in content_hash_indexes)

    def test_created_at_index_exists(self):
        """测试 created_at 索引存在"""
        table = Content.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_contents_created_at" in index_names


class TestContentRelationships:
    """测试 Content 模型关系"""

    def test_content_has_search_results_relationship(self):
        """测试 Content 有 search_results 关系"""
        content = Content()
        assert hasattr(content, "search_results")

    def test_search_results_relationship_is_configured(self):
        """测试 search_results 关系已配置"""
        mapper = inspect(Content)
        assert "search_results" in mapper.relationships


class TestContentRepr:
    """测试 Content __repr__ 方法"""

    def test_repr_returns_string(self):
        """测试 __repr__ 返回字符串"""
        content = Content()
        content.id = "test-id"
        content.url = "https://example.com"
        content.title = "Test Title"
        content.content_hash = "a" * 64

        result = repr(content)

        assert isinstance(result, str)

    def test_repr_includes_class_name(self):
        """测试 __repr__ 包含类名"""
        content = Content()
        result = repr(content)
        assert "Content" in result

    def test_repr_includes_id(self):
        """测试 __repr__ 包含 id"""
        content = Content()
        content.id = "test-id"
        result = repr(content)
        assert "test-id" in result

    def test_repr_includes_partial_title(self):
        """测试 __repr__ 包含部分 title（最多 30 字符）"""
        content = Content()
        content.id = "test-id"
        content.title = "This is a very long title that should be truncated"
        content.content_hash = "a" * 64
        result = repr(content)
        # 应该截断到 30 个字符
        assert "This is a very long title th" in result

    def test_repr_shows_na_when_no_title(self):
        """测试没有 title 时显示 N/A"""
        content = Content()
        content.id = "test-id"
        content.content_hash = "a" * 64
        result = repr(content)
        assert "N/A" in result

    def test_repr_includes_partial_hash(self):
        """测试 __repr__ 包含部分 hash（前 8 位）"""
        content = Content()
        content.id = "test-id"
        content.content_hash = "abc123" + "0" * 58
        result = repr(content)
        # 应该只显示前 8 位
        assert "abc12300" in result


class TestContentToDict:
    """测试 Content to_dict 方法"""

    def test_to_dict_returns_dict(self):
        """测试 to_dict 返回字典"""
        content = Content()
        result = content.to_dict()
        assert isinstance(result, dict)

    def test_to_dict_includes_id(self):
        """测试 to_dict 包含 id"""
        content = Content()
        content.id = "test-id"
        result = content.to_dict()
        assert "id" in result

    def test_to_dict_includes_url(self):
        """测试 to_dict 包含 url"""
        content = Content()
        content.url = "https://example.com"
        result = content.to_dict()
        assert "url" in result

    def test_to_dict_includes_title(self):
        """测试 to_dict 包含 title"""
        content = Content()
        content.title = "Test Title"
        result = content.to_dict()
        assert "title" in result

    def test_to_dict_includes_summary(self):
        """测试 to_dict 包含 summary"""
        content = Content()
        content.summary = "Test summary"
        result = content.to_dict()
        assert "summary" in result

    def test_to_dict_includes_content_hash(self):
        """测试 to_dict 包含 content_hash"""
        content = Content()
        content.content_hash = "a" * 64
        result = content.to_dict()
        assert "content_hash" in result

    def test_to_dict_includes_created_at(self):
        """测试 to_dict 包含 created_at"""
        content = Content()
        result = content.to_dict()
        assert "created_at" in result

    def test_to_dict_includes_updated_at(self):
        """测试 to_dict 包含 updated_at"""
        content = Content()
        result = content.to_dict()
        assert "updated_at" in result


class TestContentTableName:
    """测试 Content 表名"""

    def test_table_name_is_contents(self):
        """测试表名是 contents"""
        assert Content.__tablename__ == "contents"


class TestContentInheritance:
    """测试 Content 继承 Base"""

    def test_content_inherits_from_base(self):
        """测试 Content 继承自 Base"""
        from src.backend.app.models.base import Base
        assert issubclass(Content, Base)

    def test_content_has_base_fields(self):
        """测试 Content 有 Base 的所有字段"""
        content = Content()
        assert hasattr(content, "id")
        assert hasattr(content, "created_at")
        assert hasattr(content, "updated_at")

    def test_content_has_base_methods(self):
        """测试 Content 有 Base 的所有方法"""
        content = Content()
        assert hasattr(content, "to_dict")
        assert callable(content.to_dict)
        assert hasattr(content, "__repr__")


class TestContentEdgeCases:
    """测试 Content 边界情况"""

    def test_url_can_be_very_long(self):
        """测试 url 可以很长"""
        content = Content()
        long_url = "https://example.com/" + "a" * 1000
        content.url = long_url
        assert len(content.url) == len(long_url)

    def test_title_can_be_500_chars(self):
        """测试 title 可以是 500 个字符"""
        content = Content()
        content.title = "a" * 500
        assert len(content.title) == 500

    def test_summary_can_be_very_long(self):
        """测试 summary 可以很长"""
        content = Content()
        content.summary = "a" * 5000
        assert len(content.summary) == 5000

    def test_content_hash_must_be_64_chars(self):
        """测试 content_hash 必须是 64 个字符"""
        content = Content()
        # SHA-256 哈希固定 64 个十六进制字符
        content.content_hash = "a" * 64
        assert len(content.content_hash) == 64

    def test_title_can_be_none(self):
        """测试 title 可以是 None"""
        content = Content()
        content.title = None
        assert content.title is None

    def test_summary_can_be_none(self):
        """测试 summary 可以是 None"""
        content = Content()
        content.summary = None
        assert content.summary is None

    def test_multiple_contents_are_independent(self):
        """测试多个 Content 实例是独立的"""
        content1 = Content()
        content2 = Content()

        content1.url = "https://example1.com"
        content2.url = "https://example2.com"

        assert content1.url == "https://example1.com"
        assert content2.url == "https://example2.com"
