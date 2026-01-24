#!/bin/bash

echo "🚀 部署 x402 到 GitHub Pages"
echo ""
echo "=========================================="
echo ""

# 检查是否已配置远程仓库
if git remote get-url origin &> /dev/null; then
    echo "✅ 远程仓库已配置"
    git remote -v
else
    echo "❌ 还未配置远程仓库"
    echo ""
    echo "请先完成以下步骤："
    echo "1. 在 GitHub 创建新仓库"
    echo "2. 复制仓库地址"
    echo "3. 运行以下命令："
    echo ""
    echo "   git remote add origin https://github.com/你的用户名/x402-mcp-server.git"
    echo ""
    exit 1
fi

echo ""
echo "准备推送代码..."
echo ""

# 推送代码
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ 代码推送成功！"
    echo ""
    echo "下一步："
    echo "1. 访问 GitHub 仓库"
    echo "2. 点击 Settings → Pages"
    echo "3. Source: Deploy from a branch"
    echo "4. Branch: main, 目录: /website"
    echo "5. 点击 Save"
    echo ""
    echo "等待 1-2 分钟，你的网站就会上线！"
    echo ""
    echo "网站地址示例："
    echo "https://你的用户名.github.io/x402-mcp-server/"
    echo ""
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "可能的原因："
    echo "1. 需要登录 GitHub"
    echo "2. 仓库地址错误"
    echo "3. 权限不足"
    echo ""
    echo "解决方法："
    echo "查看 GITHUB_DEPLOY.md 获取详细帮助"
    echo ""
fi
