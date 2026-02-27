#!/bin/bash
# =============================================================================
# Scryer Frontend 初始化脚本
# =============================================================================
# 用途：自动化创建 Next.js 前端项目并应用配置
# 使用：bash /workspace/docs/frontend-stubs/init.sh
# =============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
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

# 项目路径
FRONTEND_DIR="/workspace/frontend"

# =============================================================================
# 步骤 1: 检查前置条件
# =============================================================================
log_info "检查前置条件..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    log_error "npm 未安装，请先安装 npm"
    exit 1
fi

# 显示版本
log_info "Node.js 版本: $(node --version)"
log_info "npm 版本: $(npm --version)"

# =============================================================================
# 步骤 2: 创建 Next.js 项目
# =============================================================================
log_info "创建 Next.js 项目..."

if [ -d "$FRONTEND_DIR" ]; then
    log_warn "frontend 目录已存在，跳过创建"
else
    # 使用 npx create-next-app 创建项目
    # 注意：--yes 标志用于非交互模式
    npx create-next-app@14 frontend \
        --typescript \
        --tailwind \
        --eslint \
        --app \
        --src-dir \
        --import-alias "@/*" \
        --no-git \
        --yes

    log_info "Next.js 项目创建完成"
fi

# 进入项目目录
cd "$FRONTEND_DIR"

# =============================================================================
# 步骤 3: 安装额外依赖
# =============================================================================
log_info "安装额外依赖..."

npm install --silent clsx tailwind-merge

log_info "依赖安装完成"

# =============================================================================
# 步骤 4: 复制配置文件
# =============================================================================
log_info "应用配置文件..."

# 这里需要手动操作，因为脚本无法直接写入详细配置
log_warn "请手动复制以下配置文件："
log_warn "  1. tsconfig.json"
log_warn "  2. next.config.js"
log_warn "  3. tailwind.config.ts"
log_warn "  4. .eslintrc.json"
log_warn "  5. .prettierrc.json"
log_warn "  6. .editorconfig"
log_warn "  7. .env.example"

# =============================================================================
# 步骤 5: 创建目录结构
# =============================================================================
log_info "创建目录结构..."

mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/components/features
mkdir -p src/lib/api
mkdir -p src/lib/hooks
mkdir -p src/lib/utils
mkdir -p src/types
mkdir -p public/images
mkdir -p public/fonts

log_info "目录结构创建完成"

# =============================================================================
# 步骤 6: 复制存根代码
# =============================================================================
log_info "准备存根代码..."

log_warn "请手动从 /workspace/docs/frontend-stubs/STUBS.md 复制代码文件"

# =============================================================================
# 步骤 7: 验证配置
# =============================================================================
log_info "验证配置..."

# 运行 TypeScript 类型检查
npm run type-check || true

# 运行 ESLint 检查
npm run lint || true

# =============================================================================
# 完成
# =============================================================================
log_info "初始化脚本执行完成！"
log_info "下一步操作："
log_info "  1. cd $FRONTEND_DIR"
log_info "  2. 手动应用配置文件"
log_info "  3. 复制存根代码"
log_info "  4. npm run dev 启动开发服务器"
