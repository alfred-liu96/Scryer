# Docker 容器化开发环境指南

本文档介绍如何使用 Docker 快速搭建 Scryer 项目的开发环境。

## 快速开始

### 前置要求

确保已安装以下工具：
- Docker (>= 20.10)
- Docker Compose (>= 2.0)

### 启动开发环境

1. **构建镜像**
   ```bash
   docker-compose build
   ```

2. **启动容器**
   ```bash
   docker-compose up -d
   ```

3. **进入容器**
   ```bash
   docker-compose exec scryer-dev /bin/bash
   ```

4. **运行测试**
   ```bash
   pytest
   ```

## 常用命令

### 容器管理

```bash
# 启动服务（后台运行）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并删除所有资源（包括 volumes）
docker-compose down -v

# 重启服务
docker-compose restart
```

### 开发操作

```bash
# 进入容器终端
docker-compose exec scryer-dev /bin/bash

# 在容器内运行测试
docker-compose exec scryer-dev pytest

# 在容器内运行代码格式化
docker-compose exec scryer-dev black .

# 在容器内运行类型检查
docker-compose exec scryer-dev mypy src/
```

### 构建与重建

```bash
# 重新构建镜像（当 Dockerfile 或依赖变更时）
docker-compose build

# 强制重新构建（不使用缓存）
docker-compose build --no-cache

# 重建并启动
docker-compose up -d --build
```

## 卷挂载说明

本项目使用两种卷挂载方式：

1. **绑定挂载 (Bind Mount)**: `.` → `/app`
   - 源代码实时同步
   - 支持热重载和即时修改
   - 本地代码修改会立即反映到容器内

2. **命名卷 (Named Volume)**: `scryer-dev-venv` → `/app/.venv`
   - 虚拟环境持久化
   - 避免每次重启都重新安装依赖
   - 提升容器启动速度

## 端口映射

容器端口 `8000` 映射到主机端口 `8000`。

如果需要在容器内运行 Web 服务，可以通过 `http://localhost:8000` 访问。

## 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs scryer-dev

# 检查容器状态
docker-compose ps
```

### 依赖安装失败

```bash
# 删除虚拟环境卷并重建
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### 权限问题

某些情况下，容器内创建的文件可能属于 root 用户。在主机上修复权限：

```bash
# 修复文件所有权（macOS/Linux）
sudo chown -R $USER:$USER .
```

### 镜像构建缓慢

- 使用 `--no-cache` 强制重新构建
- 检查网络连接
- 考虑使用国内镜像源加速（修改 Dockerfile 中的 pip 源）

## 性能优化

### 减少镜像体积

- 使用 `slim` 基础镜像（已采用）
- 清理 pip 缓存：`pip install --no-cache-dir`
- 多阶段构建（未来扩展）

### 加速构建

1. **利用缓存**：Docker 会缓存未变更的层
2. **分层优化**：将不常变更的指令放在前面
3. **并行构建**：Docker BuildKit 支持并行构建

### 开发体验优化

- **代码热重载**：绑定挂载实现代码实时同步
- **持久化依赖**：命名卷避免重复安装
- **终端保持**：`tty: true` 和 `stdin_open: true` 支持交互式操作

## 未来扩展

### 多阶段构建

生产环境可使用多阶段构建，仅保留运行时依赖：

```dockerfile
# 开发阶段
FROM python:3.12-slim AS development
...

# 生产阶段
FROM python:3.12-slim AS production
COPY --from=development /app/.venv /app/.venv
...
```

### 服务编排

未来可添加更多服务：
- 数据库服务（PostgreSQL, MySQL）
- 缓存服务（Redis）
- 消息队列（RabbitMQ, Kafka）
- 前端开发服务

### 开发工具集成

- 集成调试器（pdb, ipdb）
- 集成性能分析工具（cProfile, py-spy）
- 集成代码覆盖率工具（pytest-cov）

## 常见问题 (FAQ)

**Q: 为什么选择 Docker 而不是虚拟机？**
A: Docker 容器更轻量、启动更快、资源占用更少。

**Q: 容器内修改的代码会同步到主机吗？**
A: 是的，绑定挂载实现双向同步。

**Q: 如何在容器内使用 GPU？**
A: 需要安装 `nvidia-docker` 并配置 GPU 支持。

**Q: 容器内的数据会丢失吗？**
A: 绑定挂载的代码不会丢失；命名卷的数据（如虚拟环境）也不会丢失。

## 参考资料

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Python Docker 最佳实践](https://docs.docker.com/language/python/best-practices/)
