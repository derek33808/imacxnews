#!/bin/bash

echo "🚀 开始执行图片数据库同步..."
echo "📋 执行步骤:"
echo "1. 检查Node.js环境"
echo "2. 运行图片同步脚本"
echo "3. 显示结果"
echo ""

# 检查Node.js版本
echo "📦 Node.js版本:"
node --version
echo ""

# 检查是否存在同步脚本
if [ ! -f "run-image-sync.js" ]; then
    echo "❌ 未找到同步脚本文件"
    exit 1
fi

echo "🔄 正在运行图片同步脚本..."
echo "----------------------------------------"

# 运行同步脚本
node run-image-sync.js

echo "----------------------------------------"
echo "✅ 脚本执行完成"
