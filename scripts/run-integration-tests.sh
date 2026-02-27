#!/bin/bash
# =============================================================================
# 集成测试运行脚本
# =============================================================================
# 用途：
# - 在 Docker Compose 环境中运行集成测试
# - 生成覆盖率报告
# - 验证服务间通信
#
# 使用方法：
#   ./scripts/run-integration-tests.sh
#   ./scripts/run-integration-tests.sh --verbose
#   ./scripts/run-integration-tests.sh --coverage
# =============================================================================

set -e

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

# 默认参数
VERBOSE=""
COVERAGE="--cov=src --cov-report=term-missing --cov-report=html:test-results/coverage --cov-report=xml:test-results/coverage.xml"
PYTEST_ARGS="tests/integration/ -v --tb=short"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE="-vv"
            shift
            ;;
        --no-coverage)
            COVERAGE=""
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --verbose, -v     详细输出模式"
            echo "  --no-coverage     禁用覆盖率报告"
            echo "  --help, -h        显示帮助信息"
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            exit 1
            ;;
    esac
done

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 创建测试结果目录
mkdir -p test-results

log_info "开始运行集成测试..."
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    log_error "Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查 docker-compose.test.yml 是否存在
if [ ! -f "docker-compose.test.yml" ]; then
    log_error "docker-compose.test.yml 不存在"
    exit 1
fi

log_info "检查环境变量..."
if [ ! -f ".env" ]; then
    log_warn ".env 文件不存在，使用默认配置"
else
    log_info "使用 .env 文件中的配置"
fi

# 设置测试环境变量
export ENVIRONMENT=testing
export DEBUG=true

log_info "启动 Docker Compose 测试环境..."
echo ""

# 运行 docker-compose test
log_info "执行集成测试..."
docker-compose -f docker-compose.test.yml up --abort-on-container-exit integration-tests

# 检查测试结果
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    log_info "集成测试全部通过！"

    # 显示覆盖率报告
    if [ -n "$COVERAGE" ]; then
        echo ""
        log_info "覆盖率报告已生成："
        echo "  - HTML: test-results/coverage/index.html"
        echo "  - XML:  test-results/coverage.xml"
    fi

    # 清理容器
    echo ""
    read -p "是否清理测试容器？[y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "清理测试容器..."
        docker-compose -f docker-compose.test.yml down -v
    fi
else
    log_error "集成测试失败（退出码: $EXIT_CODE）"

    # 保留容器以便调试
    echo ""
    log_warn "测试容器已保留，请手动检查日志"
    log_info "查看日志: docker-compose -f docker-compose.test.yml logs"
    log_info "清理容器: docker-compose -f docker-compose.test.yml down -v"
fi

exit $EXIT_CODE
