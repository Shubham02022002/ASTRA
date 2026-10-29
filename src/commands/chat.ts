import * as readline from "node:readline/promises";
import type { Command } from "commander";
import ollama from "ollama";
import { latestSession, loadSession, newSession, saveMessage } from "../memory";
import { completer, handleSlash, type Ctx } from "./slash";

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
    process.stdout.write("\n[stopped]");
  }
  process.stdout.write("\n");

  if (reply) {
    const msg = { role: "assistant", content: reply };
    ctx.messages.push(msg);
    await saveMessage(ctx.sessionFile, msg);
  }
}

export const chat = async (
  query: string | undefined,
  opts: { continue?: boolean },
  command: Command,
) => {
  const { model } = command.parent?.opts<{ model: string }>() ?? {
    model: "qwen2.5-coder:0.5b",
  };

  let file = opts.continue ? await latestSession() : undefined;
  const messages = file ? await loadSession(file) : [];
  file ??= await newSession();
  const ctx: Ctx = { model, messages, sessionFile: file };

  if (query) {
    const msg = { role: "user", content: query };
    ctx.messages.push(msg);
    await saveMessage(ctx.sessionFile, msg);
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

  console.log(`model: ${ctx.model}   (type /help for commands)`);
  while (true) {
    const line = (await rl.question("> ")).trim();
    if (!line) continue;
    if (await handleSlash(line, ctx)) continue;

    const msg = { role: "user", content: line };
    ctx.messages.push(msg);
    await saveMessage(ctx.sessionFile, msg);

    busy = true;
    await ask(ctx);
    busy = false;
  }
};
