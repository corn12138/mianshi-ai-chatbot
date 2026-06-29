# 最终高标准符合性审核记录

日期：2026-06-29  
审核对象：当前仓库实现与 `/Users/huangyuming/Desktop/mianshi/斑头雁全栈开发工程师--开放型笔试题.md`。  
审核结论：高标准通过。当前实现不仅满足原始题目的必须流程，还在不破坏 MVP 边界的前提下补充了多 provider 接入、mock 覆盖增强、安全与并发基础保护、过程文档和测试证据。

## 结论摘要

当前项目符合原始题目的核心目标：用 AI 工具完成一个核心流程可运行、边界清楚、取舍明确、可本地启动的内部员工 AI Chatbot MVP。

从高标准角度看，当前实现的优势是：

- mock 模式默认可用，无真实 LLM API Key 也能完整体验。
- 前端能发起对话并展示多轮消息、工具结果、provider 模式和等待态。
- 后端集中负责上下文、模型 provider、工具路由、工具执行和错误处理。
- 工具调用不是按钮硬编码触发，而是由后端 `ToolRouter` 和模型工具意图共同决定。
- 工具结果进入最终 assistant 回复，并通过 `toolCalls` 结构化返回。
- mock 覆盖不止最低要求，覆盖员工政策、福利、入职、采购、会议室、安全合规、待办、时间、计算等场景，并支持常见非模板输入。
- 支持 DeepSeek 和 OpenAI-compatible provider，可接第三方中转站和内部网关。
- 增加了请求校验、错误脱敏、LLM 超时、限流、LLM 并发闸门、session TTL/容量控制等工程化加分项。
- README、方案说明、技术设计、AI 使用记录、录屏脚本、需求追踪表齐全。

## 必须流程符合性

| 原始题目要求 | 审核结论 | 证据 |
| --- | --- | --- |
| 用户可以在网页中发起一轮对话 | 通过 | `apps/web/src/main.tsx` 提供输入框、发送按钮、示例问题和消息列表 |
| 系统可以返回 AI 回复 | 通过 | `apps/api/src/chat/chat.service.ts` 调用 provider 并返回 `reply` |
| 支持多轮上下文 | 通过 | `InMemorySessionStore` 按 `sessionId` 保存历史；HTTP 冒烟确认同 session 返回 4 条消息 |
| 至少支持 1 个工具调用场景 | 高标准通过 | 当前 4 类工具：政策查询、待办、时间、计算 |
| 工具调用由 AI 或工具路由逻辑判断触发 | 通过 | `ToolRouter` 根据用户输入和历史判断工具；DeepSeek provider 也支持 tool schema |
| 工具调用结果进入最终回复 | 通过 | `MockLlmProvider.composeReply` 把每个工具结果拼入最终回复 |
| 无真实 API Key 也能体验核心流程 | 通过 | `LLM_PROVIDER=mock` HTTP 冒烟通过；README 明确默认 mock |
| README 可本地启动 | 通过 | README 提供 `pnpm install`、`pnpm dev`、Web/API 地址和环境变量说明 |

## 建议实现范围符合性

| 建议项 | 审核结论 | 证据 |
| --- | --- | --- |
| 简单可用聊天页面 | 通过 | React + Vite 页面，支持示例问题、输入、发送、loading、错误展示 |
| 发送消息的后端接口 | 通过 | `POST /api/chat` |
| 基础会话上下文管理 | 通过 | 内存 session store，含 TTL、容量和历史裁剪 |
| 本地 mock LLM / mock provider | 高标准通过 | deterministic `MockLlmProvider`，覆盖更多内部员工问题和非模板工具输入 |
| 本地工具 | 高标准通过 | `lookup_hr_policy`、`create_todo`、`get_current_time`、`calculate_expression` |
| 工具参数校验和失败处理 | 高标准通过 | 各工具做运行时校验；`ToolRegistry` 归一异常参数、捕获失败并结构化返回 |
| README 启动说明 | 通过 | README 启动、环境变量、mock、工具、验证说明齐全 |

## 文档要求符合性

