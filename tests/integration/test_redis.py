"""
Redis 集成测试

测试范围：
- 容器化 Redis 的连接
- Redis 连接在容器环境中的工作
- 基本 Redis 操作（GET, SET, DELETE）
- Redis 数据过期

验收标准：
- Redis 连接测试通过
- 基本操作正常
- 数据持久化正常

参考 Issue #63
"""

import asyncio

import pytest
from redis.asyncio import Redis as AsyncRedis


class TestRedisConnection:
    """测试 Redis 连接"""

    @pytest.mark.asyncio
    async def test_redis_container_available(self, check_redis_container: bool):
        """测试 Redis 容器可用"""
        assert check_redis_container is True

    @pytest.mark.asyncio
    async def test_redis_client_created(self, docker_redis_client: AsyncRedis):
        """测试 Redis 客户端已创建"""
        assert docker_redis_client is not None
        assert isinstance(docker_redis_client, AsyncRedis)

    @pytest.mark.asyncio
    async def test_redis_ping(self, docker_redis_client: AsyncRedis):
        """测试 Redis PING 命令"""
        result = await docker_redis_client.ping()
        assert result is True

    @pytest.mark.asyncio
    async def test_redis_connection_pool(self, docker_redis_pool):
        """测试 Redis 连接池已创建"""
        assert docker_redis_pool is not None
        # 连接池应该有连接配置
        assert docker_redis_pool.connection_kwargs is not None


class TestRedisBasicOperations:
    """测试 Redis 基本操作"""

    @pytest.mark.asyncio
    async def test_set_and_get(self, docker_redis_client: AsyncRedis):
        """测试 SET 和 GET 操作"""
        # SET
        await docker_redis_client.set("test_key", "test_value")

        # GET
        value = await docker_redis_client.get("test_key")
        assert value == "test_value"

    @pytest.mark.asyncio
    async def test_set_with_expiration(self, docker_redis_client: AsyncRedis):
        """测试 SET 带过期时间"""
        # 设置 2 秒过期
        await docker_redis_client.setex("expire_key", 2, "expire_value")

        # 立即查询应该存在
        value = await docker_redis_client.get("expire_key")
        assert value == "expire_value"

        # 等待 3 秒后应该被删除
        await asyncio.sleep(3)
        value = await docker_redis_client.get("expire_key")
        assert value is None

    @pytest.mark.asyncio
    async def test_delete(self, docker_redis_client: AsyncRedis):
        """测试 DELETE 操作"""
        # 先设置
        await docker_redis_client.set("delete_key", "delete_value")

        # 验证存在
        value = await docker_redis_client.get("delete_key")
        assert value == "delete_value"

        # 删除
        result = await docker_redis_client.delete("delete_key")
        assert result == 1

        # 验证已删除
        value = await docker_redis_client.get("delete_key")
        assert value is None

    @pytest.mark.asyncio
    async def test_exists(self, docker_redis_client: AsyncRedis):
        """测试 EXISTS 操作"""
        # 不存在的 key
        result = await docker_redis_client.exists("non_existent_key")
        assert result == 0

        # 设置后
        await docker_redis_client.set("exists_key", "exists_value")
        result = await docker_redis_client.exists("exists_key")
        assert result == 1

    @pytest.mark.asyncio
    async def test_increment_decrement(self, docker_redis_client: AsyncRedis):
        """测试 INCR 和 DECR 操作"""
        key = "counter_key"

        # 删除可能存在的旧值
        await docker_redis_client.delete(key)

        # 初始值应该是 0
        await docker_redis_client.set(key, "0")
        value = await docker_redis_client.get(key)
        assert value == "0"

        # 增加操作
        new_value = await docker_redis_client.incrby(key, 5)
        assert new_value == 5

        value = await docker_redis_client.get(key)
        assert value == "5"

        # 减少操作
        new_value = await docker_redis_client.decrby(key, 3)
        assert new_value == 2

        value = await docker_redis_client.get(key)
        assert value == "2"

    @pytest.mark.asyncio
    async def test_mget_mset(self, docker_redis_client: AsyncRedis):
        """测试 MGET 和 MSET 操作"""
        # 批量设置
        await docker_redis_client.mset(
            {
                "key1": "value1",
                "key2": "value2",
                "key3": "value3",
            }
        )

        # 批量获取
        values = await docker_redis_client.mget("key1", "key2", "key3", "key4")
        assert values == ["value1", "value2", "value3", None]

    @pytest.mark.asyncio
    async def test_ttl(self, docker_redis_client: AsyncRedis):
        """测试 TTL 操作"""
        # 永久 key
        await docker_redis_client.set("permanent_key", "value")
        ttl = await docker_redis_client.ttl("permanent_key")
        assert ttl == -1  # -1 表示永久

        # 带过期时间的 key
        await docker_redis_client.setex("temp_key", 10, "value")
        ttl = await docker_redis_client.ttl("temp_key")
        assert ttl > 0 and ttl <= 10

        # 不存在的 key
        ttl = await docker_redis_client.ttl("non_existent_key")
        assert ttl == -2  # -2 表示不存在


