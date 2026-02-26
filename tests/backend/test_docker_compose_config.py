"""
Docker Compose 配置验证测试 (Issue #61)

测试范围：
- docker-compose.yml YAML 语法正确性
- PostgreSQL 服务配置完整性（镜像、端口、环境变量、卷、健康检查）
- Redis 服务配置完整性（镜像、端口、卷、健康检查）
- 服务依赖关系配置正确性
- 环境变量注入正确性

验收标准：
- PostgreSQL 服务正常启动并可连接
- Redis 服务正常启动并可连接
- 数据持久化卷正确配置
- 服务依赖关系正确配置

参考 Issue #61 和 docs/blueprints/issue-61-docker-compose-infrastructure.md
"""

from pathlib import Path
from typing import Any, Dict, cast

import pytest
import yaml


class TestDockerComposeSyntax:
    """测试 docker-compose.yml 语法正确性"""

    @pytest.fixture
    def compose_file_path(self) -> Path:
        """获取 docker-compose.yml 文件路径"""
        return Path("/workspace/docker-compose.yml")

    @pytest.fixture
    def compose_config(self, compose_file_path: Path) -> Dict[str, Any]:
        """加载并解析 docker-compose.yml"""
        if not compose_file_path.exists():
            pytest.skip("docker-compose.yml not found")

        with open(compose_file_path, "r", encoding="utf-8") as f:
            config = cast(Dict[str, Any], yaml.safe_load(f))

        return config

    def test_yaml_syntax_is_valid(self, compose_config: Dict[str, Any]):
        """测试 YAML 语法正确（能够成功解析）"""
        # 如果能够解析到这个位置，说明语法是正确的
        assert compose_config is not None
        assert isinstance(compose_config, dict)

    def test_docker_compose_version_is_valid(self, compose_config: Dict[str, Any]):
        """测试 Docker Compose 版本号存在且有效"""
        assert "version" in compose_config
        assert compose_config["version"] in ["3.8", "3.9", "3.10"]


