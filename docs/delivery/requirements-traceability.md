# 需求与交付文档追踪表

本文用于确保笔试题中要求写清楚的内容都能在仓库中找到对应说明，避免交付时漏项。

## 题目核心流程追踪

| 要求 | 当前状态 | 对应位置 |
| --- | --- | --- |
| 用户可以在网页中发起一轮对话 | 已实现 | `apps/web/src/main.tsx`、`README.md` |
| 系统可以返回 AI 回复 | 已实现 | `apps/api/src/chat/chat.service.ts`、`apps/api/src/llm/mock-llm.provider.ts` |
| 支持多轮上下文 | 已实现 | `apps/api/src/session/in-memory-session.store.ts`、`docs/delivery/solution.md` |
| 至少支持 1 个工具调用场景 | 已实现，当前 4 个工具 | `apps/api/src/tools/` |
| 工具调用由 AI 或路由逻辑判断触发 | 已实现 | `apps/api/src/tools/tool-router.ts`、`docs/development/technical-design.md` |
| 工具调用结果进入最终回复 | 已实现 | `apps/api/src/llm/mock-llm.provider.ts`、`docs/development/technical-design.md` |
| 无真实 API Key 也能体验 mock 模式 | 已实现 | `.env.example`、`README.md` |
| README 可指导本地启动 | 已实现 | `README.md` |
| 可选真实 LLM API 接入 | 已实现，非原始必选项 | `apps/api/src/llm/deepseek.provider.ts`、`docs/development/technical-design.md` |
| 多 Provider / 中转站 / 内部网关说明 | 增强项，超出原题必选范围 | `docs/delivery/model-gateway.md`、`apps/api/src/llm/openai-compatible.provider.ts`、`README.md` |
| 真实模型超时与错误脱敏 | 增强项，超出原题必选范围 | `apps/api/src/llm/llm-http.ts`、`apps/api/src/chat/chat.service.ts` |
| 安全与并发基础保护 | 增强项，超出原题必选范围 | `apps/api/src/security/`、`apps/api/src/llm/llm-concurrency-limiter.ts`、`docs/development/security-concurrency-audit-2026-06-29.md` |
| mock 覆盖更多内部员工场景 | 增强项，超出原题必选范围 | `apps/api/src/tools/hr-policy.tool.ts`、`apps/api/src/tools/calculator.tool.ts`、`apps/api/src/llm/mock-llm.provider.ts` |

## README 或方案说明要求追踪

| 题目要求 | 对应文档 |
| --- | --- |
| 你对需求的理解 | `README.md`、`docs/delivery/solution.md` |
| 如何拆解 MVP 范围 | `README.md`、`docs/delivery/solution.md` |
| 第一版做了什么，明确不做什么 | `README.md`、`docs/delivery/solution.md` |
| 为什么这样取舍 | `docs/delivery/solution.md` |
| 核心流程如何运行 | `README.md`、`docs/development/technical-design.md` |
| 前端、后端、模型、工具、存储之间的关系 | `docs/delivery/solution.md`、`docs/development/technical-design.md` |
| 多轮上下文如何处理 | `docs/delivery/solution.md`、`docs/development/technical-design.md` |
| 工具调用如何判断、执行和返回结果 | `README.md`、`docs/development/technical-design.md` |
| mock 模式如何启用 | `README.md`、`.env.example` |
| 当前实现的限制和后续优化方向 | `README.md`、`docs/delivery/solution.md` |
| 安全、并发和生产化边界 | `README.md`、`docs/delivery/solution.md`、`docs/development/security-concurrency-audit-2026-06-29.md` |
| 使用了哪些 AI 工具，以及分别用于哪些环节 | `docs/delivery/ai-usage.md` |
| AI 工具输出中采纳、修改、拒绝了什么以及原因 | `docs/delivery/ai-usage.md` |

## 过程证据文档

| 过程要求 | 记录位置 | 记录规则 |
| --- | --- | --- |
| 技术方案设计 | `docs/development/technical-design.md` | 方案变化时追加变更说明或更新对应章节 |
| 给 Claude 的实现提示词 | `docs/development/claude-prompts.md` | 每次发给 Claude 前先追加一条记录 |
| 对 Claude 完成结果的评审 | `docs/development/claude-review-log.md` | 每次 Claude 改完后记录检查范围、发现、验证命令和结论 |
| 最终高标准符合性审核 | `docs/development/final-compliance-audit-2026-06-29.md` | 提交前按原始题目从头到尾复核 |
| AI 使用过程复盘 | `docs/delivery/ai-usage.md` | 阶段结束时补充采纳/修改/拒绝内容 |
| 录屏脚本 | `docs/delivery/demo-script.md` | 录屏前按最新实现更新演示步骤 |

## 文档目录归类

| 目录 | 用途 | 包含文档 |
| --- | --- | --- |
| `docs/delivery/` | 面向评审提交和原始题目要求的说明文档 | 方案说明、AI 使用记录、录屏脚本、需求追踪表 |
| `docs/development/` | 面向开发过程、技术决策和 Claude 协作的过程文档 | 技术设计、Claude 提示词、Claude 评审记录、安全与并发审核 |
