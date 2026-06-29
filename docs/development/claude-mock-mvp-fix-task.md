# Claude Task - Fix Mock MVP Completion Gaps

## Objective

Fix the remaining gaps found in `docs/development/claude-review-log.md` Review 004 so Prompt 001 can be marked complete.

The key blocker is that `pnpm dev` starts the web app but the NestJS API fails during dependency injection. The mock business flow works when using the built API, but the take-home requirement and README require reviewers to run the project with `pnpm dev`.

## Context

Read these files before editing:

- `斑头雁全栈开发工程师--开放型笔试题.md`
- `docs/development/claude-prompts.md` / Prompt 001
- `docs/development/claude-review-log.md` / Review 004
- `docs/development/technical-design.md`
- `docs/delivery/requirements-traceability.md`

Current relevant files:

- `apps/api/src/chat/chat.service.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/tools/tool-registry.spec.ts`
- `apps/api/src/chat/chat.service.spec.ts`
- `package.json`

## Required Fixes

1. Fix API dev startup.
   - `pnpm dev` currently fails because `tsx watch src/main.ts` does not provide enough runtime metadata for Nest to resolve the first `ChatService` constructor dependency.
   - Prefer the minimal code fix: add explicit Nest `@Inject(...)` decorators for `InMemorySessionStore`, `ToolRouter`, and `ToolRegistry` in `ChatService`.
   - Keep the existing `@Inject(LLM_PROVIDER)` for the LLM provider.
   - Do not change public API shapes.
   - Do not remove mock mode.

2. Keep useful tests tracked.
   - `apps/api/src/tools/tool-registry.spec.ts` exists locally but is untracked.
   - Include this test file as part of the final diff, unless you replace it with equivalent tracked test coverage.

3. Add missing unit assertions for final replies.
   - Update `apps/api/src/chat/chat.service.spec.ts` so it asserts that final assistant replies include tool results.
   - At minimum, assert the HR policy reply contains `年假政策`.
   - Add todo and time reply assertions if straightforward.
   - Keep tests deterministic enough to run locally; do not assert exact current timestamps.

4. Preserve scope boundaries.
   - Do not add authentication, database persistence, RAG, streaming responses, deployment config, or complex permissions.
   - Do not add a required real LLM path.
   - Do not commit `.env` or secrets.

## Acceptance Criteria

- `pnpm check` passes.
- `pnpm dev` starts both frontend and backend without Nest dependency injection errors.
- With no `.env` file, `POST /api/chat` returns `mode: "mock"`.
- HTTP smoke cases pass:
  - `你好，你能做什么？`
  - `公司年假政策是什么？`
  - same-session follow-up: `那远程办公时也适用吗？`
  - `帮我创建一个待办：明天提交报销`
  - `现在几点？`
  - blank message returns 400.
- Unit tests cover:
  - tool routing,
  - invalid tool argument handling,
  - session context,
  - final assistant replies containing tool results.
- `git status --short` shows only intentional tracked changes; no useful test file is left as untracked.

## Verification Commands

```bash
pnpm check
pnpm dev
```

Manual HTTP smoke can use the running API at `http://localhost:3000/api/chat`.

## Final Response Requirements

In your final response, include:

- Files changed.
- Whether `pnpm check` passed.
- Whether `pnpm dev` was verified.
- Summary of HTTP smoke results.
- Any remaining limitations.

## Claude Prompt

```text
Read AGENTS.md first if it exists. Then read and execute docs/development/claude-mock-mvp-fix-task.md.

Fix the mock MVP completion gaps from Review 004. The priority is to make pnpm dev start both the React frontend and NestJS API without dependency injection errors, while preserving the existing mock-mode behavior and API shape.

Do not add auth, database persistence, RAG, streaming, deployment config, complex permissions, or a required real LLM path. Do not commit secrets.

After editing, run pnpm check and verify pnpm dev. Also run the manual API smoke cases listed in the task document. Report changed files, verification results, and any remaining limitations.
```
