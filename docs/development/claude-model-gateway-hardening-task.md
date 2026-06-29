# Claude 任务：Mock 优先的模型网关与真实 LLM 加固

## 复制给 Claude 的入口提示词

如果仓库中存在 `AGENTS.md`，请先读取它。然后按顺序读取以下文件：

1. `斑头雁全栈开发工程师--开放型笔试题.md`
2. `docs/product-stage-audit-2026-06-29-strict.md`
3. `docs/development/claude-model-gateway-hardening-task.md`

读取完成后，按 `docs/development/claude-model-gateway-hardening-task.md` 从头到尾闭环执行。请把 mock 模式视为原始题目的主验收路径：先验证并保持完整 mock MVP 流程，再加固可选的真实模型与网关链路。不要提交密钥。新增或修改的非平凡代码必须添加中文注释。

## 背景

当前 MVP 已经跑通原始笔试题要求的 mock 核心流程：

- Web 聊天页面向 `POST /api/chat` 发送消息。
- API 使用内存会话保存多轮上下文。
- 工具调用由后端路由或模型规划触发，不依赖前端工具按钮。
- 工具结果进入最终 assistant 回复。
- mock 模式不需要真实 LLM API Key。

原始题目不要求部署、生产级认证、数据库持久化、RAG、流式输出，也不要求必须接入真实 LLM。真实模型和模型网关只是加分证据，不能削弱 mock 主路径。mock 模式是评审无凭据也能完整验收的主路径。

严格审计指出了两个需要闭环的高标准缺口：

1. 模型层需要更清楚地说明并最小实现多模型、第三方 OpenAI-compatible 中转站、公司内部 LLM 网关的接入方式。
2. 真实 LLM provider 调用需要更强的韧性：超时、结构化错误处理，以及不会破坏 mock MVP 的清晰兜底行为。

本任务只处理这两个缺口。不要扩展到登录、数据库持久化、RAG、流式输出、部署、复杂 agent 编排或生产级观测。

## 事实来源

最高优先级产品来源：

- `斑头雁全栈开发工程师--开放型笔试题.md`

当前缺口来源：

- `docs/product-stage-audit-2026-06-29-strict.md`

优先沿用现有实现风格，不要重新设计大架构：

- `apps/api/src/llm/llm-provider.interface.ts`
- `apps/api/src/llm/mock-llm.provider.ts`
- `apps/api/src/llm/deepseek.provider.ts`
- `apps/api/src/llm/openai-compatible.provider.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/chat/chat.service.ts`
- `apps/web/src/main.tsx`
- `.env.example`
- `README.md`
- `docs/development/technical-design.md`
- `docs/delivery/solution.md`
- `docs/delivery/demo-script.md`
- `docs/delivery/requirements-traceability.md`

## 硬性约束

- mock 模式是主验收路径。每个实现决策都必须保持 `LLM_PROVIDER=mock` 下的原题核心流程。
- 保持 `LLM_PROVIDER=mock` 为默认无 Key 体验。
- 没有 `.env`、没有真实 API Key 时，`pnpm dev` 必须仍能启动并跑通核心流程。
- 构建、测试和默认演示不得依赖真实 LLM Key。
- 不要提交 `.env`、真实 API Key、Token、账号信息或任何看起来像密钥的占位符。
- 示例 Key 只能使用明显占位值，例如 `replace-with-your-key`，不要使用密钥形态的占位符。
- 新增或修改的非平凡代码必须有中文注释。
- 注释应解释意图、取舍或安全边界，不要写“给变量赋值”这类机械注释。
- 除非为了小幅向后兼容扩展，否则不要改变现有 API 响应结构。
- 现有测试必须继续通过。

## 任务 0：Mock 优先的原题合规性

在修改真实模型或网关代码之前，先确认原始题目到底要求什么。不要把部署或真实 LLM 当成必做项。

### 必须满足的 mock 验收清单

mock 模式必须满足原始题目的全部核心流程：

1. 用户可以打开网页并发起聊天。
2. 系统可以返回 assistant 回复。
3. 同一个 `sessionId` 连续追问时保留多轮上下文。
4. 至少一个工具调用场景可用；当前目标是保留三个工具：
   - `lookup_hr_policy`
   - `create_todo`
   - `get_current_time`
5. 工具调用由后端 AI/mock 路由逻辑触发，不由前端按钮直接决定。
6. 工具结果进入最终 assistant 回复。
7. 没有真实 LLM API Key 时 mock 模式可完整体验。
8. README 的本地启动说明足以让评审本地运行。

### 必须保留或补齐的 mock 测试

保留或补齐能锁住以下行为的测试：

