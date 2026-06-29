# 技术设计文档

## 目标

构建一个短期可落地验证的内部员工 AI Chatbot MVP。第一版重点证明核心流程可运行：网页聊天、多轮上下文、自动工具调用、工具结果进入最终回复、无 API Key 的 mock 模式。

## 技术栈

- 前端：React + Vite + TypeScript。
- 后端：NestJS + TypeScript，运行在 Fastify 适配器上。
- 单仓库：pnpm workspace。
- 模型层：默认 `MockLlmProvider`，可选 `DeepSeekProvider` 或 `OpenAICompatibleProvider`。
- 存储层：内存 session store。
- 安全层：运行时 DTO 校验、可选 Bearer token、进程内限流、LLM 并发闸门、API 安全响应头。

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
3. 后端校验请求体、`message`、`sessionId`。
4. 后端解析请求身份；如配置 `API_BEARER_TOKEN`，则校验 Bearer token。
5. 后端执行 IP、用户、session 三层限流。
6. 后端根据 `sessionId` 读取历史消息。
7. 真实 LLM 模式先申请并发名额；mock 模式不占用真实模型名额。
8. LLM provider 生成初步回复或工具意图。
9. `ToolRouter` 根据模型意图和规则判断是否需要工具。
10. `ToolRegistry` 执行本地工具并返回结构化结果。
11. LLM provider 将工具结果合成为最终回复。
12. 后端把 user/assistant 消息写回内存 session，并按容量配置裁剪历史。
13. 前端展示 assistant 回复和工具调用详情。

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
  "mode": "mock",
  "provider": {
    "name": "mock",
    "label": "Mock LLM",
    "model": "deterministic-local-mock"
  }
}
```

## 工具设计

当前工具：

- `lookup_hr_policy`：查询 mock 员工服务知识，覆盖年假、报销、远程办公、IT 支持、福利、入职、采购、会议室、安全合规、加班调休。
- `create_todo`：创建 mock 待办。
- `get_current_time`：查询当前时间。
- `calculate_expression`：安全计算受控数学表达式，不使用 `eval` 或 `Function`。

工具调用不能依赖前端按钮。前端示例按钮只是演示入口，真正的判断在后端 `ToolRouter`。

本轮工具边界补强：

- `math-expression.ts` 统一处理数学输入归一化，覆盖全角数字/符号、中文数字、中文乘除加减、次方/平方、百分比、千分位和隐式乘法。
- `ToolRouter` 不只匹配固定按钮文案，也识别自然语言计算、待办、时间和政策问题，例如 `二加三`、`2(3+4)`、`提醒我后天提交报销`、`纽约现在几点`、`VPN 登不上怎么办`。
- `lookup_hr_policy` 支持受控 `topic` 和自然语言 `query`，未知 query 返回可查询目录，不直接制造未捕获错误。
- `create_todo` 会清理标题、拆分截止时间并限制标题/日期长度。
- `get_current_time` 会把常见城市或时区别名归一到 IANA timezone，并对非法 timezone 返回稳定错误。
- `ToolRegistry` 对模型或中转站传来的异常参数做对象归一，确保工具失败以结构化 `toolCalls` 返回。

## Mock 模式

无 `.env` 或 `LLM_PROVIDER=mock` 时默认启用 mock 模式。mock provider 不依赖外部服务，因此评审可直接本地启动并体验完整核心流程。

mock 覆盖面有意比最低要求更宽：普通自我介绍和能力说明由 `MockLlmProvider` 直接生成；员工服务、待办、时间和计算问题由 `ToolRouter` 稳定触发本地工具。工具输入也覆盖常见非模板写法，例如中文数字计算、百分比、外地时间、自然语言待办和 IT/办公政策别名。这样即使没有真实 LLM Key，录屏也能展示更接近内部员工助手的使用广度。

## DeepSeek 真实模型模式

当 `LLM_PROVIDER=deepseek` 且存在 `DEEPSEEK_API_KEY` 或 `DeepSeek_KEY` 时，后端启用 `DeepSeekProvider`，调用 DeepSeek OpenAI-compatible `/chat/completions` 接口生成普通回复和工具结果总结。

实现取舍：

- 多轮对话由本地 session history 拼接后传给 DeepSeek，因为 DeepSeek Chat API 本身是无状态请求。
- 工具触发仍由本地 `ToolRouter` 稳定判断，确保员工服务查询、待办、时间、计算工具在演示中可控。
- DeepSeek 的 tool schema 同步支持政策 `query` 和更宽的计算表达式说明，模型直接规划工具时也能理解这些边界。
- DeepSeek 负责普通自然语言回复，以及在工具执行后将工具结果总结成最终回答。
- 默认仍保留 mock 模式，避免评审没有真实 API Key 时无法启动核心流程。

## 运行态可观测性

为了方便验收时确认当前是否真的接入 DeepSeek，`POST /api/chat` 会返回脱敏 provider 元信息：

- `mode`: `mock` 或 `llm`。
- `provider.name`: `mock`、`deepseek` 或 `openai-compatible`。
- `provider.model`: 当前模型名。
- `provider.baseUrl`: 真实模型服务地址，不包含 API Key。

前端会把这些信息展示为顶部模式徽标，例如 `DeepSeek API / deepseek-v4-flash`。后端发起 DeepSeek 请求时也会输出脱敏日志，便于录屏证明浏览器本地 API 背后发生了服务器侧模型调用。

## 通用 OpenAI-compatible / 网关模式

当 `LLM_PROVIDER=openai-compatible` 且存在 `OPENAI_API_KEY` 时启用通用 OpenAI-compatible provider。真实模型模式保留为可选增强，不影响 mock MVP 验收。

`OpenAICompatibleProvider` 是第三方中转站和公司内部网关的统一接入点：任何暴露 OpenAI 兼容 `/chat/completions` 的服务（OpenAI、One API、LiteLLM、OpenRouter、内部网关）都可以只通过 `OPENAI_BASE_URL` 接入，`OPENAI_PROVIDER_LABEL` 控制前端徽标显示的网关名。完整说明见 `docs/delivery/model-gateway.md`。

## 真实模型链路健壮性

真实模型调用统一经过 `apps/api/src/llm/llm-http.ts`：

- 超时：基于 `AbortController`，可用 `LLM_REQUEST_TIMEOUT_MS` 配置，默认 15000ms。
- 错误脱敏：只对外暴露状态码或标准化错误（如 `LLM provider request failed: 401`、`LLM provider request timed out`），不回传 Key、Authorization 头或上游响应体。
- 稳定失败：`ChatService` 捕获 provider 错误并转成 HTTP 503，失败这一轮不写入会话历史，避免污染上下文。
- 可选兜底：`LLM_FALLBACK_TO_MOCK=true` 时真实模型失败降级到 mock，默认关闭以避免静默降级。

## 安全与并发设计

当前实现不追求完整生产级能力，但在不破坏 mock MVP 的前提下补了可演示的工程化保护：

- 请求体上限：Fastify `bodyLimit` 由 `CHAT_REQUEST_BODY_LIMIT_BYTES` 控制，默认 64KB。
- DTO 运行时校验：`validateChatRequest` 校验 `message` 字符串、最大长度、`sessionId` 格式和最大长度。
- 可选认证口子：`API_BEARER_TOKEN` 未配置时保持本地演示；配置后 `POST /api/chat` 必须携带 Bearer token。生产应替换为 SSO/JWT/OIDC。
- 三层限流：`InMemoryRateLimiter` 按 IP、用户、session 计数，超限返回 429；生产多实例应替换为 Redis 或 API 网关限流。
- LLM 并发闸门：`LlmConcurrencyLimiter` 只限制真实 LLM 模式，按全局和单 session 控制在途请求，避免大量请求打满 DeepSeek、中转站或内部网关。
- session 容量控制：`InMemorySessionStore` 支持 TTL、最大 session 数、每 session 最大消息数，避免进程内 Map 无限增长。
- 统一错误格式：API 错误返回 `{ code, message, requestId }`，前端只展示安全 message。
- 安全响应头：API 增加 `X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`、`Permissions-Policy`、收紧的 CSP；生产环境额外设置 HSTS。

这些保护都是本地内存版本，目的是展示后续扩展接口：认证可替换为企业身份系统，限流和 session 可替换为 Redis/Postgres，LLM 并发控制可上移到队列或网关。

## 边界和限制

- 内存 session 重启后丢失。
- 工具路由仍是演示级规则，但已覆盖常见自然语言别名和工具参数边界；生产阶段可替换为更完整的意图分类或 function calling 策略。
- DeepSeek 模式支持将工具 schema 交给模型规划，同时保留本地 `ToolRouter` 兜底，避免模型没有稳定触发工具时影响 MVP 演示。
- 未实现完整登录、复杂权限、数据库、分布式限流、RAG、流式输出和线上部署。

这些限制是有意取舍，目的是优先保证开放题要求的核心流程清晰、稳定、可解释。
