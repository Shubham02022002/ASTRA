import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import type { ProviderName, ProviderPreset } from "./presets";
import type {
  ChatMessage,
  ChatOptions,
  LLMProvider,
  LLMResponse,
  ToolCall,
  ToolDefinition,
} from "./provider.interface";

function toOpenAIMessage(m: ChatMessage): ChatCompletionMessageParam {
  if (m.role === "tool") {
    return { role: "tool", tool_call_id: m.toolCallId ?? "", content: m.content };
  }
  if (m.role === "assistant" && m.toolCalls?.length) {
    return {
      role: "assistant",
      content: m.content || null,
      tool_calls: m.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      })),
    };
  }
  return { role: m.role, content: m.content };
}

function toOpenAITools(tools?: ToolDefinition[]): ChatCompletionTool[] | undefined {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export class OpenAICompatibleProvider implements LLMProvider {
  private readonly client: OpenAI;

  constructor(
    readonly name: ProviderName,
    readonly model: string,
    preset: ProviderPreset,
  ) {
    if (!preset.apiKeyEnv || !preset.baseUrl) {
      throw new Error(`${name} is not an OpenAI-compatible provider`);
    }
    const apiKey = process.env[preset.apiKeyEnv];
    if (!apiKey) {
      throw new Error(
        `${preset.apiKeyEnv} is not set. Add it to .env or your environment, then retry.`,
      );
    }
    this.client = new OpenAI({ apiKey, baseURL: preset.baseUrl });
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<LLMResponse> {
    const request = {
      model: this.model,
      messages: messages.map(toOpenAIMessage),
      tools: toOpenAITools(opts.tools),
    };
    const options = { signal: opts.signal };

    if (!opts.onToken) {
      const res = await this.client.chat.completions.create(request, options);
      const choice = res.choices[0];
      if (!choice) return { content: null, toolCalls: [], finishReason: "stop" };
      return {
        content: choice.message.content ?? null,
        toolCalls: (choice.message.tool_calls ?? []).flatMap((tc) =>
          tc.type === "function"
            ? [
                {
                  id: tc.id,
                  name: tc.function.name,
                  arguments: parseArgs(tc.function.arguments),
                },
              ]
            : [],
        ),
        finishReason: choice.finish_reason ?? "stop",
      };
    }

    const stream = await this.client.chat.completions.create(
      { ...request, stream: true },
      options,
    );
    let content = "";
    let finishReason = "stop";
    const pending = new Map<number, { id: string; name: string; args: string }>();

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      if (choice.delta.content) {
        content += choice.delta.content;
        opts.onToken(choice.delta.content);
      }
      for (const tc of choice.delta.tool_calls ?? []) {
        const cur = pending.get(tc.index) ?? { id: "", name: "", args: "" };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name = tc.function.name;
        if (tc.function?.arguments) cur.args += tc.function.arguments;
        pending.set(tc.index, cur);
      }
      if (choice.finish_reason) finishReason = choice.finish_reason;
    }

    const toolCalls: ToolCall[] = [...pending.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, tc], i) => ({
        id: tc.id || `call_${i}`,
        name: tc.name,
        arguments: parseArgs(tc.args),
      }));

    return { content: content || null, toolCalls, finishReason };
  }

  async listModels(): Promise<string[]> {
    const page = await this.client.models.list();
    return page.data
      .map((m) => m.id.replace(/^models\//, ""))
      .sort();
  }
}
