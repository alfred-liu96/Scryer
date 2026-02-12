"""
User 模型测试

测试范围：
- 字段定义（username, email, hashed_password, is_active）
- 字段约束（唯一性、长度限制、默认值）
- 关系（queries）
- 索引（username, email）
- to_dict() 方法（排除敏感信息）
- __repr__() 方法

参考 Issue #53
"""

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

# 这些导入在当前阶段会失败，因为实现代码尚未存在
# 这正是 TDD 的 "Red First" 原则
from src.backend.app.models.user import User


class TestUserFields:
    """测试 User 模型字段"""

    def test_user_has_id_field(self):
        """测试 User 模型有 id 字段（继承自 Base）"""
        user = User()
        assert hasattr(user, "id")

    def test_user_has_username_field(self):
        """测试 User 模型有 username 字段"""
        user = User()
        assert hasattr(user, "username")

    def test_user_has_email_field(self):
        """测试 User 模型有 email 字段"""
        user = User()
        assert hasattr(user, "email")

    def test_user_has_hashed_password_field(self):
        """测试 User 模型有 hashed_password 字段"""
        user = User()
        assert hasattr(user, "hashed_password")

    def test_user_has_is_active_field(self):
        """测试 User 模型有 is_active 字段"""
        user = User()
        assert hasattr(user, "is_active")

    def test_user_has_created_at_field(self):
        """测试 User 模型有 created_at 字段（继承自 Base）"""
        user = User()
        assert hasattr(user, "created_at")

    def test_user_has_updated_at_field(self):
        """测试 User 模型有 updated_at 字段（继承自 Base）"""
        user = User()
        assert hasattr(user, "updated_at")


class TestUserFieldTypes:
    """测试 User 模型字段类型"""

    def test_username_is_string(self):
        """测试 username 是字符串类型"""
        user = User()
        user.username = "testuser"
        assert isinstance(user.username, str)

    def test_email_is_string(self):
        """测试 email 是字符串类型"""
        user = User()
        user.email = "test@example.com"
        assert isinstance(user.email, str)

    def test_hashed_password_is_string(self):
        """测试 hashed_password 是字符串类型"""
        user = User()
        user.hashed_password = "hashed_secret"
        assert isinstance(user.hashed_password, str)

    def test_is_active_is_boolean(self):
        """测试 is_active 是布尔类型"""
        user = User()
        user.is_active = True
        assert isinstance(user.is_active, bool)


class TestUserFieldConstraints:
    """测试 User 模型字段约束"""

    def test_username_max_length_is_50(self):
        """测试 username 最大长度为 50"""
        user = User()
        # 获取字段信息
        mapper = inspect(User)
        username_column = mapper.columns.username
        assert username_column.type.length == 50

    def test_email_max_length_is_255(self):
        """测试 email 最大长度为 255"""
        user = User()
        # 获取字段信息
        mapper = inspect(User)
        email_column = mapper.columns.email
        assert email_column.type.length == 255

    def test_hashed_password_max_length_is_255(self):
        """测试 hashed_password 最大长度为 255"""
        user = User()
        # 获取字段信息
        mapper = inspect(User)
        password_column = mapper.columns.hashed_password
        assert password_column.type.length == 255

    def test_username_is_nullable_false(self):
        """测试 username 不允许为空"""
        mapper = inspect(User)
        username_column = mapper.columns.username
        assert username_column.nullable is False

    def test_email_is_nullable_false(self):
        """测试 email 不允许为空"""
        mapper = inspect(User)
        email_column = mapper.columns.email
        assert email_column.nullable is False

    def test_hashed_password_is_nullable_false(self):
        """测试 hashed_password 不允许为空"""
        mapper = inspect(User)
        password_column = mapper.columns.hashed_password
        assert password_column.nullable is False

    def test_is_active_is_nullable_false(self):
        """测试 is_active 不允许为空"""
        mapper = inspect(User)
        is_active_column = mapper.columns.is_active
        assert is_active_column.nullable is False

    def test_username_is_unique(self):
        """测试 username 是唯一的"""
        mapper = inspect(User)
        username_column = mapper.columns.username
        assert username_column.unique is True

    def test_email_is_unique(self):
        """测试 email 是唯一的"""
        mapper = inspect(User)
        email_column = mapper.columns.email
        assert email_column.unique is True


class TestUserDefaultValues:
    """测试 User 模型默认值"""

    def test_is_active_defaults_to_true(self):
        """测试 is_active 默认值为 True"""
        user = User()
        # 直接设置字段（绕过 ORM 的默认值机制）
        # 测试时需要验证字段定义
        mapper = inspect(User)
        is_active_column = mapper.columns.is_active
        # default 可能是函数或值
        assert is_active_column.default is not None or is_active_column.server_default is not None


class TestUserIndexes:
    """测试 User 模型索引"""

    def test_username_index_exists(self):
        """测试 username 索引存在"""
        # 检查表配置中的索引
        table = User.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_users_username" in index_names

    def test_email_index_exists(self):
        """测试 email 索引存在"""
        table = User.__table__
        index_names = [idx.name for idx in table.indexes]
        assert "idx_users_email" in index_names


