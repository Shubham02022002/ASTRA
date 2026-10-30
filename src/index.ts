import { Command } from "commander";
import { listModels, pullModel, showModel } from "./commands/model";
import { chat } from "./commands/chat";
import { ui } from "./ui";

const program = new Command();

program
  .name("ASTRA")
  .option("-m, --model <name>", "model to use", "qwen2.5-coder:0.5b")
  .option("-p, --print <prompt>", "run one prompt, print the answer, exit")
  .option("-c, --continue", "continue the most recent session")
  .option("--cwd <dir>", "directory the agent works in", process.cwd())
  .option("--yes", "skip permission prompts")
  .action(chat);

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
  .argument("[query]", "one-shot question (omit for interactive mode)")
  .option("-c, --continue", "continue the last session")
  .action(chat);

try {
  await program.parseAsync();
} catch (err) {
  ui.error((err as Error).message);
  process.exit(1);
}
