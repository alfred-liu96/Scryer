#!/bin/bash
###############################################################################
# Docker 容器启动脚本
#
# 功能：
#   1. 等待 PostgreSQL 数据库就绪
#   2. 自动执行数据库迁移（alembic upgrade head）
#   3. 启动应用服务
#
# 环境变量：
#   - POSTGRES_HOST: PostgreSQL 主机地址（默认: postgres）
#   - POSTGRES_PORT: PostgreSQL 端口（默认: 5432）
#   - SKIP_MIGRATION: 跳过迁移（默认: false）
#
# Issue: #64
###############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取环境变量（设置默认值）
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
SKIP_MIGRATION="${SKIP_MIGRATION:-false}"

# =============================================================================
# 等待 PostgreSQL 就绪
# =============================================================================

log_info "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."

# 使用 pg_isready 检测 PostgreSQL 是否就绪
MAX_RETRIES=30
RETRY_INTERVAL=2

for i in $(seq 1 $MAX_RETRIES); do
    if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "${POSTGRES_USER:-scryer}" -q 2>/dev/null; then
        log_info "PostgreSQL is ready!"
        break
    fi

    if [ $i -eq $MAX_RETRIES ]; then
        log_error "PostgreSQL did not become ready in time"
        exit 1
    fi

    log_warn "Waiting for PostgreSQL... ($i/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
done

# =============================================================================
# 执行数据库迁移
# =============================================================================

if [ "$SKIP_MIGRATION" = "true" ]; then
    log_warn "SKIP_MIGRATION=true, skipping database migrations"
else
    log_info "Running database migrations..."

    if alembic upgrade head; then
        log_info "Database migrations completed successfully"
    else
        log_error "Database migration failed"
        exit 1
    fi
fi

# =============================================================================
# 启动应用
# =============================================================================

log_info "Starting application..."

# 如果提供了命令参数，执行该命令；否则保持容器运行
if [ $# -gt 0 ]; then
    exec "$@"
else
    # 默认：保持容器运行（用于开发环境）
    log_info "No command specified, keeping container alive..."
    exec tail -f /dev/null
fi
