export type ProviderName = "ollama" | "groq" | "gemini" | "openrouter";

export interface ProviderPreset {
  label: string;
  cloud: boolean;
  apiKeyEnv?: string;
  baseUrl?: string;
  defaultModel: string;
}

export const PRESETS: Record<ProviderName, ProviderPreset> = {
  ollama: {
    label: "Ollama",
    cloud: false,
    defaultModel: "qwen2.5-coder:0.5b",
  },
  groq: {
    label: "Groq",
    cloud: true,
    apiKeyEnv: "GROQ_API_KEY",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-20b",
  },
  gemini: {
    label: "Google Gemini",
    cloud: true,
    apiKeyEnv: "GEMINI_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultModel: "gemini-2.5-flash",
  },
  openrouter: {
    label: "OpenRouter",
    cloud: true,
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
  },
};

export const PROVIDER_NAMES = Object.keys(PRESETS) as ProviderName[];

export function isProviderName(value: string): value is ProviderName {
  return value in PRESETS;
}