class TestUserRelationships:
    """测试 User 模型关系"""

    def test_user_has_queries_relationship(self):
        """测试 User 有 queries 关系"""
        user = User()
        assert hasattr(user, "queries")

    def test_queries_relationship_is_configured(self):
        """测试 queries 关系已配置"""
        # 检查关系配置
        mapper = inspect(User)
        assert "queries" in mapper.relationships


class TestUserRepr:
    """测试 User __repr__ 方法"""

    def test_repr_returns_string(self):
        """测试 __repr__ 返回字符串"""
        user = User()
        user.id = "test-id"
        user.username = "testuser"
        user.email = "test@example.com"

        result = repr(user)

        assert isinstance(result, str)

    def test_repr_includes_class_name(self):
        """测试 __repr__ 包含类名"""
        user = User()
        result = repr(user)
        assert "User" in result

    def test_repr_includes_id(self):
        """测试 __repr__ 包含 id"""
        user = User()
        user.id = "test-id"
        result = repr(user)
        assert "test-id" in result

    def test_repr_includes_username(self):
        """测试 __repr__ 包含 username"""
        user = User()
        user.id = "test-id"
        user.username = "testuser"
        result = repr(user)
        assert "testuser" in result

    def test_repr_includes_email(self):
        """测试 __repr__ 包含 email"""
        user = User()
        user.id = "test-id"
        user.username = "testuser"
        user.email = "test@example.com"
        result = repr(user)
        assert "test@example.com" in result


class TestUserToDict:
    """测试 User to_dict 方法"""

    def test_to_dict_returns_dict(self):
        """测试 to_dict 返回字典"""
        user = User()
        result = user.to_dict()
        assert isinstance(result, dict)

    def test_to_dict_includes_id(self):
        """测试 to_dict 包含 id"""
        user = User()
        user.id = "test-id"
        result = user.to_dict()
        assert "id" in result

    def test_to_dict_includes_username(self):
        """测试 to_dict 包含 username"""
        user = User()
        user.username = "testuser"
        result = user.to_dict()
        assert "username" in result

    def test_to_dict_includes_email(self):
        """测试 to_dict 包含 email"""
        user = User()
        user.email = "test@example.com"
        result = user.to_dict()
        assert "email" in result

    def test_to_dict_excludes_hashed_password(self):
        """测试 to_dict 排除 hashed_password（敏感信息）"""
        user = User()
        user.hashed_password = "secret_hash"
        result = user.to_dict()
        # hashed_password 不应该在结果中
        assert "hashed_password" not in result

    def test_to_dict_includes_is_active(self):
        """测试 to_dict 包含 is_active"""
        user = User()
        user.is_active = True
        result = user.to_dict()
        assert "is_active" in result

    def test_to_dict_includes_created_at(self):
        """测试 to_dict 包含 created_at"""
        user = User()
        result = user.to_dict()
        assert "created_at" in result

    def test_to_dict_includes_updated_at(self):
        """测试 to_dict 包含 updated_at"""
        user = User()
        result = user.to_dict()
        assert "updated_at" in result


class TestUserTableName:
    """测试 User 表名"""

    def test_table_name_is_users(self):
        """测试表名是 users"""
        assert User.__tablename__ == "users"


class TestUserInheritance:
    """测试 User 继承 Base"""

    def test_user_inherits_from_base(self):
        """测试 User 继承自 Base"""
        from src.backend.app.models.base import Base
        assert issubclass(User, Base)

    def test_user_has_base_fields(self):
        """测试 User 有 Base 的所有字段"""
        user = User()
        assert hasattr(user, "id")
        assert hasattr(user, "created_at")
        assert hasattr(user, "updated_at")

    def test_user_has_base_methods(self):
        """测试 User 有 Base 的所有方法"""
        user = User()
        assert hasattr(user, "to_dict")
        assert callable(user.to_dict)
        assert hasattr(user, "__repr__")


class TestUserEdgeCases:
    """测试 User 边界情况"""

    def test_username_can_be_50_chars(self):
        """测试 username 可以是 50 个字符"""
        user = User()
        user.username = "a" * 50
        assert len(user.username) == 50

    def test_email_can_be_255_chars(self):
        """测试 email 可以是 255 个字符"""
        user = User()
        # 有效的邮箱格式但很长
        local_part = "a" * 240
        user.email = f"{local_part}@example.com"
        assert len(user.email) == 255

    def test_is_active_can_be_false(self):
        """测试 is_active 可以设置为 False"""
        user = User()
        user.is_active = False
        assert user.is_active is False

    def test_multiple_users_are_independent(self):
        """测试多个 User 实例是独立的"""
        user1 = User()
        user2 = User()

        user1.username = "user1"
        user2.username = "user2"

        assert user1.username == "user1"
        assert user2.username == "user2"
        assert user1.username != user2.username
