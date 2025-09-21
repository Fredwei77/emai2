# 亿麦AI智能开发项目

这是一个使用现代前端技术栈构建的响应式网站项目。

## 技术栈

- **HTML5** - 语义化标记
- **CSS3** - 现代样式
- **JavaScript (ES6+)** - 交互逻辑
- **Tailwind CSS** - 实用优先的CSS框架
- **Vite** - 快速构建工具

## 项目结构

```
website/
├── src/                    # 源代码目录
│   ├── index.html         # 主页
│   ├── css/               # 样式文件
│   │   ├── main.css       # 主样式文件
│   │   └── components.css # 组件样式
│   ├── js/                # JavaScript文件
│   │   ├── main.js        # 主脚本文件
│   │   └── components.js  # 组件逻辑
│   └── assets/            # 静态资源
│       ├── images/        # 图片文件
│       └── icons/         # 图标文件
├── public/                # 公共文件
├── dist/                  # 构建输出目录
└── package.json           # 项目配置
```

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（仅前端，不能使用函数）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 开发环境要求

- Node.js 18+
- npm 或 yarn

## AI 智能体与健康检查

本项目内置 AI 代理与健康检查，依赖 OpenRouter API。为保证密钥安全，前端通过后端函数代理访问模型。

相关端点：
- Vercel: `/api/ai-health`, `/api/ai-chat`, `/api/ai-chat/stream`
- Netlify: `/.netlify/functions/ai-health`, `/.netlify/functions/ai-chat`, `/.netlify/functions/ai-chat-stream`

前端“健康检查”按钮会尝试访问以上端点并展示来源：
- 来源: 服务器函数 → 成功连接到后端函数
- 来源: 前端回退（未连接到服务器） → 未能连接到后端，显示默认回退（env.present 会是 false，duration 为 0ms）

### 本地开发（推荐：Netlify Dev 同时启用前端与函数）

1) 创建环境变量文件
- Windows PowerShell：
```powershell
Copy-Item .env.example .env
notepad .env
```
- macOS/Linux：
```bash
cp .env.example .env
$EDITOR .env  # 或者使用 nano/vim/code 等编辑器
```
- 在 `.env` 文件中设置：
```
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxxxxxxxxxx
```

2) 启动 Netlify Dev（会自动启动 Vite 并代理函数）
```bash
npm run dev:all
```
- 访问 http://localhost:8999
- 在页面点击“健康检查”按钮，查看来源与 env.present

3) 直接测试健康端点
- 浏览器：访问 http://localhost:8999/.netlify/functions/ai-health
- PowerShell：
```powershell
Invoke-RestMethod http://localhost:8999/.netlify/functions/ai-health
```

4) 使用脚本进行一次性健康检查
```bash
npm run health:once
# 如需指定基地址：
HEALTH_BASE_URL=http://localhost:8999 npm run health:once
```

### 生产部署（Netlify）

1) 在 Netlify 控制台设置环境变量：Site settings → Environment variables
- 添加 `OPENROUTER_API_KEY`

2) 重新部署后验证：
- 访问 `https://<你的域名>/.netlify/functions/ai-health`
- 页面点击“健康检查”，应显示“来源: 服务器函数”，且 env.present: true

3) 其他可选环境变量：
- `DEFAULT_MODEL`（如：`google/gemini-2.5-flash:free`）
- `HEALTH_WEBHOOK_URL`（用于 scripts/health_check.mjs 上报）

### 可选：Vercel 部署函数

当前 `vercel.json` 为纯静态站点配置，若要启用 `/api/*` Node 函数，请添加 Node 构建规则：
```json
{
  "version": 2,
  "builds": [
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } },
    { "src": "api/*.cjs", "use": "@vercel/node" }
  ],
  "routes": [ { "src": "/(.*)", "dest": "/$1" } ]
}
```
并在 Vercel 项目 Settings → Environment Variables 中添加 `OPENROUTER_API_KEY`。

### 故障排查
- “来源: 前端回退（未连接到服务器）” → 前端无法连接到后端函数，请确认你使用 `npm run dev:all` 启动了 Netlify Dev 或生产环境正确部署了函数。
- “来源: 服务器函数，env.present: false 且 duration > 0ms” → 函数已运行，但未检测到 `OPENROUTER_API_KEY`，请检查 `.env` 或部署环境变量。
- upstream.models/chat 报错 → 检查你的模型是否可用、是否需要在 OpenRouter 后台配置允许域（Referer）。
- 默认模型可通过前端下拉或环境变量调整；若遇到免费模型限制，可选择你已开通权限的模型。

### 脚本与命令
- `npm run test:chat`：非流式对话端点测试
- `npm run test:stream`：流式对话端点测试（SSE）
- `npm run health:once`：健康检查脚本（可配合 `HEALTH_BASE_URL`）

