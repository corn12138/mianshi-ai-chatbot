# Claude 任务：修复 Mock MVP 完成缺口

## 目标

修复 `docs/development/claude-review-log.md` 中 评审 004 发现的剩余问题，使 提示词 001 可以判定完成。

关键阻塞点是：`pnpm dev` 能启动 Web 应用，但 NestJS API 在依赖注入阶段失败。mock 业务链路在构建后的 API 中可用，但原始笔试题和 README 都要求评审能够通过 `pnpm dev` 本地启动项目。

## 上下文

修改前先阅读：

- `斑头雁全栈开发工程师--开放型笔试题.md`
- `docs/development/claude-prompts.md` / 提示词 001
- `docs/development/claude-review-log.md` / 评审 004
- `docs/development/technical-design.md`
- `docs/delivery/requirements-traceability.md`

当前相关文件：

- `apps/api/src/chat/chat.service.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/tools/tool-registry.spec.ts`
- `apps/api/src/chat/chat.service.spec.ts`
- `package.json`

## 必须修复的问题

1. 修复 API 开发模式启动。
   - 当前 `pnpm dev` 失败，是因为 `tsx watch src/main.ts` 没有为 Nest 提供足够的运行时元数据，导致 `ChatService` 构造函数的第一个依赖无法解析。
   - 优先使用最小代码改动：在 `ChatService` 中为 `InMemorySessionStore`、`ToolRouter`、`ToolRegistry` 添加显式 Nest `@Inject(...)`。
   - 保留已有的 `@Inject(LLM_PROVIDER)`。
   - 不要改变公开 API 结构。
   - 不要移除 mock 模式。

2. 保留有价值的测试文件。
   - `apps/api/src/tools/tool-registry.spec.ts` 本地存在但未纳入 Git 跟踪。
   - 最终 diff 必须包含该测试文件，除非你用等价的已跟踪测试覆盖替代它。

3. 补齐最终回复断言。
   - 更新 `apps/api/src/chat/chat.service.spec.ts`，断言最终 assistant 回复包含工具结果。
   - 至少断言 HR 政策回复包含 `年假政策`。
   - 如果实现简单，也补充待办和时间回复断言。
   - 测试必须保持确定性；不要断言精确当前时间。

4. 保持范围边界。
   - 不要添加登录、数据库持久化、RAG、流式输出、部署配置或复杂权限。
   - 不要添加必须依赖真实 LLM 的路径。
   - 不要提交 `.env` 或密钥。

## 验收标准

- `pnpm check` 通过。
- `pnpm dev` 能同时启动前端和后端，不再出现 Nest 依赖注入错误。
- 没有 `.env` 时，`POST /api/chat` 返回 `mode: "mock"`。
- HTTP smoke 用例通过：
  - `你好，你能做什么？`
  - `公司年假政策是什么？`
  - 同 session 追问：`那远程办公时也适用吗？`
  - `帮我创建一个待办：明天提交报销`
  - `现在几点？`
  - 空消息返回 400。
- 单元测试覆盖：
  - 工具路由；
  - 无效工具参数处理；
  - session 上下文；
  - 最终 assistant 回复包含工具结果。
- `git status --short` 只显示有意变更；不能留下未跟踪的有用测试文件。

## 验证命令

```bash
pnpm check
pnpm dev
```

手工 HTTP smoke 可使用运行中的 API：`http://localhost:3000/api/chat`。

## 最终回复要求

最终回复请包含：

- 修改的文件。
- `pnpm check` 是否通过。
- `pnpm dev` 是否验证。
- HTTP smoke 结果摘要。
- 仍存在的限制。

## Claude 入口提示词

```text
如果仓库中存在 AGENTS.md，请先读取。然后读取并执行 docs/development/claude-mock-mvp-fix-task.md。

请修复 评审 004 中发现的 mock MVP 完成缺口。优先目标是让 pnpm dev 能同时启动 React 前端和 NestJS API，且没有依赖注入错误，同时保持现有 mock 模式行为和 API 结构。

不要添加登录、数据库持久化、RAG、流式输出、部署配置、复杂权限或必须依赖真实 LLM 的路径。不要提交密钥。

修改完成后运行 pnpm check 并验证 pnpm dev，同时执行任务文档列出的手工 API smoke 用例。最终报告修改文件、验证结果和剩余限制。
```
