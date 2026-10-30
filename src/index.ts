import { Command } from "commander";
import { chat } from "./commands/chat";
import { listModels, pullModel, showModel } from "./commands/model";
import { listProviders, setProvider } from "./commands/provider";
import { ui } from "./ui";

const program = new Command();

program
  .name("ASTRA")
  .option("-m, --model <name>", "model to use (default: saved per provider)")
  .option(
    "--provider <name>",
    "LLM provider for this run: ollama, groq, gemini, openrouter",
  )
  .option("-p, --print <prompt>", "run one prompt, print the answer, exit")
  .option("-c, --continue", "continue the most recent session")
  .option("--cwd <dir>", "directory the agent works in", process.cwd())
  .option("--yes", "skip permission prompts")
  .action(chat);

program
  .command("models")
  .description("List models for the active provider")
  .action(listModels);
program
  .command("show <model>")
  .description("Show model details (Ollama)")
  .action(showModel);
program
  .command("pull <model>")
  .description("Download an Ollama model")
  .action(pullModel);

const providerCmd = program
  .command("provider")
  .description("Choose the LLM provider and set the default");

providerCmd
  .command("list")
  .description("Show providers and the saved default")
  .action(listProviders);

providerCmd
  .command("set <name>")
  .description("Set the default provider (validates access first)")
  .option("-m, --model <name>", "default model for this provider")
  .action(async (name: string, opts: { model?: string }) => {
    const model = opts.model ?? program.opts().model;
    const result = await setProvider(name, { model });
    ui.success(`default provider: ${result.provider}  model: ${result.model}`);
  });

program
  .command("chat")
  .description("Start interactive chat")
  .argument("[query]", "one-shot question (omit for interactive mode)")
  .option("-c, --continue", "continue the last session")
  .action(chat);

try {
  await program.parseAsync();
} catch (err) {
  ui.error((err as Error).message);
  process.exit(1);
}