class TestPostgreSQLServiceConfig:
    """测试 PostgreSQL 服务配置完整性"""

    @pytest.fixture
    def compose_config(self) -> Dict[str, Any]:
        """加载 docker-compose.yml 配置"""
        compose_file = Path("/workspace/docker-compose.yml")
        if not compose_file.exists():
            pytest.skip("docker-compose.yml not found")

        with open(compose_file, "r", encoding="utf-8") as f:
            return cast(Dict[str, Any], yaml.safe_load(f))

    @pytest.fixture
    def postgres_service(self, compose_config: Dict[str, Any]) -> Dict[str, Any]:
        """获取 PostgreSQL 服务配置"""
        services = compose_config.get("services", {})
        return cast(Dict[str, Any], services.get("postgres", {}))

    def test_postgres_service_exists(self, postgres_service: Dict[str, Any]):
        """测试 PostgreSQL 服务已定义"""
        assert postgres_service is not None
        assert isinstance(postgres_service, dict)
        assert len(postgres_service) > 0

    def test_postgres_image_is_correct(self, postgres_service: Dict[str, Any]):
        """测试 PostgreSQL 镜像正确"""
        assert "image" in postgres_service
        expected_images = ["postgres:15-alpine", "postgres:15"]
        assert postgres_service["image"] in expected_images

    def test_postgres_container_name_is_correct(self, postgres_service: Dict[str, Any]):
        """测试 PostgreSQL 容器名称正确"""
        assert "container_name" in postgres_service
        assert postgres_service["container_name"] == "scryer-postgres"

    def test_postgres_restart_policy_is_configured(
        self, postgres_service: Dict[str, Any]
    ):
        """测试 PostgreSQL 重启策略已配置"""
        assert "restart" in postgres_service
        assert postgres_service["restart"] == "unless-stopped"

    def test_postgres_environment_variables_configured(
        self, postgres_service: Dict[str, Any]
    ):
        """测试 PostgreSQL 环境变量配置完整"""
        assert "environment" in postgres_service
        env = postgres_service["environment"]

        # 必需的环境变量
        required_vars = ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "PGDATA"]
        for var in required_vars:
            assert var in env

    def test_postgres_user_has_default(self, postgres_service: Dict[str, Any]):
        """测试 POSTGRES_USER 有默认值"""
        env = postgres_service["environment"]
        user_value = env["POSTGRES_USER"]

        # 应该支持环境变量或默认值
        assert user_value in ["${POSTGRES_USER:-scryer}", "${POSTGRES_USER}", "scryer"]

    def test_postgres_db_has_default(self, postgres_service: Dict[str, Any]):
        """测试 POSTGRES_DB 有默认值"""
        env = postgres_service["environment"]
        db_value = env["POSTGRES_DB"]

        # 应该支持环境变量或默认值
        assert db_value in ["${POSTGRES_DB:-scryer}", "${POSTGRES_DB}", "scryer"]

    def test_postgres_pgdata_path_is_correct(self, postgres_service: Dict[str, Any]):
        """测试 PGDATA 路径正确"""
        env = postgres_service["environment"]
        assert "PGDATA" in env
        assert env["PGDATA"] == "/var/lib/postgresql/data/pgdata"

    def test_postgres_port_mapping_is_configured(
        self, postgres_service: Dict[str, Any]
    ):
        """测试 PostgreSQL 端口映射已配置"""
        assert "ports" in postgres_service
        ports = postgres_service["ports"]
        assert "5432:5432" in ports or [5432, 5432] in ports or "5432" in ports

    def test_postgres_volumes_configured(self, postgres_service: Dict[str, Any]):
        """测试 PostgreSQL 数据卷已配置"""
        assert "volumes" in postgres_service
        volumes = postgres_service["volumes"]
        assert len(volumes) > 0

        # 应该有一个命名卷映射到 PGDATA 路径
        has_data_volume = any(
            "postgres_data" in str(vol) or "/var/lib/postgresql/data" in str(vol)
            for vol in volumes
        )
        assert has_data_volume

    def test_postgres_healthcheck_configured(self, postgres_service: Dict[str, Any]):
        """测试 PostgreSQL 健康检查已配置"""
        assert "healthcheck" in postgres_service
        healthcheck = postgres_service["healthcheck"]

        # 必需的配置项
        assert "test" in healthcheck
        assert "interval" in healthcheck
        assert "timeout" in healthcheck
        assert "retries" in healthcheck
        assert "start_period" in healthcheck

    def test_postgres_healthcheck_test_command(self, postgres_service: Dict[str, Any]):
        """测试 PostgreSQL 健康检查命令正确"""
        healthcheck = postgres_service["healthcheck"]
        test_cmd = healthcheck["test"]

        # 应该使用 pg_isready 命令
        test_str = str(test_cmd)
        assert "pg_isready" in test_str

    def test_postgres_healthcheck_interval(self, postgres_service: Dict[str, Any]):
        """测试 PostgreSQL 健康检查间隔配置"""
        healthcheck = postgres_service["healthcheck"]
        interval = healthcheck["interval"]

        # 间隔应该是 10s
        assert interval in ["10s", "10s", 10, "10"]

    def test_postgres_network_configured(self, postgres_service: Dict[str, Any]):
        """测试 PostgreSQL 网络配置"""
        assert "networks" in postgres_service
        networks = postgres_service["networks"]
        assert "scryer-network" in networks


