"""
缓存服务测试

测试范围：
- CacheService 的所有方法
- JSON 序列化/反序列化
- 批量操作
- TTL 管理
- 键构建

参考 Issue #31
"""

import pytest
import json
from unittest.mock import AsyncMock, Mock
from backend.app.core.exceptions import (
    CacheSerializationError,
    CacheDeserializationError,
)


class TestCacheServiceInit:
    """测试 CacheService 初始化"""

    def test_init_with_defaults(self):
        """测试使用默认参数初始化"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        service = CacheService(mock_redis)

        assert service.redis is mock_redis
        assert service.key_prefix == "scryer"

    def test_init_with_custom_prefix(self):
        """测试使用自定义前缀初始化"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        service = CacheService(mock_redis, key_prefix="app")

        assert service.redis is mock_redis
        assert service.key_prefix == "app"


class TestCacheServiceSet:
    """测试 set 方法"""

    @pytest.mark.asyncio
    async def test_set_with_key_and_value(self):
        """测试设置键值"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.set = AsyncMock(return_value=True)

        service = CacheService(mock_redis)
        result = await service.set("test_key", "test_value")

        assert result is True
        mock_redis.set.assert_called_once_with("test_key", "test_value")

    @pytest.mark.asyncio
    async def test_set_with_ttl(self):
        """测试使用 TTL"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.setex = AsyncMock(return_value=True)

        service = CacheService(mock_redis)
        result = await service.set("test_key", "test_value", ttl=3600)

        assert result is True
        mock_redis.setex.assert_called_once_with("test_key", 3600, "test_value")

    @pytest.mark.asyncio
    async def test_set_without_ttl(self):
        """测试不设置 TTL"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.set = AsyncMock(return_value=True)

        service = CacheService(mock_redis)
        result = await service.set("test_key", "test_value", ttl=None)

        assert result is True
        mock_redis.set.assert_called_once_with("test_key", "test_value")

    @pytest.mark.asyncio
    async def test_set_handles_exceptions(self):
        """测试处理异常"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.set = AsyncMock(side_effect=Exception("Connection error"))

        service = CacheService(mock_redis)
        result = await service.set("test_key", "test_value")

        assert result is False


class TestCacheServiceGet:
    """测试 get 方法"""

    @pytest.mark.asyncio
    async def test_get_existing_key(self):
        """测试获取存在的键"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.get = AsyncMock(return_value=b"test_value")

        service = CacheService(mock_redis)
        result = await service.get("test_key")

        assert result == b"test_value"
        mock_redis.get.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_get_nonexistent_key(self):
        """测试获取不存在的键"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.get = AsyncMock(return_value=None)

        service = CacheService(mock_redis)
        result = await service.get("nonexistent_key")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_handles_exceptions(self):
        """测试处理异常"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.get = AsyncMock(side_effect=Exception("Connection error"))

        service = CacheService(mock_redis)
        result = await service.get("test_key")

        assert result is None


class TestCacheServiceDelete:
    """测试 delete 方法"""

    @pytest.mark.asyncio
    async def test_delete_existing_key(self):
        """测试删除存在的键"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.delete = AsyncMock(return_value=1)

        service = CacheService(mock_redis)
        result = await service.delete("test_key")

        assert result is True
        mock_redis.delete.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_delete_nonexistent_key(self):
        """测试删除不存在的键"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.delete = AsyncMock(return_value=0)

        service = CacheService(mock_redis)
        result = await service.delete("nonexistent_key")

        assert result is False

    @pytest.mark.asyncio
    async def test_delete_handles_exceptions(self):
        """测试处理异常"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.delete = AsyncMock(side_effect=Exception("Connection error"))

        service = CacheService(mock_redis)
        result = await service.delete("test_key")

        assert result is False


