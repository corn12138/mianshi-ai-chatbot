# AI 工具使用记录

## 使用环节

- Codex：阅读题目、拆解 MVP、阶段审核、补充安全与并发设计、修复实现问题、运行验证并整理交付文档。
- Claude：按过程文档中的提示词闭环实现和补充部分功能；每轮完成后由人工/Codex 继续审查、修正和补测。

## 过程记录规则

- 技术方案统一记录在 `docs/development/technical-design.md`。
- 每次准备发给 Claude 的提示词都追加到 `docs/development/claude-prompts.md`。
- 每次 Claude 完成后的人工评审都追加到 `docs/development/claude-review-log.md`。
- 题目要求与交付文档的覆盖关系维护在 `docs/delivery/requirements-traceability.md`。

## 采纳的 AI 输出

- 采用前后端分离的 React + NestJS 单仓库方案，因为它能清楚展示全栈边界。
- 采用 mock provider 默认启用，因为题目明确要求无 API Key 也能体验核心流程。
- 采用 HR/IT + 待办 + 时间工具，因为它们既贴近内部员工场景，又容易稳定演示。
- 采用 pnpm workspace 管理 monorepo，减少 npm workspaces 与后续工具链不一致的问题。
- 采用 DeepSeek 作为可选真实 LLM provider，同时保留 mock 默认模式，兼顾演示上限和无 Key 可运行要求。
- 采用安全与并发基础硬化方案：请求校验、可选 Bearer token、进程内限流、LLM 并发闸门、session TTL/容量控制，作为不破坏 MVP 的工程意识展示。

## 修改的 AI 输出

- 没有直接做复杂 agent 框架，而是收敛为 provider + router + registry 三层，降低实现和评审启动成本。
- 没有把工具调用放到前端按钮，改为后端自动判断，满足题目要求。
- DeepSeek 接入没有强行改成复杂 Agent 编排，而是保留本地工具路由，让真实模型负责普通回答和工具结果总结。
- 对安全与并发建议做了范围收敛：不直接引入 Redis、SSO、数据库和压测平台，而是先实现本地内存版保护和生产替换口子。

## 拒绝的 AI 输出

- 拒绝第一版加入登录、数据库、RAG、流式输出和多工具复杂编排，因为这些会削弱 MVP 的清晰度。
- 拒绝提交真实 API Key，真实模型模式仅通过 `.env.example` 说明。
- 拒绝把 DeepSeek 的 FIM、KV cache、Anthropic API 兼容等能力放入第一版，因为它们不服务于当前内部员工 Chatbot 的核心验收流程。
- 拒绝把笔试 MVP 伪装成完整生产系统；文档中明确区分“已实现的基础保护”和“后续生产化改造”。
