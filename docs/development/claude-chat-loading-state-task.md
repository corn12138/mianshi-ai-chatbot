# Claude 任务：聊天等待态 Loading 优化

## 复制给 Claude 的入口提示词

如果仓库中存在 `AGENTS.md`，请先读取。然后按顺序读取以下文件：

1. `斑头雁全栈开发工程师--开放型笔试题.md`
2. `README.md`
3. `docs/development/technical-design.md`
4. `docs/development/claude-chat-loading-state-task.md`

读取后，请完整执行 `docs/development/claude-chat-loading-state-task.md`。本任务只做一个小的前端体验优化：用户发送消息后，在等待 API 返回期间，在消息区显示类似 Claude / Codex 的 assistant loading / 正在思考占位。新增或修改的非平凡代码必须添加中文注释。

## 背景

当前聊天页面发送消息后，会立即乐观展示用户消息，并把发送按钮文案改为“发送中”。但消息区没有 assistant 等待态，用户会看到右侧用户消息下方留白，直到接口返回后才出现 AI 回复。

用户截图表达的目标是：发送后，在等待期间让左侧 AI 助手位置出现一个轻量 loading 气泡，类似 Claude / Codex 的“正在思考”状态，降低等待感。

## 范围

只修改前端体验，不改后端接口、不改工具逻辑、不改 mock/真实模型 provider。

重点文件：

- `apps/web/src/main.tsx`
- `apps/web/src/styles.css`

必要时可补充注释，但不要引入新依赖。

## 设计要求

1. 用户发送消息后：
   - 继续立即展示用户消息。
   - 在 API 请求未完成期间，在消息列表底部显示一条 assistant loading 气泡。
   - loading 气泡不写入 `messages` 状态，不作为真实消息发送到后端，也不进入 session history。

2. API 成功返回后：
   - loading 气泡消失。
   - 用后端返回的完整 `messages` 替换本地消息列表，展示真实 assistant 回复和工具调用详情。

3. API 失败后：
   - loading 气泡消失。
   - 保留现有错误展示逻辑。
   - 不生成假的 assistant 错误消息。

4. loading 样式：
   - 与现有 assistant 消息气泡风格保持一致，左对齐。
   - 显示角色名 `AI 助手`。
   - 内容建议为 `正在思考` + 三个小圆点动画，或等价的轻量“打字中”动效。
   - 动画要克制，不能导致布局抖动。
   - 需要支持 `prefers-reduced-motion: reduce`，用户减少动画时应停止或弱化动画。

5. 可访问性：
   - loading 区域应有合理的 `aria-live` 或 `role="status"`，让辅助技术知道系统正在响应。
   - 不要频繁变更文本导致读屏器反复朗读。

6. 滚动体验：
   - 发送消息和 loading 出现后，消息区域应尽量滚动到底部。
   - 后端真实回复到达后，也应滚动到底部。
   - 只做简单、稳定的滚动实现；不要引入复杂虚拟列表或第三方库。

7. 移动端：
   - loading 气泡在窄屏下不能超出消息容器。
   - 不要改变现有输入框、示例按钮和消息卡片的主要布局。

## 推荐实现思路

可以采用以下最小实现方案：

1. 在 `apps/web/src/main.tsx` 中：
   - 从 React 引入 `useRef`。
   - 为消息列表底部增加一个 `messagesEndRef`。
   - 增加 `useEffect`，当 `messages` 或 `isSending` 变化时滚动到底部。
   - 在 `messages.map(...)` 后面，如果 `isSending` 为 `true`，渲染一个非持久化的 assistant loading `<article>`。

2. loading 组件结构示例：

```tsx
{isSending ? (
  <article className="message assistant message-loading" role="status" aria-live="polite">
    <div className="message-role">AI 助手</div>
    <div className="typing-indicator" aria-label="AI 助手正在思考">
      <span>正在思考</span>
      <span className="typing-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </div>
  </article>
) : null}
<div ref={messagesEndRef} />
```

这只是结构示例，请按现有代码风格调整。新增的非平凡逻辑请添加中文注释。

3. 在 `apps/web/src/styles.css` 中：
   - 增加 `.message-loading`、`.typing-indicator`、`.typing-dots` 等样式。
   - 使用 `@keyframes` 做点状 loading。
   - 增加 `@media (prefers-reduced-motion: reduce)` 关闭动画。

## 不要做的事

- 不要改 `POST /api/chat` API。
- 不要改后端 session、tool router、tool registry 或 provider 逻辑。
- 不要把 loading 占位写入 `messages` 状态。
- 不要在失败时伪造 assistant 消息。
- 不要引入新 UI 库或动画库。
- 不要重做页面设计。
- 不要修改原始笔试题文档。

## 验收标准

完成后必须满足：

- 发送消息后，用户消息立即出现。
- 等待 API 返回期间，消息区底部出现左侧 `AI 助手` loading 气泡。
- loading 气泡在成功返回后消失，并替换为真实 assistant 回复。
- loading 气泡在请求失败后消失，现有错误提示仍显示。
- loading 不是后端返回消息的一部分，不进入 session history。
- 页面自动滚动到底部，至少覆盖发送、loading 出现和回复到达三种情况。
- mock 模式核心流程不受影响。
- `pnpm build` 通过。
- `pnpm test` 通过。
- `git diff --check` 通过。

## 建议手工验证

可以在浏览器里用 Network throttling 或临时让 API 延迟来观察 loading，但不要把人为延迟提交到最终代码。

建议验证问题：

```text
你好，你能做什么？
公司年假政策是什么？
帮我创建一个待办：明天提交报销
现在几点？
```

每次发送后都应先看到 loading 气泡，再看到真实回复。

## 最终回复要求

Claude 完成后，用中文简洁说明：

- 修改了哪些文件。
- loading 等待态如何实现。
- 是否影响 API / session / 工具调用逻辑。
- 验证命令结果。
- 如果未做浏览器手工验证，说明原因。