class TestCacheServiceExists:
    """测试 exists 方法"""

    @pytest.mark.asyncio
    async def test_exists_returns_true(self):
        """测试键存在返回 True"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.exists = AsyncMock(return_value=1)

        service = CacheService(mock_redis)
        result = await service.exists("test_key")

        assert result is True

    @pytest.mark.asyncio
    async def test_exists_returns_false(self):
        """测试键不存在返回 False"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.exists = AsyncMock(return_value=0)

        service = CacheService(mock_redis)
        result = await service.exists("test_key")

        assert result is False

    @pytest.mark.asyncio
    async def test_exists_handles_exceptions(self):
        """测试处理异常"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.exists = AsyncMock(side_effect=Exception("Connection error"))

        service = CacheService(mock_redis)
        result = await service.exists("test_key")

        assert result is False


class TestCacheServiceSetJson:
    """测试 JSON 序列化"""

    @pytest.mark.asyncio
    async def test_set_json_serializes_dict(self):
        """测试序列化字典"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.set = AsyncMock(return_value=True)

        service = CacheService(mock_redis)
        data = {"name": "test", "value": 123}
        result = await service.set_json("test_key", data)

        assert result is True
        mock_redis.set.assert_called_once_with("test_key", json.dumps(data))

    @pytest.mark.asyncio
    async def test_set_json_with_ttl(self):
        """测试 JSON 设置 TTL"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.setex = AsyncMock(return_value=True)

        service = CacheService(mock_redis)
        data = {"key": "value"}
        result = await service.set_json("test_key", data, ttl=1800)

        assert result is True
        mock_redis.setex.assert_called_once_with("test_key", 1800, json.dumps(data))

    @pytest.mark.asyncio
    async def test_set_json_raises_exception_on_function(self):
        """测试序列化函数抛出异常"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()

        service = CacheService(mock_redis)

        with pytest.raises(CacheSerializationError):
            await service.set_json("test_key", lambda x: x)

    @pytest.mark.asyncio
    async def test_set_json_raises_exception_on_object(self):
        """测试序列化普通对象抛出异常"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()

        service = CacheService(mock_redis)

        with pytest.raises(CacheSerializationError):
            await service.set_json("test_key", object())


class TestCacheServiceGetJson:
    """测试 JSON 反序列化"""

    @pytest.mark.asyncio
    async def test_get_json_deserializes_dict(self):
        """测试反序列化字典"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        data = {"name": "test", "value": 123}
        mock_redis.get = AsyncMock(return_value=json.dumps(data).encode())

        service = CacheService(mock_redis)
        result = await service.get_json("test_key")

        assert result == data

    @pytest.mark.asyncio
    async def test_get_json_returns_none_for_nonexistent(self):
        """测试不存在的键返回 None"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.get = AsyncMock(return_value=None)

        service = CacheService(mock_redis)
        result = await service.get_json("nonexistent_key")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_json_raises_exception_on_invalid_json(self):
        """测试处理无效 JSON 抛出异常"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.get = AsyncMock(return_value=b"invalid json")

        service = CacheService(mock_redis)

        with pytest.raises(CacheDeserializationError):
            await service.get_json("test_key")


class TestCacheServiceMget:
    """测试批量获取"""

    @pytest.mark.asyncio
    async def test_mget_returns_values(self):
        """测试批量获取值"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.mget = AsyncMock(
            return_value=[b"value1", b"value2", None]
        )

        service = CacheService(mock_redis)
        result = await service.mget(["key1", "key2", "key3"])

        assert result == ["value1", "value2", None]
        mock_redis.mget.assert_called_once_with(["key1", "key2", "key3"])

    @pytest.mark.asyncio
    async def test_mget_handles_bytes(self):
        """测试处理字节值"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.mget = AsyncMock(
            return_value=[b"value1", None, b"value3"]
        )

        service = CacheService(mock_redis)
        result = await service.mget(["key1", "key2", "key3"])

        assert result == ["value1", None, "value3"]

    @pytest.mark.asyncio
    async def test_mget_handles_exceptions(self):
        """测试处理异常"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.mget = AsyncMock(side_effect=Exception("Connection error"))

        service = CacheService(mock_redis)
        result = await service.mget(["key1", "key2", "key3"])

        assert result == [None, None, None]


class TestCacheServiceMset:
    """测试批量设置"""

    @pytest.mark.asyncio
    async def test_mset_sets_multiple_values(self):
        """测试批量设置值"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.mset = AsyncMock(return_value=True)

        service = CacheService(mock_redis)
        mapping = {"key1": "value1", "key2": "value2"}
        result = await service.mset(mapping)

        assert result is True
        mock_redis.mset.assert_called_once_with(mapping)

    @pytest.mark.asyncio
    async def test_mset_handles_exceptions(self):
        """测试处理异常"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.mset = AsyncMock(side_effect=Exception("Connection error"))

        service = CacheService(mock_redis)
        result = await service.mset({"key1": "value1"})

        assert result is False


class TestCacheServiceIncrement:
    """测试递增操作"""

    @pytest.mark.asyncio
    async def test_increment_increments_value(self):
        """测试递增数值"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.incrby = AsyncMock(return_value=5)

        service = CacheService(mock_redis)
        result = await service.increment("counter")

        assert result == 5
        mock_redis.incrby.assert_called_once_with("counter", 1)

    @pytest.mark.asyncio
    async def test_increment_with_amount(self):
        """测试递增指定数量"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.incrby = AsyncMock(return_value=10)

        service = CacheService(mock_redis)
        result = await service.increment("counter", 5)

        assert result == 10
        mock_redis.incrby.assert_called_once_with("counter", 5)

    @pytest.mark.asyncio
    async def test_increment_propagates_exceptions(self):
        """测试异常传播"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.incrby = AsyncMock(side_effect=Exception("Connection error"))

        service = CacheService(mock_redis)

        with pytest.raises(Exception, match="Connection error"):
            await service.increment("counter")


