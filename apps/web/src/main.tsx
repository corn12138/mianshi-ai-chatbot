import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
  result: string;
  ok: boolean;
};

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  toolCalls?: ToolCall[];
};

type ChatResponse = {
  sessionId: string;
  reply: string;
  messages: ChatMessage[];
  toolCalls: ToolCall[];
  mode: 'mock' | 'llm';
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const examples = ['你好，你能做什么？', '公司年假政策是什么？', '那远程办公时也适用吗？', '帮我创建一个待办：明天提交报销', '现在几点？'];

function getInitialSessionId() {
  const existing = localStorage.getItem('mianshi-session-id');
  if (existing) return existing;

  const created = `web_${crypto.randomUUID()}`;
  localStorage.setItem('mianshi-session-id', created);
  return created;
}

function App() {
  const [sessionId, setSessionId] = useState(getInitialSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'mock' | 'llm'>('mock');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSend = useMemo(() => draft.trim().length > 0 && !isSending, [draft, isSending]);

  useEffect(() => {
    localStorage.setItem('mianshi-session-id', sessionId);
  }, [sessionId]);

  async function sendMessage(text = draft) {
    const message = text.trim();
    if (!message) return;

    setError(null);
    setIsSending(true);
    setDraft('');
    setMessages((current) => [
      ...current,
      { role: 'user', content: message, createdAt: new Date().toISOString() },
    ]);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as ChatResponse;
      setSessionId(data.sessionId);
      setMessages(data.messages);
      setMode(data.mode);
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
          <span className="mode-pill">{mode === 'mock' ? 'Mock Mode' : 'LLM Mode'}</span>
        </header>

        <div className="examples" aria-label="示例问题">
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => sendMessage(example)} disabled={isSending}>
              {example}
            </button>
          ))}
        </div>

        <div className="messages" aria-live="polite">
          {messages.length === 0 ? (
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
