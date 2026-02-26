"""
缓存装饰器测试

测试范围：
- @cached_async 装饰器
- 缓存服务初始化和获取
- 复杂键构建器
- @cached 别名

参考 Issue #31
"""

import json
import pytest
from unittest.mock import AsyncMock, Mock
from redis.asyncio import Redis as AsyncRedis


def create_mock_redis():
    """创建一个正确配置的 mock Redis 客户端

    这个函数确保 mock 对象的异步方法正确返回值，而不是 AsyncMock 对象
    """
    # 创建一个简单的对象，完全避免 Mock 的自动属性创建
    class MockRedis:
        pass

    mock_redis = MockRedis()

    # 显式设置所有需要的方法
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.set = AsyncMock(return_value=True)
    mock_redis.setex = AsyncMock(return_value=True)
    mock_redis.delete = AsyncMock(return_value=1)
    mock_redis.exists = AsyncMock(return_value=0)
    mock_redis.expire = AsyncMock(return_value=True)
    mock_redis.ttl = AsyncMock(return_value=-1)
    mock_redis.incrby = AsyncMock(return_value=1)
    mock_redis.decrby = AsyncMock(return_value=-1)
    mock_redis.mget = AsyncMock(return_value=[])
    mock_redis.mset = AsyncMock(return_value=True)
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.keys = AsyncMock(return_value=[])
    mock_redis.scan_iter = Mock(return_value=iter([]))
    mock_redis.close = AsyncMock(return_value=None)
    mock_redis.aclose = AsyncMock(return_value=None)

    return mock_redis


class TestInitCacheDecorators:
    """测试装饰器初始化"""

    def test_init_cache_decorators_sets_service(self):
        """测试 init_cache_decorators 设置缓存服务"""
        from backend.app.utils.decorators import init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        mock_redis = create_mock_redis()
        init_cache_decorators(mock_redis)

        # 验证 _cache_service 已被初始化
        from backend.app.utils.decorators import _cache_service
        assert _cache_service is not None
        assert _cache_service.redis is mock_redis


class TestGetCacheService:
    """测试获取缓存服务"""

    def test_get_cache_service_returns_initialized_service(self):
        """测试返回已初始化的服务"""
        from backend.app.utils.decorators import init_cache_decorators, _get_cache_service

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        mock_redis = create_mock_redis()
        init_cache_decorators(mock_redis)

        result = _get_cache_service()

        assert result is not None
        assert result.redis is mock_redis

    def test_get_cache_service_raises_error_if_not_initialized(self):
        """测试未初始化时抛出错误"""
        from backend.app.utils.decorators import _get_cache_service

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        with pytest.raises(RuntimeError) as exc_info:
            _get_cache_service()

        assert "Cache service not initialized" in str(exc_info.value)


