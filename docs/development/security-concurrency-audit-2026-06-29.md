# 安全与并发阶段审核记录

日期：2026-06-29  
范围：前端聊天页、后端 `POST /api/chat`、LLM provider、工具调用、session 存储、现有开发与交付文档。

## 总体结论

当前项目可以作为面试题要求的本地 MVP 演示：支持 mock 模式、多轮上下文、工具调用、真实模型可选接入、LLM 超时和错误脱敏。

实现补强后，项目已经具备“单进程/本地演示级”的安全与并发保护：请求校验、可选 Bearer token、进程内限流、LLM 并发闸门、session TTL/容量控制、统一错误格式和安全响应头。

但如果按“内部多人真实使用”或“公网可访问服务”的标准审核，仍不能直接视为生产级通过。主要原因是：认证仍是演示口子而非 SSO/JWT/OIDC，限流和 session 仍是进程内实现，缺少 Redis/网关/数据库支撑，观测和压测也还未达到生产闭环。

这不是当前 MVP 的业务功能缺陷，但必须在下一阶段明确补齐，否则大量用户或脚本调用时会带来成本失控、内存增长、会话串扰、上游模型被打满等风险。

## 已具备的基础保护

| 能力 | 当前状态 | 证据 |
| --- | --- | --- |
| API Key 不下发前端 | 已具备 | `apps/api/src/llm/llm-http.ts` 只在后端请求头拼接 `authorization` |
| 真实模型调用超时 | 已具备 | `apps/api/src/llm/llm-http.ts` 使用 `AbortController`，默认 15000ms |
| LLM 错误脱敏 | 已具备 | 非 2xx 只暴露状态码，网络错误转成通用错误 |
| provider 失败稳定语义 | 已具备 | `apps/api/src/chat/chat.service.ts` 将 provider 错误转成 503，失败轮次不写入历史 |
| 工具执行白名单 | 已具备 | `apps/api/src/tools/tool-registry.ts` 只注册固定工具 |
| 工具参数基础校验 | 已具备 | `todo.tool.ts`、`hr-policy.tool.ts`、`time.tool.ts` 进行运行时校验 |
| 前端重复点击保护 | 已具备 | `apps/web/src/main.tsx` 使用 `isSending` 禁用发送按钮 |
| 请求 DTO 运行时校验 | 已具备基础版 | `apps/api/src/chat/dto.ts` |
| 可选 Bearer token | 已具备接入口 | `apps/api/src/security/request-security.service.ts` |
| IP/用户/session 三层限流 | 已具备进程内版本 | `apps/api/src/security/in-memory-rate-limiter.ts` |
| LLM 并发闸门 | 已具备进程内版本 | `apps/api/src/llm/llm-concurrency-limiter.ts` |
| session TTL/容量控制 | 已具备进程内版本 | `apps/api/src/session/in-memory-session.store.ts` |
| 统一错误格式和安全响应头 | 已具备基础版 | `apps/api/src/common/api-exception.filter.ts`、`apps/api/src/main.ts` |

## 剩余生产化风险

### P1：认证仍是演示口子，不是企业身份体系

当前已经提供 `API_BEARER_TOKEN` 服务端校验口子；未配置时保持 mock MVP 零配置体验。这个设计适合面试演示，但真实内部系统仍应接 SSO / OIDC / JWT，并把 session 与真实 `userId` 绑定。

剩余风险：

- Bearer token 只能证明“知道演示密钥”，不能表达真实用户、部门、角色和租户。
- session 仍由前端传入，虽然有格式限制，但还没有与真实用户强绑定。
- 后续如果接入真实内部数据或副作用工具，必须做工具级权限校验。

### P1：限流和 session 仍是进程内版本

当前已经有 IP、用户、session 三层限流和 session TTL/容量控制，但这些都是单进程 Map 实现，适合本地演示和单实例运行。

剩余风险：

- 多实例部署时，不同实例之间不会共享限流计数和 session 数据。
- 服务重启后 session 丢失。
- 面对真实公网流量，仍需要 API 网关、Redis 或数据库层的保护。

### P1：LLM 并发控制仍是单进程 semaphore

当前真实 LLM 模式已有全局和单 session 并发闸门，mock 模式不占用名额。它可以防止单进程直接打满 DeepSeek、中转站或内部网关，但不是完整成本治理。

剩余风险：

- 多实例部署时，各实例会分别持有自己的并发计数。
- 目前没有排队、熔断、预算配额和 provider 级成本统计。
- 真实业务需要按用户、团队、模型、provider 做更细的配额与告警。

