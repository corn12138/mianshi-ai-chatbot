# Claude 提示词记录

本文记录每次准备发给 Claude 的实现提示词。规则：先登记，再执行；Claude 返回后，再到 `docs/development/claude-review-log.md` 记录评审结果。

## 提示词 001 - Mock 模式完整 AI Chatbot MVP

- 日期：2026-06-29
- 目标：第一波让 Claude 完成无真实 LLM API Key 也能完整体验的 mock 模式核心功能闭环。
- 状态：作为第一阶段实现提示词基线；后续 Claude 执行、修改或复核时以此为验收来源。
- 关联文档：`斑头雁全栈开发工程师--开放型笔试题.md`、`docs/development/technical-design.md`、`docs/delivery/requirements-traceability.md`

```text
你正在实现一个全栈开发面试笔试项目的第一阶段功能。

修改前请阅读：
- 斑头雁全栈开发工程师--开放型笔试题.md
- docs/development/technical-design.md
- docs/delivery/requirements-traceability.md

目标：
构建一个面向内部员工的完整 mock 模式 AI Chatbot MVP。

项目必须在没有 .env 文件、没有真实 LLM API Key 的情况下运行。只有当评审可以本地启动应用、在网页中聊天、连续追问、自动触发本地工具，并在最终 assistant 回复中看到工具结果时，第一阶段才算成功。

原始需求中的主要成功标准：
1. 用户可以从网页发起聊天。
2. 系统返回类似 AI assistant 的回复。
3. 连续追问时保留多轮上下文。
4. 至少一个工具调用场景可用；为了演示更充分，实现三个工具。
5. 工具调用由后端 AI/mock 路由逻辑触发，不能靠点击前端工具按钮。
6. 工具结果进入最终 assistant 回复。
7. mock 模式不需要任何真实 LLM API Key。
8. 项目可按 README 说明本地启动。

技术栈：
- 使用 pnpm workspace 的 monorepo。
- 前端：React + Vite + TypeScript。
- 后端：NestJS + TypeScript，可使用 Fastify 适配器。
- 第一阶段默认且必须可用的模式：Mock LLM provider。
- 不要提交任何真实 API Key 或敏感信息。

目录结构要求：
- `apps/web`：React 应用。
- `apps/api`：NestJS API。
- `docs/delivery`：面向原始需求和交付评审的文档。
- `docs/development`：技术设计、Claude 提示词和评审日志。
- 根目录保留 `README.md`、`.env.example`、`package.json`、`pnpm-workspace.yaml`、`tsconfig.base.json`。

第一阶段不要实现：
- 登录或用户账号。
- 数据库持久化。
- RAG 或知识库。
- 流式响应。
- 必须依赖真实 LLM API 的路径。
- 部署配置。
- 复杂权限系统或生产级审计日志。

后端要求：
1. 实现 `POST /api/chat`。
2. 请求体：
   {
     "sessionId": "可选 session id",
     "message": "用户消息"
   }
3. 响应体：
   {
     "sessionId": "session id",
     "reply": "最终 assistant 回复",
     "messages": [...],
     "toolCalls": [...],
     "mode": "mock"
   }
4. 校验空消息或只有空白的消息，并返回 400 风格错误。
5. 使用基于 `sessionId` 的内存 session store 维护多轮上下文。
6. 存储 user 和 assistant 消息，字段包含 `role`、`content`、`createdAt`，以及可选 `toolCalls`。
7. 实现清晰的 `LlmProvider` 接口，即使第一阶段只需要 mock 模式。
8. 实现默认的 `MockLlmProvider`：
   - 问候消息说明 assistant 能做什么。
   - 普通消息返回简洁 assistant 回复。
   - 有工具结果时，最终自然语言回复必须明确包含工具结果。
9. 实现 `ToolRouter`。它必须根据用户文本和可用历史判断工具意图。前端按钮不能直接决定工具。
10. 实现 `ToolRegistry`，执行本地工具并返回结构化记录：
    {
      "name": "工具名",
      "arguments": {},
      "result": "工具结果或错误",
      "ok": true
    }
11. 实现这些工具：
    - `lookup_hr_policy(topic)`
      - topic 值：`annual_leave`、`expense`、`remote_work`、`it_support`。
      - 返回 mock 内部政策文本。
      - 触发示例：
        - “公司年假政策是什么？” -> `annual_leave`
        - “报销需要什么材料？” -> `expense`
        - “远程办公政策是什么？” -> `remote_work`
        - “VPN 或邮箱出问题怎么办？” -> `it_support`
    - `create_todo(title, dueDate?)`
      - 校验 title 必须是非空字符串。
      - 返回 mock 待办 id 和确认信息。
      - 触发示例：
        - “帮我创建一个待办：明天提交报销”
        - “提醒我下午找 IT 开通 VPN”
    - `get_current_time(timezone?)`
      - 默认时区：`Asia/Shanghai`。
      - 触发示例：
        - “现在几点？”
        - “current time”
12. 多轮行为：
    - 用户在政策问题后继续追问“那远程办公时也适用吗？”时，后端必须用同一 `sessionId` 做上下文相关回答。
    - 可以用内存历史和简单 mock 路由规则实现追问，不要过度设计。
13. 失败处理：
    - 无效工具参数不能导致 API 崩溃。
    - 在 `toolCalls` 中返回 `ok=false` 和失败原因，并把失败原因写入最终回复。
    - 前端能读到可理解的 API 错误。
14. 增加单元测试：
    - HR 政策路由。
    - 待办路由和标题提取。
    - 时间路由。
    - chat service 保留 session 上下文。
    - 工具结果进入最终 assistant 回复。

前端要求：
1. 单页聊天页面。
2. 从 `localStorage` 生成或复用 `sessionId`。
3. 向 `POST /api/chat` 发送消息。
4. 渲染 user 和 assistant 消息。
5. 返回 `toolCalls` 时，在 assistant 回复下展示工具调用详情。
6. 展示当前模式：Mock Mode。
7. 提供演示用示例问题按钮，但工具调用不能依赖这些按钮。
8. 包含这些演示问题：
   - “你好，你能做什么？”
   - “公司年假政策是什么？”
   - “那远程办公时也适用吗？”
   - “帮我创建一个待办：明天提交报销”
   - “现在几点？”
9. UI 保持简单、清晰、响应式、可靠，不要过度投入视觉效果。
10. 展示 loading 和 error 状态，让评审知道 API 是否正常运行。

文档要求：
1. `README.md` 必须包含：
   - 项目概览。
   - 需求理解。
   - MVP 范围。
   - 明确不做事项。
   - 架构和数据流。
   - 本地启动说明。
   - 环境变量。
   - mock 模式说明。
   - 工具调用说明。
   - 限制和后续优化方向。
2. `docs/delivery/solution.md` 必须说明：
   - 前端、后端、模型、工具、存储之间的关系。
   - 多轮上下文处理。
   - 工具路由和执行流程。
3. `docs/delivery/ai-usage.md` 必须说明：
   - 使用了哪些 AI 工具。
   - 采纳了哪些输出。
   - 修改了哪些输出。
   - 拒绝了哪些输出以及原因。
4. `docs/delivery/demo-script.md` 必须提供录屏脚本，覆盖：
   - 题目理解。
   - MVP 定义。
   - AI 协作过程。
   - 项目运行。
   - 普通聊天。
   - 多轮追问。
   - 工具调用。
   - mock 模式。
   - 当前限制。
5. `docs/delivery/requirements-traceability.md` 必须把原始需求映射到实现和文档位置。
6. `docs/development/technical-design.md` 必须描述架构和请求流程。
7. `docs/development/claude-prompts.md` 必须保留本提示词记录。

验收标准：
- 从根目录执行 `pnpm install` 可用。
- `pnpm dev` 同时启动前端和后端。
- 没有 `.env` 文件、没有 API Key 时应用可用。
- 用户发送普通消息并收到回复。
- 连续追问保留上下文。
- HR/IT 政策问题自动调用 `lookup_hr_policy`。
- 创建待办请求自动调用 `create_todo`。
- 时间问题自动调用 `get_current_time`。
- 工具结果进入最终回复。
- 前端展示后端返回的工具调用详情。
- `pnpm build` 通过。
- `pnpm test` 通过。
- 没有提交真实 API Key 或个人敏感信息。

必需的手工 smoke 脚本：
1. 用 `pnpm dev` 启动。
2. 打开 `http://localhost:5173`。
3. 发送“你好，你能做什么？”，确认普通 assistant 回复。
4. 发送“公司年假政策是什么？”，确认 `toolCalls` 中出现 `lookup_hr_policy`，最终回复包含政策内容。
5. 在同一 session 中发送“那远程办公时也适用吗？”，确认上下文被保留。
6. 发送“帮我创建一个待办：明天提交报销”，确认出现 `create_todo` 和 mock 待办 id。
7. 发送“现在几点？”，确认出现 `get_current_time` 和 `Asia/Shanghai` 时间。
8. 停止服务，确认不需要真实 `.env` 或 API Key。