- mock provider 返回 `mode: "mock"` 和 `provider.name: "mock"`；
- HR 政策工具结果出现在 `reply` 中；
- 待办工具结果出现在 `reply` 中；
- 当前时间工具结果出现在 `reply` 中；
- 同一 `sessionId` 的追问保留历史；
- 空消息被清晰拒绝；
- provider 失败相关测试不得破坏默认 mock 行为。

如果实现真实模型 fallback，必须测试 fallback 后仍返回 mock provider 元信息，避免评审误以为仍是真实模型产出。

## 任务 A：模型网关与多 Provider 文档

### 目标

讲清楚本 MVP 可以支持：

- Mock 模式。
- DeepSeek 直连模式。
- 通用 OpenAI-compatible 模式。
- One API、LiteLLM、OpenRouter 等第三方 OpenAI-compatible 中转站。
- 暴露 OpenAI-compatible `/chat/completions` 的公司内部 LLM 网关。

目标不是给每个供应商都写一个 provider，而是把通用 OpenAI-compatible 路径说明清楚并做最小加固，让评审能看懂多模型和网关如何接入。

### 必须修改的文档

1. 创建 `docs/delivery/model-gateway.md`。

   必须包含这些章节：

   - `目标`
   - `当前支持的模型模式`
   - `为什么默认保留 mock`
   - `DeepSeek 直连模式`
   - `OpenAI-compatible / 中转站 / 内部网关模式`
   - `环境变量矩阵`
   - `接入示例`
   - `工具调用策略`
   - `安全边界`
   - `当前限制与下一步`

2. 在 `docs/delivery/model-gateway.md` 中加入不含密钥的公司内部网关示例：

   ```bash
   LLM_PROVIDER=openai-compatible
   OPENAI_PROVIDER_LABEL=Company Gateway
   OPENAI_BASE_URL=https://llm-gateway.example.com/v1
   OPENAI_MODEL=company-chat-model
   OPENAI_API_KEY=replace-with-your-key
   ```

   同时用中文说明 One API、LiteLLM、OpenRouter 的接入方式。不要把任何真实地址写成强制默认值。

3. 更新 `README.md`。

   增加简短模型 Provider 章节，并链接到 `docs/delivery/model-gateway.md`。

   必须讲清楚：

   - `LLM_PROVIDER=mock` 是默认模式。
   - mock 模式是原始题目的无 Key 主验收路径。
   - `LLM_PROVIDER=deepseek` 是可选 DeepSeek 直连模式。
   - `LLM_PROVIDER=openai-compatible` 可通过 `OPENAI_BASE_URL` 指向 OpenAI-compatible provider、第三方中转站或公司内部网关。
   - `OPENAI_PROVIDER_LABEL` 控制前端展示的 provider 名称。

4. 更新 `.env.example`。

   增加安全的注释示例：

   - Mock 默认模式。
   - DeepSeek 直连模式。
   - OpenAI-compatible 网关模式。

   复制 `.env.example` 后不得意外启用真实 LLM 模式。`LLM_PROVIDER=mock` 必须仍是唯一启用的默认值。

5. 更新 `docs/delivery/solution.md` 和 `docs/development/technical-design.md`。

   说明 `OpenAICompatibleProvider` 是第三方中转站和公司内部网关的统一接入点。

6. 更新 `docs/delivery/requirements-traceability.md`。

   增加多 Provider / 中转站 / 内部网关说明的追踪行，并标记为原题必选范围之外的增强项。

## 任务 B：Provider 标签与网关身份的最小代码支持

### 目标

让 OpenAI-compatible provider 的显示名称可配置，使评审能看出当前接的是普通 provider、中转站、内部网关还是其他兼容服务。

### 必须修改的代码

1. 更新 `apps/api/src/llm/openai-compatible.provider.ts`。

   支持：

   - `OPENAI_PROVIDER_LABEL`，默认 `OpenAI Compatible`。
   - 已有 `OPENAI_BASE_URL`。
   - 已有 `OPENAI_MODEL`。
   - 已有 `OPENAI_API_KEY`。

   provider 的 `info.label` 应使用 `OPENAI_PROVIDER_LABEL`。

2. 判断 `LlmProviderInfo.name` 是否需要保持严格联合类型。

   首选最小路径：

   - 保持 `name` 为 `openai-compatible`，确保 API 契约稳定。
   - 通过 `label` 区分 `Company Gateway API`、`One API Gateway`、`LiteLLM Gateway` 等显示名称。

   只有确实必要时才放宽 `name`。如果放宽，必须安全更新后端、前端类型和测试。

3. 必要时更新 `apps/web/src/main.tsx`，确保模式徽标能正确展示可配置的 provider label 和 model。

4. provider label / 网关配置相关逻辑必须有中文注释。

## 任务 C：真实 LLM 超时与结构化错误处理

### 目标

真实 provider 失败时，行为应可理解、可控且安全；不能泄漏密钥；mock 流程必须保持稳定。

