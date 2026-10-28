import { Command } from "commander";

import { listModels, modelDetails } from "./commands/model";

const program = new Command();

program
  .name("myagent")
  .option("-m, --model <name>", "model to use", "qwen2.5-coder:0.5b");

program.command("models").action(listModels);
program.command("modelDetails").action(modelDetails);

program
  .command("chat")
  .description("Start interactive chat")
  .action(async () => {
    console.log("chat starting...");
  });

await program.parseAsync();