重要实现约束：
- 保持 MVP 小而易审查。
- 不要添加登录、数据库持久化、RAG、流式响应、部署配置或复杂权限。
- 优先保证清晰架构和可运行核心流程，而不是堆功能。
- 使用 TypeScript 类型描述 API DTO、消息、工具调用和 provider 接口。
- 如果生成建议扩大范围，应拒绝并保持 MVP 聚焦。
- 更新文件时，保持 `docs/delivery` 和 `docs/development` 的目录分工一致。
```

## 后续记录模板

````md
## 提示词 00X - 标题

- 日期：
- 目标：
- 状态：
- 关联文档：

```text
完整提示词
```
````

## 提示词 002 - 迁移 monorepo 到 pnpm

- 日期：2026-06-29
- 目标：将现有 npm workspaces 项目迁移为 pnpm workspace，并同步 README、技术文档、录屏脚本和验证命令。
- 状态：由 Codex 直接执行；如后续交给 Claude 复核或继续实现，使用此提示词作为任务来源。
- 关联文档：`docs/development/technical-design.md`、`docs/delivery/requirements-traceability.md`

```text
你正在更新现有 AI Chatbot MVP 仓库。

目标：
把 monorepo 从 npm workspaces 迁移到 pnpm workspace。

必须修改：
1. 新增 `pnpm-workspace.yaml`，workspace 包为 `apps/*`。
2. 移除根 `package.json` 的 `workspaces` 字段。
3. 在根 `package.json` 增加 `packageManager: pnpm@11.7.0`。
4. 重写根脚本，使用 pnpm workspace filter：
   - `pnpm dev` 并行启动 `apps/api` 和 `apps/web`。
   - `pnpm build` 构建两个 workspace。
   - `pnpm test` 运行 API 测试。
   - `pnpm check` 运行 build 和 test。
5. 删除 `package-lock.json`。
6. 用 `pnpm install` 生成 `pnpm-lock.yaml`。
7. 更新 README 和 docs，使本地安装、启动和验证都使用 `pnpm install`、`pnpm dev`、`pnpm build`、`pnpm test`。
8. 不要改变产品行为、API 结构、工具行为或 UI 行为。

验收标准：
- 从仓库根目录执行 `pnpm install` 成功。
- `pnpm build` 通过。
- `pnpm test` 通过。
- 不再存在 `package-lock.json`。
- `pnpm-lock.yaml` 被纳入提交。
- 文档不再指导评审用 npm 做常规启动。
```
