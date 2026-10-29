import { Command } from "commander";
import ollama from "ollama";
import { listModels, pullModel, showModel } from "./commands/model";
import { latestSession, loadSession, newSession, saveMessage } from "./memory";

const program = new Command();

program
  .name("ASTRA")
  .option("-m, --model <name>", "model to use", "qwen2.5-coder:0.5b");

program
  .command("models")
  .description("List installed models")
  .action(listModels);
program
  .command("show <model>")
  .description("Show model details")
  .action(showModel);
program
  .command("pull <model>")
  .description("Download a model")
  .action(pullModel);

program
  .command("chat")
  .description("Start interactive chat")
  .argument("<query>", "What's on your mind today?")
  .option("-c, --continue", "continue the last session")
  .action(async (query: string, opts: { continue?: boolean }) => {
    const { model } = program.opts<{ model: string }>();

    let file = opts.continue ? await latestSession() : undefined;
    const messages = file ? await loadSession(file) : [];
    file ??= await newSession();

    const user = { role: "user", content: query };
    messages.push(user);
    await saveMessage(file, user);

    let reply = "";
    const stream = await ollama.chat({ model, messages, stream: true });
    for await (const part of stream) {
      process.stdout.write(part.message.content);
      reply += part.message.content;
    }
    process.stdout.write("\n");

    await saveMessage(file, { role: "assistant", content: reply });
  });

try {
  await program.parseAsync();
} catch (err) {
  console.error(`error: ${(err as Error).message}`);
  process.exit(1);
}
