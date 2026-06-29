# Internal AI Chatbot MVP

面向内部员工的 AI Chatbot MVP，用于展示开放题要求中的核心流程：网页对话、多轮上下文、自动工具调用、工具结果进入最终回复，以及无真实 API Key 也能体验的 mock 模式。

## 本地启动

```bash
npm install
npm run dev
```

默认地址：

- Web: http://localhost:5173
- API: http://localhost:3000

没有 `.env` 和真实 LLM API Key 时，项目默认使用 mock 模式，仍可完整体验核心流程。

## 环境变量

复制 `.env.example` 为 `.env` 后按需修改：

```bash
cp .env.example .env
```

关键变量：

- `LLM_PROVIDER=mock`：默认 mock 模式。
- `LLM_PROVIDER=openai-compatible`：可选真实模型模式。
- `OPENAI_API_KEY`：真实模型模式所需，禁止提交真实值。
- `OPENAI_BASE_URL`：OpenAI-compatible 服务地址。
- `OPENAI_MODEL`：模型名。
- `VITE_API_BASE_URL`：前端访问后端的地址。

## MVP 范围

第一版完成：

- React 聊天页面。
- NestJS `POST /api/chat` 后端接口。
- 基于内存的多轮会话上下文。
- 默认 mock LLM provider。
- 可选 OpenAI-compatible provider。
- 本地工具注册、路由、执行和结果回填。
- HR/IT 政策查询、创建待办、查询当前时间三个工具。

明确不做：

- 登录、权限和多租户。
- 数据库存储。
- RAG/知识库。
- 流式输出。
- 复杂多工具编排。
- 生产级审计和监控。

## 核心流程

```text
Web Chat UI
  -> POST /api/chat
  -> InMemorySessionStore 读取上下文
  -> LLM Provider 生成初步回复
  -> ToolRouter 判断是否需要工具
  -> ToolRegistry 执行工具
  -> LLM Provider 汇总最终回复
  -> 写回上下文并返回前端
```

## 工具调用说明

工具调用由后端根据用户输入和模型计划自动判断，前端示例按钮只负责快速填入演示问题，不参与工具选择。

示例：

- “公司年假政策是什么？” -> `lookup_hr_policy`
- “帮我创建一个待办：明天提交报销” -> `create_todo`
- “现在几点？” -> `get_current_time`

工具结果会进入 `reply`，并同时通过 `toolCalls` 返回给前端展示。

## 验证

```bash
npm run build
npm run test
```

建议演示问题：

1. 你好，你能做什么？
2. 公司年假政策是什么？
3. 那远程办公时也适用吗？
4. 帮我创建一个待办：明天提交报销
5. 现在几点？

## 限制与后续优化

当前实现优先证明核心流程，不追求生产完备性。后续可扩展：

- 将内存会话替换为数据库。
- 使用真实 function calling 协议。
- 增加流式输出。
- 加入用户身份和工具权限控制。
- 引入结构化日志、链路追踪和更完整测试。

## AI 工具使用

详见 [docs/ai-usage.md](docs/ai-usage.md)。
