#!/bin/bash

# x402 MCP Server 一键部署脚本
# 使用方法：./deploy.sh YOUR_GITHUB_TOKEN

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 开始部署 x402 MCP Server 到 GitHub Pages...${NC}"

# 检查参数
if [ -z "$1" ]; then
    echo -e "${RED}❌ 错误：需要提供 GitHub Personal Access Token${NC}"
    echo ""
    echo "使用方法："
    echo "  ./deploy.sh YOUR_TOKEN"
    echo ""
    echo "获取 Token："
    echo "  1. 访问 https://github.com/settings/tokens"
    echo "  2. 点击 'Generate new token (classic)'"
    echo "  3. 勾选 'repo' 权限"
    echo "  4. 复制生成的 token (以 ghp_ 开头)"
    echo ""
    exit 1
fi

TOKEN=$1
GITHUB_USER="beijiang987"
REPO_NAME="x402-mcp-server"

echo -e "${BLUE}📝 配置信息：${NC}"
echo "  用户名: $GITHUB_USER"
echo "  仓库名: $REPO_NAME"
echo ""

# 移除旧的远程仓库
echo -e "${BLUE}🔧 配置远程仓库...${NC}"
git remote remove origin 2>/dev/null || true

# 添加新的远程仓库（使用 token）
git remote add origin https://${TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git

# 推送代码
echo -e "${BLUE}⬆️  推送代码到 GitHub...${NC}"
git push -u origin main

echo ""
echo -e "${GREEN}✅ 代码推送成功！${NC}"
echo ""
echo -e "${BLUE}📋 接下来需要手动启用 GitHub Pages：${NC}"
echo ""
echo "1. 访问: https://github.com/${GITHUB_USER}/${REPO_NAME}/settings/pages"
echo "2. 在 'Source' 下："
echo "   - Branch: 选择 'main'"
echo "   - Folder: 选择 '/website' ⚠️ 重要！"
echo "3. 点击 'Save'"
echo "4. 等待 1-2 分钟"
echo ""
echo -e "${GREEN}🎉 你的网站将在以下地址上线：${NC}"
echo -e "${GREEN}https://${GITHUB_USER}.github.io/${REPO_NAME}/${NC}"
echo ""
echo -e "${BLUE}💡 提示：首次部署可能需要 2-5 分钟才能访问${NC}"
