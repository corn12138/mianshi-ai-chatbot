# Claude 评审记录

本文记录每次 Claude 完成任务后的人工评审结果。规则：先对照 `docs/development/claude-prompts.md` 或具体 task 文档建立验收清单，再看代码和运行验证，最后记录结论。

## Review 001 - 初始化前记录

- 日期：2026-06-29
- 对应提示词：`docs/development/claude-prompts.md` / Prompt 001
- 评审对象：暂无 Claude 产出；当前初始代码由 Codex 先行完成。
- 结论：尚未进行 Claude completion review。后续一旦 Claude 修改代码，需要在本文件追加正式评审记录。

迁移前基线验证：

| 检查项 | 状态 | 证据 |
| --- | --- | --- |
| 根目录依赖安装 | Pass | 初始 npm workspaces 基线已执行，后续已迁移为 pnpm |
| 构建 | Pass | 初始构建已通过，后续验证命令改为 `pnpm build` |
| 后端测试 | Pass | 初始测试已通过，后续验证命令改为 `pnpm test` |
| GitHub public 仓库 | Pass | `https://github.com/corn12138/mianshi-ai-chatbot` |

## Review 002 - pnpm workspace 迁移

- 日期：2026-06-29
- 对应提示词：`docs/development/claude-prompts.md` / Prompt 002
- 评审对象：Codex 迁移产出，后续可作为 Claude 复核基线。
- 评审结论：Pass

### 验收矩阵

| 要求 | 状态 | 证据 | 备注 |
| --- | --- | --- | --- |
| 使用 pnpm workspace | Pass | `pnpm-workspace.yaml` | workspace 包为 `apps/*` |
| 根 packageManager 固定 pnpm | Pass | `package.json` | `pnpm@11.7.0` |
| 删除 npm lockfile | Pass | `package-lock.json` 已删除 |  |
| 生成 pnpm lockfile | Pass | `pnpm-lock.yaml` |  |
| 文档启动命令改为 pnpm | Pass | `README.md`、`docs/delivery/demo-script.md`、`docs/development/technical-design.md` |  |
| 构建通过 | Pass | `pnpm build` |  |
| 测试通过 | Pass | `pnpm test` | 2 个 test file、4 个 test |

### 验证命令

```bash
pnpm install
pnpm build
pnpm test
```

## Review 003 - 文档归类与 Prompt 001 细化

- 日期：2026-06-29
- 对应提示词：`docs/development/claude-prompts.md` / Prompt 001
- 评审对象：文档目录归类、README 索引、需求追踪表、第一波 Claude mock MVP 提示词。
- 评审结论：Pass

### 验收矩阵

| 要求 | 状态 | 证据 | 备注 |
| --- | --- | --- | --- |
| 原始需求要求的交付说明归入子目录 | Pass | `docs/delivery/` | 包含方案说明、AI 使用、录屏脚本、需求追踪 |
| 技术设计和 Claude 协作记录归入子目录 | Pass | `docs/development/` | 包含技术设计、Claude prompts、Claude review log |
| README 文档索引更新 | Pass | `README.md` | 按交付说明和开发过程分组 |
| Prompt 001 聚焦 mock 模式完整闭环 | Pass | `docs/development/claude-prompts.md` | 覆盖 API、session、tool routing、tools、UI、测试、文档 |
| 无旧 docs 根路径引用残留 | Pass | `rg` 路径检查 | 旧 `docs/*.md` 引用已清理 |
| 构建和测试通过 | Pass | `pnpm check` | 2 个 test file、4 个 test |

### 验证命令

```bash
find docs -maxdepth 2 -type f | sort
rg -n "docs/(solution|ai-usage|demo-script|requirements-traceability|technical-design|claude-prompts|claude-review-log)\\.md" README.md docs --glob '*.md'
pnpm check
```

## Review 004 - Prompt 001 Mock MVP 完成度审计

- 日期：2026-06-29
- 对应提示词：`docs/development/claude-prompts.md` / Prompt 001
- Claude 修改范围：本次本地工作区出现 `apps/api/src/tools/tool-registry.spec.ts` 未跟踪文件；其余核心实现来自既有代码。
- 评审结论：Partial，mock 业务链路在构建产物模式下可用，但 Prompt 001 要求的 `pnpm dev` 本地启动链路失败，不能算完整完成。

### 发现

