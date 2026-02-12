#!/bin/bash
# 运行后端测试的脚本

set -e

echo "=== Scryer Backend Tests ==="
echo ""

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查是否在虚拟环境中
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  警告: 未在虚拟环境中运行"
    echo "建议先激活虚拟环境: source .venv/bin/activate"
    echo ""
fi

# 运行后端测试
echo "🧪 运行后端测试..."
echo ""

if [ "$1" == "--cov" ]; then
    pytest tests/backend/ -v --cov=src/backend/app --cov-report=html --cov-report=term
else
    pytest tests/backend/ -v
fi

echo ""
echo "✅ 测试完成"
