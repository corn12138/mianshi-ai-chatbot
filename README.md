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
- `LLM_PROVIDER=openai-compatible`：可选真实模型模式，可指向 OpenAI、第三方中转站或公司内部网关。
- `OPENAI_API_KEY`：真实模型模式所需，禁止提交真实值。
- `OPENAI_BASE_URL`：任意 OpenAI 兼容 `/chat/completions` 地址（OpenAI / One API / LiteLLM / OpenRouter / 内部网关）。
- `OPENAI_MODEL`：模型名。
- `OPENAI_PROVIDER_LABEL`：前端模式徽标显示的网关名，默认 `OpenAI Compatible`。
- `LLM_PROVIDER=deepseek`：可选 DeepSeek 真实模型模式。
- `DEEPSEEK_API_KEY` / `DeepSeek_KEY`：DeepSeek API Key，二选一，禁止提交真实值。
- `DEEPSEEK_BASE_URL`：DeepSeek OpenAI-compatible 地址，默认 `https://api.deepseek.com`。
- `DEEPSEEK_MODEL`：DeepSeek 模型，默认 `deepseek-v4-flash`。
- `DEEPSEEK_THINKING`：DeepSeek 思考模式开关，默认 `disabled`，可按需设为 `enabled`。
- `LLM_REQUEST_TIMEOUT_MS`：真实模型请求超时（毫秒），默认 `15000`，仅影响真实模型模式。
- `LLM_FALLBACK_TO_MOCK`：设为 `true` 时真实模型失败会降级到 mock，默认关闭（默认明确报错）。
- `CHAT_REQUEST_BODY_LIMIT_BYTES`：后端请求体大小上限，默认 `65536`。
- `CHAT_MAX_MESSAGE_LENGTH` / `CHAT_MAX_SESSION_ID_LENGTH`：`POST /api/chat` 运行时 DTO 长度限制。
- `API_BEARER_TOKEN`：可选服务端 Bearer token 校验；未配置时保持本地 mock 零配置体验。
- `RATE_LIMIT_*`：进程内 IP、用户、session 三层限流配置；生产建议替换为 Redis 或 API 网关限流。
- `LLM_MAX_CONCURRENT_REQUESTS` / `LLM_MAX_CONCURRENT_REQUESTS_PER_SESSION`：真实 LLM 并发闸门，mock 模式不消耗名额。
- `SESSION_TTL_MS` / `SESSION_MAX_COUNT` / `SESSION_MAX_MESSAGES`：内存 session TTL、容量和历史消息裁剪配置。
- `VITE_API_BASE_URL`：前端访问后端的地址。

## 模型 Provider 与网关

项目用同一套 `LlmProvider` 接口支持多种模型模式，业务代码不感知具体厂商：

- `LLM_PROVIDER=mock`（默认）：本地 deterministic provider，无需任何 Key。
- `LLM_PROVIDER=deepseek`：可选 DeepSeek 直连模式，支持把工具 schema 交给模型规划。
- `LLM_PROVIDER=openai-compatible`：通用接入点。`OpenAICompatibleProvider` 可通过 `OPENAI_BASE_URL` 指向 OpenAI 官方、第三方中转站（One API / LiteLLM / OpenRouter）或公司内部网关，只要它们暴露 OpenAI 兼容的 `/chat/completions`。`OPENAI_PROVIDER_LABEL` 控制前端徽标显示的网关名。

真实模型链路已加入超时（`LLM_REQUEST_TIMEOUT_MS`）、错误脱敏和可选 mock 兜底（`LLM_FALLBACK_TO_MOCK`）。

详细的接入示例、环境变量矩阵和安全边界见 [模型网关说明](docs/delivery/model-gateway.md)。

## 安全与并发拔高点

为了不破坏题目要求的“无 API Key 可本地启动”，安全与并发能力采用“默认可演示、配置可收紧、生产可替换”的策略：

- 请求入口有运行时 DTO 校验：限制 `message`、`sessionId` 类型、长度和格式。
- Fastify 层限制请求体大小，异常 payload 不进入业务逻辑。
- 可选 `API_BEARER_TOKEN` 作为演示环境认证口子；真实内部系统应替换为 SSO/JWT/OIDC。
- 当前提供进程内 IP、用户、session 三层限流；真实部署建议迁移到 Redis 或 API 网关。
- 真实 LLM 模式有全局和单 session 并发闸门，避免大量请求直接打满 DeepSeek、中转站或内部网关。
- 内存 session 有 TTL、最大 session 数和每 session 最大消息数，避免无限增长。
- API 统一返回 `{ code, message, requestId }` 错误结构，并设置基础安全响应头。

