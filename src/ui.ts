import chalk from "chalk";

const theme = {
  accent: chalk.hex("#D97757"),
  accentBold: chalk.hex("#D97757").bold,
  text: chalk.white,
  dim: chalk.hex("#888888"),
  success: chalk.hex("#4EBA65"),
  warn: chalk.hex("#FFC107"),
  error: chalk.hex("#FF6B80"),
  diffAdd: chalk.hex("#4EBA65"),
  diffRemove: chalk.hex("#FF6B80"),
};

function box(lines: string[]) {
  const width =
    Math.max(
      ...lines.map((l) => chalk.reset(l).replace(/\x1b\[[0-9;]*m/g, "").length),
    ) + 2;
  const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
  const top = theme.accent("╭" + "─".repeat(width) + "╮");
  const bottom = theme.accent("╰" + "─".repeat(width) + "╯");
  const body = lines.map(
    (l) =>
      theme.accent("│") +
      " " +
      l +
      " ".repeat(width - strip(l).length - 1) +
      theme.accent("│"),
  );
  return [top, ...body, bottom].join("\n");
}

export const ui = {
  banner: (model: string, cwd: string) =>
    box([
      theme.accent("✻ ") + theme.text.bold("Welcome to ASTRA"),
      "",
      theme.dim("model: ") + theme.text(model),
      theme.dim("cwd:   ") + theme.text(cwd),
      "",
      theme.dim("/help for commands · Ctrl+C stops a reply"),
    ]) + "\n",

  prompt: theme.accentBold("> "),

  info: (s: string) => console.log(theme.dim(s)),
  success: (s: string) => console.log(theme.success("✔ ") + s),
  warn: (s: string) => console.log(theme.warn("! ") + s),
  error: (s: string) => console.error(theme.error("✖ ") + s),

  command: (name: string, desc: string) =>
    `  ${theme.accent("/" + name.padEnd(10))} ${theme.dim(desc)}`,
  row: (n: number, when: string, preview: string) =>
    `  ${theme.accent(n + ".")} ${theme.dim(when)}  ${preview}`,
  tool: (name: string, arg: string) =>
    `${theme.accent("● ")}${theme.text.bold(name)}${theme.dim("(" + arg + ")")}`,
  toolResult: (s: string) => theme.dim("  ⎿  " + s),

  diffAdd: (s: string) => theme.diffAdd("+ " + s),
  diffRemove: (s: string) => theme.diffRemove("- " + s),

  stopped: () => theme.warn("\n[stopped]"),
};
