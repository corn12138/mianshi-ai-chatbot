// 真实模型 / 网关请求的统一出口。
// 把超时控制、错误脱敏和响应解析集中到一处，原因有三：
// 1. DeepSeek 与 OpenAI-compatible 两个 provider 的 fetch 逻辑几乎一致，避免重复。
// 2. 统一保证错误信息里不出现 API Key、Authorization 头或上游响应体，防止泄漏。
// 3. 给真实模型调用加超时，网关抖动时把请求转成可控错误，而不是让接口长时间挂起。

// 只取首个 choice 的 message：plan 阶段可能只有 tool_calls，compose 阶段主要看 content。
export interface ChatCompletionMessage {
  content?: string;
  // tool_calls 仅 DeepSeek 等支持 function calling 的网关会返回；通用网关可忽略。
  tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: ChatCompletionMessage }>;
}

// 默认超时 15s。允许用 LLM_REQUEST_TIMEOUT_MS 覆盖；非法或非正数时回退默认值，
// 避免误配置（如空串、0、负数）把超时关掉。
export function getLlmTimeoutMs(): number {
  const raw = Number(process.env.LLM_REQUEST_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 15000;
}

export interface ChatCompletionRequest {
  baseUrl: string;
  apiKey: string;
  // body 由各 provider 自行构造（model、messages、tools、temperature 等）。
  body: Record<string, unknown>;
  timeoutMs?: number;
}

// 统一发起 OpenAI 兼容的 /chat/completions 请求，并返回首个 message。
export async function requestChatCompletion(
  params: ChatCompletionRequest,
): Promise<ChatCompletionMessage> {
  const timeoutMs = params.timeoutMs ?? getLlmTimeoutMs();

  // 用 AbortController 到点中断请求；finally 里 clearTimeout 防止定时器泄漏。
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${params.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        // Authorization 仅出现在请求头，绝不写入日志或抛出的错误信息。
        authorization: `Bearer ${params.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(params.body),
      signal: controller.signal,
    });
  } catch (error) {
    // 区分“超时中断”和“其它网络错误”，两类都只对外暴露脱敏信息，
    // 原始错误仅留在服务端日志，便于本地排查而不污染 API 响应。
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('LLM provider request timed out');
    }
    console.warn('[llm] request failed before response:', (error as Error)?.message);
    throw new Error('LLM provider request failed');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // 只暴露状态码，不回传上游响应体：响应体可能包含请求回显等不可控内容。
    throw new Error(`LLM provider request failed: ${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices?.[0]?.message ?? {};
}
