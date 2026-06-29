# 严格阶段审计：AI Chatbot MVP

审计日期：2026-06-29

源文档：

- `斑头雁全栈开发工程师--开放型笔试题.md`
- `README.md`
- `docs/delivery/solution.md`
- `docs/delivery/ai-usage.md`
- `docs/delivery/demo-script.md`
- `docs/development/technical-design.md`
- `docs/development/claude-review-log.md`

仓库内未发现独立 `AGENTS.md` 或 `AI_CONTEXT.md`。本次审计按用户给出的 AGENTS 指令和原始笔试 MD 作为最高优先级来源。

## 总体结论

按原始笔试 MD 的最低 MVP 标准，当前代码主链路已经基本符合：网页对话、多轮上下文、自动工具调用、工具结果进入最终回复、mock 模式、本地构建和测试均具备。

按更高面试标准，初次审计时不建议直接宣称“完整高质量符合”。当时仍有 3 类明显短板：

1. 最终交付物不完整：缺少可提交的视频/录屏链接，已有第一次 demo 也被文档自评为覆盖不完整。
2. 多模型/中转站/内部网关适配还不够硬：已有 `OpenAICompatibleProvider` 和 `baseUrl`，但 provider 选择、类型、文档、验证仍偏 DeepSeek + 单一 OpenAI-compatible 示例。
3. 真实模型链路的工程韧性不足：缺少真实模型失败后的可选 mock 兜底、超时控制、统一错误响应、网关兼容测试和前端浏览器烟测证据。

因此本阶段建议判定为：

- 原题核心功能：通过
- 原题最终交付：部分通过
- 拔高标准/高分面试表达：部分通过

复审更新：

- 多模型 / 中转站 / 内部网关说明已补充到 `docs/delivery/model-gateway.md`、`README.md`、`docs/delivery/solution.md` 和 `docs/development/technical-design.md`。
- OpenAI-compatible provider 已支持 `OPENAI_PROVIDER_LABEL`，可展示公司内部网关或中转站名称。
- 真实模型调用已增加统一 HTTP helper、超时、错误脱敏、HTTP 503 包装、可选 mock 兜底和相关测试。
- 因此模型网关和真实模型链路的高标准缺口已基本闭环；最终完整交付仍取决于 GitHub 仓库链接和录屏 / 视频链接是否实际提交。

## 严重发现

| 严重级别 | 发现 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| P1 | 缺少可提交的视频/录屏链接，且已有 demo 覆盖不足 | 原题要求提交录屏或视频链接；`docs/delivery/demo-script.md` 记录 `/Users/huangyuming/Desktop/第一次demo.mov` 只覆盖部分功能，并建议补录 | 即使代码符合，最终交付仍可能被判为漏交 | 补录 3-6 分钟讲解型视频，上传到可访问位置，并在 README 增加最终交付链接 |
| P1 | 多模型/中转站能力没有形成可验证的“通用网关方案” | 初次审计时 `OpenAICompatibleProvider` 说明不足；复审时已补 `docs/delivery/model-gateway.md` 和 `OPENAI_PROVIDER_LABEL` | 初次影响是面试追问时证据不足；当前已基本闭环 | 保持 `docs/delivery/model-gateway.md` 与 README 同步，后续如接入真实内部网关再补具体 smoke 记录 |
| P2 | 真实模型失败没有可选 mock 兜底或用户友好错误 | 初次审计时 `ChatService` 未包装 provider 错误；复审时已补 `llm-http.ts`、HTTP 503、错误脱敏、可选 fallback 和测试 | 初次影响是上游异常可能 500；当前已基本闭环 | 后续可继续补浏览器端错误态截图或录屏证据 |
| P2 | 工具调用协议对 DeepSeek 较完整，但 OpenAI-compatible 模式没有工具 schema/function calling | `DeepSeekProvider` 传 `tools/tool_choice`；`OpenAICompatibleProvider` 注释说明工具触发交给本地规则 | 原题允许“AI 或工具路由逻辑判断”，所以不阻塞最低要求；但高标准下会被问为什么通用模型不能参与工具规划 | 给 OpenAI-compatible 增加可选 tools schema 支持，或在文档中明确这是 MVP 取舍并列出下一步 |
| P2 | 缺少浏览器端实际烟测证据 | 代码能展示工具详情，但当前自动验证主要是 API/service 测试 | 题目强调网页中发起对话，纯 API 验证对评审说服力弱一些 | 用 Playwright 或手工录屏覆盖 `http://localhost:5173` 的普通对话、追问、工具结果卡片和错误态 |
| P3 | AI 工具使用记录足够说明方向，但还可以更具体 | `docs/delivery/ai-usage.md` 记录了采用/修改/拒绝，但没有按时间线列出关键 prompt 摘要与人类判断依据 | AI 工具使用能力占 30%，表达越具体越有利 | 在交付说明中补“关键 AI 协作节点”：需求拆解、架构选择、修复 DI、补测试、拒绝过度范围 |

