#!/bin/bash
echo "🌐 启动 x402 产品网站预览..."
echo ""
echo "访问: http://localhost:8000"
echo "按 Ctrl+C 停止服务器"
echo ""
python3 -m http.server 8000