class TestRedisServiceConfig:
    """测试 Redis 服务配置完整性"""

    @pytest.fixture
    def compose_config(self) -> Dict[str, Any]:
        """加载 docker-compose.yml 配置"""
        compose_file = Path("/workspace/docker-compose.yml")
        if not compose_file.exists():
            pytest.skip("docker-compose.yml not found")

        with open(compose_file, "r", encoding="utf-8") as f:
            return cast(Dict[str, Any], yaml.safe_load(f))

    @pytest.fixture
    def redis_service(self, compose_config: Dict[str, Any]) -> Dict[str, Any]:
        """获取 Redis 服务配置"""
        services = compose_config.get("services", {})
        return cast(Dict[str, Any], services.get("redis", {}))

    def test_redis_service_exists(self, redis_service: Dict[str, Any]):
        """测试 Redis 服务已定义"""
        assert redis_service is not None
        assert isinstance(redis_service, dict)
        assert len(redis_service) > 0

    def test_redis_image_is_correct(self, redis_service: Dict[str, Any]):
        """测试 Redis 镜像正确"""
        assert "image" in redis_service
        expected_images = ["redis:7-alpine", "redis:7"]
        assert redis_service["image"] in expected_images

    def test_redis_container_name_is_correct(self, redis_service: Dict[str, Any]):
        """测试 Redis 容器名称正确"""
        assert "container_name" in redis_service
        assert redis_service["container_name"] == "scryer-redis"

    def test_redis_restart_policy_is_configured(self, redis_service: Dict[str, Any]):
        """测试 Redis 重启策略已配置"""
        assert "restart" in redis_service
        assert redis_service["restart"] == "unless-stopped"

    def test_redis_command_configured(self, redis_service: Dict[str, Any]):
        """测试 Redis 启动命令已配置"""
        assert "command" in redis_service
        command = redis_service["command"]
        command_str = str(command)

        # 应该包含 AOF 持久化配置
        assert "appendonly" in command_str
        assert "maxmemory" in command_str
        assert "maxmemory-policy" in command_str

    def test_redis_port_mapping_is_configured(self, redis_service: Dict[str, Any]):
        """测试 Redis 端口映射已配置"""
        assert "ports" in redis_service
        ports = redis_service["ports"]
        assert "6379:6379" in ports or [6379, 6379] in ports or "6379" in ports

    def test_redis_volumes_configured(self, redis_service: Dict[str, Any]):
        """测试 Redis 数据卷已配置"""
        assert "volumes" in redis_service
        volumes = redis_service["volumes"]
        assert len(volumes) > 0

        # 应该有一个命名卷映射到 /data
        has_data_volume = any(
            "redis_data" in str(vol) or "/data" in str(vol) for vol in volumes
        )
        assert has_data_volume

    def test_redis_healthcheck_configured(self, redis_service: Dict[str, Any]):
        """测试 Redis 健康检查已配置"""
        assert "healthcheck" in redis_service
        healthcheck = redis_service["healthcheck"]

        # 必需的配置项
        assert "test" in healthcheck
        assert "interval" in healthcheck
        assert "timeout" in healthcheck
        assert "retries" in healthcheck
        assert "start_period" in healthcheck

    def test_redis_healthcheck_test_command(self, redis_service: Dict[str, Any]):
        """测试 Redis 健康检查命令正确"""
        healthcheck = redis_service["healthcheck"]
        test_cmd = healthcheck["test"]

        # 应该使用 redis-cli ping 命令
        test_str = str(test_cmd)
        assert "redis-cli" in test_str
        assert "ping" in test_str

    def test_redis_healthcheck_interval(self, redis_service: Dict[str, Any]):
        """测试 Redis 健康检查间隔配置"""
        healthcheck = redis_service["healthcheck"]
        interval = healthcheck["interval"]

        # 间隔应该是 10s
        assert interval in ["10s", "10s", 10, "10"]

    def test_redis_network_configured(self, redis_service: Dict[str, Any]):
        """测试 Redis 网络配置"""
        assert "networks" in redis_service
        networks = redis_service["networks"]
        assert "scryer-network" in networks


class TestServiceDependencies:
    """测试服务依赖关系配置"""

    @pytest.fixture
    def compose_config(self) -> Dict[str, Any]:
        """加载 docker-compose.yml 配置"""
        compose_file = Path("/workspace/docker-compose.yml")
        if not compose_file.exists():
            pytest.skip("docker-compose.yml not found")

        with open(compose_file, "r", encoding="utf-8") as f:
            return cast(Dict[str, Any], yaml.safe_load(f))

    @pytest.fixture
    def scryer_dev_service(self, compose_config: Dict[str, Any]) -> Dict[str, Any]:
        """获取 scryer-dev 服务配置"""
        services = compose_config.get("services", {})
        return cast(Dict[str, Any], services.get("scryer-dev", {}))

    def test_scryer_dev_depends_on_postgres(self, scryer_dev_service: Dict[str, Any]):
        """测试 scryer-dev 服务依赖 PostgreSQL"""
        assert "depends_on" in scryer_dev_service
        depends_on = scryer_dev_service["depends_on"]

        # 应该依赖 postgres 服务
        assert "postgres" in depends_on

    def test_scryer_dev_depends_on_redis(self, scryer_dev_service: Dict[str, Any]):
        """测试 scryer-dev 服务依赖 Redis"""
        assert "depends_on" in scryer_dev_service
        depends_on = scryer_dev_service["depends_on"]

        # 应该依赖 redis 服务
        assert "redis" in depends_on

    def test_scryer_dev_waits_for_postgres_healthcheck(
        self, scryer_dev_service: Dict[str, Any]
    ):
        """测试 scryer-dev 等待 PostgreSQL 健康检查通过"""
        assert "depends_on" in scryer_dev_service
        depends_on = scryer_dev_service["depends_on"]

        if isinstance(depends_on, dict):
            # 新格式：depends_on with condition
            assert "postgres" in depends_on
            postgres_dep = depends_on["postgres"]
            assert isinstance(postgres_dep, dict)
            assert "condition" in postgres_dep
            assert postgres_dep["condition"] == "service_healthy"

    def test_scryer_dev_waits_for_redis_healthcheck(
        self, scryer_dev_service: Dict[str, Any]
    ):
        """测试 scryer-dev 等待 Redis 健康检查通过"""
        assert "depends_on" in scryer_dev_service
        depends_on = scryer_dev_service["depends_on"]

        if isinstance(depends_on, dict):
            # 新格式：depends_on with condition
            assert "redis" in depends_on
            redis_dep = depends_on["redis"]
            assert isinstance(redis_dep, dict)
            assert "condition" in redis_dep
            assert redis_dep["condition"] == "service_healthy"


