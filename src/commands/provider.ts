import { loadSettings, saveSettings } from "../config/settings";
import { createProvider } from "../providers";
import {
  PRESETS,
  PROVIDER_NAMES,
  isProviderName,
  type ProviderName,
  type ProviderPreset,
} from "../providers/presets";
import type { LLMProvider } from "../providers/provider.interface";
import { ui } from "../ui";

function keyStatus(preset: ProviderPreset): string {
  if (!preset.apiKeyEnv) return "local";
  return process.env[preset.apiKeyEnv] ? "key set" : "key missing";
}

export async function listProviders(): Promise<void> {
  const settings = await loadSettings();
  for (const name of PROVIDER_NAMES) {
    const preset = PRESETS[name];
    const active = name === settings.provider;
    const line = [
      active ? "*" : " ",
      name.padEnd(11),
      preset.label.padEnd(17),
      settings.models[name].padEnd(28),
      keyStatus(preset),
    ].join(" ");
    console.log(active ? ui.accent(line) : ui.dim(line));
  }
  console.log(ui.dim("\nswitch with: ASTRA provider set <name>"));
}

function friendlyError(err: unknown, preset: ProviderPreset): Error {
  const status = (err as { status?: number }).status;
  if (status === 401) {
    return new Error(`${preset.apiKeyEnv ?? "API key"} was rejected (401) — check the key`);
  }
  if (status === 429) {
    return new Error(`${preset.label} rate limit hit (429) — try again shortly`);
  }
  if (status !== undefined) {
    return new Error(`${preset.label} error ${status}: ${(err as Error).message}`);
  }
  const message = err instanceof Error ? err.message : String(err);
  if (!preset.cloud) {
    return new Error(`could not reach Ollama — is it running? (${message})`);
  }
  return new Error(`${preset.label}: ${message}`);
}

async function verify(provider: LLMProvider, preset: ProviderPreset): Promise<void> {
  try {
    const models = await provider.listModels();
    if (models.length) {
      if (!models.includes(provider.model)) {
        ui.warn(
          `"${provider.model}" is not in ${preset.label}'s model list — use /model or --model to pick one`,
        );
      }
      return;
    }
  } catch (err) {
    throw friendlyError(err, preset);
  }
  try {
    await provider.chat([{ role: "user", content: "Reply with OK." }]);
  } catch (err) {
    throw friendlyError(err, preset);
  }
}

export async function setProvider(
  input: string,
  opts: { model?: string; verify?: boolean } = {},
): Promise<{ provider: ProviderName; model: string }> {
  if (!isProviderName(input)) {
    throw new Error(
      `unknown provider "${input}" — choose one of: ${PROVIDER_NAMES.join(", ")}`,
    );
  }
  const name = input;
  const settings = await loadSettings();
  const model = opts.model ?? settings.models[name];
  const provider = createProvider(name, model);
  if (opts.verify !== false) await verify(provider, PRESETS[name]);

  settings.provider = name;
  settings.models[name] = model;
  await saveSettings(settings);
  return { provider: name, model };
}