| 文档要求 | 审核结论 | 证据 |
| --- | --- | --- |
| 需求理解 | 通过 | README、`docs/delivery/solution.md` |
| MVP 范围拆解 | 通过 | README “MVP 范围”、方案说明 |
| 第一版做什么 / 不做什么 | 通过 | README 明确完成项和不做项 |
| 为什么这样取舍 | 通过 | `docs/delivery/solution.md` “取舍” |
| 核心流程如何运行 | 通过 | README 流程图、`docs/development/technical-design.md` |
| 前端/后端/模型/工具/存储关系 | 通过 | 技术设计和方案说明 |
| 多轮上下文如何处理 | 通过 | 技术设计、方案说明、session store 实现 |
| 工具调用如何判断、执行和返回 | 通过 | README、技术设计、ToolRouter/ToolRegistry |
| mock 模式如何启用 | 通过 | README、`.env.example` |
| 限制和后续优化 | 通过 | README、技术设计、安全并发审核 |
| 使用哪些 AI 工具 | 通过 | `docs/delivery/ai-usage.md` |
| 采纳/修改/拒绝 AI 输出 | 通过 | `docs/delivery/ai-usage.md` |

## 工程化加分项

这些能力不是原始题目的硬要求，但符合评分维度中的“技术方案与工程意识”：

- 多 provider：`MockLlmProvider`、`DeepSeekProvider`、`OpenAICompatibleProvider`。
- 中转站/内部网关：`OPENAI_BASE_URL` + `OPENAI_PROVIDER_LABEL` 支持 OpenAI-compatible 网关。
- mock 工具边界：政策 query 别名、自然语言待办、时区别名、中文数字/百分比/次方/隐式乘法等计算输入。
- LLM 超时：`LLM_REQUEST_TIMEOUT_MS`，默认 15 秒。
- 错误脱敏：不回传 API Key、Authorization 或上游响应体。
- 可选 mock 兜底：`LLM_FALLBACK_TO_MOCK=true`。
- 请求校验：`message`、`sessionId` 类型、长度、格式。
- 请求体大小限制：Fastify `bodyLimit`。
- 可选认证口子：`API_BEARER_TOKEN`。
- 三层限流：IP、用户、session。
- LLM 并发闸门：全局和单 session 在途请求控制。
- session TTL/容量控制：避免内存无限增长。
- 统一错误格式：`{ code, message, requestId }`。
- 安全响应头：`X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`、`Permissions-Policy`、CSP，生产 HSTS。

## 验证记录

已运行：

```bash
pnpm test
pnpm build
git diff --check
rg -n "sk-[A-Za-z0-9_-]{20,}|Bearer [A-Za-z0-9._-]{20,}|api[_-]?key\\s*=\\s*['\\\"][^'\\\"]+['\\\"]|DEEPSEEK_API_KEY\\s*=\\s*[^#\\s]|OPENAI_API_KEY\\s*=\\s*[^#\\s]|API_BEARER_TOKEN\\s*=\\s*[^#\\s]" .env.example README.md docs apps package.json pnpm-workspace.yaml --glob '!node_modules' --glob '!dist'
LLM_PROVIDER=mock PORT=3103 pnpm --filter @mianshi/api dev
```

结果：

- `pnpm test` 通过：14 个测试文件，56 个测试。
- `pnpm build` 通过：API 和 Web 均构建成功。
- `git diff --check` 通过。
- 敏感信息扫描无真实密钥；仅命中 `.env.example`/文档占位符和测试假 token。
- mock HTTP 冒烟通过：
  - `介绍一下自己`：返回 mock 普通回复。
  - `公司年假政策是什么？`：触发 `lookup_hr_policy`。
  - 同一 session 追问 `那远程办公时也适用吗？`：保留上下文并返回 4 条历史消息。
  - `计算 128*7+36`：触发 `calculate_expression`，结果为 932。
  - `二加三`、`2(3+4)`、`百分之五十 * 200`：触发 `calculate_expression` 并正确归一计算。
  - `帮我创建一个待办：明天提交报销`、`下周五同步项目风险`：触发 `create_todo`，并拆分标题与截止时间。
  - `纽约现在几点？`：触发 `get_current_time`，时区归一为 `America/New_York`。
  - `VPN 登不上怎么办？`：触发 `lookup_hr_policy`，命中 IT 支持政策。
  - 非法 `sessionId`：返回统一 `BAD_REQUEST` 错误结构。

## 剩余风险

无阻塞项。

非阻塞说明：

- 录屏/视频链接仍需要作为最终外部提交物提供；仓库已提供录屏脚本和演示顺序。
- 当前不是生产级系统，且 README 已明确不做完整登录、数据库、分布式限流、RAG、流式输出、生产审计和线上部署。
- 本地 `.env` 如果配置了 DeepSeek，页面会显示 `DeepSeek API`；演示 mock 时应使用 `LLM_PROVIDER=mock`。

## 最终判定

从原始题目要求看：完整符合。  
从高标准面试交付看：高标准符合。  
从生产级系统看：不是生产级，但边界清楚、取舍合理，并已预留可扩展口子。