class TestEnvironmentVariables:
    """测试环境变量注入配置"""

    @pytest.fixture
    def compose_config(self) -> Dict[str, Any]:
        """加载 docker-compose.yml 配置"""
        compose_file = Path("/workspace/docker-compose.yml")
        if not compose_file.exists():
            pytest.skip("docker-compose.yml not found")

        with open(compose_file, "r", encoding="utf-8") as f:
            return cast(Dict[str, Any], yaml.safe_load(f))

    @pytest.fixture
    def scryer_dev_service(self, compose_config: Dict[str, Any]) -> Dict[str, Any]:
        """获取 scryer-dev 服务配置"""
        services = compose_config.get("services", {})
        return cast(Dict[str, Any], services.get("scryer-dev", {}))

    def test_scryer_dev_has_env_file(self, scryer_dev_service: Dict[str, Any]):
        """测试 scryer-dev 配置了 env_file"""
        assert "env_file" in scryer_dev_service
        env_files = scryer_dev_service["env_file"]

        # 应该引用 .env 文件
        assert ".env" in env_files or any(".env" in str(f) for f in env_files)

    def test_scryer_dev_has_environment_overrides(
        self, scryer_dev_service: Dict[str, Any]
    ):
        """测试 scryer-dev 配置了环境变量覆盖"""
        assert "environment" in scryer_dev_service
        env = scryer_dev_service["environment"]

        # 应该是一个列表或字典
        assert isinstance(env, (list, dict))

    def test_database_url_overridden_for_docker(
        self, scryer_dev_service: Dict[str, Any]
    ):
        """测试 DATABASE_URL 被覆盖为 Docker 网络地址"""
        assert "environment" in scryer_dev_service
        env = scryer_dev_service["environment"]

        # 检查 DATABASE_URL 配置
        database_url = None
        if isinstance(env, dict):
            database_url = env.get("DATABASE_URL")
        elif isinstance(env, list):
            for var in env:
                if "DATABASE_URL" in str(var):
                    database_url = var
                    break

        assert database_url is not None
        # 应该使用 postgres 服务名而非 localhost
        assert "postgres:5432" in str(database_url) or "postgres:" in str(database_url)
        assert "asyncpg" in str(database_url)

    def test_redis_url_overridden_for_docker(self, scryer_dev_service: Dict[str, Any]):
        """测试 REDIS_URL 被覆盖为 Docker 网络地址"""
        assert "environment" in scryer_dev_service
        env = scryer_dev_service["environment"]

        # 检查 REDIS_URL 配置
        redis_url = None
        if isinstance(env, dict):
            redis_url = env.get("REDIS_URL")
        elif isinstance(env, list):
            for var in env:
                if "REDIS_URL" in str(var):
                    redis_url = var
                    break

        assert redis_url is not None
        # 应该使用 redis 服务名而非 localhost
        assert "redis:6379" in str(redis_url) or "redis:" in str(redis_url)


