# 模型网关与多 Provider 接入说明

> 本文是对原始笔试要求的增强说明（非原题强制项）。原题只要求 mock 模式可运行；
> 这里进一步说明本项目如何在同一套接口下支持多种真实模型、第三方中转站和公司内部网关。

## 目标

用最小的代码改动，把“多模型 / 中转站 / 内部网关”讲清楚并给出可运行证据：

- 评审无需任何 Key，默认 mock 模式即可体验完整核心流程。
- 需要真实模型时，可在不改动业务代码的前提下，通过环境变量切换 DeepSeek、OpenAI、第三方中转站或公司内部网关。
- 真实模型链路具备超时、错误脱敏和可选兜底，演示时不会因为上游异常直接 500。

设计原则：不为每个厂商单独写一个 provider，而是把通用的 OpenAI-compatible 路径做扎实，让大多数网关“配置即接入”。

## 当前支持的模型模式

| 模式 | `LLM_PROVIDER` | 说明 | 是否需要 Key |
| --- | --- | --- | --- |
| Mock（默认） | `mock` 或不设置 | 本地 deterministic provider，无网络依赖 | 否 |
| DeepSeek 直连 | `deepseek` | 调用 DeepSeek 官方 OpenAI 兼容接口，支持工具 schema | 是 |
| OpenAI-compatible / 网关 | `openai-compatible` | 任意暴露 `/chat/completions` 的服务，统一接入点 | 是 |

OpenAI-compatible 模式覆盖：OpenAI 官方、第三方中转站（One API、LiteLLM、OpenRouter 等）、以及公司内部 LLM 网关。

## 为什么默认保留 mock

- 题目硬性要求“没有真实 LLM API Key 也能体验核心流程”。
- 评审 `git clone` 后无需任何配置即可 `pnpm dev` 跑通普通对话、多轮上下文和工具调用。
- mock provider 输出可预测，便于自动化测试和录屏演示稳定复现。
- 真实模型始终是“可选增强”，不作为构建、测试或默认演示的前提。

## DeepSeek 直连模式

`DeepSeekProvider` 直接调用 DeepSeek 的 `/chat/completions`：

- 在 `plan` 阶段把对话历史和工具 schema 一起发给模型，模型可返回 `tool_calls`。
- 工具仍由本地 `ToolRegistry` 执行；模型只负责普通回复和工具结果总结。
- 本地 `ToolRouter` 始终兜底，保证模型未稳定触发工具时演示依然可控。
- DeepSeek tool schema 已同步工具边界：政策工具可传受控 `topic` 或自然语言 `query`，计算工具说明支持 `+ - * / ** ^ %`、括号、中文乘除加减和次方说法。

```bash
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=replace-with-your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_THINKING=disabled
```

## OpenAI-compatible / 中转站 / 内部网关模式

`OpenAICompatibleProvider` 是接入第三方网关和公司内部网关的统一入口。
只要目标服务暴露 OpenAI 兼容的 `POST /chat/completions`，就可以通过 `OPENAI_BASE_URL` 指向它，无需新增 provider 代码。

`OPENAI_PROVIDER_LABEL` 用于在前端模式徽标上显示具体网关名（例如 `Company Gateway API / model-name`），让评审一眼看出当前接的是哪条链路。

公司内部网关示例（无任何真实密钥）：

```bash
LLM_PROVIDER=openai-compatible
OPENAI_PROVIDER_LABEL=Company Gateway
OPENAI_BASE_URL=https://llm-gateway.example.com/v1
OPENAI_MODEL=company-chat-model
OPENAI_API_KEY=replace-with-your-key
```

## 环境变量矩阵

