# Claude 提示词记录

本文记录每次准备发给 Claude 的实现提示词。规则：先登记，再执行；Claude 返回后，再到 `docs/development/claude-review-log.md` 记录评审结果。

## Prompt 001 - Mock 模式完整 AI Chatbot MVP

- 日期：2026-06-29
- 目标：第一波让 Claude 完成无真实 LLM API Key 也能完整体验的 mock 模式核心功能闭环。
- 状态：作为第一阶段实现提示词基线；后续 Claude 执行、修改或复核时以此为验收来源。
- 关联文档：`斑头雁全栈开发工程师--开放型笔试题.md`、`docs/development/technical-design.md`、`docs/delivery/requirements-traceability.md`

```text
You are implementing the first functional wave of a coding interview take-home project.

Read these files before editing:
- 斑头雁全栈开发工程师--开放型笔试题.md
- docs/development/technical-design.md
- docs/delivery/requirements-traceability.md

Goal:
Build the complete mock-mode AI Chatbot MVP for internal employees.

The project must run with no .env file and no real LLM API key. The first wave is considered successful only when a reviewer can start the app locally, chat in the web UI, ask follow-up questions, trigger local tools automatically, and see tool results included in the final assistant reply.

Primary success criteria from the original requirement:
1. User can start a chat from a web page.
2. System returns an AI-like assistant reply.
3. Multi-turn context is preserved for follow-up questions.
4. At least one tool call scenario works; implement three for a stronger demo.
5. Tool calling is triggered by backend AI/mock routing logic, not by clicking a tool button.
6. Tool results are included in the final assistant reply.
7. Mock mode works without any real LLM API key.
8. The project starts locally from README instructions.

Tech stack:
- Monorepo using pnpm workspace.
- Frontend: React + Vite + TypeScript.
- Backend: NestJS + TypeScript. Fastify adapter is acceptable.
- Default and required mode for this wave: Mock LLM provider.
- Do not commit any real API keys or sensitive data.

Required directory structure:
- apps/web for the React app.
- apps/api for the NestJS API.
- docs/delivery for requirement-facing documents.
- docs/development for technical design, Claude prompts, and review logs.
- root README.md, .env.example, package.json, pnpm-workspace.yaml, tsconfig.base.json.

Do not implement these in the first wave:
- Authentication or user accounts.
- Database persistence.
- RAG or a knowledge base.
- Streaming responses.
- Real LLM API calls as a required path.
- Deployment configuration.
- Complex permission systems or production-grade audit logs.

Backend requirements:
1. Implement POST /api/chat.
2. Request body:
   {
     "sessionId": "optional-session-id",
     "message": "user message"
   }
3. Response body:
   {
     "sessionId": "session id",
     "reply": "final assistant reply",
     "messages": [...],
     "toolCalls": [...],
     "mode": "mock"
   }
4. Validate empty or whitespace-only messages and return a 400-style error.
5. Maintain multi-turn context with an in-memory session store keyed by sessionId.
6. Store user and assistant messages with role, content, createdAt, and optional toolCalls.
7. Implement a clear LlmProvider interface even though the first wave only needs mock mode.
8. Implement MockLlmProvider as the default provider:
   - greeting messages should explain what the assistant can do.
   - normal messages should produce a concise assistant reply.
   - when tool results exist, compose a final natural-language answer that explicitly includes the tool result.
9. Implement a ToolRouter. It must infer tool intent from user text and available history. Frontend buttons must never directly choose a tool.
10. Implement a ToolRegistry that executes local tools and returns structured records:
    {
      "name": "tool name",
      "arguments": {},
      "result": "tool result or error",
      "ok": true
    }
11. Implement these tools:
    - lookup_hr_policy(topic)
      - topic values: annual_leave, expense, remote_work, it_support.
      - return mock internal policy text.
      - trigger examples:
        - "公司年假政策是什么？" -> annual_leave
        - "报销需要什么材料？" -> expense
        - "远程办公政策是什么？" -> remote_work
        - "VPN 或邮箱出问题怎么办？" -> it_support
    - create_todo(title, dueDate?)
      - validate title is a non-empty string.
      - return a mock todo id and confirmation.
      - trigger examples:
        - "帮我创建一个待办：明天提交报销"
        - "提醒我下午找 IT 开通 VPN"
    - get_current_time(timezone?)
      - default timezone: Asia/Shanghai.
      - trigger examples:
        - "现在几点？"
        - "current time"
12. Multi-turn behavior:
    - If a user asks a follow-up like "那远程办公时也适用吗？" after a policy question, the backend must use the same sessionId and answer with context-aware behavior.
    - Follow-up context can be implemented with in-memory message history and simple mock routing rules. Do not overbuild.
13. Failure handling:
    - Invalid tool arguments should not crash the API.
    - Return ok=false in toolCalls and include the failure reason in the final reply.
    - API errors should be readable from the frontend.
14. Add unit tests for:
    - HR policy routing.
    - todo routing and title extraction.
    - time routing.
    - chat service preserving session context.
    - tool results appearing in final assistant replies.

Frontend requirements:
1. Single chat page.
2. Generate or reuse sessionId from localStorage.
3. Send messages to POST /api/chat.
4. Render user and assistant messages.
5. Show tool call details under assistant replies when toolCalls are returned.
6. Show current mode: Mock Mode.
7. Provide example prompt chips for demo convenience, but do not make tool calling depend on clicking those chips.
8. Include these demo prompts:
   - "你好，你能做什么？"
   - "公司年假政策是什么？"
   - "那远程办公时也适用吗？"
   - "帮我创建一个待办：明天提交报销"
   - "现在几点？"
9. Keep UI simple, clear, responsive, and reliable. Do not over-invest in visual polish.
10. Show loading and error states so reviewers can tell whether the API is running.

Documentation requirements:
1. README.md must include:
   - Project overview.
   - Requirement understanding.
   - MVP scope.
   - Explicit non-goals.
   - Architecture and data flow.
   - Local startup instructions.
   - Environment variables.
   - Mock mode instructions.
   - Tool calling explanation.
   - Limitations and future improvements.
2. docs/delivery/solution.md must explain:
   - Frontend/backend/model/tool/storage relationship.
   - Multi-turn context handling.
   - Tool routing and execution flow.
3. docs/delivery/ai-usage.md must explain:
   - Which AI tools were used.
   - Which outputs were accepted.
   - Which outputs were modified.
   - Which outputs were rejected and why.
4. docs/delivery/demo-script.md must provide a recording script that covers:
   - Understanding the task.
   - Defining the MVP.
   - AI collaboration process.
   - Running the project.
   - Normal chat.
   - Multi-turn follow-up.
   - Tool calling.
   - Mock mode.
   - Current limitations.
5. docs/delivery/requirements-traceability.md must map the original requirement items to implementation and document locations.
6. docs/development/technical-design.md must describe the architecture and request flow.
7. docs/development/claude-prompts.md must preserve this prompt.

Acceptance criteria:
- pnpm install works from the root.
- pnpm dev starts both frontend and backend.
- The app works with no .env file and no API key.
- The user can send a normal message and receive a reply.
- Follow-up questions preserve context.
- HR/IT policy questions automatically call lookup_hr_policy.
- Todo creation requests automatically call create_todo.
- Time questions automatically call get_current_time.
- Tool results appear in the final reply.
- The frontend displays tool call details returned by the backend.
- pnpm build passes.
- pnpm test passes.
- No real API keys or personal secrets are committed.

Required manual smoke script:
1. Start with pnpm dev.
2. Open http://localhost:5173.
3. Send "你好，你能做什么？" and confirm a normal assistant reply.
4. Send "公司年假政策是什么？" and confirm lookup_hr_policy appears in toolCalls and the final reply includes the policy.
5. Send "那远程办公时也适用吗？" in the same session and confirm context is preserved.
6. Send "帮我创建一个待办：明天提交报销" and confirm create_todo appears with a mock todo id.
7. Send "现在几点？" and confirm get_current_time appears with Asia/Shanghai time.
8. Stop the server, ensure no real .env or API key was required.

Important implementation constraints:
- Keep the MVP small and easy to review.
- Do not add authentication, database persistence, RAG, streaming responses, deployment config, or complex permissions.
- Prefer clear architecture and runnable core flow over feature count.
- Use TypeScript types for API DTOs, messages, tool calls, and provider interfaces.
- If a generated suggestion increases scope, reject it and keep the MVP focused.
- When updating files, keep docs paths aligned with the docs/delivery and docs/development folder split.
```