### P2：请求校验是轻量手写版本

当前 `validateChatRequest` 已覆盖 `message`、`sessionId` 和请求体大小，但不是完整 schema 体系。

后续可选：

- 如果接口字段增多，可迁移到 Zod、class-validator 或统一 DTO pipe。
- 如果要支持文件、富文本或多模态输入，需要重新设计大小、类型和安全策略。

## 重要非阻塞风险

### P2：缺少审计日志和指标

当前只做了少量 provider 日志。真实多人使用需要记录：

- requestId；
- userId/sessionId；
- provider/model；
- latency；
- token 或字符规模；
- tool 调用名称；
- 429/503/timeout 数量；
- 单用户调用量。

日志不得记录 API Key、Authorization、完整敏感输入或上游原始响应体。

### P2：副作用工具缺少权限分级

当前 `create_todo` 是 mock，不落库。后续如果变成真实创建任务、发邮件、改审批状态等副作用工具，必须增加权限校验、参数白名单、二次确认和审计记录。

## 后续生产化改造顺序

1. 将 `RequestIdentity` 替换为 SSO / OIDC / JWT 解析，并把 session 与真实 `userId` 绑定。
2. 将 `InMemoryRateLimiter` 替换为 Redis 或 API 网关分布式限流。
3. 将 `InMemorySessionStore` 替换为 Redis/Postgres，保留 TTL 和消息裁剪策略。
4. 将 `LlmConcurrencyLimiter` 上移为 Redis semaphore、队列或 provider 网关限流。
5. 增加结构化日志和指标：QPS、p95、429 数量、LLM 超时率、provider 成本、单用户调用量。
6. 对副作用工具加入权限、二次确认和审计。
7. 用 `autocannon` 或 `k6` 做并发压测，覆盖 429、超时、session 裁剪和 provider 失败。

## 基础版验收标准

当前如果声称“安全和并发有基础保护”，至少需要满足：

- 空消息、超长消息、非法 sessionId、超大请求体都能被稳定拒绝。
- 单 IP、单 session 高频调用会返回 429。
- 单 session 同时发起多次真实模型请求时，不会无限并发打到 provider。
- session 有 TTL 和容量控制。
- API 响应不泄漏 Key、Authorization、上游响应体或内部堆栈。
- mock 模式仍然不需要任何外部 Key，可完整跑通原始题目要求。
- `pnpm test` 通过，并新增限流、校验、session 裁剪、并发闸门相关测试。

## 建议给 Claude 的后续生产化提示词

```text
If an AGENTS.md file exists in this repository, read it first and follow it.

Then read these files in order:
1. /Users/huangyuming/Desktop/mianshi/斑头雁全栈开发工程师--开放型笔试题.md
2. /Users/huangyuming/Desktop/mianshi/README.md
3. /Users/huangyuming/Desktop/mianshi/docs/development/technical-design.md
4. /Users/huangyuming/Desktop/mianshi/docs/delivery/solution.md
5. /Users/huangyuming/Desktop/mianshi/docs/development/security-concurrency-audit-2026-06-29.md

Audit the already implemented local hardening stage and plan the production hardening stage. Keep the original mock MVP behavior intact.

Primary goals:
- Verify runtime request validation, request body/message/sessionId limits, in-memory rate limiting, LLM concurrency protection, and session trimming.
- Propose production replacements for auth, distributed rate limiting, distributed session storage, LLM concurrency governance, observability, and pressure testing.
- Do not break the no-key mock mode.
- Keep all code comments in Chinese.

After implementation, run:
- pnpm test
- pnpm build
- git diff --check

Report in Chinese:
- changed files
- implemented safeguards
- verification results
- remaining production gaps
```

## 本次审核验证

已运行：

```bash
pnpm test
pnpm build
git diff --check
```

结果：

- 10 个 API 测试文件通过。
- 38 个测试通过。
- 前后端 build 通过。
- `git diff --check` 通过。
- HTTP 冒烟通过：mock 模式下待办工具调用正常进入最终回复。
- HTTP 冒烟通过：非法 `sessionId` 返回统一 `{ code, message, requestId }` 错误结构。
- 本机当前 `.env` 启用 DeepSeek 时，真实模型链路也已冒烟通过，响应未泄漏 API Key。
- 当前测试覆盖业务 MVP、工具路由、provider 错误脱敏、mock 兜底、DTO 校验、限流、可选认证、session TTL/裁剪、LLM 并发闸门。