| 严重级别 | 问题 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| P1 | `pnpm dev` 无法启动后端 API | `package.json:7` 使用 `tsx watch src/main.ts`；运行时报 `Nest can't resolve dependencies of the ChatService (?, Symbol(LLM_PROVIDER))`；`apps/api/src/chat/chat.service.ts:11`-`15` 构造函数依赖需要运行时注入 | 原始 Prompt 明确要求 `pnpm dev` 启动前后端；评审按 README 启动时网页会起来但 `/api/chat` 不可用，mock MVP 主流程失败 | 在 `ChatService` 构造函数上为 `InMemorySessionStore`、`ToolRouter`、`ToolRegistry` 增加显式 `@Inject(...)`，或改用能保留 decorator metadata 的 dev 启动方式；优先做最小代码改动并验证 `pnpm dev` |
| P2 | 新增工具注册测试未纳入 Git 追踪 | `git status --short` 显示 `?? apps/api/src/tools/tool-registry.spec.ts` | 本地 `pnpm test` 会跑到该测试，但 GitHub 仓库和最终提交不会包含它，测试覆盖证据会丢失 | 将该测试作为正式变更纳入提交，或移除后在已跟踪测试中补齐同等覆盖 |
| P2 | Prompt 001 要求的“tool results appearing in final assistant replies”缺少单元测试断言 | `apps/api/src/chat/chat.service.spec.ts:17`-`28` 只断言 tool name、sessionId 和 message length，没有断言 `reply` 包含工具结果 | 运行 smoke 能证明当前行为可用，但自动测试没有锁住最关键的最终回复要求，后续改动可能回归 | 在 `ChatService` 测试里断言 HR/todo/time 的 `reply` 包含对应工具结果关键词，并补空消息 400 或服务级校验测试 |

### 验收矩阵

| 要求 | 状态 | 证据 | 备注 |
| --- | --- | --- | --- |
| `pnpm install` works | Pass | 已存在 pnpm lockfile，依赖可用 | 本轮未重复完整安装 |
| `pnpm dev` starts frontend and backend | Fail | dev 启动时 API 报 Nest DI 错误 | 阻塞项 |
| No `.env` / API key required | Pass | `no .env file`；API smoke 返回 `mode: "mock"` |  |
| Normal chat works | Partial | 构建产物 API smoke greeting 通过 | dev 模式失败，因此整体 Partial |
| Follow-up context works | Partial | API smoke 同 session 追问返回 6 条 messages 和 `lookup_hr_policy` | dev 模式失败 |
| HR/IT policy auto tool call | Partial | API smoke `公司年假政策是什么？` 返回 `lookup_hr_policy` | dev 模式失败 |
| Todo auto tool call | Partial | API smoke `帮我创建一个待办：明天提交报销` 返回 `create_todo` | dev 模式失败 |
| Time auto tool call | Partial | API smoke `现在几点？` 返回 `get_current_time` | dev 模式失败 |
| Tool results in final reply | Pass | API smoke reply 包含政策、todo id、Asia/Shanghai 时间 | 建议补单元测试 |
| Frontend displays tool details | Partial | `apps/web/src/main.tsx:113`-`120` 渲染 `message.toolCalls` | 未完成浏览器端联调，因为 `pnpm dev` API 失败 |
| `pnpm build` passes | Pass | `pnpm check` 通过 |  |
| `pnpm test` passes | Pass | `pnpm check` 通过，3 个 test file、8 个 test | 其中 1 个测试文件未跟踪 |
| No secrets committed | Pass | 无 `.env`；secret grep 无命中 |  |

### 验证命令

```bash
git status --short --branch
pnpm check
pnpm dev
pnpm --filter @mianshi/api start
node <HTTP smoke script against POST /api/chat>
test -f .env && echo ".env exists" || echo "no .env file"
rg -n "sk-[A-Za-z0-9]|gho_[A-Za-z0-9]|OPENAI_API_KEY=.*[A-Za-z0-9]{8,}|TOKEN=.*[A-Za-z0-9]{8,}" . --glob '!node_modules' --glob '!apps/*/dist' --glob '!pnpm-lock.yaml'
```

### 结论

- Mock 业务能力本身基本具备：构建产物模式下普通对话、多轮追问、HR/IT、待办、时间、空消息 400 都跑通。
- 不能判定 Prompt 001 完成：README/Prompt 的首要本地启动命令 `pnpm dev` 当前失败。
- 下一步应先修复 dev 启动，再补齐测试断言和未跟踪测试文件。