class TestVolumesConfiguration:
    """测试数据卷配置"""

    @pytest.fixture
    def compose_config(self) -> Dict[str, Any]:
        """加载 docker-compose.yml 配置"""
        compose_file = Path("/workspace/docker-compose.yml")
        if not compose_file.exists():
            pytest.skip("docker-compose.yml not found")

        with open(compose_file, "r", encoding="utf-8") as f:
            return cast(Dict[str, Any], yaml.safe_load(f))

    @pytest.fixture
    def volumes_config(self, compose_config: Dict[str, Any]) -> Dict[str, Any]:
        """获取 volumes 配置"""
        return cast(Dict[str, Any], compose_config.get("volumes", {}))

    def test_volumes_section_exists(self, volumes_config: Dict[str, Any]):
        """测试 volumes 配置段存在"""
        assert volumes_config is not None
        assert isinstance(volumes_config, dict)

    def test_postgres_data_volume_defined(self, volumes_config: Dict[str, Any]):
        """测试 PostgreSQL 数据卷已定义"""
        # 检查 postgres_data 卷
        assert "postgres_data" in volumes_config or any(
            "postgres" in key.lower() for key in volumes_config.keys()
        )

    def test_redis_data_volume_defined(self, volumes_config: Dict[str, Any]):
        """测试 Redis 数据卷已定义"""
        # 检查 redis_data 卷
        assert "redis_data" in volumes_config or any(
            "redis" in key.lower() for key in volumes_config.keys()
        )

    def test_scryer_dev_venv_volume_preserved(self, volumes_config: Dict[str, Any]):
        """测试现有的 scryer-dev-venv 卷被保留"""
        # 确保向后兼容性
        assert "scryer-dev-venv" in volumes_config

    def test_volumes_use_local_driver(self, volumes_config: Dict[str, Any]):
        """测试所有卷使用 local 驱动"""
        for volume_name, volume_config in volumes_config.items():
            if isinstance(volume_config, dict):
                # 如果有 driver 配置，应该是 local
                if "driver" in volume_config:
                    assert volume_config["driver"] == "local"
            else:
                # 如果没有 driver 配置，默认使用 local
                pass


class TestNetworkConfiguration:
    """测试网络配置"""

    @pytest.fixture
    def compose_config(self) -> Dict[str, Any]:
        """加载 docker-compose.yml 配置"""
        compose_file = Path("/workspace/docker-compose.yml")
        if not compose_file.exists():
            pytest.skip("docker-compose.yml not found")

        with open(compose_file, "r", encoding="utf-8") as f:
            return cast(Dict[str, Any], yaml.safe_load(f))

    @pytest.fixture
    def networks_config(self, compose_config: Dict[str, Any]) -> Dict[str, Any]:
        """获取 networks 配置"""
        return cast(Dict[str, Any], compose_config.get("networks", {}))

    def test_networks_section_exists(self, networks_config: Dict[str, Any]):
        """测试 networks 配置段存在"""
        assert networks_config is not None
        assert isinstance(networks_config, dict)
        assert len(networks_config) > 0

    def test_scryer_network_defined(self, networks_config: Dict[str, Any]):
        """测试 scryer-network 已定义"""
        assert "scryer-network" in networks_config

    def test_scryer_network_driver_is_bridge(self, networks_config: Dict[str, Any]):
        """测试 scryer-network 使用 bridge 驱动"""
        network = networks_config.get("scryer-network", {})
        if isinstance(network, dict):
            assert "driver" in network or "name" in network
            if "driver" in network:
                assert network["driver"] == "bridge"


class TestEnvExampleFile:
    """测试 .env.example 文件配置"""

    @pytest.fixture
    def env_example_path(self) -> Path:
        """获取 .env.example 文件路径"""
        return Path("/workspace/.env.example")

    @pytest.fixture
    def env_example_content(self, env_example_path: Path) -> str:
        """读取 .env.example 文件内容"""
        if not env_example_path.exists():
            pytest.skip(".env.example not found")

        with open(env_example_path, "r", encoding="utf-8") as f:
            return f.read()

    def test_env_example_has_postgres_user(self, env_example_content: str):
        """测试 .env.example 包含 POSTGRES_USER"""
        assert "POSTGRES_USER" in env_example_content

    def test_env_example_has_postgres_password(self, env_example_content: str):
        """测试 .env.example 包含 POSTGRES_PASSWORD"""
        assert "POSTGRES_PASSWORD" in env_example_content

    def test_env_example_has_postgres_db(self, env_example_content: str):
        """测试 .env.example 包含 POSTGRES_DB"""
        assert "POSTGRES_DB" in env_example_content

    def test_env_example_has_comments(self, env_example_content: str):
        """测试 .env.example 包含注释说明"""
        assert "#" in env_example_content
        assert (
            "PostgreSQL" in env_example_content
            or "postgres" in env_example_content.lower()
        )


