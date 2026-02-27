# Docker 容器化开发环境
# Issue #22: Docker 容器化开发环境配置
# Issue #64: Alembic 迁移流程验证

FROM python:3.12-slim

# 设置环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

# 设置工作目录
WORKDIR /app

# 安装 PostgreSQL 客户端（用于 pg_isready）
RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# 创建虚拟环境
RUN python -m venv /app/.venv

# 复制项目文件
COPY pyproject.toml ./

# 安装开发依赖 (pytest, black, isort, mypy, flake8, pyyaml)
RUN pip install --no-cache-dir -e ".[dev]" && \
    pip install --no-cache-dir pytest black isort mypy flake8 pyyaml

# 复制脚本文件
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY scripts/wait-for-postgres.sh /usr/local/bin/wait-for-postgres.sh

# 设置脚本可执行权限
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/wait-for-postgres.sh

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 设置 entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# 默认命令：保持容器运行
CMD ["/bin/bash"]
