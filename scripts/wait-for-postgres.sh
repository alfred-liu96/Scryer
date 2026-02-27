#!/bin/bash
###############################################################################
# PostgreSQL 就绪检测脚本
#
# 功能：
#   等待 PostgreSQL 数据库就绪并可接受连接
#
# 使用方法：
#   ./wait-for-postgres.sh [host] [port] [timeout]
#
# 参数：
#   host: PostgreSQL 主机地址（默认: postgres）
#   port: PostgreSQL 端口（默认: 5432）
#   timeout: 超时时间（秒，默认: 30）
#
# 返回值：
#   0: PostgreSQL 就绪
#   1: 超时或连接失败
#
# Issue: #64
###############################################################################

# 默认参数
POSTGRES_HOST="${1:-postgres}"
POSTGRES_PORT="${2:-5432}"
TIMEOUT="${3:-30}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# 检查 pg_isready 是否可用
if ! command -v pg_isready &> /dev/null; then
    log_error "pg_isready not found. Please install postgresql-client."
    exit 1
fi

log_info "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT} (timeout: ${TIMEOUT}s)..."

# 计算超时时间戳
START_TIME=$(date +%s)
END_TIME=$((START_TIME + TIMEOUT))

# 循环检测
while true; do
    CURRENT_TIME=$(date +%s)

    # 检查超时
    if [ $CURRENT_TIME -ge $END_TIME ]; then
        log_error "Timeout waiting for PostgreSQL"
        exit 1
    fi

    # 尝试连接
    if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -q 2>/dev/null; then
        log_info "PostgreSQL is ready!"
        exit 0
    fi

    # 等待后重试
    REMAINING=$((END_TIME - CURRENT_TIME))
    log_warn "Waiting for PostgreSQL... (${REMAINING}s remaining)"
    sleep 2
done
