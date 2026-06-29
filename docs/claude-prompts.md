# Claude 提示词记录

本文记录每次准备发给 Claude 的实现提示词。规则：先登记，再执行；Claude 返回后，再到 `docs/claude-review-log.md` 记录评审结果。

## Prompt 001 - 初始化 AI Chatbot MVP

- 日期：2026-06-29
- 目标：让 Claude 基于题目要求实现 React + NestJS AI Chatbot MVP。
- 状态：已设计提示词；当前仓库初始实现由 Codex 先行落地，后续 Claude 执行时应以此提示词或其修订版为准。
- 关联文档：`斑头雁全栈开发工程师--开放型笔试题.md`、`docs/technical-design.md`

```text
You are implementing a coding interview take-home project.

Read the requirement file first:
- 斑头雁全栈开发工程师--开放型笔试题.md

Goal:
Build a runnable AI Chatbot MVP for internal employees. The project must demonstrate normal chat, multi-turn context, automatic tool calling, tool results included in final replies, and a mock mode that works without any real LLM API key.

Tech stack:
- Monorepo using npm workspaces.
- Frontend: React + Vite + TypeScript.
- Backend: NestJS + TypeScript.
- Default mode: Mock LLM provider.
- Optional real model mode: OpenAI-compatible provider controlled by environment variables.
- Do not commit any real API keys or sensitive data.

Create this directory structure:
- apps/web for the React app.
- apps/api for the NestJS API.
- docs for solution notes, AI usage notes, and demo script.
- root README.md, .env.example, package.json, tsconfig.base.json.

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
     "mode": "mock" or "llm"
   }
4. Maintain multi-turn context with an in-memory session store.
5. Implement a provider interface for LLM behavior.
6. Implement MockLlmProvider as the default provider.
7. Implement OpenAICompatibleProvider as optional, activated only when LLM_PROVIDER=openai-compatible and OPENAI_API_KEY exists.
8. Implement a tool registry and tool router.
9. Implement these tools:
   - lookup_hr_policy(topic): returns mock HR/IT policy information.
   - create_todo(title, dueDate?): returns a mock todo id and confirmation.
   - get_current_time(timezone?): returns current time.
10. Tool calls must be triggered by backend logic or mock LLM intent detection, not by frontend buttons.
11. Tool call results must be included in the final assistant reply.
12. Add validation for empty messages and invalid tool arguments.
13. Add basic unit tests for tool routing and chat service behavior.

Frontend requirements:
1. Single chat page.
2. Generate or reuse sessionId from localStorage.
3. Send messages to POST /api/chat.
4. Render user and assistant messages.
5. Show tool call details under assistant replies when toolCalls are returned.
6. Show current mode: Mock Mode or LLM Mode.
7. Provide example prompt chips for demo convenience, but do not make tool calling depend on clicking those chips.
8. Keep UI simple, clean, and reliable. Do not over-invest in visual polish.

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
2. docs/solution.md must explain:
   - Frontend/backend/model/tool/storage relationship.
   - Multi-turn context handling.
   - Tool routing and execution flow.
3. docs/ai-usage.md must explain:
   - Which AI tools were used.
   - Which outputs were accepted.
   - Which outputs were modified.
   - Which outputs were rejected and why.
4. docs/demo-script.md must provide a recording script that covers:
   - Understanding the task.
   - Defining the MVP.
   - AI collaboration process.
   - Running the project.
   - Normal chat.
   - Multi-turn follow-up.
   - Tool calling.
   - Mock mode.
   - Current limitations.

Acceptance criteria:
- npm install works from the root.
- npm run dev starts both frontend and backend.
- The app works with no .env file and no API key.
- The user can send a normal message and receive a reply.
- Follow-up questions preserve context.
- HR/IT policy questions automatically call lookup_hr_policy.
- Todo creation requests automatically call create_todo.
- Time questions automatically call get_current_time.
- Tool results appear in the final reply.
- npm run build passes.
- No real API keys or personal secrets are committed.

Important implementation constraints:
- Keep the MVP small and easy to review.
- Do not add authentication, database persistence, RAG, streaming responses, deployment config, or complex permissions.
- Prefer clear architecture and runnable core flow over feature count.
- Use TypeScript types for API DTOs, messages, tool calls, and provider interfaces.
- If a generated suggestion increases scope, reject it and keep the MVP focused.
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
