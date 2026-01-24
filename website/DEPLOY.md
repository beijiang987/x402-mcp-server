# 🌐 网站部署指南

你的 x402 产品网站已经创建完成！

---

## 📂 网站文件

```
website/
├── index.html      # 主页
├── api.html        # API 文档
├── style.css       # 样式表
└── DEPLOY.md       # 本文档
```

---

## 🚀 部署选项

### 选项 1：GitHub Pages（推荐 - 免费）⭐

**步骤：**

1. **创建 GitHub 仓库**
   ```bash
   cd ~/x402-mcp-server
   git init
   git add .
   git commit -m "Initial commit: x402 data service"
   ```

2. **推送到 GitHub**
   ```bash
   # 创建远程仓库后
   git remote add origin https://github.com/你的用户名/x402-mcp-server.git
   git push -u origin main
   ```

3. **启用 GitHub Pages**
   - 进入仓库 Settings
   - 找到 Pages 选项
   - Source 选择 `main` 分支
   - Folder 选择 `/website`
   - 点击 Save

4. **访问网站**
   - 网址：`https://你的用户名.github.io/x402-mcp-server/`
   - 通常 5 分钟内生效

---

### 选项 2：Vercel（免费 + 超快）

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **部署**
   ```bash
   cd ~/x402-mcp-server/website
   vercel
   ```

3. **按提示操作**
   - 登录 Vercel 账号
   - 确认项目设置
   - 自动部署

4. **获得网址**
   - Vercel 会给你一个 `.vercel.app` 域名
   - 支持自定义域名

---

### 选项 3：Netlify（免费）

1. **拖拽部署**
   - 访问 https://app.netlify.com/drop
   - 将 `website/` 文件夹拖拽到页面
   - 立即部署完成

2. **或使用 CLI**
   ```bash
   npm install -g netlify-cli
   cd ~/x402-mcp-server/website
   netlify deploy
   ```

---

### 选项 4：本地预览

**使用 Python**（最简单）：
```bash
cd ~/x402-mcp-server/website
python3 -m http.server 8000
```

**使用 Node.js**：
```bash
cd ~/x402-mcp-server/website
npx serve
```

然后访问：`http://localhost:8000`

---

## 🔧 自定义配置

### 修改 GitHub 链接

编辑 `index.html` 和 `api.html`，替换所有：
```html
https://github.com/your-repo/x402-mcp-server
```

改为你的实际 GitHub 仓库地址。

### 修改联系邮箱

搜索并替换：
```
support@x402-data.com
```

改为你的邮箱。

### 添加 Google Analytics（可选）

在 `</head>` 前添加：
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 📱 响应式设计

网站已经完全响应式，在以下设备完美显示：
- ✅ 桌面电脑
- ✅ 平板
- ✅ 手机

---

## 🎨 自定义颜色主题

编辑 `style.css` 的 `:root` 部分：

```css
:root {
    --primary-color: #6366f1;     /* 主色调 */
    --secondary-color: #8b5cf6;   /* 次要色 */
    --accent-color: #10b981;      /* 强调色 */
    --bg-color: #0f172a;          /* 背景色 */
    --text-primary: #f1f5f9;      /* 主文字 */
}
```

---

## 🔍 SEO 优化

### 添加 sitemap.xml

创建 `website/sitemap.xml`：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://你的域名/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://你的域名/api.html</loc>
    <priority>0.8</priority>
  </url>
</urlset>
```

### 添加 robots.txt

创建 `website/robots.txt`：
```
User-agent: *
Allow: /
Sitemap: https://你的域名/sitemap.xml
```

---

## 📊 推荐的部署流程

### 第一次部署（立即）

1. **GitHub Pages** - 免费托管
2. **更新 README.md** - 添加网站链接
3. **在 Twitter 分享** - 带上网站地址

### 有流量后（1-2周）

1. **自定义域名** - 购买域名（$10/年）
2. **HTTPS** - GitHub Pages 自动提供
3. **CDN 加速** - Cloudflare 免费版

### 规模化（1个月后）

1. **Vercel Pro** - 更快速度
2. **监控工具** - Google Analytics
3. **用户反馈** - Hotjar / UserTesting

---

## ✅ 部署检查清单

部署前确认：

- [ ] 所有 GitHub 链接已更新
- [ ] 邮箱地址已替换
- [ ] 在本地浏览器测试过
- [ ] 手机端显示正常
- [ ] 所有链接可点击
- [ ] 没有 JavaScript 错误

---

## 🎉 部署后

### 推广你的网站

1. **Twitter**
   ```
   🚀 推出 x402 AI Agent 数据服务！

   ✅ 实时链上数据
   ✅ 跨链价格聚合
   ✅ AI 原生微支付

   免费试用：https://你的网站
   #AI #DeFi #Web3
   ```

2. **Product Hunt**
   - 提交你的产品
   - 附上网站链接

3. **Discord 社区**
   - 在 x402 Discord 分享
   - 在 DeFi 社区推广

---

## 💡 快速命令

```bash
# 1. 本地预览
cd ~/x402-mcp-server/website && python3 -m http.server 8000

# 2. GitHub 部署
git add website/
git commit -m "Add website"
git push

# 3. Vercel 部署
cd website && vercel

# 4. Netlify 部署
cd website && netlify deploy
```

---

## 🆘 常见问题

**Q: 网站不显示？**
A: 检查 GitHub Pages 是否启用，通常需要 5-10 分钟生效。

**Q: 样式不正常？**
A: 确保 `style.css` 在同一目录，检查浏览器控制台错误。

**Q: 想要自定义域名？**
A: 购买域名后，在 GitHub Pages 设置中添加 Custom domain。

---

## 📞 需要帮助？

- GitHub Issues: https://github.com/你的仓库/issues
- Email: support@x402-data.com

---

**祝贺！你的产品网站已经准备就绪！** 🎉🚀
