# Internal AI Chatbot MVP

面向内部员工的 AI Chatbot MVP，用于展示开放题要求中的核心流程：网页对话、多轮上下文、自动工具调用、工具结果进入最终回复，以及无真实 API Key 也能体验的 mock 模式。

## 本地启动

本项目使用 pnpm workspace，推荐 pnpm `11.7.0`。

```bash
pnpm install
pnpm dev
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
- `LLM_PROVIDER=deepseek`：可选 DeepSeek 真实模型模式。
- `DEEPSEEK_API_KEY` / `DeepSeek_KEY`：DeepSeek API Key，二选一，禁止提交真实值。
- `DEEPSEEK_BASE_URL`：DeepSeek OpenAI-compatible 地址，默认 `https://api.deepseek.com`。
- `DEEPSEEK_MODEL`：DeepSeek 模型，默认 `deepseek-v4-flash`。
- `DEEPSEEK_THINKING`：DeepSeek 思考模式开关，默认 `disabled`，可按需设为 `enabled`。
- `VITE_API_BASE_URL`：前端访问后端的地址。

## MVP 范围

第一版完成：

- React 聊天页面。
- NestJS `POST /api/chat` 后端接口。
- 基于内存的多轮会话上下文。
- 默认 mock LLM provider。
- 可选 OpenAI-compatible provider。
- 可选 DeepSeek provider，使用真实 DeepSeek `/chat/completions` API 生成普通回复和工具结果总结。
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

在 DeepSeek 模式下，本地 `ToolRouter` 仍负责稳定触发工具；DeepSeek 负责普通自然语言回复，以及把工具执行结果总结成最终回答。

## 验证

```bash
pnpm build
pnpm test
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

详见 [docs/delivery/ai-usage.md](docs/delivery/ai-usage.md)。

## 文档索引

交付说明：

- [需求与交付文档追踪表](docs/delivery/requirements-traceability.md)
- [方案说明](docs/delivery/solution.md)
- [AI 工具使用记录](docs/delivery/ai-usage.md)
- [录屏脚本](docs/delivery/demo-script.md)

开发过程：

- [技术设计文档](docs/development/technical-design.md)
- [Claude 提示词记录](docs/development/claude-prompts.md)
- [Claude 评审记录](docs/development/claude-review-log.md)