## 后续记录模板

````md
## Prompt 00X - 标题

- 日期：
- 目标：
- 状态：
- 关联文档：

```text
完整提示词
```
````

## Prompt 002 - 迁移 monorepo 到 pnpm

- 日期：2026-06-29
- 目标：将现有 npm workspaces 项目迁移为 pnpm workspace，并同步 README、技术文档、录屏脚本和验证命令。
- 状态：由 Codex 直接执行；如后续交给 Claude 复核或继续实现，使用此提示词作为任务来源。
- 关联文档：`docs/development/technical-design.md`、`docs/delivery/requirements-traceability.md`

```text
You are updating the existing AI Chatbot MVP repository.

Goal:
Migrate the monorepo from npm workspaces to pnpm workspace.

Required changes:
1. Add pnpm-workspace.yaml with apps/* as workspace packages.
2. Remove the root package.json workspaces field.
3. Add packageManager: pnpm@11.7.0 to the root package.json.
4. Rewrite root scripts to use pnpm workspace filters:
   - pnpm dev starts apps/api and apps/web concurrently.
   - pnpm build builds both workspaces.
   - pnpm test runs API tests.
   - pnpm check runs build and test.
5. Remove package-lock.json.
6. Generate pnpm-lock.yaml with pnpm install.
7. Update README and docs so local setup and verification use pnpm install, pnpm dev, pnpm build, and pnpm test.
8. Do not change product behavior, API shapes, tool behavior, or UI behavior.

Acceptance criteria:
- pnpm install succeeds from the repository root.
- pnpm build passes.
- pnpm test passes.
- No package-lock.json remains.
- pnpm-lock.yaml is committed.
- Documentation no longer instructs reviewers to use npm for normal setup.
```
