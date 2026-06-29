import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// 前端只消费后端返回的工具调用记录；工具是否触发始终由后端判断。
type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
  result: string;
  ok: boolean;
};

// 与后端 ChatMessage 保持同构，便于直接用接口响应刷新完整消息列表。
type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  toolCalls?: ToolCall[];
};

// ChatResponse 是页面和 API 的唯一契约，mode/provider 用于录屏时证明当前运行模式。
type ChatResponse = {
  sessionId: string;
  reply: string;
  messages: ChatMessage[];
  toolCalls: ToolCall[];
  mode: 'mock' | 'llm';
  provider: {
    name: 'mock' | 'deepseek' | 'openai-compatible';
    label: string;
    model: string;
    baseUrl?: string;
  };
};

type ApiErrorPayload = {
  message?: unknown;
};

// 默认指向本地 API；部署或本地改端口时可通过 Vite 环境变量覆盖。
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

// 示例问题只负责快速填充演示输入，不参与工具路由判断。
const examples = [
  '介绍一下自己',
  '公司年假政策是什么？',
  '报销需要哪些材料？',
  '福利和五险一金怎么查？',
  '会议室和访客怎么安排？',
  '计算 128*7+36',
  '帮我创建一个待办：明天提交报销',
  '现在几点？',
];

function getInitialSessionId() {
  // 会话 ID 放在 localStorage，刷新页面后仍能继续同一段 mock 会话。
  const existing = localStorage.getItem('mianshi-session-id');
  if (existing) return existing;

  // 前端生成 sessionId，后端只负责按 ID 保存上下文，避免引入登录系统。
  const created = `web_${crypto.randomUUID()}`;
  localStorage.setItem('mianshi-session-id', created);
  return created;
}

function App() {
  const [sessionId, setSessionId] = useState(getInitialSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'mock' | 'llm'>('mock');
  const [provider, setProvider] = useState<ChatResponse['provider']>({
    name: 'mock',
    label: 'Mock LLM',
    model: 'deterministic-local-mock',
  });
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 消息列表底部锚点：发送消息、loading 出现、回复到达后都滚动到这里，保证最新内容可见。
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 发送按钮只做基础空值和并发保护，核心校验仍由后端兜底。
  const canSend = useMemo(() => draft.trim().length > 0 && !isSending, [draft, isSending]);

  useEffect(() => {
    // 后端可能返回新 sessionId，因此每次变化都同步到本地存储。
    localStorage.setItem('mianshi-session-id', sessionId);
  }, [sessionId]);

  useEffect(() => {
    // messages 或 isSending 变化时滚动到底部，覆盖“发送消息、loading 出现、回复到达”三种情况。
    // 可选链兼容 ref 尚未挂载的极端情况，避免抛错。
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  async function sendMessage(text = draft) {
    const message = text.trim();
    if (!message) return;

    setError(null);
    setIsSending(true);
    setDraft('');

    // 先乐观展示用户消息，减少等待 API 时的空白感。
    setMessages((current) => [
      ...current,
      { role: 'user', content: message, createdAt: new Date().toISOString() },
    ]);

    try {
      // 所有对话、上下文和工具调用都收敛到一个 POST 接口，便于评审验证主链路。
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
      });

      if (!response.ok) {
        // 后端已统一返回安全错误结构；解析失败时再退回纯文本，避免页面展示 JSON 噪音。
        throw new Error(await readApiErrorMessage(response));
      }

      const data = (await response.json()) as ChatResponse;

      // 用后端返回的完整 messages 覆盖本地状态，保证工具调用详情和最终回复一致。
      setSessionId(data.sessionId);
      setMessages(data.messages);
      setMode(data.mode);
      setProvider(data.provider);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '发送失败');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="chat-panel">
        <header className="chat-header">
          <div>
            <h1>Internal AI Chatbot MVP</h1>
            <p>面向内部员工的多轮对话、mock LLM 和自动工具调用演示。</p>
          </div>
          <span className="mode-pill">
            <strong>{mode === 'mock' ? 'Mock Mode' : `${provider.label} API`}</strong>
            <small>{provider.model}</small>
          </span>
        </header>

        <div className="examples" aria-label="示例问题">
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => sendMessage(example)} disabled={isSending}>
              {example}
            </button>
          ))}
        </div>

        <div className="messages" aria-live="polite">
          {messages.length === 0 && !isSending ? (
            <div className="empty-state">输入一个问题开始对话，或点击示例问题演示工具调用。</div>
          ) : (
            messages.map((message, index) => (
              <article className={`message ${message.role}`} key={`${message.createdAt}-${index}`}>
                <div className="message-role">{message.role === 'user' ? '你' : 'AI 助手'}</div>
                <p>{message.content}</p>
                {message.toolCalls && message.toolCalls.length > 0 ? (
                  <div className="tool-call-list">
                    {message.toolCalls.map((toolCall, toolIndex) => (
                      <div className="tool-call" key={`${toolCall.name}-${toolIndex}`}>
                        <strong>{toolCall.name}</strong>
                        <span>{toolCall.ok ? '成功' : '失败'}</span>
                        <code>{toolCall.result}</code>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          )}

          {/* 等待 API 返回期间的 assistant loading 气泡：纯前端占位，
              不写入 messages、不发送到后端、也不进入 session history。
              成功或失败后 isSending 变为 false，气泡随之消失。 */}
          {isSending ? (
            <article className="message assistant message-loading" role="status" aria-live="polite">
              <div className="message-role">AI 助手</div>
              <div className="typing-indicator" aria-label="AI 助手正在思考">
                <span>正在思考</span>
                {/* 圆点动画对读屏器隐藏，避免反复朗读；等待语义由上面的文本承载。 */}
                <span className="typing-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </article>
          ) : null}

          {/* 滚动锚点：上面的 useEffect 在消息或发送状态变化时滚动到这里。 */}
          <div ref={messagesEndRef} />
        </div>

        {error ? <div className="error">{error}</div> : null}

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="输入问题，例如：帮我创建一个待办：明天提交报销"
          />
          <button type="submit" disabled={!canSend}>
            {isSending ? '发送中' : '发送'}
          </button>
        </form>
      </section>
    </main>
  );
}

async function readApiErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message;
      }
    } catch {
      return '发送失败，请稍后重试';
    }
  }

  const text = await response.text();
  return text || '发送失败';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