这些能力不是把 MVP 伪装成生产级系统，而是明确展示后续工程化演进路径。

## MVP 范围

第一版完成：

- React 聊天页面。
- NestJS `POST /api/chat` 后端接口。
- 基于内存的多轮会话上下文。
- 默认 mock LLM provider。
- 可选 OpenAI-compatible provider。
- 可选 DeepSeek provider，使用真实 DeepSeek `/chat/completions` API 生成普通回复和工具结果总结。
- 本地工具注册、路由、执行和结果回填。
- mock 员工服务知识覆盖：年假、报销、远程办公、IT 支持、福利、入职、采购、会议室、安全合规、加班调休。
- 本地工具覆盖：内部政策查询、创建待办、查询当前时间、受控数学表达式计算。
- 基础安全与并发保护：请求校验、可选 Bearer token、进程内限流、LLM 并发闸门、session TTL/容量控制。

明确不做：

- 登录、权限和多租户。
- 数据库存储。
- 分布式限流和分布式 session。
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
- “报销需要哪些材料？” -> `lookup_hr_policy`
- “福利和五险一金怎么查？” -> `lookup_hr_policy`
- “会议室和访客怎么安排？” -> `lookup_hr_policy`
- “VPN 登不上怎么办？” -> `lookup_hr_policy`
- “计算 128*7+36 / 2**3+2 / 二加三 / 2(3+4) / 百分之五十 * 200” -> `calculate_expression`
- “帮我创建一个待办：明天提交报销 / 提醒我后天提交报销 / 下周五同步项目风险” -> `create_todo`
- “现在几点？/ 今天星期几？/ 纽约现在几点？” -> `get_current_time`

工具结果会进入 `reply`，并同时通过 `toolCalls` 返回给前端展示。

工具层针对 mock 演示做了边界补强：政策工具支持自然语言别名，计算工具支持 `2**3+2`、`二加三`、`2(3+4)`、百分比和全角符号，待办工具会拆分标题与截止时间，时间工具支持常见城市/时区别名。

在 DeepSeek 模式下，本地 `ToolRouter` 仍负责稳定触发工具；DeepSeek 负责普通自然语言回复，以及把工具执行结果总结成最终回答。

## 如何确认正在调用 DeepSeek

浏览器 DevTools 的 Network 只能看到前端请求本地 API：`POST http://localhost:3000/api/chat`。后端到 DeepSeek 的服务器侧请求不会直接出现在浏览器 Network 中。

确认方式：

1. 页面右上角模式徽标显示 `DeepSeek API` 和当前模型名。
2. Network -> `chat` -> Preview 中查看：

```json
{
  "mode": "llm",
  "provider": {
    "name": "deepseek",
    "label": "DeepSeek",
    "model": "deepseek-v4-flash",
    "baseUrl": "https://api.deepseek.com"
  }
}
```

3. 后端终端会输出脱敏请求日志：

```text
[llm] provider=deepseek model=deepseek-v4-flash endpoint=https://api.deepseek.com/chat/completions tools=auto
```

以上信息不会输出 API Key。

## 验证

```bash
pnpm build
pnpm test
```

建议演示问题：

1. 你好，你能做什么？
2. 公司年假政策是什么？
3. 福利和五险一金怎么查？
4. 会议室和访客怎么安排？
5. 计算 128*7+36
6. 那远程办公时也适用吗？
7. 帮我创建一个待办：明天提交报销
8. 现在几点？

## 限制与后续优化

当前实现优先证明核心流程，不追求生产完备性。后续可扩展：

- 将内存会话替换为数据库。
- 将进程内限流和 LLM 并发控制迁移到 Redis/API 网关。
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
- [模型网关说明](docs/delivery/model-gateway.md)
- [AI 工具使用记录](docs/delivery/ai-usage.md)
- [录屏脚本](docs/delivery/demo-script.md)

开发过程：

- [技术设计文档](docs/development/technical-design.md)
- [最终高标准符合性审核记录](docs/development/final-compliance-audit-2026-06-29.md)
- [Claude 提示词记录](docs/development/claude-prompts.md)
- [Claude 评审记录](docs/development/claude-review-log.md)
