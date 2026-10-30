import ollama, { type Message, type Tool } from "ollama";
import type {
  ChatMessage,
  ChatOptions,
  LLMProvider,
  LLMResponse,
  ToolCall,
} from "./provider.interface";

function toOllamaMessage(m: ChatMessage): Message {
  return {
    role: m.role,
    content: m.content,
    ...(m.toolCalls?.length && {
      tool_calls: m.toolCalls.map((tc) => ({
        function: { name: tc.name, arguments: tc.arguments },
      })),
    }),
    ...(m.toolName && { tool_name: m.toolName }),
  };
}

function normalizeCalls(
  calls: { function: { name: string; arguments: Record<string, unknown> } }[] | undefined,
): ToolCall[] {
  return (calls ?? []).map((tc, i) => ({
    id: `call_${i}`,
    name: tc.function.name,
    arguments: tc.function.arguments ?? {},
  }));
}

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";

  constructor(readonly model: string) {}

  private request(messages: ChatMessage[], opts: ChatOptions) {
    return {
      model: this.model,
      messages: messages.map(toOllamaMessage),
      ...(opts.tools?.length && {
        tools: opts.tools.map((t) => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters as Tool["function"]["parameters"],
          },
        })),
      }),
    };
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<LLMResponse> {
    const request = this.request(messages, opts);
    const onAbort = () => ollama.abort();
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    try {
      if (!opts.onToken) {
        const res = await ollama.chat({ ...request, stream: false });
        return {
          content: res.message.content || null,
          toolCalls: normalizeCalls(res.message.tool_calls),
          finishReason: res.done_reason ?? "stop",
        };
      }

      let content = "";
      let toolCalls: ToolCall[] = [];
      let finishReason = "stop";
      const stream = await ollama.chat({ ...request, stream: true });
      for await (const part of stream) {
        if (part.message.content) {
          content += part.message.content;
          opts.onToken(part.message.content);
        }
        const calls = normalizeCalls(part.message.tool_calls);
        if (calls.length) toolCalls = calls;
        if (part.done_reason) finishReason = part.done_reason;
      }
      return { content: content || null, toolCalls, finishReason };
    } finally {
      opts.signal?.removeEventListener("abort", onAbort);
    }
  }

  async listModels(): Promise<string[]> {
    const { models } = await ollama.list();
    return models.map((m) => m.name);
  }
}
