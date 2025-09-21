from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<>",
)

completion = client.chat.completions.create(
  extra_headers={
    "HTTP-Referer": "<YOUR_SITE_URL>", # Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "<YOUR_SITE_NAME>", # Optional. Site title for rankings on openrouter.ai.
  },
  extra_body={},
  model="google/gemini-2.5-flash-image-preview:free",
  messages=[
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is in this image?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
          }
        }
      ]
    }
  ]
)
print(completion.choices[0].message.content)


# 🤖 AI聊天机器人项目

一个功能完整的AI聊天机器人，支持文本对话和图像分析功能。

## 📋 项目特性

- 🗣️ **智能文本对话** - 基于OpenAI API的自然语言对话
- 🖼️ **图像分析功能** - 上传图像并获得AI分析结果
- 🌐 **Web界面** - 现代化的聊天界面
- 💾 **对话历史** - 保存和查看历史对话
- 🎨 **多主题支持** - 明亮/暗黑主题切换
- 📱 **响应式设计** - 支持桌面和移动设备

## 🚀 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 配置环境变量
复制 `.env.example` 到 `.env` 并填入你的API密钥：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```
OPENROUTER_API_KEY=
```

### 3. 启动应用
```bash
python app.py
```

### 4. 访问应用
打开浏览器访问：http://localhost:5000

## 📁 项目结构

```
openai/
├── app.py                 # Flask主应用
├── chatbot.py            # 聊天机器人核心逻辑
├── image_analyzer.py     # 图像分析模块
├── requirements.txt      # Python依赖
├── .env.example         # 环境变量示例
├── README.md            # 项目说明
├── static/              # 静态文件
│   ├── css/
│   │   └── style.css    # 样式文件
│   ├── js/
│   │   └── app.js       # 前端JavaScript
│   └── uploads/         # 图像上传目录
├── templates/           # HTML模板
│   └── index.html       # 主页面
└── data/               # 数据存储
    └── chat_history.json # 对话历史
```

## 🔧 功能说明

### 文本对话
- 支持多轮对话
- 上下文记忆
- 实时响应

### 图像分析
- 支持JPG、PNG格式
- 自动Base64编码
- 详细分析结果

### 数据存储
- JSON格式存储对话历史
- 支持导出对话记录
- 自动备份功能

## 🛠️ 技术栈

- **后端**: Python Flask
- **前端**: HTML5, CSS3, JavaScript
- **AI服务**: OpenRouter API
- **图像处理**: Pillow
- **数据存储**: JSON文件

## 📝 使用说明

1. **开始对话**: 在输入框中输入消息并按回车
2. **上传图像**: 点击图像按钮选择图片进行分析
3. **查看历史**: 点击历史按钮查看过往对话
4. **切换主题**: 点击主题按钮切换界面风格
5. **清除对话**: 点击清除按钮重新开始

## 🔒 安全注意事项

- 不要将API密钥提交到版本控制
- 定期更换API密钥
- 监控API使用量
- 限制文件上传大小

## 📞 支持

如有问题，请查看项目文档或提交Issue。

## 📄 许可证

MIT License