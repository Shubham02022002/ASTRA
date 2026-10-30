import { stat } from "node:fs/promises";
import path from "node:path";
import * as readline from "node:readline/promises";
import ollama, { type Message } from "ollama";
import { latestSession, loadSession, newSession, saveMessage } from "../memory";
import { completer, handleSlash, type Ctx } from "../slash";
import { ui } from "../ui";

type ChatOptions = {
  model: string;
  print?: string;
  continue?: boolean;
  cwd: string;
  yes?: boolean;
};

async function ask(ctx: Ctx) {
  let reply = "";
  try {
    const stream = await ollama.chat({
      model: ctx.model,
      messages: ctx.messages,
      stream: true,
    });
    for await (const part of stream) {
      process.stdout.write(part.message.content);
      reply += part.message.content;
    }
  } catch (err) {
    if ((err as Error).name !== "AbortError") throw err;
    process.stdout.write(ui.stopped());
  }
  process.stdout.write("\n");

  if (reply) {
    const msg = { role: "assistant", content: reply };
    ctx.messages.push(msg);
    await saveMessage(ctx.sessionFile, msg);
  }
}

async function addUser(ctx: Ctx, content: string) {
  const msg: Message = { role: "user", content };
  ctx.messages.push(msg);
  await saveMessage(ctx.sessionFile, msg);
}

export const chat = async (opts: ChatOptions) => {
  const cwd = path.resolve(opts.cwd);
  const info = await stat(cwd).catch(() => undefined);
  if (!info?.isDirectory()) throw new Error(`--cwd is not a directory: ${cwd}`);

  let file = opts.continue ? await latestSession() : undefined;
  const messages = file ? await loadSession(file) : [];
  file ??= await newSession();
  const ctx: Ctx = {
    model: opts.model,
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
  rl.on("SIGINT", () => (busy ? ollama.abort() : rl.close()));
  rl.on("close", () => process.exit(0));

  console.log(ui.banner(ctx.model, ctx.cwd));
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
