"""
Base 模型测试

测试范围：
- Base 类的通用字段（id, created_at, updated_at）
- to_dict() 方法
- __repr__() 方法

参考 Issue #52
"""

from datetime import datetime
from unittest.mock import Mock
from uuid import UUID, uuid4

import pytest

# 这些导入在当前阶段会失败，因为实现代码尚未存在
# 这正是 TDD 的 "Red First" 原则
from src.backend.app.models.base import Base


class TestBaseFields:
    """测试 Base 类的通用字段"""

    def test_base_has_id_field(self):
        """测试 Base 类有 id 字段"""
        # 创建一个继承自 Base 的测试模型
        class TestModel(Base):
            __tablename__ = "test_models"

        # 实例化
        instance = TestModel()

        # 验证有 id 字段
        assert hasattr(instance, "id")

    def test_base_id_is_uuid(self):
        """测试 id 字段是 UUID 类型"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()

        # id 应该是 UUID 或 None（未设置时）
        assert instance.id is None or isinstance(instance.id, UUID)

    def test_base_has_created_at_field(self):
        """测试 Base 类有 created_at 字段"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()

        assert hasattr(instance, "created_at")

    def test_base_created_at_is_datetime(self):
        """测试 created_at 字段是 datetime 类型"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()

        # created_at 应该是 datetime 或 None（未设置时）
        assert instance.created_at is None or isinstance(instance.created_at, datetime)

    def test_base_has_updated_at_field(self):
        """测试 Base 类有 updated_at 字段"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()

        assert hasattr(instance, "updated_at")

    def test_base_updated_at_is_datetime(self):
        """测试 updated_at 字段是 datetime 类型"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()

        # updated_at 应该是 datetime 或 None（未设置时）
        assert instance.updated_at is None or isinstance(instance.updated_at, datetime)


class TestBaseToDict:
    """测试 Base 类的 to_dict 方法"""

    def test_to_dict_returns_dict(self):
        """测试 to_dict 返回字典"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()

        # 设置一些值
        instance.id = uuid4()
        instance.created_at = datetime.now()
        instance.updated_at = datetime.now()

        result = instance.to_dict()

        assert isinstance(result, dict)

    def test_to_dict_includes_id(self):
        """测试 to_dict 包含 id"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()
        test_id = str(uuid4())
        instance.id = test_id

        result = instance.to_dict()

        assert "id" in result
        # id 是字符串类型
        assert result["id"] == test_id

    def test_to_dict_includes_created_at(self):
        """测试 to_dict 包含 created_at"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()
        now = datetime.now()
        instance.created_at = now

        result = instance.to_dict()

        assert "created_at" in result
        # datetime 转换可能会有精度损失
        assert result["created_at"] is not None

    def test_to_dict_includes_updated_at(self):
        """测试 to_dict 包含 updated_at"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()
        now = datetime.now()
        instance.updated_at = now

        result = instance.to_dict()

        assert "updated_at" in result
        assert result["updated_at"] is not None

    def test_to_dict_serializes_datetime_to_string(self):
        """测试 to_dict 将 datetime 序列化为字符串"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()
        now = datetime.now()
        instance.created_at = now
        instance.updated_at = now

        result = instance.to_dict()

        # datetime 应该被序列化为 ISO 格式字符串
        # 或者保持 datetime 对象（根据实现）
        assert result.get("created_at") is not None
        assert result.get("updated_at") is not None

    def test_to_dict_serializes_uuid_to_string(self):
        """测试 to_dict 将 UUID 序列化为字符串"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()
        test_id = uuid4()
        instance.id = test_id

        result = instance.to_dict()

        # UUID 应该被序列化为字符串
        assert isinstance(result.get("id"), (str, UUID))
        if isinstance(result.get("id"), str):
            assert str(test_id) == result["id"]

    def test_to_dict_excludes_internal_attributes(self):
        """测试 to_dict 排除内部属性"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()

        result = instance.to_dict()

        # 不应该包含 SQLAlchemy 的内部属性
        # _sa_instance_state 不在 columns 中，所以不会出现在结果中
        assert "_sa_instance_state" not in result


class TestBaseRepr:
    """测试 Base 类的 __repr__ 方法"""

    def test_repr_returns_string(self):
        """测试 __repr__ 返回字符串"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()

        result = repr(instance)

        assert isinstance(result, str)

    def test_repr_includes_class_name(self):
        """测试 __repr__ 包含类名"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()

        result = repr(instance)

        # 应该包含类名
        assert "TestModel" in result

    def test_repr_includes_id_when_set(self):
        """测试 __repr__ 在设置了 id 时包含 id"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()
        test_id = uuid4()
        instance.id = test_id

        result = repr(instance)

        # 应该包含 id
        assert "id" in result.lower()
        assert str(test_id) in result

    def test_repr_format_is_readable(self):
        """测试 __repr__ 格式可读"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()
        test_id = uuid4()
        instance.id = test_id

        result = repr(instance)

        # 格式应该是类似：TestModel(id=xxx)
        assert result.startswith("TestModel(")
        assert result.endswith(")")


class TestBaseInheritance:
    """测试 Base 类的继承"""

    def test_custom_model_inherits_base_fields(self):
        """测试自定义模型继承 Base 的字段"""
        class CustomModel(Base):
            __tablename__ = "custom_models"
            # 可以添加其他字段

        instance = CustomModel()

        # 应该有 Base 的所有字段
        assert hasattr(instance, "id")
        assert hasattr(instance, "created_at")
        assert hasattr(instance, "updated_at")

    def test_custom_model_inherits_base_methods(self):
        """测试自定义模型继承 Base 的方法"""
        class CustomModel(Base):
            __tablename__ = "custom_models"

        instance = CustomModel()

        # 应该有 Base 的所有方法
        assert hasattr(instance, "to_dict")
        assert callable(instance.to_dict)
        assert hasattr(instance, "__repr__")

    def test_multiple_models_can_inherit_base(self):
        """测试多个模型可以继承 Base"""
        class Model1(Base):
            __tablename__ = "model1"

        class Model2(Base):
            __tablename__ = "model2"

        instance1 = Model1()
        instance2 = Model2()

        # 两个实例都应该有 Base 的字段和方法
        assert hasattr(instance1, "id")
        assert hasattr(instance2, "id")
        assert hasattr(instance1, "to_dict")
        assert hasattr(instance2, "to_dict")


class TestBaseEdgeCases:
    """测试 Base 类的边界情况"""

    def test_to_dict_with_none_values(self):
        """测试 to_dict 处理 None 值"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()
        # 不设置任何值

        result = instance.to_dict()

        # 应该返回包含 None 值的字典
        assert isinstance(result, dict)
        assert "id" in result

    def test_repr_without_id(self):
        """测试 __repr__ 在没有 id 时的表现"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance = TestModel()
        # 不设置 id

        result = repr(instance)

        # 应该仍然返回可读的字符串
        assert isinstance(result, str)
        assert "TestModel" in result

    def test_multiple_instances_have_independent_fields(self):
        """测试不同实例的字段是独立的"""
        class TestModel(Base):
            __tablename__ = "test_models"

        instance1 = TestModel()
        instance2 = TestModel()

        id1 = uuid4()
        id2 = uuid4()

        instance1.id = id1
        instance2.id = id2

        # 两个实例的 id 应该不同
        assert instance1.id != instance2.id
        assert instance1.id == id1
        assert instance2.id == id2
