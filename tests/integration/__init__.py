"""
Integration tests for Docker containerized environment

测试范围：
- PostgreSQL 容器连接和操作
- Redis 容器连接和操作
- Alembic 迁移在容器环境中的执行
- 健康检查端点在容器环境中的验证

契约来源：Issue #63 - 容器化环境集成测试编写
"""
