import { stat } from "node:fs/promises";
import path from "node:path";
import * as readline from "node:readline/promises";
import { loadSettings } from "../config/settings";
import { latestSession, loadSession, newSession, saveMessage } from "../memory";
import { createProvider } from "../providers";
import {
  PROVIDER_NAMES,
  isProviderName,
  type ProviderName,
} from "../providers/presets";
import type { ChatMessage } from "../providers/provider.interface";
import { completer, handleSlash, type Ctx } from "../slash";
import { ui } from "../ui";

type ChatOptions = {
  model?: string;
  provider?: string;
  print?: string;
  continue?: boolean;
  cwd: string;
  yes?: boolean;
};

async function ask(ctx: Ctx) {
  let reply = "";
  const controller = new AbortController();
  ctx.abort = () => controller.abort();
  try {
    const res = await ctx.llm.chat(ctx.messages, {
      signal: controller.signal,
      onToken: (text) => {
        process.stdout.write(text);
        reply += text;
      },
    });
    reply = res.content ?? reply;
  } catch (err) {
    const name = (err as Error).name;
    if (!controller.signal.aborted && name !== "AbortError") throw err;
    process.stdout.write(ui.stopped());
  } finally {
    ctx.abort = undefined;
  }
  process.stdout.write("\n");

  if (reply) {
    const msg: ChatMessage = { role: "assistant", content: reply };
    ctx.messages.push(msg);
    await saveMessage(ctx.sessionFile, msg);
  }
}

async function addUser(ctx: Ctx, content: string) {
  const msg: ChatMessage = { role: "user", content };
  ctx.messages.push(msg);
  await saveMessage(ctx.sessionFile, msg);
}

async function resolveProvider(opts: ChatOptions): Promise<{
  provider: ProviderName;
  model: string;
}> {
  const settings = await loadSettings();
  let provider = settings.provider;
  if (opts.provider) {
    if (!isProviderName(opts.provider)) {
      throw new Error(
        `unknown provider "${opts.provider}" — choose one of: ${PROVIDER_NAMES.join(", ")}`,
      );
    }
    provider = opts.provider;
  }
  return { provider, model: opts.model ?? settings.models[provider] };
}

export const chat = async (opts: ChatOptions) => {
  const cwd = path.resolve(opts.cwd);
  const info = await stat(cwd).catch(() => undefined);
  if (!info?.isDirectory()) throw new Error(`--cwd is not a directory: ${cwd}`);

  const { provider, model } = await resolveProvider(opts);

  let file = opts.continue ? await latestSession() : undefined;
  const messages = file ? await loadSession(file) : [];
  file ??= await newSession();
  const ctx: Ctx = {
    provider,
    model,
    llm: createProvider(provider, model),
    messages,
    sessionFile: file,
    cwd,
    yes: opts.yes ?? false,
  };
  if (opts.print) {
    await addUser(ctx, opts.print);
    await ask(ctx);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer,
  });
  let busy = false;
  rl.on("SIGINT", () => (busy ? ctx.abort?.() : rl.close()));
  rl.on("close", () => process.exit(0));

  console.log(ui.banner({ provider, model, cwd }));
  while (true) {
    const line = (await rl.question(ui.prompt)).trim();
    if (!line) continue;
    if (await handleSlash(line, ctx)) continue;

    await addUser(ctx, line);
    busy = true;
    await ask(ctx);
    busy = false;
  }
};
