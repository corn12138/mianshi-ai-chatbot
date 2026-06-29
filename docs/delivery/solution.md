# 技术方案说明

## 需求理解

题目要求不是做一个完整 AI 产品，而是用 AI 工具快速交付一个核心流程可运行、边界清楚、取舍明确的 Chatbot MVP。

这个 MVP 面向内部员工，第一版聚焦三件事：

1. 用户能在网页中多轮对话。
2. 系统能在合适时机自动调用本地工具。
3. 没有真实 LLM API Key 时仍能通过 mock 模式完整体验。

## 架构关系

- 前端：负责聊天页面、会话 ID 保存、消息展示、工具调用结果展示。
- 后端：负责接口、上下文管理、模型 provider、工具路由和工具执行。
- 模型层：默认 mock provider，可选 DeepSeek provider 或 OpenAI-compatible provider。
- 工具层：注册 HR/IT 查询、待办创建、时间查询。
- 存储层：第一版使用内存 Map 保存会话上下文。

## 多轮上下文

前端首次访问生成 `sessionId` 并保存在 `localStorage`。每次请求带上 `sessionId`，后端用 `InMemorySessionStore` 查找历史消息，并在生成最终回复后把 user/assistant 消息追加回会话。

## 工具调用

后端 `ToolRouter` 根据用户输入和模型计划判断工具意图。当前 mock 模式使用规则路由保证可演示性；真实模型模式下仍保留规则路由作为兜底。

工具执行后，结果会：

- 写入 assistant 消息的 `toolCalls`。
- 拼入最终自然语言回复。
- 返回给前端用于展示。

## DeepSeek 真实 API 增强

第一版已经保留无 Key 可运行的 mock 模式，同时支持可选 DeepSeek 真实模型模式：

- 设置 `LLM_PROVIDER=deepseek`。
- 在本地 `.env` 中配置 `DEEPSEEK_API_KEY` 或 `DeepSeek_KEY`。
- 后端会调用 DeepSeek `/chat/completions` 生成普通回复和工具结果总结。
- 工具调用仍由本地 `ToolRouter` 触发，避免真实模型输出不稳定影响核心演示。

这个设计既满足题目要求的 mock 模式，也能展示真实 LLM API 接入能力。

## 取舍

第一版不做数据库、登录、复杂权限、RAG、流式输出和线上部署。原因是这些能力会显著扩大范围，但不是题目的核心评分点。当前实现优先保证普通对话、多轮上下文、工具调用和 mock 模式四条主链路可靠可演示。
