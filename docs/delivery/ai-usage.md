# AI 工具使用记录

## 使用环节

- Codex：阅读题目、拆解 MVP、设计技术方案和目录结构。
- Claude：计划用于落代码实现、补充测试、修复编译问题和完善 README。

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

## 修改的 AI 输出

- 没有直接做复杂 agent 框架，而是收敛为 provider + router + registry 三层，降低实现和评审启动成本。
- 没有把工具调用放到前端按钮，改为后端自动判断，满足题目要求。

## 拒绝的 AI 输出

- 拒绝第一版加入登录、数据库、RAG、流式输出和多工具复杂编排，因为这些会削弱 MVP 的清晰度。
- 拒绝提交真实 API Key，真实模型模式仅通过 `.env.example` 说明。