审计过程中另发现 `.env.example` 曾包含未注释的 DeepSeek 伪 key 和 `LLM_PROVIDER=deepseek` 示例。虽然不是实际密钥，但会触发 secret 扫描并破坏默认 mock 体验；本次已删除该未注释示例，只保留注释说明。

## 原题硬要求矩阵

| 原题要求 | 当前状态 | 证据 | 严格结论 |
| --- | --- | --- | --- |
| 必须使用 AI 工具完成项目 | 已记录 | `docs/delivery/ai-usage.md`、`docs/development/claude-prompts.md`、`docs/development/claude-review-log.md` | 通过 |
| 必须提交 GitHub 仓库，包含可运行代码 | 仓库 remote 存在，代码可构建 | `origin https://github.com/corn12138/mianshi-ai-chatbot.git`；`pnpm build` 通过 | 通过，但 README 最好加最终提交链接 |
| 需要提交录屏或视频 | 本地有视频，缺少提交链接，且覆盖不足 | `/Users/huangyuming/Desktop/第一次demo.mov`；`docs/delivery/demo-script.md` | 部分通过；最终交付仍需视频链接 |
| 不提交真实 API Key/Token/敏感信息 | 当前扫描未发现 | `.gitignore` 忽略 `.env`；secret grep 无命中 | 通过 |
| 用户可在网页发起一轮对话 | 已实现 | `apps/web/src/main.tsx` 调用 `POST /api/chat` | 通过 |
| 系统可以返回 AI 回复 | 已实现 | `ChatService` + `MockLlmProvider` | 通过 |
| 支持多轮上下文 | 已实现 | `InMemorySessionStore`、`sessionId`、测试覆盖 | 通过 |
| 至少 1 个工具调用场景 | 已实现 3 个 | HR policy、todo、time | 通过 |
| 工具调用由 AI 或路由逻辑判断触发 | 已实现 | `ToolRouter` 后端判断，前端按钮只填充示例 | 通过 |
| 工具调用结果进入最终回复 | 已实现 | mock composeReply、ChatService 测试断言 | 通过 |
| 没有真实 LLM Key 也能体验 mock | 已实现 | 默认 `MockLlmProvider`，`.env.example` | 通过 |
| 项目可根据 README 本地启动 | 基本可启动 | `pnpm install`、`pnpm dev`；端口冲突可用 PORT/VITE_API_BASE_URL 处理 | 通过，建议 README 增加端口冲突说明 |

## 多模型与中转站拔高评估

当前已经具备的能力：

- `LlmProvider` 接口把 `plan` 和 `composeReply` 抽象出来，`ChatService` 不直接依赖厂商。
- `OpenAICompatibleProvider` 已允许配置 `OPENAI_BASE_URL` 和 `OPENAI_MODEL`，理论上可接 OpenAI-compatible 中转站。
- `DeepSeekProvider` 已支持真实模型请求、工具 schema、工具结果总结和脱敏 provider 信息。
- `ToolRouter` 兜底保证模型不触发工具时，核心演示仍稳定。

当前不足：

- Provider factory 是硬编码分支，不是配置驱动注册表。
- Provider 类型被限制为 `'mock' | 'deepseek' | 'openai-compatible'`，添加内部网关需要改后端和前端类型。
- `.env.example` 没有明确写出中转站示例，如 One API/LiteLLM/OpenRouter/公司内部 `/v1/chat/completions`。
- OpenAI-compatible provider 没有发送 tools schema，所以不能证明通用网关也支持 AI tool planning。
- 没有验证脚本证明同一套接口可切换多个 base URL/model。

建议目标：不要为了题目过度实现复杂 agent，但要把“多模型/中转站/内部网关”讲清楚并给出可运行证据。最小增强可以是：

