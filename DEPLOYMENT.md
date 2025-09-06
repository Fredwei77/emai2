# 部署指南（emai2.cn）

本项目为 Vite + Tailwind 的静态网站，已提供 Netlify、Vercel 与 Docker(Nginx) 三种部署方案配置。请选择一种进行上线。

## 一、准备工作
- Node.js 18+（Vite 5 需要 Node 18+）
- npm
- 自定义域名：emai2.cn（已在页面 canonical、OG、sitemap、robots 配置）

本地构建测试：
```
npm install
npm run build
npm run preview
```

构建产物位于 dist/ 目录。

---

## 二、Netlify 部署（推荐简单快速）

项目已包含 netlify.toml：
- build.command: `npm run build`
- build.publish: `dist`
- NODE_VERSION=18
- 静态资源缓存与安全头部

部署步骤：
1. 将代码推送到 Git 仓库（GitHub/GitLab/Bitbucket）。
2. 登录 Netlify -> Add new site -> Import an existing project。
3. 选择仓库；Build command: `npm run build`；Publish directory: `dist`；（netlify.toml 会自动生效）
4. 首次部署完成后，在 Site settings -> Domain management -> Add custom domain 绑定 `emai2.cn`。
5. 在域名 DNS 服务商处添加 Netlify 提供的 CNAME/A 记录。
6. 等待证书自动签发（Netlify 自动配置 HTTPS）。

可选：在 Netlify 控制台中设置环境变量（若后续集成后端或第三方服务）。

---

## 三、Vercel 部署

项目已包含 vercel.json（static-build）：
- 使用 `@vercel/static-build`
- distDir: `dist`
- 静态资源缓存与安全头部

部署步骤：
1. 将代码推送到 GitHub/GitLab。
2. 登录 Vercel -> New Project -> Import，选择仓库。
3. Framework Preset 可选择 Vite 或 None；Build Command: `npm run build`；Output Directory: `dist`（vercel.json 亦可识别）。
4. 部署完成后，在 Settings -> Domains 绑定 `emai2.cn`。
5. 在域名 DNS 服务商处添加 Vercel 提供的 CNAME 记录。
6. 等待证书签发（Vercel 自动配置 HTTPS）。

---

## 四、Docker + Nginx 部署（自有服务器）

项目已包含用于静态站点的 Dockerfile 与 nginx.conf。

构建镜像：
```
docker build -t emai2cn/site:latest .
```
运行容器（80 端口）：
```
docker run -d --name emai2cn-site -p 80:80 emai2cn/site:latest
```
（若需要 HTTPS，建议在服务器上使用 Nginx/Caddy/Traefik 作 TLS 终端，或使用 nginx + certbot 配置 443）

Nginx 已对 /assets/* 配置长缓存，对根文档配置了合理的安全头部。

---

## 五、验证与检查
- 访问 https://emai2.cn 确认页面正常。
- 查看 https://emai2.cn/sitemap.xml 与 https://emai2.cn/robots.txt。
- 使用浏览器 DevTools 检查资产缓存策略（/assets/* 应该有 immutable 长缓存）。
- 在 Google Search Console/Bing Webmaster Tools 提交站点地图以加速收录。

---

## 六、后续建议
- 表单提交方式选择：Formspree / Netlify Forms / 自有 API（目前默认本地保存草稿）。
- 持续集成：可接入 GitHub Actions/Netlify/Vercel 自动化构建与预览环境。
- 监控与分析：接入简单的分析（如 Plausible/Umami）或 APM。
