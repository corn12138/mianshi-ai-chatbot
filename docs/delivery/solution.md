# 技术方案说明

## 需求理解

题目要求不是做一个完整 AI 产品，而是用 AI 工具快速交付一个核心流程可运行、边界清楚、取舍明确的 Chatbot MVP。

这个 MVP 面向内部员工，第一版聚焦三件事：

1. 用户能在网页中多轮对话。
2. 系统能在合适时机自动调用本地工具。
3. 没有真实 LLM API Key 时仍能通过 mock 模式完整体验。

## 架构关系

- 前端：负责聊天页面、会话 ID 保存、消息展示、工具调用结果展示。
- 后端：负责接口、上下文管理、模型 provider、工具路由和工具执行。
- 模型层：默认 mock provider，可选 DeepSeek provider 或 OpenAI-compatible provider。
- 工具层：注册员工服务知识查询、待办创建、时间查询、安全四则运算。
- 存储层：第一版使用内存 Map 保存会话上下文。

## 多轮上下文

前端首次访问生成 `sessionId` 并保存在 `localStorage`。每次请求带上 `sessionId`，后端用 `InMemorySessionStore` 查找历史消息，并在生成最终回复后把 user/assistant 消息追加回会话。

## 工具调用

后端 `ToolRouter` 根据用户输入和模型计划判断工具意图。当前 mock 模式使用规则路由保证可演示性；真实模型模式下仍保留规则路由作为兜底。

工具执行后，结果会：

- 写入 assistant 消息的 `toolCalls`。
- 拼入最终自然语言回复。
- 返回给前端用于展示。

mock 模式下的员工服务知识不只覆盖单一 HR 问题，而是覆盖年假、报销、远程办公、IT 支持、福利、入职、采购、会议室、安全合规、加班调休等常见内部场景；同时增加 `calculate_expression` 工具，展示“计算数据”这类题目建议场景。

## DeepSeek 真实 API 增强

第一版已经保留无 Key 可运行的 mock 模式，同时支持可选 DeepSeek 真实模型模式：

- 设置 `LLM_PROVIDER=deepseek`。
- 在本地 `.env` 中配置 `DEEPSEEK_API_KEY` 或 `DeepSeek_KEY`。
- 后端会调用 DeepSeek `/chat/completions` 生成普通回复和工具结果总结。
- 工具调用仍由本地 `ToolRouter` 触发，避免真实模型输出不稳定影响核心演示。

这个设计既满足题目要求的 mock 模式，也能展示真实 LLM API 接入能力。

## 多 Provider 与网关接入

`OpenAICompatibleProvider` 是第三方中转站和公司内部网关的统一接入点。任何暴露 OpenAI 兼容 `/chat/completions` 的服务（OpenAI、One API、LiteLLM、OpenRouter、内部网关）都可以只通过 `OPENAI_BASE_URL` 接入，无需新增 provider 代码；`OPENAI_PROVIDER_LABEL` 让前端徽标显示具体网关名。

这是有意的取舍：与其为每个厂商各写一个 provider，不如把通用 OpenAI-compatible 路径做扎实，做到“配置即接入”。完整接入示例和环境变量矩阵见 [模型网关说明](model-gateway.md)。

## 真实模型链路的健壮性

真实模型是可选增强，但仍按工程标准做了基础韧性处理：

- 超时：真实请求带 `AbortController`，可用 `LLM_REQUEST_TIMEOUT_MS` 配置，默认 15s。
- 错误脱敏：对外只返回 `LLM provider request failed: 401`、`LLM provider request timed out` 这类安全信息，不泄漏 Key、Authorization 或上游响应体。
- 稳定失败语义：provider 失败转成 HTTP 503，而不是未捕获的 500；失败这一轮不写入会话历史。
- 可选兜底：`LLM_FALLBACK_TO_MOCK=true` 时真实模型失败会降级到 mock 继续本轮对话，默认关闭以避免静默降级误导。

## 安全与并发拔高设计

原始题目不要求生产级稳定性，但评分维度会关注参数校验、API Key 安全、错误处理和工程意识。因此当前实现做了不影响 MVP 的基础硬化：

- 后端对 `POST /api/chat` 做运行时 DTO 校验，限制 `message` 和 `sessionId`。
- Fastify 限制请求体大小，拒绝异常 payload。
- 真实 API Key 只在后端使用，错误响应不泄漏 Key、Authorization 或上游响应体。
- 提供可选 `API_BEARER_TOKEN` 认证口子；未配置时仍可零配置运行 mock，真实内部系统应接 SSO/JWT/OIDC。
- 提供进程内 IP、用户、session 三层限流；真实部署时迁移到 Redis 或 API 网关。
- 真实 LLM 模式加全局和单 session 并发闸门，防止大量请求打满 DeepSeek、中转站或公司内部网关。
- 内存 session 加 TTL、最大 session 数和每 session 最大消息数；生产可替换为 Redis/Postgres。
- API 错误统一为 `{ code, message, requestId }`，前端只展示安全文案。

这些不是为了宣称项目已经生产可用，而是让评审能看到后续演进路径和关键风险已被识别并预留接口。

## 取舍

第一版不做数据库、登录、复杂权限、RAG、流式输出和线上部署。原因是这些能力会显著扩大范围，但不是题目的核心评分点。当前实现优先保证普通对话、多轮上下文、工具调用和 mock 模式四条主链路可靠可演示。