1. 将 `openai-compatible` 文档改成 `gateway` 视角：任何兼容 `/chat/completions` 的服务都可接入。
2. `.env.example` 增加 `OPENAI_PROVIDER_LABEL`、`OPENAI_BASE_URL`、`OPENAI_MODEL` 的中转站示例注释。
3. 增加 `docs/delivery/model-gateway.md`，说明如何接 OpenAI、DeepSeek、One API、LiteLLM、OpenRouter、内部网关。
4. 增加一个不含密钥的 smoke 脚本模板，验证 mock/gateway 两种模式的返回结构。
5. 视时间决定是否给 OpenAI-compatible provider 加工具 schema 支持；如果不加，文档要明确这是稳定 MVP 取舍。

## 下一阶段任务

优先级 1：补齐最终交付

- 补录视频，覆盖需求理解、AI 协作、普通对话、多轮追问、工具调用、mock 模式、真实/网关模式、限制与后续优化。
- 上传视频并在 README 增加“最终交付链接”。
- 确认 GitHub 仓库已 push 当前代码和文档。

优先级 2：模型网关表达与最小实现增强

- 新增 `docs/delivery/model-gateway.md`，把 DeepSeek、OpenAI-compatible、中转站、内部网关接入方式讲清楚。
- 扩展 README 的环境变量说明，明确 `OPENAI_BASE_URL` 可指向任意 OpenAI-compatible gateway。
- 可选：把 `LlmProviderInfo.name` 从固定三值改为更宽松的 provider id，避免前后端为每个网关改类型。
- 可选：增加 `OPENAI_PROVIDER_LABEL`，前端显示 `Company Gateway API / model-name`。

优先级 3：真实模型链路稳健性

- 给 provider 请求加 `AbortController` 超时。
- 捕获上游错误并返回结构化错误；可配置 fallback 到 mock。
- 补 provider 层单元测试：无 key fallback、上游 401/500、timeout、工具结果总结。
- 增加浏览器烟测脚本或录屏证据。

## 验证命令

本次审计建议继续使用：

```bash
git status --short --branch
git diff --stat
pnpm build
pnpm test
rg -n "sk-[A-Za-z0-9]|gh[pousr]_[A-Za-z0-9]|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|PRIVATE)|api[_-]?key\\s*=\\s*[^#\\s][^\\s]*|token\\s*=\\s*[^#\\s][^\\s]*|secret\\s*=\\s*[^#\\s][^\\s]*|password\\s*=\\s*[^#\\s][^\\s]*|Bearer [A-Za-z0-9._-]+" . --glob '!node_modules/**' --glob '!apps/*/dist/**' --glob '!pnpm-lock.yaml'
```

## Claude 中文交接提示词

如果仓库中存在 `AGENTS.md`，请先读取。然后读取 `斑头雁全栈开发工程师--开放型笔试题.md`、`README.md` 和 `docs/product-stage-audit-2026-06-29-strict.md`。

你的任务是在不超出原始题目范围的前提下，加固 AI Chatbot MVP，使其更能经受严格笔试评审。必须保留默认无 Key 的 mock 模式和所有现有核心流程。

按以下优先级实现下一阶段改进：

1. 在 README 中增加清晰的交付物区域，列出 GitHub 仓库链接和视频链接占位说明。
2. 新增或更新文档，说明模型层如何支持 DeepSeek、OpenAI-compatible provider、第三方中转站和公司内部网关。必须明确取舍：MVP 为了稳定演示使用本地工具路由，已实现的真实模型规划只是可选增强。
3. 改进 OpenAI-compatible / 网关配置说明。优先做最小代码改动：支持可配置 provider label，并说明 `OPENAI_BASE_URL` 可以指向任意兼容 `/chat/completions` 的服务。如果放宽 provider id，必须安全更新后端和前端类型。
4. 为真实 LLM provider 调用增加稳健错误处理：超时、结构化错误、可选 fallback 说明。不要泄漏 API Key。
5. 为 provider、配置和错误行为增加聚焦测试。现有 mock 模式测试必须继续通过。

必须执行的验证：

```bash
pnpm build
pnpm test
git diff --check
```

除非任务明确要求，不要添加登录、数据库持久化、RAG、流式输出、部署自动化或复杂多 agent 编排。不要提交 `.env` 或密钥。
