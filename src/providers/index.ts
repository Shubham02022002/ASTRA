import { OllamaProvider } from "./ollama";
import { OpenAICompatibleProvider } from "./openaiCompatible";
import { PRESETS, type ProviderName } from "./presets";
import type { LLMProvider } from "./provider.interface";

export function createProvider(name: ProviderName, model?: string): LLMProvider {
  const preset = PRESETS[name];
  const selected = model ?? preset.defaultModel;
  if (name === "ollama") return new OllamaProvider(selected);
  return new OpenAICompatibleProvider(name, selected, preset);
}

export * from "./presets";
export type {
  ChatMessage,
  ChatOptions,
  LLMProvider,
  LLMResponse,
  ToolCall,
  ToolDefinition,
} from "./provider.interface";