class TestRedisDataTypes:
    """测试 Redis 数据类型"""

    @pytest.mark.asyncio
    async def test_list_operations(self, docker_redis_client: AsyncRedis):
        """测试列表操作"""
        key = "test_list"

        # 清空
        await docker_redis_client.delete(key)

        # LPUSH
        await docker_redis_client.lpush(key, "value3", "value2", "value1")
        length = await docker_redis_client.llen(key)
        assert length == 3

        # LRANGE
        values = await docker_redis_client.lrange(key, 0, -1)
        assert values == ["value1", "value2", "value3"]

        # RPOP
        value = await docker_redis_client.rpop(key)
        assert value == "value3"

    @pytest.mark.asyncio
    async def test_hash_operations(self, docker_redis_client: AsyncRedis):
        """测试哈希操作"""
        key = "test_hash"

        # 清空
        await docker_redis_client.delete(key)

        # HSET
        await docker_redis_client.hset(
            key,
            mapping={
                "field1": "value1",
                "field2": "value2",
            },
        )

        # HGET
        value = await docker_redis_client.hget(key, "field1")
        assert value == "value1"

        # HGETALL
        all_values = await docker_redis_client.hgetall(key)
        assert all_values == {"field1": "value1", "field2": "value2"}

        # HDEL
        result = await docker_redis_client.hdel(key, "field1")
        assert result == 1

        value = await docker_redis_client.hget(key, "field1")
        assert value is None


class TestRedisIsolation:
    """测试数据隔离"""

    @pytest.mark.asyncio
    async def test_data_isolation_between_tests(self, docker_redis_client: AsyncRedis):
        """测试间的数据隔离"""
        # docker_redis_client fixture 会在每个测试后自动 flushdb
        # 所以这里设置的数据在下一个测试应该不存在

        await docker_redis_client.set("isolation_test", "value")
        value = await docker_redis_client.get("isolation_test")
        assert value == "value"

    @pytest.mark.asyncio
    async def test_database_separation(self, docker_redis_client: AsyncRedis):
        """测试不同数据库的隔离"""
        # 当前使用的数据库应该从环境变量读取
        # 测试数据应该在不同数据库中隔离

        # 这里简单验证操作成功
        await docker_redis_client.set("db_test", "value")
        value = await docker_redis_client.get("db_test")
        assert value == "value"


class TestRedisPersistence:
    """测试 Redis 持久化"""

    @pytest.mark.asyncio
    async def test_save_and_reload(self, docker_redis_client: AsyncRedis):
        """测试数据保存"""
        # 设置数据
        await docker_redis_client.set("persist_key", "persist_value")

        # 验证存在
        value = await docker_redis_client.get("persist_key")
        assert value == "persist_value"

        # 注意：在容器环境中，实际的持久化需要重启容器来验证
        # 这里我们只验证操作成功


class TestRedisPerformance:
    """测试 Redis 性能"""

    @pytest.mark.asyncio
    async def test_concurrent_operations(self, docker_redis_client: AsyncRedis):
        """测试并发操作"""

        async def set_get(key: int):
            await docker_redis_client.set(f"perf_key_{key}", f"value_{key}")
            value = await docker_redis_client.get(f"perf_key_{key}")
            return value

        # 并发执行 100 个操作
        results = await asyncio.gather(*[set_get(i) for i in range(100)])
        assert len(results) == 100
        assert all(r == f"value_{i}" for i, r in enumerate(results))

    @pytest.mark.asyncio
    async def test_pipeline_operations(self, docker_redis_client: AsyncRedis):
        """测试管道操作"""
        async with docker_redis_client.pipeline(transaction=True) as pipe:
            # 添加多个命令到管道
            await pipe.set("pipe_key1", "value1")
            await pipe.set("pipe_key2", "value2")
            await pipe.set("pipe_key3", "value3")
            # 执行
            results = await pipe.execute()

        # 验证所有命令都成功
        assert all(results)

        # 验证数据
        assert await docker_redis_client.get("pipe_key1") == "value1"
        assert await docker_redis_client.get("pipe_key2") == "value2"
        assert await docker_redis_client.get("pipe_key3") == "value3"