class TestCacheServiceDecrement:
    """测试递减操作"""

    @pytest.mark.asyncio
    async def test_decrement_decrements_value(self):
        """测试递减数值"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.decrby = AsyncMock(return_value=-1)

        service = CacheService(mock_redis)
        result = await service.decrement("counter")

        assert result == -1
        mock_redis.decrby.assert_called_once_with("counter", 1)

    @pytest.mark.asyncio
    async def test_decrement_with_amount(self):
        """测试递减指定数量"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.decrby = AsyncMock(return_value=-5)

        service = CacheService(mock_redis)
        result = await service.decrement("counter", 5)

        assert result == -5
        mock_redis.decrby.assert_called_once_with("counter", 5)

    @pytest.mark.asyncio
    async def test_decrement_propagates_exceptions(self):
        """测试异常传播"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.decrby = AsyncMock(side_effect=Exception("Connection error"))

        service = CacheService(mock_redis)

        with pytest.raises(Exception, match="Connection error"):
            await service.decrement("counter")


class TestCacheServiceExpire:
    """测试设置过期时间"""

    @pytest.mark.asyncio
    async def test_expire_sets_ttl(self):
        """测试设置 TTL"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.expire = AsyncMock(return_value=True)

        service = CacheService(mock_redis)
        result = await service.expire("test_key", 300)

        assert result is True
        mock_redis.expire.assert_called_once_with("test_key", 300)

    @pytest.mark.asyncio
    async def test_expire_handles_exceptions(self):
        """测试处理异常"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.expire = AsyncMock(side_effect=Exception("Connection error"))

        service = CacheService(mock_redis)
        result = await service.expire("test_key", 300)

        assert result is False


class TestCacheServiceTtl:
    """测试获取 TTL"""

    @pytest.mark.asyncio
    async def test_ttl_returns_remaining_time(self):
        """测试返回剩余时间"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.ttl = AsyncMock(return_value=120)

        service = CacheService(mock_redis)
        result = await service.ttl("test_key")

        assert result == 120

    @pytest.mark.asyncio
    async def test_ttl_returns_negative_one_for_no_expiry(self):
        """测试无过期时间返回 -1"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.ttl = AsyncMock(return_value=-1)

        service = CacheService(mock_redis)
        result = await service.ttl("test_key")

        assert result == -1

    @pytest.mark.asyncio
    async def test_ttl_returns_negative_two_for_nonexistent(self):
        """测试不存在的键返回 -2"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.ttl = AsyncMock(return_value=-2)

        service = CacheService(mock_redis)
        result = await service.ttl("nonexistent_key")

        assert result == -2

    @pytest.mark.asyncio
    async def test_ttl_handles_exceptions(self):
        """测试处理异常"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        mock_redis.ttl = AsyncMock(side_effect=Exception("Connection error"))

        service = CacheService(mock_redis)
        result = await service.ttl("test_key")

        assert result == -2


class TestCacheServiceDeleteByPattern:
    """测试模式删除"""

    @pytest.mark.asyncio
    async def test_delete_by_pattern_deletes_keys(self):
        """测试按模式删除键"""
        from backend.app.services.cache import CacheService

        async def mock_scan_iter(match):
            for key in ["key1", "key2", "key3"]:
                yield key

        mock_redis = Mock()
        mock_redis.scan_iter = mock_scan_iter
        mock_redis.delete = AsyncMock(return_value=3)

        service = CacheService(mock_redis)
        result = await service.delete_by_pattern("pattern:*")

        assert result == 3
        mock_redis.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_by_pattern_with_no_matches(self):
        """测试没有匹配项"""
        from backend.app.services.cache import CacheService

        async def mock_scan_iter(match):
            return
            yield  # 使其成为异步生成器

        mock_redis = Mock()
        mock_redis.scan_iter = mock_scan_iter

        service = CacheService(mock_redis)
        result = await service.delete_by_pattern("pattern:*")

        assert result == 0

    @pytest.mark.asyncio
    async def test_delete_by_pattern_handles_exceptions(self):
        """测试处理异常"""
        from backend.app.services.cache import CacheService

        async def mock_scan_iter_error(match):
            raise Exception("Connection error")
            yield  # 使其成为异步生成器

        mock_redis = Mock()
        mock_redis.scan_iter = mock_scan_iter_error

        service = CacheService(mock_redis)
        result = await service.delete_by_pattern("pattern:*")

        assert result == 0


class TestCacheServiceBuildKey:
    """测试键构建"""

    def test_build_key_with_single_part(self):
        """测试单个部分的键"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        service = CacheService(mock_redis, key_prefix="scryer")
        result = service.build_key("user")

        assert result == "scryer:user"

    def test_build_key_with_multiple_parts(self):
        """测试多个部分的键"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        service = CacheService(mock_redis, key_prefix="scryer")
        result = service.build_key("user", "123", "profile")

        assert result == "scryer:user:123:profile"

    def test_build_key_with_custom_prefix(self):
        """测试自定义前缀的键"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        service = CacheService(mock_redis, key_prefix="app")
        result = service.build_key("user", "123")

        assert result == "app:user:123"

    def test_build_key_with_no_parts(self):
        """测试无部分时只返回前缀"""
        from backend.app.services.cache import CacheService

        mock_redis = Mock()
        service = CacheService(mock_redis, key_prefix="scryer")
        result = service.build_key()

        assert result == "scryer"
