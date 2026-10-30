import ollama, { type Message } from "ollama";
import path from "node:path";
import { listSessions, loadSession, newSession } from "../memory";
import { ui } from "../ui";

export type Ctx = {
  model: string;
  messages: Message[];
  sessionFile: string;
  cwd: string;
  yes: boolean;
};

type SlashCommand = {
  description: string;
  run: (args: string[], ctx: Ctx) => Promise<void> | void;
};

async function describeSession(file: string) {
  const when = new Date(Number(path.basename(file, ".jsonl"))).toLocaleString();
  const first = (await loadSession(file)).find((m) => m.role === "user");
  const preview = (first?.content ?? "").slice(0, 50).replace(/\s+/g, " ");
  return `${when}  ${preview}`;
}

export const commands: Record<string, SlashCommand> = {
  help: {
    description: "List all commands",
    run: () => {
      for (const [name, c] of Object.entries(commands)) {
        console.log(ui.command(name, c.description));
      }
    },
  },

  model: {
    description: "Show or switch model:  /model [name]",
    run: async ([name], ctx) => {
      const { models } = await ollama.list();
      const installed = models.map((m) => m.name);
      if (!name) {
        console.log(
          `current: ${ctx.model}\ninstalled:\n  ${installed.join("\n  ")}`,
        );
        return;
      }
      if (!installed.includes(name)) {
        ui.warn(`"${name}" is not installed. Run: ASTRA pull ${name}`);
        return;
      }
      ctx.model = name;
      ui.success(`switched to ${name}`);
    },
  },

  clear: {
    description: "Start a fresh conversation",
    run: async (_a, ctx) => {
      ctx.messages.length = 0;
      ctx.sessionFile = await newSession();
      ui.success("cleared");
    },
  },

  sessions: {
    description: "List saved sessions",
    run: async () => {
      const files = (await listSessions()).slice(0, 10);
      if (!files.length) return console.log("no saved sessions");
      for (const [i, f] of files.entries()) {
        console.log(`  ${i + 1}. ${await describeSession(f)}`);
      }
      console.log("resume one with /resume <number>");
    },
  },

  resume: {
    description: "Resume a session:  /resume [number]",
    run: async ([n], ctx) => {
      const files = await listSessions();
      const file = files[(n ? Number(n) : 1) - 1];
      if (!file) return console.log("no such session (see /sessions)");
      ctx.messages.splice(0, ctx.messages.length, ...(await loadSession(file)));
      ctx.sessionFile = file;
      console.log(`resumed (${ctx.messages.length} messages)`);
    },
  },

  exit: {
    description: "Quit",
    run: () => process.exit(0),
  },
};

export async function handleSlash(line: string, ctx: Ctx): Promise<boolean> {
  if (!line.startsWith("/")) return false;
  const [name = "", ...args] = line.slice(1).trim().split(/\s+/);
  const cmd = commands[name];
  if (!cmd) ui.warn(`unknown command: /${name}  (try /help)`);
  else await cmd.run(args, ctx);
  return true;
}

export function completer(line: string): [string[], string] {
  if (!line.startsWith("/")) return [[], line];
  const all = Object.keys(commands).map((n) => "/" + n);
  const hits = all.filter((c) => c.startsWith(line));
  return [hits.length ? hits : all, line];
}
