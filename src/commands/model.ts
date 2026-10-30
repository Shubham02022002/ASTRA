import ollama from "ollama";
import { loadSettings } from "../config/settings";
import { createProvider } from "../providers";
import { ui } from "../ui";

export const listModels = async () => {
  const settings = await loadSettings();
  const provider = createProvider(
    settings.provider,
    settings.models[settings.provider],
  );
  const models = await provider.listModels();
  if (!models.length) {
    console.log(ui.dim(`no models available for ${settings.provider}`));
    return;
  }
  console.log(models.join("\n"));
};

export const showModel = async (model: string) => {
  const info = await ollama.show({ model });
  console.log(`model:        ${model}`);
  console.log(`family:       ${info.details.family}`);
  console.log(`parameters:   ${info.details.parameter_size}`);
  console.log(`quantization: ${info.details.quantization_level}`);
  console.log(`capabilities: ${info.capabilities?.join(", ") ?? "unknown"}`);
};

export const pullModel = async (model: string) => {
  const stream = await ollama.pull({ model, stream: true });
  for await (const p of stream) {
    if (p.total && p.completed) {
      const pct = ((p.completed / p.total) * 100).toFixed(1);
      process.stdout.write(`\r${p.status} ${pct}%   `);
    } else {
      process.stdout.write(`\r${p.status}`.padEnd(50));
    }
  }
  console.log("\ndone");
};
