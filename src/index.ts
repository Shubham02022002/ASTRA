import { Command } from "commander";
import { listModels, pullModel, showModel } from "./commands/model";

const program = new Command();

program
  .name("myagent")
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
  .action(async () => {
    const { model } = program.opts();
    console.log(`chat starting with ${model}...`);
  });

try {
  await program.parseAsync();
} catch (err) {
  console.error(`error: ${(err as Error).message}`);
  process.exit(1);
}
