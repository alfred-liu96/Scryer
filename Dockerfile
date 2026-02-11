# Docker 容器化开发环境
# Issue #22: Docker 容器化开发环境配置

FROM python:3.12-slim

# 设置环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

# 设置工作目录
WORKDIR /app

# 创建虚拟环境
RUN python -m venv /app/.venv

# 复制项目文件
COPY pyproject.toml ./

# 安装开发依赖 (pytest, black, isort, mypy, flake8, pyyaml)
RUN pip install --no-cache-dir -e ".[dev]" && \
    pip install --no-cache-dir pytest black isort mypy flake8 pyyaml

# 暴露端口
EXPOSE 8000

# 默认命令：保持容器运行
CMD ["/bin/bash"]
