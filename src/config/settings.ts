import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  PRESETS,
  PROVIDER_NAMES,
  isProviderName,
  type ProviderName,
} from "../providers/presets";

export interface Settings {
  provider: ProviderName;
  models: Record<ProviderName, string>;
}

const DIR = path.join(homedir(), ".ASTRA");
const FILE = path.join(DIR, "config.json");

function defaults(): Settings {
  return {
    provider: "ollama",
    models: Object.fromEntries(
      PROVIDER_NAMES.map((n) => [n, PRESETS[n].defaultModel]),
    ) as Record<ProviderName, string>,
  };
}

export async function loadSettings(): Promise<Settings> {
  const base = defaults();
  try {
    const saved = JSON.parse(await readFile(FILE, "utf8")) as Partial<Settings>;
    const models = { ...base.models };
    for (const name of PROVIDER_NAMES) {
      const model = saved.models?.[name];
      if (typeof model === "string" && model.trim()) models[name] = model;
    }
    return {
      provider:
        typeof saved.provider === "string" && isProviderName(saved.provider)
          ? saved.provider
          : base.provider,
      models,
    };
  } catch {
    return base;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(settings, null, 2) + "\n");
}