class TestConfigurationCompleteness:
    """测试配置完整性和一致性"""

    @pytest.fixture
    def compose_config(self) -> Dict[str, Any]:
        """加载 docker-compose.yml 配置"""
        compose_file = Path("/workspace/docker-compose.yml")
        if not compose_file.exists():
            pytest.skip("docker-compose.yml not found")

        with open(compose_file, "r", encoding="utf-8") as f:
            return cast(Dict[str, Any], yaml.safe_load(f))

    def test_all_required_services_exist(self, compose_config: Dict[str, Any]):
        """测试所有必需的服务都已定义"""
        services = compose_config.get("services", {})
        required_services = ["scryer-dev", "postgres", "redis"]

        for service in required_services:
            assert service in services

    def test_all_services_share_same_network(self, compose_config: Dict[str, Any]):
        """测试所有服务共享同一个网络"""
        services = compose_config.get("services", {})

        for service_name, service_config in services.items():
            if service_name in ["scryer-dev", "postgres", "redis"]:
                assert "networks" in service_config
                assert "scryer-network" in service_config["networks"]

    def test_all_infrastructure_services_have_healthcheck(
        self, compose_config: Dict[str, Any]
    ):
        """测试所有基础设施服务都有健康检查"""
        services = compose_config.get("services", {})
        infrastructure_services = ["postgres", "redis"]

        for service_name in infrastructure_services:
            if service_name in services:
                service_config = services[service_name]
                assert "healthcheck" in service_config

    def test_all_infrastructure_services_have_restart_policy(
        self, compose_config: Dict[str, Any]
    ):
        """测试所有基础设施服务都有重启策略"""
        services = compose_config.get("services", {})
        infrastructure_services = ["postgres", "redis"]

        for service_name in infrastructure_services:
            if service_name in services:
                service_config = services[service_name]
                assert "restart" in service_config
                assert service_config["restart"] == "unless-stopped"

    def test_persistent_data_volumes_configured(self, compose_config: Dict[str, Any]):
        """测试所有需要持久化的服务都有数据卷"""
        services = compose_config.get("services", {})
        volumes = compose_config.get("volumes", {})

        # PostgreSQL 应该有数据卷
        if "postgres" in services:
            postgres_volumes = services["postgres"].get("volumes", [])
            assert len(postgres_volumes) > 0
            # 确保卷在 volumes 段有定义
            has_postgres_volume = any(
                "postgres" in vol.lower() or "postgres_data" in str(vol)
                for vol in volumes.keys()
            )
            assert has_postgres_volume

        # Redis 应该有数据卷
        if "redis" in services:
            redis_volumes = services["redis"].get("volumes", [])
            assert len(redis_volumes) > 0
            # 确保卷在 volumes 段有定义
            has_redis_volume = any(
                "redis" in vol.lower() or "redis_data" in str(vol)
                for vol in volumes.keys()
            )
            assert has_redis_volume


class TestBackwardCompatibility:
    """测试向后兼容性"""

    @pytest.fixture
    def compose_config(self) -> Dict[str, Any]:
        """加载 docker-compose.yml 配置"""
        compose_file = Path("/workspace/docker-compose.yml")
        if not compose_file.exists():
            pytest.skip("docker-compose.yml not found")

        with open(compose_file, "r", encoding="utf-8") as f:
            return cast(Dict[str, Any], yaml.safe_load(f))

    def test_scryer_dev_service_preserved(self, compose_config: Dict[str, Any]):
        """测试 scryer-dev 服务配置被保留"""
        services = compose_config.get("services", {})
        assert "scryer-dev" in services

        service = services["scryer-dev"]
        assert "container_name" in service
        assert service["container_name"] == "scryer-dev"

    def test_scryer_dev_port_mapping_unchanged(self, compose_config: Dict[str, Any]):
        """测试 scryer-dev 端口映射未改变"""
        services = compose_config.get("services", {})
        if "scryer-dev" in services:
            ports = services["scryer-dev"].get("ports", [])
            assert "8000:8000" in ports or [8000, 8000] in ports or "8000" in ports

    def test_existing_volumes_preserved(self, compose_config: Dict[str, Any]):
        """测试现有卷配置被保留"""
        volumes = compose_config.get("volumes", {})
        assert "scryer-dev-venv" in volumes

    def test_existing_network_preserved(self, compose_config: Dict[str, Any]):
        """测试现有网络配置被保留"""
        networks = compose_config.get("networks", {})
        assert "scryer-network" in networks