| 变量 | 作用 | 默认值 | 适用模式 |
| --- | --- | --- | --- |
| `LLM_PROVIDER` | 选择模型模式 | `mock` | 全部 |
| `OPENAI_PROVIDER_LABEL` | 前端展示的网关名 | `OpenAI Compatible` | openai-compatible |
| `OPENAI_BASE_URL` | 任意 OpenAI 兼容 `/chat/completions` 地址 | `https://api.openai.com/v1` | openai-compatible |
| `OPENAI_MODEL` | 模型名 | `gpt-4o-mini` | openai-compatible |
| `OPENAI_API_KEY` | 网关鉴权 Key | 无 | openai-compatible |
| `DEEPSEEK_API_KEY` / `DeepSeek_KEY` | DeepSeek Key（二选一） | 无 | deepseek |
| `DEEPSEEK_BASE_URL` | DeepSeek 地址 | `https://api.deepseek.com` | deepseek |
| `DEEPSEEK_MODEL` | DeepSeek 模型 | `deepseek-v4-flash` | deepseek |
| `LLM_REQUEST_TIMEOUT_MS` | 真实模型请求超时（毫秒） | `15000` | deepseek / openai-compatible |
| `LLM_FALLBACK_TO_MOCK` | 真实模型失败时是否降级到 mock | 不开启 | deepseek / openai-compatible |

所有真实 Key 只放在本地 `.env`，仓库中只保留 `replace-with-your-key` 这类明显占位符。

## 接入示例

不同中转站 / 网关基本只是 `OPENAI_BASE_URL` 和 `OPENAI_MODEL` 的差异：

- One API：`OPENAI_BASE_URL` 指向自建 One API 的 `/v1`，`OPENAI_API_KEY` 用 One API 下发的令牌，`OPENAI_MODEL` 用其聚合的模型名。
- LiteLLM Proxy：`OPENAI_BASE_URL` 指向 LiteLLM 代理的 `/v1`，模型名用 LiteLLM 路由配置中的名称。
- OpenRouter：`OPENAI_BASE_URL=https://openrouter.ai/api/v1`，`OPENAI_MODEL` 用形如 `vendor/model` 的 OpenRouter 模型名。
- 公司内部网关：`OPENAI_BASE_URL` 指向内网 `/v1`，`OPENAI_PROVIDER_LABEL` 设为如 `Company Gateway` 便于识别。

以上都不需要改动后端业务代码，只切换环境变量即可。仓库不把任何真实地址写成强制默认值。

## 工具调用策略

这是一个明确的 MVP 取舍：

- 工具触发统一由后端完成，前端示例按钮只负责填充演示问题，不参与工具选择。
- DeepSeek 模式下，模型可通过 `tool_calls` 参与工具规划，本地 `ToolRouter` 仍兜底。
- 通用 OpenAI-compatible 模式默认不发送 tools schema，工具触发完全交给本地 `ToolRouter`，以保证不同网关下演示链路稳定一致。
- 本地 `ToolRouter` 和 `ToolRegistry` 已补常见边界：政策别名、自然语言待办、时区别名、中文/全角/百分比/次方类计算输入，以及异常工具参数归一化。
- 下一步可为通用网关增加可选的 tools schema 支持，但当前优先保证稳定可解释，而不是覆盖所有网关的 function calling 差异。

## 安全边界

- API Key 只通过请求头 `Authorization` 发送，绝不写入日志或错误信息。
- 真实模型日志只输出 `provider/model/endpoint`，不输出 Key。
- 上游失败时，对外只返回脱敏错误（如 `LLM provider request failed: 401`、`LLM provider request timed out`），不回传上游响应体，避免泄漏请求回显等内容。
- 真实模型请求带 `AbortController` 超时，避免网关抖动时接口长时间挂起。
- provider 调用失败的这一轮对话不会写入会话历史，防止失败内容污染上下文。

## 当前限制与下一步

- 通用 OpenAI-compatible 模式暂未发送 tools schema（有意取舍，见“工具调用策略”）。
- `LLM_FALLBACK_TO_MOCK` 兜底默认关闭：默认行为是明确报错，避免“看起来成功其实是静默降级”。
- 会话仍是内存存储，重启丢失（与原 MVP 一致）。
- 后续可补充：通用网关的可选 function calling、按 provider 的重试与限流、结构化日志与链路追踪。