## Review 005 - Prompt 001 Mock MVP 复审

- 日期：2026-06-29
- 对应提示词：`docs/development/claude-prompts.md` / Prompt 001；修复任务：`docs/development/claude-mock-mvp-fix-task.md`
- Claude 修改范围：`apps/api/src/chat/chat.controller.ts`、`apps/api/src/chat/chat.service.ts`、`apps/api/src/chat/chat.service.spec.ts`、`apps/api/src/tools/tool-registry.spec.ts`
- 评审结论：Pass。基于原始笔试 MD 和 Prompt 001，mock 模式模拟的核心全功能已完成并通过本地验证。

### 发现

无阻塞问题。上一轮 P1 `pnpm dev` 后端启动失败已修复；测试覆盖也已补齐。

### 验收矩阵

| 要求 | 状态 | 证据 | 备注 |
| --- | --- | --- | --- |
| README 本地启动命令可用 | Pass | `pnpm dev` | 前端 `5173`、后端 `3000` 均成功启动 |
| 无 `.env` / 无 API Key 可体验 | Pass | `test -f .env` 输出 `no .env file`；HTTP 返回 `mode: "mock"` |  |
| 网页可发起对话 | Pass | `GET http://localhost:5173/` 返回 200 | 前端页面可服务 |
| 系统返回 AI 回复 | Pass | HTTP smoke `你好，你能做什么？` 返回 201 且包含内部助手说明 |  |
| 多轮上下文保留 | Pass | 同 session 追问 `那远程办公时也适用吗？` 返回 6 条 messages |  |
| 自动工具调用 | Pass | HR/todo/time smoke 分别返回 `lookup_hr_policy`、`create_todo`、`get_current_time` | 非前端按钮触发 |
| 工具结果进入最终回复 | Pass | smoke 回复包含 `年假政策`、`已创建待办`、`Asia/Shanghai` |  |
| 工具失败处理 | Pass | `tool-registry.spec.ts` 覆盖 invalid topic、missing title、unknown tool |  |
| 空消息校验 | Pass | blank message 返回 400 `message is required` |  |
| 前端展示工具调用详情 | Pass | `apps/web/src/main.tsx` 渲染 `message.toolCalls` 的 name/status/result | 通过代码证据确认 |
| `pnpm build` / `pnpm test` | Pass | `pnpm check` 通过 | 3 个 test file、12 个 test |
| 无敏感信息 | Pass | 无 `.env`；secret grep 无命中 |  |

### 验证命令

```bash
git status --short --branch
pnpm check
test -f .env && echo ".env exists" || echo "no .env file"
rg -n "sk-[A-Za-z0-9]|gho_[A-Za-z0-9]|OPENAI_API_KEY=.*[A-Za-z0-9]{8,}|TOKEN=.*[A-Za-z0-9]{8,}" . --glob '!node_modules' --glob '!apps/*/dist' --glob '!pnpm-lock.yaml'
pnpm dev
node <HTTP smoke script against http://localhost:3000/api/chat and http://localhost:5173/>
```

### Smoke 结果

| Case | Result |
| --- | --- |
| `你好，你能做什么？` | 201, `mode: mock`, normal assistant reply |
| `公司年假政策是什么？` | 201, `lookup_hr_policy`, reply includes `年假政策` |
| `那远程办公时也适用吗？` | 201, same session, reply includes `远程办公政策` |
| `帮我创建一个待办：明天提交报销` | 201, `create_todo`, reply includes todo confirmation |
| `现在几点？` | 201, `get_current_time`, reply includes `Asia/Shanghai` |
| blank message | 400, `message is required` |
| web page | 200, `text/html` |

### 后续

因为本轮已通过，不需要再生成下一步修复提示词。后续工作应转向录屏准备、README 最终复核、GitHub 提交链接和视频链接交付。

## 正式评审模板

````md
## Review 00X - 标题

- 日期：
- 对应提示词或任务文档：
- Claude 修改范围：
- 评审结论：Pass / Partial / Fail

### 发现

| 严重级别 | 问题 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| P1/P2/P3 |  | 文件路径:行号 |  |  |

### 验收矩阵

| 要求 | 状态 | 证据 | 备注 |
| --- | --- | --- | --- |
|  | Pass/Partial/Fail/Blocked |  |  |

### 验证命令

```bash
pnpm build
pnpm test
```

### 采纳、修改、拒绝

- 采纳：
- 修改：
- 拒绝：
````
