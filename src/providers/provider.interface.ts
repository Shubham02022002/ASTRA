export interface ToolDefination {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: string;
}
export interface LLMProvider {
  chat(message: any[], tools?: ToolDefination[]): Promise<LLMResponse>;
}