class TestCachedAsyncDecorator:
    """测试 @cached_async 装饰器"""

    @pytest.mark.asyncio
    async def test_cached_async_hits_cache(self):
        """测试缓存命中"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()
        mock_redis.get = AsyncMock(return_value=json.dumps("cached_value"))

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        call_count = 0

        @cached_async(key_builder=lambda x, y: f"test:{x}:{y}", ttl=60)
        async def test_function(x, y):
            nonlocal call_count
            call_count += 1
            return f"computed_{x}_{y}"

        # 第一次调用，缓存命中
        result = await test_function(1, 2)

        assert result == "cached_value"
        assert call_count == 0  # 函数未被执行
        mock_redis.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_cached_async_misses_cache(self):
        """测试缓存未命中"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        call_count = 0

        @cached_async(key_builder=lambda x, y: f"test:{x}:{y}")
        async def test_function(x, y):
            nonlocal call_count
            call_count += 1
            return f"computed_{x}_{y}"

        result = await test_function(1, 2)

        assert result == "computed_1_2"
        assert call_count == 1  # 函数被执行
        mock_redis.set.assert_called_once()

    @pytest.mark.asyncio
    async def test_cached_async_with_custom_key_builder(self):
        """测试使用自定义键构建器"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        @cached_async(key_builder=lambda user_id, action: f"user:{user_id}:{action}")
        async def test_function(user_id, action):
            return f"{action}_for_{user_id}"

        await test_function(123, "profile")

        # 验证使用了正确的缓存键
        mock_redis.get.assert_called_once_with("user:123:profile")

    @pytest.mark.asyncio
    async def test_cached_async_with_ttl(self):
        """测试 TTL 参数生效"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()

        # 记录 setex 调用
        setex_calls = []
        async def mock_setex(key, ttl, value):
            setex_calls.append((key, ttl, value))
            return True

        mock_redis.setex = AsyncMock(side_effect=mock_setex)

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        @cached_async(key_builder=lambda: "test", ttl=300)
        async def test_function():
            return "result"

        await test_function()

        # 验证使用了 setex 且 TTL 正确
        assert len(setex_calls) == 1
        assert setex_calls[0][1] == 300

    @pytest.mark.asyncio
    async def test_cached_async_without_ttl(self):
        """测试不使用 TTL"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()

        # 记录 set 调用
        set_calls = []
        async def mock_set(key, value):
            set_calls.append((key, value))
            return True

        mock_redis.set = AsyncMock(side_effect=mock_set)

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        @cached_async(key_builder=lambda: "test")
        async def test_function():
            return "result"

        await test_function()

        # 验证使用了 set（不是 setex）
        assert len(set_calls) == 1

    @pytest.mark.asyncio
    async def test_cached_async_with_json_serialization(self):
        """测试 JSON 序列化"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()

        stored_value = None
        async def mock_set(key, value):
            nonlocal stored_value
            stored_value = value
            return True

        mock_redis.set = AsyncMock(side_effect=mock_set)

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        @cached_async(key_builder=lambda: "test")
        async def test_function():
            return {"key": "value"}

        await test_function()

        # 验证存储的是 JSON 字符串
        assert json.loads(stored_value) == {"key": "value"}

    @pytest.mark.asyncio
    async def test_cached_async_cache_hit_returns_deserialized_json(self):
        """测试缓存命中时返回反序列化的 JSON"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()
        mock_redis.get = AsyncMock(return_value=json.dumps({"data": "value"}))

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        @cached_async(key_builder=lambda: "test")
        async def test_function():
            return {"should_not": "execute"}

        result = await test_function()

        assert result == {"data": "value"}

    @pytest.mark.asyncio
    async def test_cached_async_cache_hit_with_non_json_returns_raw(self):
        """测试缓存命中时返回非 JSON 原始值"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()
        mock_redis.get = AsyncMock(return_value="plain_string")

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        @cached_async(key_builder=lambda: "test")
        async def test_function():
            return "should_not_execute"

        result = await test_function()

        assert result == "plain_string"

    @pytest.mark.asyncio
    async def test_cached_async_with_non_json_serializable(self):
        """测试非 JSON 可序列化对象"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()

        stored_value = None
        async def mock_set(key, value):
            nonlocal stored_value
            stored_value = value
            return True

        mock_redis.set = AsyncMock(side_effect=mock_set)

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        class CustomObject:
            def __str__(self):
                return "CustomObject"

        @cached_async(key_builder=lambda: "test")
        async def test_function():
            return CustomObject()

        await test_function()

        # 验证存储的是字符串表示
        assert stored_value == "CustomObject"

    @pytest.mark.asyncio
    async def test_cached_async_handles_exception(self):
        """测试函数异常时不缓存"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        @cached_async(key_builder=lambda: "test")
        async def test_function():
            raise ValueError("Test error")

        # 异常应该被传播
        with pytest.raises(ValueError, match="Test error"):
            await test_function()

        # set 不应该被调用
        mock_redis.set.assert_not_called()


class TestCachedAlias:
    """测试 @cached 别名"""

    def test_cached_is_alias_of_cached_async(self):
        """测试 cached 是 cached_async 的别名"""
        from backend.app.utils.decorators import cached, cached_async

        assert cached is cached_async

    @pytest.mark.asyncio
    async def test_cached_decorator_works(self):
        """测试 @cached 装饰器工作"""
        from backend.app.utils.decorators import cached, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = Mock(spec=AsyncRedis)
        mock_redis.get = AsyncMock(return_value=None)

        call_count = 0
        async def mock_set(key, value):
            nonlocal call_count
            call_count += 1
            return True

        mock_redis.set = AsyncMock(side_effect=mock_set)

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        @cached(key_builder=lambda x: f"test:{x}")
        async def test_function(x):
            return x * 2

        result = await test_function(5)

        assert result == 10
        assert call_count == 1


class TestCachedAsyncWithComplexKeyBuilders:
    """测试复杂键构建器"""

    @pytest.mark.asyncio
    async def test_key_builder_with_multiple_args_and_kwargs(self):
        """测试键构建器处理多个参数和关键字参数"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        @cached_async(key_builder=lambda **kwargs: f"complex:{kwargs['id']}")
        async def test_function(id, name=""):
            return f"{id}:{name}"

        await test_function(id=42, name="test")

        # 验证使用了正确的键
        mock_redis.get.assert_called_once_with("complex:42")

    @pytest.mark.asyncio
    async def test_key_builder_with_function_name(self):
        """测试键构建器使用函数名"""
        from backend.app.utils.decorators import cached_async, init_cache_decorators

        # 重置全局状态
        import backend.app.utils.decorators as decorators_module
        decorators_module._cache_service = None

        # 创建 mock Redis 客户端
        mock_redis = create_mock_redis()

        # 初始化装饰器
        init_cache_decorators(mock_redis)

        @cached_async(key_builder=lambda: "my_function")
        async def test_function():
            return "result"

        await test_function()

        # 验证使用了正确的键
        mock_redis.get.assert_called_once_with("my_function")