### 必须实现的行为

1. 为真实 LLM 调用增加可配置超时：

   - 环境变量：`LLM_REQUEST_TIMEOUT_MS`。
   - 默认值：`15000`。
   - 使用 `AbortController` 或同等标准运行时 API。
   - 同时应用于 `DeepSeekProvider` 和 `OpenAICompatibleProvider`。

2. 如果能减少重复，可以增加一个小型共享 helper。

   可接受文件名：

   - `apps/api/src/llm/llm-http.ts`
   - `apps/api/src/llm/provider-errors.ts`

   保持简单，不要引入大型框架。

3. 统一 provider 错误。

   上游 provider 失败时，调用方只能看到安全错误，例如：

   - `LLM provider request timed out`
   - `LLM provider request failed: 401`
   - `LLM provider returned no content`

   错误信息不得包含 API Key、Authorization header 或原始请求体。

4. 更新 `ChatService`，让 provider 失败变成稳定 API 错误。

   最小可接受行为：

   - 捕获 `plan` 和 `composeReply` 周围的 provider 错误。
   - 抛出 NestJS `ServiceUnavailableException`，错误文案必须安全。
   - 失败请求不得写入 session history。

   可选但有价值：

   - 增加 `LLM_FALLBACK_TO_MOCK=true`，允许真实 provider 失败时降级到 mock。
   - 如果实现，必须清楚写入文档并补测试。

5. 添加中文注释解释：

   - 为什么需要超时；
   - 为什么要脱敏原始 provider 错误；
   - 为什么失败轮次不能写入 session history；
   - 如果实现 fallback，为什么它是可选且默认关闭。

## 任务 D：测试

增加聚焦测试，保持轻量、确定性强。

必须满足：

1. 现有测试继续通过：

   - `apps/api/src/chat/chat.service.spec.ts`
   - `apps/api/src/tools/tool-router.spec.ts`
   - `apps/api/src/tools/tool-registry.spec.ts`

2. 可行时增加 provider / 配置测试：

   - `OpenAICompatibleProvider` 使用 `OPENAI_PROVIDER_LABEL`。
   - 真实 provider 超时 / 错误 helper 产生安全错误。
   - `ChatService` 在 provider planning 失败时不追加 user/assistant 消息。

3. 测试不得依赖真实 DeepSeek、OpenAI、网关或内部网络凭据。

使用 mock `fetch` 或 fake provider 做失败测试。

## 任务 E：验证

完成前运行：

```bash
pnpm build
pnpm test
git diff --check
rg -n "sk-[A-Za-z0-9]|gh[pousr]_[A-Za-z0-9]|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|PRIVATE)|api[_-]?key\\s*=\\s*[^#\\s][^\\s]*|token\\s*=\\s*[^#\\s][^\\s]*|secret\\s*=\\s*[^#\\s][^\\s]*|password\\s*=\\s*[^#\\s][^\\s]*|Bearer [A-Za-z0-9._-]+" . --glob '!node_modules/**' --glob '!apps/*/dist/**' --glob '!pnpm-lock.yaml'
```

同时运行或记录一次 `LLM_PROVIDER=mock` 下针对 `POST /api/chat` 的 mock smoke：

```text
你好，你能做什么？
公司年假政策是什么？
那远程办公时也适用吗？
帮我创建一个待办：明天提交报销
现在几点？
```

smoke 结果必须显示 `mode: "mock"`、同 session 历史增长、工具调用存在、工具结果进入最终回复。

如果使用 `pnpm dev` 做人工验证，完成前必须停止本地服务。

## 验收标准

全部满足才算完成：

- 默认 mock 模式在没有 `.env` 时仍可工作。
- `.env.example` 仍默认 mock。
- 原始题目的 8 个核心流程在 mock 模式下通过。
- mock 模式仍是默认本地评审路径；真实模型只标记为可选增强。
- README 清楚解释 DeepSeek、OpenAI-compatible、中转站和内部网关模式。
- `docs/delivery/model-gateway.md` 存在，并从 README 链接。
- OpenAI-compatible provider 可通过 `OPENAI_PROVIDER_LABEL` 显示自定义 provider 标签。
- 真实 provider 调用有超时处理。
- API 返回的 provider 错误已脱敏，不泄漏密钥。
- 失败的 provider 调用不会污染 session history。
- 新增或修改的非平凡代码有中文注释。
- `pnpm build` 通过。
- `pnpm test` 通过。
- `git diff --check` 通过。
- 密钥扫描无命中。

## Claude 最终回复要求

最终回复用中文简洁报告：

- 改了哪些文件。
- mock 模式是否满足原题核心流程。
- 模型网关做了什么。
- 超时 / 错误处理做了什么。
- 新增或更新了哪些测试。
- 验证命令结果。
- 有哪些刻意延后项以及原因。
