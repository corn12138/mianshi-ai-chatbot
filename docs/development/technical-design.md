# 技术设计文档

## 目标

构建一个短期可落地验证的内部员工 AI Chatbot MVP。第一版重点证明核心流程可运行：网页聊天、多轮上下文、自动工具调用、工具结果进入最终回复、无 API Key 的 mock 模式。

## 技术栈

- 前端：React + Vite + TypeScript。
- 后端：NestJS + TypeScript，运行在 Fastify 适配器上。
- 单仓库：pnpm workspace。
- 模型层：默认 `MockLlmProvider`，可选 `OpenAICompatibleProvider`。
- 存储层：内存 session store。

## 模块关系

```text
apps/web
  Chat UI
  localStorage sessionId
  POST /api/chat

apps/api
  ChatController
  ChatService
  InMemorySessionStore
  LlmProvider
  ToolRouter
  ToolRegistry
  Local Tools
```

## 请求流程

1. 用户在前端输入消息。
2. 前端读取或创建 `sessionId`，请求 `POST /api/chat`。
3. 后端校验消息不能为空。
4. 后端根据 `sessionId` 读取历史消息。
5. LLM provider 生成初步回复或工具意图。
6. `ToolRouter` 根据模型意图和规则判断是否需要工具。
7. `ToolRegistry` 执行本地工具并返回结构化结果。
8. LLM provider 将工具结果合成为最终回复。
9. 后端把 user/assistant 消息写回内存 session。
10. 前端展示 assistant 回复和工具调用详情。

## API 设计

```http
POST /api/chat
Content-Type: application/json
```

请求：

```json
{
  "sessionId": "optional-session-id",
  "message": "公司年假政策是什么？"
}
```

响应：

```json
{
  "sessionId": "session-id",
  "reply": "最终回复",
  "messages": [],
  "toolCalls": [],
  "mode": "mock"
}
```

## 工具设计

当前工具：

- `lookup_hr_policy`：查询 mock HR/IT 政策。
- `create_todo`：创建 mock 待办。
- `get_current_time`：查询当前时间。

工具调用不能依赖前端按钮。前端示例按钮只是演示入口，真正的判断在后端 `ToolRouter`。

## Mock 模式

无 `.env` 或 `LLM_PROVIDER=mock` 时默认启用 mock 模式。mock provider 不依赖外部服务，因此评审可直接本地启动并体验完整核心流程。

## 真模型模式

当 `LLM_PROVIDER=openai-compatible` 且存在 `OPENAI_API_KEY` 时启用 OpenAI-compatible provider。当前真模型模式保留为可选扩展，不影响 MVP 验收。

## 边界和限制

- 内存 session 重启后丢失。
- 工具路由以演示级规则为主。
- 真模型模式未实现完整 function calling 协议。
- 未实现登录、权限、数据库、RAG、流式输出和线上部署。

这些限制是有意取舍，目的是优先保证开放题要求的核心流程清晰、稳定、可解释。
